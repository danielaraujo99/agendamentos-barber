import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, X, Share, Plus, MoreVertical, CheckCircle2, Bell, Zap, Smartphone } from "lucide-react";
import { isPwaStandalone } from "@/lib/pwa";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __deferredInstallPrompt?: BIPEvent | null;
  }
}

const ua = () => (typeof navigator !== "undefined" ? navigator.userAgent || "" : "");
const isIOS = () => /iphone|ipad|ipod/i.test(ua()) && !/crios|fxios/i.test(ua());
const isSamsungBrowser = () => /samsungbrowser/i.test(ua());
const isFirefox = () => /firefox|fxios/i.test(ua());
const InstallAppButton = () => {
  const [installed, setInstalled] = useState<boolean>(() => (typeof window !== "undefined" ? isPwaStandalone() : true));
  const [deferred, setDeferred] = useState<BIPEvent | null>(
    typeof window !== "undefined" ? window.__deferredInstallPrompt ?? null : null,
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (installed) return;
    if (window.__deferredInstallPrompt) setDeferred(window.__deferredInstallPrompt);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      const bip = e as BIPEvent;
      window.__deferredInstallPrompt = bip;
      setDeferred(bip);
    };
    const onInstalled = () => {
      window.__deferredInstallPrompt = null;
      setDeferred(null);
      setInstalled(true);
      setOpen(false);
    };
    const mq = window.matchMedia("(display-mode: standalone)");
    const onMq = () => setInstalled(isPwaStandalone());

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    mq.addEventListener?.("change", onMq);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener?.("change", onMq);
    };
  }, [installed]);

  if (installed || !deferred) return null;

  const doInstall = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") {
          setInstalled(true);
          setOpen(false);
        }
      } catch {
        /* fallback stays in modal */
      } finally {
        window.__deferredInstallPrompt = null;
        setDeferred(null);
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[11px] font-semibold transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, #c69447, #e5b877)",
          color: "#111318",
          boxShadow: "0 4px 14px hsl(35 55% 52% / 0.35)",
        }}
        aria-label="Baixar aplicativo"
      >
        <Download className="w-3.5 h-3.5" />
        Baixar app
      </button>

      {open &&
        createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ background: "hsl(0 0% 0% / 0.72)", backdropFilter: "blur(8px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-3xl overflow-hidden my-auto max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
            style={{
              background: "linear-gradient(180deg, hsl(220 25% 9%), hsl(220 25% 6%))",
              border: "1px solid hsl(35 55% 52% / 0.3)",
              boxShadow: "0 30px 80px hsl(0 0% 0% / 0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative p-5 pb-4" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #c69447, #e5b877)",
                    boxShadow: "0 8px 24px hsl(35 55% 52% / 0.4)",
                  }}
                >
                  <Smartphone className="w-7 h-7" style={{ color: "#111318" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: "#e5b877" }}>
                    Aplicativo oficial
                  </p>
                  <h3 className="text-lg font-black text-white leading-tight">Baixar GenesisBarber</h3>
                </div>
              </div>

              <p className="mt-3 text-[13px] leading-relaxed text-white/70">
                Instale o app no seu celular e receba <b className="text-white">notificações em tempo real</b> quando
                sua vez estiver chegando — sem precisar ficar atualizando a página.
              </p>
            </div>

            <div className="p-5 space-y-2.5">
              {[
                { icon: Bell, title: "Notificações em segundo plano", desc: "Avisamos quando faltarem 2 clientes" },
                { icon: Zap, title: "Abre instantâneo", desc: "Ícone na tela inicial, igual a um app nativo" },
                { icon: CheckCircle2, title: "Sem loja de apps", desc: "Instala direto do navegador, ocupa quase nada" },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "hsl(35 55% 52% / 0.12)", color: "#e5b877" }}
                  >
                    <f.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white leading-tight">{f.title}</p>
                    <p className="text-[11px] text-white/55 leading-snug">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 pt-1 space-y-3">
              {deferred ? (
                <button
                  onClick={doInstall}
                  className="w-full h-12 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #c69447, #e5b877)",
                    color: "#111318",
                    boxShadow: "0 8px 24px hsl(35 55% 52% / 0.4)",
                  }}
                >
                  <Download className="w-5 h-5" />
                  Baixar agora
                </button>
              ) : isIOS() ? (
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}
                >
                  <p className="text-[12px] font-semibold text-white">Como instalar no iPhone:</p>
                  <ol className="space-y-2 text-[12px] text-white/80">
                    <li className="flex gap-2 items-center">
                      <StepNum n={1} /> Toque em <Share className="w-3.5 h-3.5" style={{ color: "#e5b877" }} />{" "}
                      <b>Compartilhar</b> no Safari
                    </li>
                    <li className="flex gap-2 items-center">
                      <StepNum n={2} /> Escolha <b>Adicionar à Tela de Início</b>{" "}
                      <Plus className="w-3.5 h-3.5" style={{ color: "#e5b877" }} />
                    </li>
                    <li className="flex gap-2 items-center">
                      <StepNum n={3} /> Confirme em <b>Adicionar</b>
                    </li>
                  </ol>
                </div>
              ) : (
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.06)" }}
                >
                  <p className="text-[12px] font-semibold text-white">
                    Como instalar no{" "}
                    {isSamsungBrowser() ? "Samsung Internet" : isFirefox() ? "Firefox" : "Chrome / Edge"}:
                  </p>
                  <ol className="space-y-2 text-[12px] text-white/80">
                    <li className="flex gap-2 items-center">
                      <StepNum n={1} /> Abra o menu <MoreVertical className="w-3.5 h-3.5" style={{ color: "#e5b877" }} />
                    </li>
                    <li className="flex gap-2 items-center">
                      <StepNum n={2} /> Toque em{" "}
                      <b>{isSamsungBrowser() ? "Adicionar página a → Tela inicial" : "Instalar app"}</b>
                    </li>
                    <li className="flex gap-2 items-center">
                      <StepNum n={3} /> Confirme em <b>Instalar</b>
                    </li>
                  </ol>
                </div>
              )}

              <button
                onClick={() => setOpen(false)}
                className="w-full h-10 rounded-xl text-[12px] font-medium text-white/60 hover:text-white transition-colors"
              >
                Talvez depois
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

const StepNum = ({ n }: { n: number }) => (
  <span
    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
    style={{ background: "#c69447", color: "#111318" }}
  >
    {n}
  </span>
);

export default InstallAppButton;
