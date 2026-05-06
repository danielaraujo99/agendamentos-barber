import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { toast } from "sonner";
import { Save, Settings as SettingsIcon } from "lucide-react";

const FIELDS: { key: string; label: string; placeholder?: string; type?: string }[] = [
  { key: "store_business_name", label: "Nome da loja", placeholder: "Sua Loja" },
  { key: "store_pix_key", label: "Chave PIX" },
  { key: "store_pix_type", label: "Tipo do PIX (cpf/email/phone/random)" },
  { key: "store_whatsapp_number", label: "WhatsApp da loja", placeholder: "5511999999999" },
  { key: "store_delivery_radius", label: "Raio de entrega (km)", type: "number" },
  { key: "store_delivery_fee", label: "Taxa de entrega (R$)", type: "number" },
  { key: "store_min_order", label: "Pedido mínimo (R$)", type: "number" },
  { key: "store_open_hours", label: "Horário de funcionamento", placeholder: "Seg-Sáb 09:00-18:00" },
  { key: "store_address", label: "Endereço da loja" },
];

const StoreSettings = () => {
  const t = useThemeColors();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("store_settings").select("key,value").in("key", FIELDS.map((f) => f.key));
      const map: Record<string, string> = {};
      for (const r of data || []) map[r.key] = r.value || "";
      setValues(map);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    for (const [key, value] of Object.entries(values)) {
      const { data: exist } = await supabase.from("store_settings").select("id").eq("key", key).maybeSingle();
      if (exist) await supabase.from("store_settings").update({ value }).eq("id", exist.id);
      else await supabase.from("store_settings").insert({ key, value });
    }
    toast.success("Configurações salvas");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <SettingsIcon className="w-5 h-5 opacity-60" />
        <h2 className="text-xl sm:text-2xl font-black">Configurações da Loja</h2>
      </div>

      {loading ? (
        <p className="text-sm opacity-60">Carregando...</p>
      ) : (
        <div className="rounded-2xl p-5 space-y-3" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-semibold uppercase tracking-wider opacity-70 block mb-1.5">{f.label}</label>
              <input className="glass-input" type={f.type || "text"} placeholder={f.placeholder}
                value={values[f.key] || ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            </div>
          ))}
          <button onClick={save}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "hsl(280 70% 60%)" }}>
            <Save className="w-4 h-4" /> Salvar configurações
          </button>
        </div>
      )}
    </div>
  );
};

export default StoreSettings;
