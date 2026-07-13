import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Captura o evento nativo de instalação o quanto antes — antes do React montar —
// para não perder o disparo (Chrome/Edge/Android emitem uma única vez).
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    // @ts-ignore
    window.__deferredInstallPrompt = e;
  });
}

createRoot(document.getElementById("root")!).render(<App />);

// Service worker para push + critérios de instalabilidade (PWA).
// Guardado contra preview/iframe do Lovable.
if ("serviceWorker" in navigator) {
  const host = window.location.hostname;
  const isPreview =
    window.self !== window.top ||
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovableproject-dev.com") ||
    host.endsWith(".beta.lovable.dev");
  if (!isPreview) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/notifications-sw.js", { scope: "/" })
        .catch((e) => console.error("SW register failed", e));
    });
  }
}
