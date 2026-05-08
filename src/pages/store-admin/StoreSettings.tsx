import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useStoreTheme, type StoreThemeName } from "@/contexts/StoreThemeContext";
import { toast } from "sonner";
import { Save, Settings as SettingsIcon, Palette, Store, CreditCard, Truck, MessageSquare, Megaphone, Check } from "lucide-react";

type SectionKey = "general" | "payment" | "delivery" | "whatsapp" | "promo" | "visual";

const SECTIONS: { key: SectionKey; label: string; icon: any; fields: { key: string; label: string; placeholder?: string; type?: string; textarea?: boolean }[] }[] = [
  { key: "general", label: "Geral", icon: Store, fields: [
    { key: "store_business_name", label: "Nome da loja", placeholder: "Sua Loja" },
    { key: "store_address", label: "Endereço da loja" },
    { key: "store_open_hours", label: "Horário de funcionamento", placeholder: "Seg-Sáb 09:00-18:00" },
  ]},
  { key: "payment", label: "PIX & Pagamento", icon: CreditCard, fields: [
    { key: "store_pix_key", label: "Chave PIX" },
    { key: "store_pix_type", label: "Tipo do PIX (cpf/email/phone/random)" },
  ]},
  { key: "delivery", label: "Entrega", icon: Truck, fields: [
    { key: "store_delivery_radius", label: "Raio de entrega (km)", type: "number" },
    { key: "store_delivery_fee", label: "Taxa de entrega (R$)", type: "number" },
    { key: "store_min_order", label: "Pedido mínimo (R$)", type: "number" },
  ]},
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, fields: [
    { key: "store_whatsapp_number", label: "WhatsApp da loja", placeholder: "5511999999999" },
  ]},
  { key: "promo", label: "Promoção (modal)", icon: Megaphone, fields: [
    { key: "promo_modal_enabled", label: "Ativar modal (true/false)" },
    { key: "promo_modal_icon", label: "Ícone (gift/sparkles/tag/percent)", placeholder: "gift" },
    { key: "promo_modal_title", label: "Título" },
    { key: "promo_modal_subtitle", label: "Subtítulo", textarea: true },
    { key: "promo_modal_cta", label: "Texto do botão" },
    { key: "promo_modal_coupon", label: "Cupom (opcional)" },
  ]},
];

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

const StoreSettings = () => {
  const t = useThemeColors();
  const { theme, setTheme, accent } = useStoreTheme();
  const [section, setSection] = useState<SectionKey>("general");
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("store_settings").select("key,value").in("key", ALL_KEYS);
      const map: Record<string, string> = {};
      for (const r of data || []) map[r.key] = r.value || "";
      setValues(map);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    for (const [key, value] of Object.entries(values)) {
      const { data: exist } = await supabase.from("store_settings").select("id").eq("key", key).maybeSingle();
      if (exist) await supabase.from("store_settings").update({ value }).eq("id", exist.id);
      else await supabase.from("store_settings").insert({ key, value });
    }
    setSaving(false);
    toast.success("Configurações salvas");
  };

  const current = SECTIONS.find((s) => s.key === section);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 opacity-60" />
          <h2 className="text-xl sm:text-2xl font-black text-foreground">Configurações da Loja</h2>
        </div>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg disabled:opacity-50"
          style={{ background: accent }}>
          <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-4">
        {/* Sidebar interna */}
        <aside className="rounded-2xl p-2 self-start lg:sticky lg:top-2"
          style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
          {[...SECTIONS, { key: "visual" as SectionKey, label: "Visual", icon: Palette, fields: [] }].map((s) => {
            const isActive = section === s.key;
            return (
              <button key={s.key} onClick={() => setSection(s.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                style={isActive
                  ? { background: "hsl(var(--store-accent-soft))", color: t.textPrimary, border: `1px solid hsl(var(--store-accent-border))` }
                  : { color: t.textSecondary, border: "1px solid transparent" }}>
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </aside>

        {/* Conteúdo */}
        <div className="rounded-2xl p-5 sm:p-6" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
          {loading ? (
            <p className="text-sm opacity-60">Carregando...</p>
          ) : section === "visual" ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-foreground mb-1">Tema da loja</h3>
                <p className="text-xs text-muted-foreground">A escolha é aplicada em tempo real em /loja para todos os visitantes.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {([
                  { key: "default" as StoreThemeName, label: "Indigo (padrão)", colors: ["#1e1e5a", "#4f46e5", "#a78bfa", "#0a0a1a"] },
                  { key: "pink-dark" as StoreThemeName, label: "Rosa Dark", colors: ["#0d0d12", "#3a1530", "#e91e63", "#ff7ab8"] },
                ]).map((opt) => {
                  const isActive = theme === opt.key;
                  return (
                    <button key={opt.key} onClick={() => setTheme(opt.key)}
                      className="text-left rounded-2xl p-4 transition-all"
                      style={{
                        background: t.cardBgSubtle,
                        border: isActive ? `2px solid hsl(var(--store-accent))` : `1px solid ${t.border}`,
                      }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold">{opt.label}</span>
                        {isActive && <Check className="w-4 h-4" style={{ color: accent }} />}
                      </div>
                      <div className="flex gap-1">
                        {opt.colors.map((c) => (
                          <div key={c} className="h-10 flex-1 rounded-md" style={{ background: c }} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-2 mb-1">
                {current?.icon && <current.icon className="w-4 h-4 opacity-70" />}
                <h3 className="text-base font-bold text-foreground">{current?.label}</h3>
              </div>
              {current?.fields.map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-semibold uppercase tracking-wider opacity-70 block mb-1.5">{f.label}</label>
                  {f.textarea ? (
                    <textarea className="glass-input" rows={3} placeholder={f.placeholder}
                      value={values[f.key] || ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                  ) : (
                    <input className="glass-input" type={f.type || "text"} placeholder={f.placeholder}
                      value={values[f.key] || ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreSettings;
