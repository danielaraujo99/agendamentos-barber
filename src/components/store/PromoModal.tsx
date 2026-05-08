import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Sparkles, Tag, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreTheme } from "@/contexts/StoreThemeContext";

const ICONS: Record<string, any> = { gift: Gift, sparkles: Sparkles, tag: Tag, percent: Percent };
const SESSION_FLAG = "lovable.promoModalShown";

const PromoModal = () => {
  const { accent, accentSoft, accentBorder } = useStoreTheme();
  const [data, setData] = useState<{ enabled: boolean; title: string; subtitle: string; cta: string; coupon: string; icon: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    (async () => {
      const { data: rows } = await supabase
        .from("store_settings").select("key,value")
        .in("key", ["promo_modal_enabled", "promo_modal_title", "promo_modal_subtitle", "promo_modal_cta", "promo_modal_coupon", "promo_modal_icon"]);
      const m: Record<string, string> = {};
      for (const r of rows || []) m[r.key] = r.value || "";
      const enabled = (m.promo_modal_enabled || "").toLowerCase() === "true";
      if (!enabled) return;
      setData({
        enabled,
        title: m.promo_modal_title || "Promoção especial!",
        subtitle: m.promo_modal_subtitle || "Aproveite descontos exclusivos por tempo limitado.",
        cta: m.promo_modal_cta || "Aproveitar agora",
        coupon: m.promo_modal_coupon || "",
        icon: m.promo_modal_icon || "gift",
      });
      setTimeout(() => setOpen(true), 600);
    })();
  }, []);

  const close = () => {
    setOpen(false);
    sessionStorage.setItem(SESSION_FLAG, "1");
  };

  if (!data) return null;
  const Icon = ICONS[data.icon] || Gift;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/70"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 240 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: "hsl(var(--background))",
              border: `1px solid ${accentBorder}`,
              boxShadow: `0 30px 80px -20px ${accentBorder}, 0 0 0 1px hsl(0 0% 100% / 0.04)`,
            }}
          >
            <button onClick={close} aria-label="Fechar"
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-foreground/5 hover:bg-foreground/10 text-foreground/70">
              <X className="w-4 h-4" />
            </button>

            <div className="relative px-8 pt-10 pb-8 text-center">
              <div className="absolute inset-0 pointer-events-none opacity-50"
                style={{ background: `radial-gradient(circle at 50% 0%, ${accentSoft}, transparent 70%)` }} />

              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: "spring", damping: 14, stiffness: 200 }}
                className="relative mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                style={{
                  background: `linear-gradient(135deg, ${accent}, hsl(var(--store-accent-light)))`,
                  boxShadow: `0 18px 40px -10px ${accentBorder}`,
                }}
              >
                <Icon className="w-10 h-10 text-white" strokeWidth={2.2} />
              </motion.div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2 leading-tight">{data.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">{data.subtitle}</p>

              {data.coupon && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-6 font-mono font-bold tracking-widest text-sm"
                  style={{ background: accentSoft, border: `1px dashed ${accentBorder}`, color: accent }}>
                  <Tag className="w-3.5 h-3.5" /> {data.coupon}
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={close}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg"
                style={{ background: accent }}
              >
                {data.cta}
              </motion.button>

              <button onClick={close} className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Continuar para a loja
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PromoModal;
