// Push/background notification handlers imported by the generated PWA service worker.
const GENESIS_NOTIFICATION_BRAND = {
  icon: "/icon-192.png",
  badge: "/badge-96.png",
  image: "/icon-512.png",
  vibrate: [220, 90, 220, 90, 320],
  silent: false,
  dir: "auto",
  lang: "pt-BR",
};

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SHOW_NOTIFICATION") {
    const { title, body, tag, link, image } = data.payload || {};
    event.waitUntil(
      self.registration.showNotification(title || "GenesisBarber", {
        body: body || "",
        ...GENESIS_NOTIFICATION_BRAND,
        image: image || GENESIS_NOTIFICATION_BRAND.image,
        tag: tag || "genesis-update",
        renotify: true,
        timestamp: Date.now(),
        data: { link: link || "/fila" },
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "GenesisBarber",
    body: "Você tem uma atualização na fila.",
    link: "/fila",
    tag: "queue",
  };

  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "GenesisBarber", {
      body: payload.body || "",
      ...GENESIS_NOTIFICATION_BRAND,
      image: payload.image || GENESIS_NOTIFICATION_BRAND.image,
      tag: payload.tag || "queue",
      renotify: true,
      requireInteraction: payload.requireInteraction !== false,
      timestamp: Date.now(),
      actions: [
        { action: "open", title: "Abrir fila" },
        { action: "dismiss", title: "Fechar" },
      ],
      data: { link: payload.link || "/fila" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const link = (event.notification.data && event.notification.data.link) || "/fila";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
      return undefined;
    }),
  );
});