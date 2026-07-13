import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readyPwaServiceWorker } from "@/lib/pwa";

const STORAGE_KEY = "push_notifications_enabled";
const SEEN_KEY = "push_notifications_seen";

export type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications(email: string | null | undefined) {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const swReg = useRef<ServiceWorkerRegistration | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  // Carrega ids já vistos
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      if (raw) seenIds.current = new Set(JSON.parse(raw));
    } catch {}
  }, []);

  const persistSeen = () => {
    try {
      const arr = Array.from(seenIds.current).slice(-200); // limita
      localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
    } catch {}
  };

  // Registra SW e detecta suporte/permissão
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermissionState);

    readyPwaServiceWorker()
      .then((reg) => {
        if (!reg) return;
        swReg.current = reg;
      })
      .catch((e) => console.error("SW register error:", e));
  }, []);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
    if (result === "granted") {
      localStorage.setItem(STORAGE_KEY, "true");
      setEnabled(true);
    }
  };

  const setEnabledFlag = (val: boolean) => {
    setEnabled(val);
    try {
      localStorage.setItem(STORAGE_KEY, val ? "true" : "false");
    } catch {}
  };

  const showNotification = (n: { id: string; title: string; message: string; type?: string }) => {
    if (!enabled || permission !== "granted") return;
    if (seenIds.current.has(n.id)) return;
    seenIds.current.add(n.id);
    persistSeen();

    const payload = {
      title: n.title,
      body: n.message,
      tag: n.id,
      link: "/membro/notificacoes",
    };

    if (swReg.current && swReg.current.active) {
      swReg.current.active.postMessage({ type: "SHOW_NOTIFICATION", payload });
    } else if (typeof Notification !== "undefined") {
      try {
        const notif = new Notification(payload.title, {
          body: payload.body,
          icon: "/favicon.png",
          tag: payload.tag,
        });
        notif.onclick = () => {
          window.focus();
          window.location.href = payload.link;
        };
      } catch (e) {
        console.error("Notification error:", e);
      }
    }
  };

  // Realtime listener para notificações do usuário
  useEffect(() => {
    if (!email || !enabled || permission !== "granted") return;
    const channel = supabase
      .channel(`push-notifications-${email}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `customer_email=eq.${email}` },
        (payload) => {
          const n: any = payload.new;
          if (!n) return;
          showNotification({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, enabled, permission]);

  return {
    permission,
    enabled,
    setEnabled: setEnabledFlag,
    requestPermission,
    isSupported: permission !== "unsupported",
  };
}
