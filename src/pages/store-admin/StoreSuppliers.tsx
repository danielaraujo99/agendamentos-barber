import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Truck, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useStoreTheme } from "@/contexts/StoreThemeContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Supplier {
  id: string; name: string; contact: string | null; phone: string | null; email: string | null; notes: string | null; active: boolean;
}

const StoreSuppliers = () => {
  const t = useThemeColors();
  const { accent } = useStoreTheme();
  const [items, setItems] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("store_suppliers").select("*").order("name");
    setItems((data || []) as Supplier[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => items.filter((s) => !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contact || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || "").includes(search)),
    [items, search]
  );

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

  const toggleActive = async (s: Supplier) => {
    await supabase.from("store_suppliers").update({ active: !s.active }).eq("id", s.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este fornecedor?")) return;
    await supabase.from("store_suppliers").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-0.5">Cadastro</p>
          <h2 className="text-xl sm:text-2xl font-black text-foreground">Fornecedores</h2>
        </div>
        <button onClick={() => setEditing({ active: true })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg"
          style={{ background: accent }}>
          <Plus className="w-4 h-4" /> Novo fornecedor
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar fornecedor..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-10 h-10 mx-auto opacity-40 mb-3" />
            <p className="text-sm opacity-60">Nenhum fornecedor encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: t.cardBgSubtle }}>
                <tr className="text-xs uppercase tracking-wider opacity-60">
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">Contato</th>
                  <th className="text-left p-3">Telefone</th>
                  <th className="text-left p-3">E-mail</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} style={{ borderTop: `1px solid ${t.borderSubtle}` }} className="hover:bg-foreground/[0.02]">
                    <td className="p-3 font-semibold">{s.name}</td>
                    <td className="p-3 text-xs opacity-80">{s.contact || "—"}</td>
                    <td className="p-3 text-xs">{s.phone || "—"}</td>
                    <td className="p-3 text-xs opacity-70">{s.email || "—"}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => toggleActive(s)}
                        className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{
                          background: s.active ? "hsl(140 60% 45% / 0.15)" : "hsl(0 0% 50% / 0.15)",
                          color: s.active ? "hsl(140 60% 45%)" : "hsl(0 0% 60%)",
                        }}>
                        {s.active ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => setEditing(s)} className="p-1.5 rounded-lg hover:bg-foreground/5"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(s.id)} className="p-1.5 rounded-lg hover:bg-foreground/5 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-3" style={{ background: t.modalCardBg, border: `1px solid ${t.border}` }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">{editing.id ? "Editar" : "Novo"} fornecedor</h3>
            <input className="glass-input" placeholder="Nome da empresa" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <input className="glass-input" placeholder="Pessoa de contato" value={editing.contact || ""} onChange={(e) => setEditing({ ...editing, contact: e.target.value })} />
            <input className="glass-input" placeholder="Telefone" value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            <input className="glass-input" placeholder="E-mail" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <textarea className="glass-input" rows={3} placeholder="Observações" value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-sm" style={{ background: t.btnGhostBg }}>Cancelar</button>
              <button onClick={save} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: accent }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreSuppliers;
