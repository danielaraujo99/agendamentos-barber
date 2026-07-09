// Service worker: push background notifications + click handling
self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });

// Fallback: mensagens do app (in-tab)
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SHOW_NOTIFICATION") {
    const { title, body, tag, link } = data.payload || {};
    self.registration.showNotification(title || "Notificação", {
      body: body || "",
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: tag || "default",
      data: { link: link || "/membro" },
    });
  }
});

// Web Push (background, mesmo com app fechado)
self.addEventListener("push", (event) => {
  let payload = { title: "Barbearia", body: "Você tem uma atualização", link: "/fila", tag: "queue" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: payload.tag || "queue",
      renotify: true,
      vibrate: [200, 100, 200],
      requireInteraction: payload.requireInteraction === true,
      data: { link: payload.link || "/fila" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
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
