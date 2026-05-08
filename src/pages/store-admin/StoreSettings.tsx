import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useStoreTheme, type StoreThemeName } from "@/contexts/StoreThemeContext";
import { toast } from "sonner";
import {
  Save, Settings as SettingsIcon, Palette, Store, CreditCard, Truck,
  MessageSquare, Megaphone, Check, Gift, Sparkles, Tag, Percent,
} from "lucide-react";

type FieldType = "text" | "number" | "textarea" | "switch" | "segmented" | "icon";
type Field = {
  key: string;
  label: string;
  hint?: string;
  type?: FieldType;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  options?: { value: string; label: string }[];
  cols?: 1 | 2;
};
type Section = { key: SectionKey; label: string; icon: any; description: string; fields: Field[] };
type SectionKey = "general" | "payment" | "delivery" | "whatsapp" | "promo" | "visual";

const SECTIONS: Section[] = [
  {
    key: "general", label: "Geral", icon: Store,
    description: "Identificação e funcionamento da loja.",
    fields: [
      { key: "store_business_name", label: "Nome da loja", hint: "Aparece no topo, no título da aba e nos pedidos.", placeholder: "Ex.: Sua Loja", cols: 2 },
      { key: "store_address", label: "Endereço completo", placeholder: "Rua, número, bairro, cidade", cols: 2 },
      { key: "store_open_hours", label: "Horário de funcionamento", placeholder: "Seg-Sáb 09:00–18:00" },
      { key: "store_phone", label: "Telefone de contato", placeholder: "(11) 99999-9999" },
    ],
  },
  {
    key: "payment", label: "PIX & Pagamento", icon: CreditCard,
    description: "Configure como seus clientes pagam.",
    fields: [
      { key: "store_pix_key", label: "Chave PIX", hint: "CPF, e-mail, telefone ou chave aleatória.", placeholder: "Sua chave PIX" },
      {
        key: "store_pix_type", label: "Tipo da chave PIX", type: "segmented",
        options: [
          { value: "cpf", label: "CPF" }, { value: "email", label: "E-mail" },
          { value: "phone", label: "Telefone" }, { value: "random", label: "Aleatória" },
        ],
      },
    ],
  },
  {
    key: "delivery", label: "Entrega", icon: Truck,
    description: "Regras de entrega, raio de cobertura e taxas.",
    fields: [
      { key: "store_delivery_radius", label: "Raio de entrega", type: "number", suffix: "km", placeholder: "5" },
      { key: "store_delivery_fee", label: "Taxa de entrega", type: "number", prefix: "R$", placeholder: "0,00" },
      { key: "store_min_order", label: "Pedido mínimo", type: "number", prefix: "R$", placeholder: "0,00" },
      { key: "store_free_shipping_above", label: "Frete grátis acima de", type: "number", prefix: "R$", placeholder: "100,00", hint: "Deixe vazio para desativar." },
    ],
  },
  {
    key: "whatsapp", label: "WhatsApp", icon: MessageSquare,
    description: "Número onde os pedidos chegam no modo WhatsApp.",
    fields: [
      { key: "store_whatsapp_number", label: "WhatsApp da loja", hint: "Use DDI + DDD, sem espaços. Ex.: 5511999999999", placeholder: "5511999999999", cols: 2 },
    ],
  },
  {
    key: "promo", label: "Promoção", icon: Megaphone,
    description: "Modal de boas-vindas exibido ao entrar em /loja.",
    fields: [
      { key: "promo_modal_enabled", label: "Exibir modal de promoção", type: "switch", hint: "Aparece 1x por sessão." },
      { key: "promo_modal_icon", label: "Ícone do modal", type: "icon" },
      { key: "promo_modal_title", label: "Título", placeholder: "Promoção da semana", cols: 2 },
      { key: "promo_modal_subtitle", label: "Descrição", type: "textarea", placeholder: "Frete grátis em compras acima de R$ 99…", cols: 2 },
      { key: "promo_modal_cta", label: "Texto do botão", placeholder: "Aproveitar agora" },
      { key: "promo_modal_coupon", label: "Cupom (opcional)", placeholder: "BEMVINDO10" },
    ],
  },
];

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));
const ICON_OPTIONS = [
  { value: "gift", label: "Presente", Icon: Gift },
  { value: "sparkles", label: "Brilho", Icon: Sparkles },
  { value: "tag", label: "Tag", Icon: Tag },
  { value: "percent", label: "Desconto", Icon: Percent },
];

