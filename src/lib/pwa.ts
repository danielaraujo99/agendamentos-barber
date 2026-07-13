const PWA_SW_PATH = "/notifications-sw.js";
const LEGACY_APP_SW_PATHS = [PWA_SW_PATH, "/sw.js", "/service-worker.js"];

const isLovablePreviewHost = (host: string) =>
  host.startsWith("id-preview--") ||
  host.startsWith("preview--") ||
  host === "lovableproject.com" ||
  host.endsWith(".lovableproject.com") ||
  host === "lovableproject-dev.com" ||
  host.endsWith(".lovableproject-dev.com") ||
  host === "beta.lovable.dev" ||
  host.endsWith(".beta.lovable.dev");

export const isPwaStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith("android-app://"));

export const canRegisterPwaServiceWorker = () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return false;
  if (isLovablePreviewHost(window.location.hostname)) return false;
  return window.isSecureContext || window.location.hostname === "localhost";
};

const isAppServiceWorker = (registration: ServiceWorkerRegistration) => {
  const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || "";
  if (!scriptUrl) return false;
  const path = new URL(scriptUrl).pathname;
  return LEGACY_APP_SW_PATHS.includes(path);
};

export const unregisterStalePwaServiceWorkers = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(registrations.filter(isAppServiceWorker).map((registration) => registration.unregister()));
};

export const registerPwaServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) return null;

  if (!canRegisterPwaServiceWorker()) {
    await unregisterStalePwaServiceWorkers();
    return null;
  }

  return navigator.serviceWorker.register(PWA_SW_PATH, { scope: "/" });
};

export const readyPwaServiceWorker = async () => {
  const registration = await registerPwaServiceWorker();
  if (!registration) return null;
  return navigator.serviceWorker.ready;
};