import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register the push/notifications service worker for installability + background push.
// Guarded to avoid Lovable preview/dev/iframe contexts (per PWA safety rules).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
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
        .register("/notifications-sw.js")
        .catch((e) => console.error("SW register failed", e));
    });
  }
}

