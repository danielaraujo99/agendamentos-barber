import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Boxes, ArrowDown, ArrowUp, RotateCcw, Search, AlertTriangle, PackageX, Package, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useStoreTheme } from "@/contexts/StoreThemeContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Movement {
  id: string; product_id: string | null; type: "in" | "out" | "adjust";
  qty: number; unit_cost: number | null; reason: string | null; created_at: string;
}
interface Product { id: string; title: string; stock: number | null; price: number; image_url: string | null; category: string | null; }
interface Supplier { id: string; name: string; }

const StoreInventory = () => {
  const t = useThemeColors();
  const { accent, accentSoft, accentBorder } = useStoreTheme();
  const [movs, setMovs] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ product_id: "", type: "in" as Movement["type"], qty: 1, unit_cost: "", supplier_id: "", reason: "" });

  const load = async () => {
    const [m, p, s] = await Promise.all([
      supabase.from("store_inventory_movements").select("*").order("created_at", { ascending: false }).limit(80),
      supabase.from("products").select("id,title,stock,price,image_url,category").order("title"),
      supabase.from("store_suppliers").select("id,name").eq("active", true).order("name"),
    ]);
    setMovs((m.data || []) as Movement[]);
    setProducts((p.data || []) as Product[]);
    setSuppliers((s.data || []) as Supplier[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const totalSku = products.length;
    const low = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length;
    const out = products.filter((p) => (p.stock ?? 0) <= 0).length;
    const value = products.reduce((s, p) => s + (Number(p.price) || 0) * (p.stock ?? 0), 0);
    return { totalSku, low, out, value };
  }, [products]);

  const filtered = useMemo(
    () => products.filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  const quickAdjust = async (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const cur = product.stock ?? 0;
    const next = Math.max(0, cur + delta);
    await supabase.from("store_inventory_movements").insert({
      product_id: productId,
      type: delta > 0 ? "in" : "out",
      qty: Math.abs(delta),
      reason: "Ajuste rápido",
    });
    await supabase.from("products").update({ stock: next }).eq("id", productId);
    setProducts((arr) => arr.map((x) => (x.id === productId ? { ...x, stock: next } : x)));
    load();
  };

  const save = async () => {
    if (!form.product_id || !form.qty) return toast.error("Produto e quantidade são obrigatórios");
    const { error } = await supabase.from("store_inventory_movements").insert({
      product_id: form.product_id, type: form.type, qty: form.qty,
      unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
      supplier_id: form.supplier_id || null, reason: form.reason || null,
    });
    if (error) return toast.error(error.message);

    const product = products.find((p) => p.id === form.product_id);
    if (product) {
      const cur = product.stock ?? 0;
      const next = form.type === "in" ? cur + form.qty : form.type === "out" ? Math.max(0, cur - form.qty) : form.qty;
      await supabase.from("products").update({ stock: next }).eq("id", form.product_id);
    }
    toast.success("Movimentação registrada");
    setShowForm(false);
    setForm({ product_id: "", type: "in", qty: 1, unit_cost: "", supplier_id: "", reason: "" });
    load();
  };

  const productName = (id: string | null) => products.find((p) => p.id === id)?.title || "—";

  const cards = [
    { label: "Total SKUs", value: String(stats.totalSku), icon: Package, color: accent },
    { label: "Estoque baixo", value: String(stats.low), icon: AlertTriangle, color: "hsl(40 90% 55%)" },
    { label: "Sem estoque", value: String(stats.out), icon: PackageX, color: "hsl(0 70% 55%)" },
    { label: "Valor estimado", value: `R$ ${stats.value.toFixed(2)}`, icon: DollarSign, color: "hsl(140 60% 45%)" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-0.5">Inventário</p>
          <h2 className="text-xl sm:text-2xl font-black text-foreground">Controle de estoque</h2>
        </div>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg"
          style={{ background: accent }}>
          <Plus className="w-4 h-4" /> Nova movimentação
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-2xl p-4" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: c.color.replace(")", " / 0.15)"), border: `1px solid ${c.color.replace(")", " / 0.25)")}` }}>
              <c.icon className="w-4 h-4" style={{ color: c.color }} />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{loading ? "—" : c.value}</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
        <div className="p-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
          <h3 className="font-bold flex items-center gap-2"><Boxes className="w-4 h-4" /> Produtos</h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} />
          </div>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: t.cardBgSubtle }}>
                <tr className="text-xs uppercase tracking-wider opacity-60">
                  <th className="text-left p-3">Produto</th>
                  <th className="text-left p-3">Categoria</th>
                  <th className="text-right p-3">Preço</th>
                  <th className="text-right p-3">Estoque</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const stock = p.stock ?? 0;
                  const status = stock <= 0 ? "sem" : stock <= 5 ? "baixo" : "ok";
                  return (
                    <tr key={p.id} style={{ borderTop: `1px solid ${t.borderSubtle}` }} className="hover:bg-foreground/[0.02]">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {p.image_url
                            ? <img src={p.image_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                            : <div className="w-9 h-9 rounded-lg" style={{ background: t.cardBgSubtle }} />}
                          <span className="font-semibold">{p.title}</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs opacity-70">{p.category || "—"}</td>
                      <td className="p-3 text-right">R$ {Number(p.price).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold">{stock}</td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{
                            background: status === "ok" ? "hsl(140 60% 45% / 0.15)" : status === "baixo" ? "hsl(40 90% 55% / 0.15)" : "hsl(0 70% 55% / 0.15)",
                            color: status === "ok" ? "hsl(140 60% 45%)" : status === "baixo" ? "hsl(40 90% 55%)" : "hsl(0 70% 55%)",
                          }}>
                          {status === "ok" ? "OK" : status === "baixo" ? "Baixo" : "Sem"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => quickAdjust(p.id, -1)} className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-foreground/5"
                            style={{ border: `1px solid ${t.borderSubtle}` }}>−</button>
                          <button onClick={() => quickAdjust(p.id, 1)} className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-white"
                            style={{ background: accent }}>+</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
        <div className="p-4" style={{ borderBottom: `1px solid ${t.borderSubtle}` }}>
          <h3 className="font-bold">Últimas movimentações</h3>
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
                  <th className="text-right p-3">Custo</th>
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
                          background: m.type === "in" ? "hsl(140 60% 45% / 0.15)" : m.type === "out" ? "hsl(0 70% 55% / 0.15)" : "hsl(40 90% 55% / 0.15)",
                          color: m.type === "in" ? "hsl(140 60% 45%)" : m.type === "out" ? "hsl(0 70% 55%)" : "hsl(40 90% 55%)",
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
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
              <button onClick={save} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: accent }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreInventory;
