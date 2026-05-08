import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, Search, User, Users, Crown, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useStoreTheme } from "@/contexts/StoreThemeContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Customer {
  id: string; name: string; phone: string | null; email: string | null;
  total_orders: number; total_spent: number; last_order_at: string | null; notes: string | null;
}

const StoreCustomers = () => {
  const t = useThemeColors();
  const { accent } = useStoreTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Customer> | null>(null);
  const [loading, setLoading] = useState(true);

  // Carrega já existentes primeiro (UI rápida), e dispara sync em background
  const load = async () => {
    const { data } = await supabase.from("store_customers").select("*").order("total_spent", { ascending: false });
    setCustomers((data || []) as Customer[]);
    setLoading(false);
    // sync silencioso
    syncFromOrders();
  };

  const syncFromOrders = async () => {
    const { data: orders } = await supabase.from("orders").select("customer_name,customer_phone,customer_email,total_price,created_at").limit(1000);
    if (!orders) return;
    const map = new Map<string, any>();
    for (const o of orders as any[]) {
      const key = (o.customer_phone || o.customer_email || o.customer_name || "").toLowerCase().trim();
      if (!key) continue;
      const cur = map.get(key) || { name: o.customer_name, phone: o.customer_phone, email: o.customer_email, total_orders: 0, total_spent: 0, last_order_at: null };
      cur.total_orders += 1;
      cur.total_spent += Number(o.total_price || 0);
      if (!cur.last_order_at || o.created_at > cur.last_order_at) cur.last_order_at = o.created_at;
      map.set(key, cur);
    }
    for (const c of map.values()) {
      if (!c.phone && !c.email) continue;
      const filter = c.phone ? `phone.eq.${c.phone}` : `email.eq.${c.email}`;
      const { data: exist } = await supabase.from("store_customers").select("id").or(filter).maybeSingle();
      if (exist) {
        await supabase.from("store_customers").update({
          total_orders: c.total_orders, total_spent: c.total_spent, last_order_at: c.last_order_at, name: c.name,
        }).eq("id", exist.id);
      } else {
        await supabase.from("store_customers").insert(c);
      }
    }
    const { data } = await supabase.from("store_customers").select("*").order("total_spent", { ascending: false });
    setCustomers((data || []) as Customer[]);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const total = customers.length;
    const totalSpent = customers.reduce((s, c) => s + Number(c.total_spent || 0), 0);
    const avg = total ? totalSpent / total : 0;
    const top = [...customers].sort((a, b) => Number(b.total_spent) - Number(a.total_spent))[0];
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
    const novos = customers.filter((c) => c.last_order_at && new Date(c.last_order_at) >= monthAgo).length;
    return { total, avg, top, novos };
  }, [customers]);

  const save = async () => {
    if (!editing?.name) return;
    if (editing.id) {
      await supabase.from("store_customers").update({
        name: editing.name, phone: editing.phone || null, email: editing.email || null, notes: editing.notes || null,
      }).eq("id", editing.id);
    } else {
      await supabase.from("store_customers").insert({
        name: editing.name, phone: editing.phone || null, email: editing.email || null, notes: editing.notes || null,
      });
    }
    toast.success("Cliente salvo");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este cliente?")) return;
    await supabase.from("store_customers").delete().eq("id", id);
    load();
  };

  const filtered = customers.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search) || (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const cards = [
    { label: "Total clientes", value: String(stats.total), icon: Users, color: accent },
    { label: "Ticket médio", value: `R$ ${stats.avg.toFixed(2)}`, icon: TrendingUp, color: "hsl(140 60% 45%)" },
    { label: "Top cliente", value: stats.top?.name?.split(" ")[0] || "—", icon: Crown, color: "hsl(40 90% 55%)" },
    { label: "Ativos no mês", value: String(stats.novos), icon: Calendar, color: "hsl(200 70% 50%)" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-0.5">CRM</p>
          <h2 className="text-xl sm:text-2xl font-black text-foreground">Clientes da loja</h2>
        </div>
        <button onClick={() => setEditing({})}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg"
          style={{ background: accent }}>
          <Plus className="w-4 h-4" /> Novo cliente
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
            <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{loading ? "—" : c.value}</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, telefone ou e-mail..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-10 h-10 mx-auto opacity-40 mb-3" />
            <p className="text-sm opacity-60">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: t.cardBgSubtle }}>
                <tr className="text-xs uppercase tracking-wider opacity-60">
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Contato</th>
                  <th className="text-right p-3">Pedidos</th>
                  <th className="text-right p-3">Total Gasto</th>
                  <th className="text-right p-3">Último Pedido</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const initial = (c.name || "?").trim().charAt(0).toUpperCase();
                  return (
                    <tr key={c.id} style={{ borderTop: `1px solid ${t.borderSubtle}` }} className="hover:bg-foreground/[0.02]">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: accent }}>{initial}</div>
                          <span className="font-semibold">{c.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        {c.phone && <div>{c.phone}</div>}
                        {c.email && <div className="opacity-60">{c.email}</div>}
                      </td>
                      <td className="p-3 text-right">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold"
                          style={{ background: "hsl(var(--store-accent-soft))", color: accent }}>
                          {c.total_orders}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold">R$ {Number(c.total_spent).toFixed(2)}</td>
                      <td className="p-3 text-right text-xs opacity-60">
                        {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg hover:bg-foreground/5"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-foreground/5 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-3" style={{ background: t.modalCardBg, border: `1px solid ${t.border}` }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">{editing.id ? "Editar" : "Novo"} cliente</h3>
            <input className="glass-input" placeholder="Nome" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <input className="glass-input" placeholder="Telefone" value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            <input className="glass-input" placeholder="E-mail" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <textarea className="glass-input" placeholder="Observações" rows={3} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
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

export default StoreCustomers;
