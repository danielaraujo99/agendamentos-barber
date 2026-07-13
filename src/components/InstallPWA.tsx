import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const InstallPWA = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_MS) return;

    // already installed?
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore iOS
      window.navigator.standalone === true;
    if (isStandalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setVisible(false));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible || !deferred) return null;

  const install = async () => {
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "dismissed") {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
    } finally {
      setDeferred(null);
      setVisible(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div
      className="fixed z-[90] left-3 right-3 bottom-3 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm rounded-2xl shadow-2xl p-3 flex items-center gap-3"
      style={{
        background: "hsl(220 25% 10% / 0.95)",
        border: "1px solid hsl(0 0% 100% / 0.08)",
        backdropFilter: "blur(20px)",
      }}
      role="dialog"
      aria-label="Instalar aplicativo"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "hsl(35 55% 52% / 0.15)", color: "#e5b877" }}
      >
        <Download className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-tight">
          Instalar aplicativo
        </p>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Acesso rápido e notificações em segundo plano.
        </p>
      </div>
      <button
        onClick={install}
        className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
        style={{ background: "#c69447", color: "#111318" }}
      >
        Instalar
      </button>
      <button
        onClick={dismiss}
        className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default InstallPWA;
