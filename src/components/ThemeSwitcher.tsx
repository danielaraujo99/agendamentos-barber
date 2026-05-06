import { useState } from "react";
import { Palette, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useUserTheme } from "@/contexts/UserThemeContext";

const ThemeSwitcher = () => {
  const { theme, setTheme, themes } = useUserTheme();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Hide on admin routes — admin uses tenant config
  if (location.pathname.includes("/admin")) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Trocar tema"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          color: "hsl(var(--foreground))",
          boxShadow: "0 8px 24px hsl(0 0% 0% / 0.25)",
        }}
      >
        <Palette className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80]"
              style={{ background: "hsl(0 0% 0% / 0.5)", backdropFilter: "blur(4px)" }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="fixed z-[90] left-1/2 -translate-x-1/2 bottom-4 sm:bottom-20 sm:right-4 sm:left-auto sm:translate-x-0 w-[min(92vw,360px)] rounded-2xl p-4"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                boxShadow: "0 24px 60px hsl(0 0% 0% / 0.35)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
                    Estúdio de Temas
                  </h3>
                  <p className="text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Personalize a aparência
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg"
                  style={{ background: "hsl(var(--muted))" }}
                >
                  <X className="w-4 h-4" style={{ color: "hsl(var(--muted-foreground))" }} />
                </button>
              </div>

              <div className="space-y-2">
                {themes.map((t) => {
                  const active = t.id === theme;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id);
                        setTimeout(() => setOpen(false), 280);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] text-left"
                      style={{
                        background: active ? "hsl(var(--muted))" : "transparent",
                        border: `1px solid ${active ? "hsl(var(--brand) / 0.4)" : "hsl(var(--border))"}`,
                      }}
                    >
                      <div className="flex gap-1 shrink-0">
                        {t.preview.map((c, i) => (
                          <div
                            key={i}
                            className="w-6 h-10 rounded-md"
                            style={{ background: c, border: "1px solid hsl(0 0% 0% / 0.08)" }}
                          />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                          {t.name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {t.description}
                        </p>
                      </div>
                      {active && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "hsl(var(--brand))", color: "hsl(var(--brand-foreground))" }}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-[10px] text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
                Sua escolha é salva neste dispositivo
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ThemeSwitcher;
