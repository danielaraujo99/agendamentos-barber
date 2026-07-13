import { useEffect, useState } from "react";
import { Download, X, Share, Plus, MoreVertical } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __deferredInstallPrompt?: BIPEvent | null;
  }
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_MS = 1000 * 60 * 60 * 12; // 12h

const ua = () => navigator.userAgent || "";
const isIOS = () => /iphone|ipad|ipod/i.test(ua()) && !/crios|fxios/i.test(ua());
const isAndroid = () => /android/i.test(ua());
const isSamsungBrowser = () => /samsungbrowser/i.test(ua());
const isFirefox = () => /firefox|fxios/i.test(ua());

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // @ts-ignore iOS
  window.navigator.standalone === true ||
  document.referrer.startsWith("android-app://");

const InstallPWA = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(
    typeof window !== "undefined" ? window.__deferredInstallPrompt ?? null : null,
  );
  const [visible, setVisible] = useState(false);
  const [helpKind, setHelpKind] = useState<"ios" | "android" | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const recentlyDismissed = dismissedAt && Date.now() - dismissedAt < DISMISS_MS;
    if (recentlyDismissed) return;

    // Se o evento já foi capturado antes do mount (bootstrap em main.tsx), usa.
    if (window.__deferredInstallPrompt) {
      setDeferred(window.__deferredInstallPrompt);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      const bip = e as BIPEvent;
      window.__deferredInstallPrompt = bip;
      setDeferred(bip);
      setVisible(true);
    };
    const onInstalled = () => {
      window.__deferredInstallPrompt = null;
      setDeferred(null);
      setVisible(false);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Fallback: se em 2.5s nada disparou, mostramos banner com guia manual
    // (iOS Safari nunca dispara; Android sem critérios PWA também não; Samsung/Firefox nem sempre).
    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 2500);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
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
      } catch {
        // Alguns navegadores lançam se prompt() já foi consumido: cai para guia manual.
        setHelpKind(isIOS() ? "ios" : "android");
      } finally {
        window.__deferredInstallPrompt = null;
        setDeferred(null);
        setVisible(false);
      }
      return;
    }
    // Sem evento nativo: guia manual por plataforma
    setHelpKind(isIOS() ? "ios" : "android");
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    setHelpKind(null);
  };

  const cta = deferred ? "Instalar" : isIOS() ? "Ver como" : "Como instalar";

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
          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90 whitespace-nowrap"
          style={{ background: "#c69447", color: "#111318" }}
        >
          {cta}
        </button>
        <button
          onClick={dismiss}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {helpKind && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          style={{ background: "hsl(0 0% 0% / 0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setHelpKind(null)}
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
              <p className="text-sm font-bold text-foreground">
                {helpKind === "ios" ? "Instalar no iPhone" : "Instalar no Android"}
              </p>
              <button
                onClick={() => setHelpKind(null)}
                className="p-1 text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {helpKind === "ios" ? (
              <ol className="space-y-3 text-[13px] text-foreground/90">
                <Step n={1}>
                  Toque em <Share className="w-4 h-4 inline mx-1" style={{ color: "#e5b877" }} />
                  <b>Compartilhar</b> no Safari
                </Step>
                <Step n={2}>
                  Escolha <b>Adicionar à Tela de Início</b>
                  <Plus className="w-4 h-4 inline ml-1" style={{ color: "#e5b877" }} />
                </Step>
                <Step n={3}>
                  Confirme em <b>Adicionar</b>. Pronto — notificações em segundo plano ativadas.
                </Step>
              </ol>
            ) : (
              <ol className="space-y-3 text-[13px] text-foreground/90">
                <Step n={1}>
                  Abra o menu
                  <MoreVertical className="w-4 h-4 inline mx-1" style={{ color: "#e5b877" }} />
                  no canto superior direito do navegador
                  {isSamsungBrowser() ? " (Samsung Internet)" : isFirefox() ? " (Firefox)" : " (Chrome / Edge)"}.
                </Step>
                <Step n={2}>
                  Toque em <b>{isSamsungBrowser() ? "Adicionar página a" : "Instalar app"}</b>
                  {isSamsungBrowser() ? " → Tela inicial" : " ou Adicionar à tela inicial"}.
                </Step>
                <Step n={3}>
                  Confirme em <b>Instalar</b>. Abra pelo ícone e ative as notificações quando pedir.
                </Step>
              </ol>
            )}

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

const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <li className="flex gap-3">
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
      style={{ background: "#c69447", color: "#111318" }}
    >
      {n}
    </span>
    <span className="flex-1 flex items-center flex-wrap">{children}</span>
  </li>
);

export default InstallPWA;
