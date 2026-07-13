import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerPwaServiceWorker } from "./lib/pwa";

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

// Registro único do PWA: só produção publicada, nunca preview/dev/iframe.
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    registerPwaServiceWorker().catch((e) => console.error("PWA register failed", e));
  });
}
