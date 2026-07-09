import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/vapid";

type Perm = "default" | "granted" | "denied" | "unsupported";

export function useWebPush(userId: string | null) {
  const [permission, setPermission] = useState<Perm>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  const supported = typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;

  useEffect(() => {
    if (!supported) { setPermission("unsupported"); return; }
    setPermission(Notification.permission as Perm);
    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/notifications-sw.js");
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      } catch (e) { console.error("SW register", e); }
    })();
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || !userId) return false;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as Perm);
      if (perm !== "granted") return false;
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json: any = sub.toJSON();
      await supabase.from("push_subscriptions").upsert({
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh || "",
        auth: json.keys?.auth || "",
        user_agent: navigator.userAgent.slice(0, 200),
      }, { onConflict: "endpoint" });
      setSubscribed(true);
      return true;
    } catch (e) {
      console.error("subscribe", e);
      return false;
    } finally { setBusy(false); }
  }, [supported, userId]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally { setBusy(false); }
  }, [supported]);

  return { supported, permission, subscribed, busy, subscribe, unsubscribe };
}
