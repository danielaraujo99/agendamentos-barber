// Chave pública VAPID (segura para expor no cliente)
export const VAPID_PUBLIC_KEY =
  "BPToqHiVYCDEr7OwGjR-jKh7uOY1vhK6acshLDx1bMsXii6Zzq03WZsu3Mq2zfgLWzQxbOjGr3ALNBGtt2AGrn8";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
