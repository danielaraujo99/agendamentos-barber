import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { toast } from "sonner";

interface Supplier {
  id: string; name: string; contact: string | null; phone: string | null; email: string | null; notes: string | null; active: boolean;
}

const StoreSuppliers = () => {
  const t = useThemeColors();
  const [items, setItems] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);

  const load = async () => {
    const { data } = await supabase.from("store_suppliers").select("*").order("name");
    setItems((data || []) as Supplier[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name) return;
    if (editing.id) {
      await supabase.from("store_suppliers").update({
        name: editing.name, contact: editing.contact || null, phone: editing.phone || null,
        email: editing.email || null, notes: editing.notes || null, active: editing.active ?? true,
      }).eq("id", editing.id);
    } else {
      await supabase.from("store_suppliers").insert({
        name: editing.name, contact: editing.contact || null, phone: editing.phone || null,
        email: editing.email || null, notes: editing.notes || null,
      });
    }
    toast.success("Fornecedor salvo");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este fornecedor?")) return;
    await supabase.from("store_suppliers").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl sm:text-2xl font-black">Fornecedores</h2>
        <button onClick={() => setEditing({ active: true })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "hsl(245 60% 55%)", color: "white" }}>
          <Plus className="w-4 h-4" /> Novo fornecedor
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 rounded-2xl" style={{ background: t.cardBg, border: `1px solid ${t.border}` }}>
          <Truck className="w-10 h-10 mx-auto opacity-40 mb-3" />
          <p className="text-sm opacity-60">Nenhum fornecedor cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((s) => (
            <div key={s.id} className="rounded-2xl p-4 space-y-2" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{s.name}</h3>
                  {s.contact && <p className="text-xs opacity-70">{s.contact}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(s)} className="p-1.5 rounded-lg hover:bg-white/5"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(s.id)} className="p-1.5 rounded-lg hover:bg-white/5 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {s.phone && <p className="text-xs">📱 {s.phone}</p>}
              {s.email && <p className="text-xs opacity-70">✉ {s.email}</p>}
              {s.notes && <p className="text-xs opacity-60 italic">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-3" style={{ background: t.modalCardBg, border: `1px solid ${t.border}` }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">{editing.id ? "Editar" : "Novo"} fornecedor</h3>
            <input className="glass-input" placeholder="Nome da empresa" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <input className="glass-input" placeholder="Pessoa de contato" value={editing.contact || ""} onChange={(e) => setEditing({ ...editing, contact: e.target.value })} />
            <input className="glass-input" placeholder="Telefone" value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            <input className="glass-input" placeholder="E-mail" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <textarea className="glass-input" rows={3} placeholder="Observações" value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-sm" style={{ background: t.btnGhostBg }}>Cancelar</button>
              <button onClick={save} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "hsl(245 60% 55%)" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreSuppliers;
