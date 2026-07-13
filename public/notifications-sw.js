// Service worker: push background notifications + click handling
self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });
// Minimal fetch listener (required for PWA installability criteria on Chrome).
// Pass-through: never intercepts or caches — preserves app behavior 100%.
self.addEventListener("fetch", () => { /* no-op, network handles request */ });

// Base branded options — usadas por push e por mensagens in-tab.
const BRAND = {
  icon: "/icon-192.png",
  badge: "/badge-96.png",
  image: "/icon-512.png",
  vibrate: [220, 90, 220, 90, 320],
  silent: false, // usa o som padrão de notificação do sistema
  dir: "auto",
  lang: "pt-BR",
};

// Fallback: mensagens do app (in-tab)
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SHOW_NOTIFICATION") {
    const { title, body, tag, link, image } = data.payload || {};
    self.registration.showNotification(title || "GenesisBarber", {
      body: body || "",
      ...BRAND,
      image: image || BRAND.image,
      tag: tag || "default",
      renotify: true,
      data: { link: link || "/fila" },
    });
  }
});

// Web Push (background, mesmo com app fechado)
self.addEventListener("push", (event) => {
  let payload = {
    title: "GenesisBarber",
    body: "Você tem uma atualização",
    link: "/fila",
    tag: "queue",
  };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      ...BRAND,
      image: payload.image || BRAND.image,
      tag: payload.tag || "queue",
      renotify: true,
      requireInteraction: payload.requireInteraction !== false,
      timestamp: Date.now(),
      actions: [
        { action: "open", title: "Abrir fila" },
        { action: "dismiss", title: "Fechar" },
      ],
      data: { link: payload.link || "/fila" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const link = (event.notification.data && event.notification.data.link) || "/fila";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) { client.navigate(link); return client.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })
  );
});
