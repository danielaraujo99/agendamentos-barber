import { useEffect, useState } from "react";
import { Plus, Boxes, ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { toast } from "sonner";

interface Movement {
  id: string; product_id: string | null; type: "in" | "out" | "adjust";
  qty: number; unit_cost: number | null; reason: string | null; created_at: string;
}
interface Product { id: string; title: string; stock: number | null; }
interface Supplier { id: string; name: string; }

const StoreInventory = () => {
  const t = useThemeColors();
  const [movs, setMovs] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product_id: "", type: "in" as Movement["type"], qty: 1, unit_cost: "", supplier_id: "", reason: "" });

  const load = async () => {
    const [m, p, s] = await Promise.all([
      supabase.from("store_inventory_movements").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("products").select("id,title,stock").eq("active", true).order("title"),
      supabase.from("store_suppliers").select("id,name").eq("active", true).order("name"),
    ]);
    setMovs((m.data || []) as Movement[]);
    setProducts((p.data || []) as Product[]);
    setSuppliers((s.data || []) as Supplier[]);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.product_id || !form.qty) return toast.error("Produto e quantidade são obrigatórios");
    const { error } = await supabase.from("store_inventory_movements").insert({
      product_id: form.product_id,
      type: form.type,
      qty: form.qty,
      unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
      supplier_id: form.supplier_id || null,
      reason: form.reason || null,
    });
    if (error) return toast.error(error.message);

    // ajusta estoque do produto
    const product = products.find((p) => p.id === form.product_id);
    if (product) {
      const cur = product.stock ?? 0;
      const next = form.type === "in" ? cur + form.qty : form.type === "out" ? cur - form.qty : form.qty;
      await supabase.from("products").update({ stock: next }).eq("id", form.product_id);
    }
    toast.success("Movimentação registrada");
    setShowForm(false);
    setForm({ product_id: "", type: "in", qty: 1, unit_cost: "", supplier_id: "", reason: "" });
    load();
  };

  const productName = (id: string | null) => products.find((p) => p.id === id)?.title || "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl sm:text-2xl font-black">Estoque</h2>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "hsl(245 60% 55%)", color: "white" }}>
          <Plus className="w-4 h-4" /> Nova movimentação
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {products.slice(0, 8).map((p) => {
          const stock = p.stock ?? 0;
          const low = stock <= 5;
          return (
            <div key={p.id} className="rounded-xl p-3" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
              <p className="text-xs font-semibold truncate">{p.title}</p>
              <p className={`text-lg font-black ${low ? "text-destructive" : ""}`}>{stock}</p>
              {low && <p className="text-[10px] uppercase tracking-wider opacity-60">estoque baixo</p>}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.border}` }}>
        <div className="p-4" style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
          <h3 className="font-bold flex items-center gap-2"><Boxes className="w-4 h-4" /> Últimas movimentações</h3>
        </div>
        {movs.length === 0 ? (
          <div className="p-8 text-center text-sm opacity-60">Nenhuma movimentação ainda</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: t.cardBgSubtle }}>
                <tr className="text-xs uppercase tracking-wider opacity-60">
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Produto</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-right p-3">Qtd</th>
                  <th className="text-right p-3">Custo Un.</th>
                  <th className="text-left p-3">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {movs.map((m) => (
                  <tr key={m.id} style={{ borderTop: `1px solid ${t.borderSubtle}` }}>
                    <td className="p-3 text-xs opacity-70">{new Date(m.created_at).toLocaleString("pt-BR")}</td>
                    <td className="p-3">{productName(m.product_id)}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{
                          background: m.type === "in" ? "hsl(140 60% 50% / 0.15)" : m.type === "out" ? "hsl(0 70% 55% / 0.15)" : "hsl(40 80% 55% / 0.15)",
                          color: m.type === "in" ? "hsl(140 60% 50%)" : m.type === "out" ? "hsl(0 70% 55%)" : "hsl(40 80% 55%)",
                        }}>
                        {m.type === "in" ? <ArrowDown className="w-3 h-3" /> : m.type === "out" ? <ArrowUp className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
                        {m.type}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold">{m.qty}</td>
                    <td className="p-3 text-right">{m.unit_cost ? `R$ ${Number(m.unit_cost).toFixed(2)}` : "—"}</td>
                    <td className="p-3 text-xs opacity-70">{m.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-3" style={{ background: t.modalCardBg, border: `1px solid ${t.border}` }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Nova movimentação</h3>
            <select className="glass-input" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
              <option value="">Selecione o produto</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.title} (estoque: {p.stock ?? 0})</option>)}
            </select>
            <select className="glass-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
              <option value="in">Entrada</option>
              <option value="out">Saída</option>
              <option value="adjust">Ajuste (definir valor)</option>
            </select>
            <input className="glass-input" type="number" placeholder="Quantidade" value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
            <input className="glass-input" type="number" step="0.01" placeholder="Custo unitário (opcional)" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
            <select className="glass-input" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">Sem fornecedor</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="glass-input" placeholder="Motivo / observação" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm" style={{ background: t.btnGhostBg }}>Cancelar</button>
              <button onClick={save} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "hsl(245 60% 55%)" }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreInventory;