const StoreSettings = () => {
  const t = useThemeColors();
  const { theme, setTheme, accent } = useStoreTheme();
  const [section, setSection] = useState<SectionKey>("general");
  const [values, setValues] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("store_settings").select("key,value").in("key", ALL_KEYS);
      const map: Record<string, string> = {};
      for (const r of data || []) map[r.key] = r.value || "";
      setValues(map);
      setOriginal(map);
      setLoading(false);
    })();
  }, []);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(original), [values, original]);

  const save = async () => {
    setSaving(true);
    try {
      const changed = Object.entries(values).filter(([k, v]) => (original[k] || "") !== (v || ""));
      // upsert em paralelo, muito mais rápido
      await Promise.all(changed.map(async ([key, value]) => {
        const { data: exist } = await supabase.from("store_settings").select("id").eq("key", key).maybeSingle();
        if (exist) await supabase.from("store_settings").update({ value }).eq("id", exist.id);
        else await supabase.from("store_settings").insert({ key, value });
      }));
      setOriginal({ ...values });
      toast.success(`Configurações salvas (${changed.length} alteração${changed.length === 1 ? "" : "ões"})`);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message || "tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const sidebarItems: Array<{ key: SectionKey; label: string; icon: any }> = [
    ...SECTIONS.map((s) => ({ key: s.key, label: s.label, icon: s.icon })),
    { key: "visual", label: "Visual & Tema", icon: Palette },
  ];
  const current = SECTIONS.find((s) => s.key === section);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header sticky com Salvar */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b sticky top-0 z-10 backdrop-blur-md"
        style={{ borderColor: t.border, background: `${t.surface}cc` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "hsl(var(--store-accent-soft))", border: `1px solid hsl(var(--store-accent-border))` }}>
            <SettingsIcon className="w-5 h-5" style={{ color: accent }} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-foreground leading-tight">Configurações da loja</h2>
            <p className="text-xs text-muted-foreground">Personalize identidade, pagamento, entrega, promoções e tema.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="hidden sm:inline text-[11px] font-semibold px-2 py-1 rounded-full"
            style={{ background: "hsl(40 95% 55% / 0.18)", color: "hsl(40 95% 60%)" }}>Alterações pendentes</span>}
          <button onClick={save} disabled={saving || !dirty}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
            style={{ background: accent }}>
            <Save className="w-4 h-4" /> {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>

      <div className="flex-1 grid gap-5 pt-5 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-[88px] self-start">
          <nav className="rounded-2xl p-2 space-y-0.5"
            style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
            {sidebarItems.map((s) => {
              const isActive = section === s.key;
              return (
                <button key={s.key} onClick={() => setSection(s.key)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left group"
                  style={isActive
                    ? { background: "hsl(var(--store-accent-soft))", color: t.textPrimary, border: `1px solid hsl(var(--store-accent-border))` }
                    : { color: t.textSecondary, border: "1px solid transparent" }}>
                  <s.icon className="w-4 h-4 shrink-0" style={{ color: isActive ? accent : undefined }} />
                  <span className="flex-1 truncate">{s.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Conteúdo */}
        <section className="min-w-0">
          {loading ? (
            <div className="rounded-2xl p-8 text-sm opacity-60"
              style={{ background: t.cardBg, border: `1px solid ${t.border}` }}>Carregando…</div>
          ) : section === "visual" ? (
            <VisualPanel theme={theme} setTheme={setTheme} accent={accent} t={t} />
          ) : (
            <FormPanel section={current!} values={values} setValues={setValues} t={t} accent={accent} />
          )}
        </section>
      </div>
    </div>
  );
};

const FormPanel = ({ section, values, setValues, t, accent }: any) => {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
      {/* Header da seção */}
      <div className="px-6 py-5 border-b" style={{ borderColor: t.border, background: t.cardBgSubtle }}>
        <div className="flex items-center gap-3">
          <section.icon className="w-5 h-5" style={{ color: accent }} />
          <div>
            <h3 className="text-base font-bold text-foreground">{section.label}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
          </div>
        </div>
      </div>

      <div className="p-6 grid gap-5 sm:grid-cols-2">
        {section.fields.map((f: Field) => (
          <FieldRow key={f.key} field={f} value={values[f.key] || ""}
            onChange={(v) => setValues({ ...values, [f.key]: v })} accent={accent} t={t} />
        ))}
      </div>
    </div>
  );
};

const FieldRow = ({ field, value, onChange, accent, t }: any) => {
  const wrapperClass = field.cols === 2 ? "sm:col-span-2" : "sm:col-span-1";

  if (field.type === "switch") {
    const enabled = value === "true";
    return (
      <div className={wrapperClass}>
        <button type="button" onClick={() => onChange(enabled ? "false" : "true")}
          className="w-full flex items-center justify-between gap-4 p-4 rounded-xl transition-all"
          style={{ background: t.cardBgSubtle, border: `1px solid ${t.border}` }}>
          <div className="text-left">
            <div className="text-sm font-semibold text-foreground">{field.label}</div>
            {field.hint && <div className="text-[11px] text-muted-foreground mt-0.5">{field.hint}</div>}
          </div>
          <span className="relative inline-flex h-6 w-11 rounded-full transition-colors shrink-0"
            style={{ background: enabled ? accent : "hsl(var(--muted))" }}>
            <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
              style={{ left: enabled ? "calc(100% - 22px)" : "2px" }} />
          </span>
        </button>
      </div>
    );
  }

  if (field.type === "segmented") {
    return (
      <div className={wrapperClass}>
        <Label field={field} />
        <div className="grid grid-flow-col auto-cols-fr gap-1 p-1 rounded-xl"
          style={{ background: t.cardBgSubtle, border: `1px solid ${t.border}` }}>
          {field.options.map((o: any) => {
            const active = value === o.value;
            return (
              <button key={o.value} type="button" onClick={() => onChange(o.value)}
                className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={active
                  ? { background: accent, color: "white" }
                  : { color: t.textSecondary }}>
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "icon") {
    return (
      <div className={wrapperClass}>
        <Label field={field} />
        <div className="grid grid-cols-4 gap-2">
          {ICON_OPTIONS.map((o) => {
            const active = (value || "gift") === o.value;
            return (
              <button key={o.value} type="button" onClick={() => onChange(o.value)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                style={{
                  background: active ? "hsl(var(--store-accent-soft))" : t.cardBgSubtle,
                  border: `1px solid ${active ? "hsl(var(--store-accent-border))" : t.border}`,
                }}>
                <o.Icon className="w-5 h-5" style={{ color: active ? accent : t.textSecondary }} />
                <span className="text-[10px] font-medium" style={{ color: active ? t.textPrimary : t.textSecondary }}>{o.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className={wrapperClass}>
        <Label field={field} />
        <textarea rows={3} placeholder={field.placeholder} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm resize-none transition-all focus:outline-none"
          style={{ background: t.cardBgSubtle, border: `1px solid ${t.border}`, color: t.textPrimary }} />
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <Label field={field} />
      <div className="relative">
        {field.prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold"
            style={{ color: t.textSecondary }}>{field.prefix}</span>
        )}
        <input type={field.type === "number" ? "number" : "text"} placeholder={field.placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full py-2.5 rounded-xl text-sm transition-all focus:outline-none"
          style={{
            background: t.cardBgSubtle, border: `1px solid ${t.border}`, color: t.textPrimary,
            paddingLeft: field.prefix ? "2.25rem" : "0.875rem",
            paddingRight: field.suffix ? "2.5rem" : "0.875rem",
          }} />
        {field.suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold"
            style={{ color: t.textSecondary }}>{field.suffix}</span>
        )}
      </div>
    </div>
  );
};

const Label = ({ field }: { field: Field }) => (
  <label className="block mb-1.5">
    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{field.label}</span>
    {field.hint && <span className="block text-[11px] text-muted-foreground mt-0.5 normal-case font-normal">{field.hint}</span>}
  </label>
);

const VisualPanel = ({ theme, setTheme, accent, t }: any) => {
  const themes: { key: StoreThemeName; label: string; description: string; colors: string[] }[] = [
    { key: "default", label: "Indigo (padrão)", description: "Identidade clássica do app.", colors: ["#0a0a1a", "#1e1e5a", "#4f46e5", "#a78bfa"] },
    { key: "pink-dark", label: "Rosa Dark", description: "Estética premium para a loja.", colors: ["#0d0d12", "#3a1530", "#e91e63", "#ff7ab8"] },
  ];
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
      <div className="px-6 py-5 border-b" style={{ borderColor: t.border, background: t.cardBgSubtle }}>
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5" style={{ color: accent }} />
          <div>
            <h3 className="text-base font-bold text-foreground">Visual & Tema</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Aplicado em tempo real em /loja para todos os visitantes.</p>
          </div>
        </div>
      </div>
      <div className="p-6 grid sm:grid-cols-2 gap-4">
        {themes.map((opt) => {
          const isActive = theme === opt.key;
          return (
            <button key={opt.key} onClick={() => setTheme(opt.key)}
              className="text-left rounded-2xl p-5 transition-all hover:-translate-y-0.5"
              style={{
                background: t.cardBgSubtle,
                border: isActive ? `2px solid hsl(var(--store-accent))` : `1px solid ${t.border}`,
                boxShadow: isActive ? `0 8px 28px hsl(var(--store-accent) / 0.25)` : undefined,
              }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-foreground">{opt.label}</span>
                {isActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ background: accent }}>
                    <Check className="w-3 h-3" /> Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{opt.description}</p>
              <div className="flex gap-1 rounded-lg overflow-hidden">
                {opt.colors.map((c) => <div key={c} className="h-12 flex-1" style={{ background: c }} />)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StoreSettings;
