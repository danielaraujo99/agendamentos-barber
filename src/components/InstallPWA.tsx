import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_MS = 1000 * 60 * 60 * 24; // 24h

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // @ts-ignore iOS
  window.navigator.standalone === true;

const InstallPWA = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const recentlyDismissed = dismissedAt && Date.now() - dismissedAt < DISMISS_MS;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      if (!recentlyDismissed) setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => {
      setVisible(false);
      localStorage.removeItem(DISMISS_KEY);
    });

    // iOS Safari nunca dispara beforeinstallprompt — mostra guia manual.
    if (isIOS() && !recentlyDismissed) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible) return null;

  const install = async () => {
    if (deferred) {
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
    } else if (isIOS()) {
      setShowIOSHelp(true);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setShowIOSHelp(false);
  };

  return (
    <>
      <div
        className="fixed z-[90] left-3 right-3 bottom-3 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm rounded-2xl shadow-2xl p-3 flex items-center gap-3"
        style={{
          background: "hsl(220 25% 10% / 0.96)",
          border: "1px solid hsl(35 55% 52% / 0.35)",
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
            Instalar GenesisBarber
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Notificações em segundo plano e acesso rápido.
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

      {showIOSHelp && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          style={{ background: "hsl(0 0% 0% / 0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowIOSHelp(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-2xl p-5 space-y-4"
            style={{
              background: "hsl(220 25% 10%)",
              border: "1px solid hsl(0 0% 100% / 0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Instalar no iPhone</p>
              <button
                onClick={() => setShowIOSHelp(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-3 text-[13px] text-foreground/90">
              <li className="flex gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ background: "#c69447", color: "#111318" }}
                >
                  1
                </span>
                <span className="flex-1 flex items-center gap-1">
                  Toque no botão <Share className="w-4 h-4 inline" style={{ color: "#e5b877" }} /> Compartilhar do Safari
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ background: "#c69447", color: "#111318" }}
                >
                  2
                </span>
                <span className="flex-1 flex items-center gap-1">
                  Escolha <b>Adicionar à Tela de Início</b> <Plus className="w-4 h-4 inline" style={{ color: "#e5b877" }} />
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ background: "#c69447", color: "#111318" }}
                >
                  3
                </span>
                <span className="flex-1">Confirme em <b>Adicionar</b> — pronto, notificações em segundo plano habilitadas.</span>
              </li>
            </ol>
            <button
              onClick={dismiss}
              className="w-full text-[12px] font-semibold px-3 py-2 rounded-lg"
              style={{ background: "#c69447", color: "#111318" }}
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPWA;
