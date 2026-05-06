import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, DollarSign, Package, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";

const ACCENT = "hsl(280 70% 60%)";

const StoreDashboard = () => {
  const t = useThemeColors();
  const [stats, setStats] = useState({
    salesToday: 0, salesMonth: 0, ordersToday: 0, ordersMonth: 0,
    customers: 0, products: 0, lowStock: 0, avgTicket: 0,
  });
  const [topProducts, setTopProducts] = useState<{ title: string; qty: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [ordRes, prodRes, custRes, itemsRes] = await Promise.all([
        supabase.from("orders").select("id,total_price,created_at,status").gte("created_at", monthStart.toISOString()),
        supabase.from("products").select("id,stock,active"),
        supabase.from("store_customers").select("id"),
        supabase.from("order_items").select("product_title,quantity,product_price,created_at").gte("created_at", monthStart.toISOString()),
      ]);

      const orders = ordRes.data || [];
      const ordersToday = orders.filter((o: any) => new Date(o.created_at) >= today);
      const salesMonth = orders.reduce((s: number, o: any) => s + Number(o.total_price || 0), 0);
      const salesToday = ordersToday.reduce((s: number, o: any) => s + Number(o.total_price || 0), 0);
      const products = prodRes.data || [];
      const lowStock = products.filter((p: any) => p.active && (p.stock ?? 0) <= 5 && (p.stock ?? 0) > 0).length;

      const map = new Map<string, { title: string; qty: number; revenue: number }>();
      for (const it of itemsRes.data || []) {
        const k = it.product_title;
        const cur = map.get(k) || { title: k, qty: 0, revenue: 0 };
        cur.qty += it.quantity;
        cur.revenue += Number(it.product_price) * it.quantity;
        map.set(k, cur);
      }

      setStats({
        salesToday, salesMonth,
        ordersToday: ordersToday.length, ordersMonth: orders.length,
        customers: (custRes.data || []).length,
        products: products.filter((p: any) => p.active).length,
        lowStock,
        avgTicket: orders.length ? salesMonth / orders.length : 0,
      });
      setTopProducts(Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Vendas Hoje", value: `R$ ${stats.salesToday.toFixed(2)}`, icon: DollarSign, color: ACCENT },
    { label: "Vendas no Mês", value: `R$ ${stats.salesMonth.toFixed(2)}`, icon: TrendingUp, color: "hsl(140 60% 50%)" },
    { label: "Pedidos Hoje", value: stats.ordersToday, icon: ShoppingBag, color: "hsl(210 70% 55%)" },
    { label: "Pedidos no Mês", value: stats.ordersMonth, icon: ShoppingBag, color: "hsl(40 80% 55%)" },
    { label: "Ticket Médio", value: `R$ ${stats.avgTicket.toFixed(2)}`, icon: DollarSign, color: "hsl(180 60% 50%)" },
    { label: "Clientes", value: stats.customers, icon: Users, color: "hsl(320 60% 55%)" },
    { label: "Produtos Ativos", value: stats.products, icon: Package, color: ACCENT },
    { label: "Estoque Baixo", value: stats.lowStock, icon: AlertTriangle, color: "hsl(0 70% 55%)" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-1">Visão Geral</p>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight">Dashboard da Loja</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-2xl p-4"
            style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{c.label}</span>
              <c.icon className="w-4 h-4" style={{ color: c.color }} />
            </div>
            <p className="text-xl sm:text-2xl font-black" style={{ color: t.textPrimary }}>
              {loading ? "—" : c.value}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
        <h3 className="text-base font-bold mb-4">Top Produtos do Mês</h3>
        {topProducts.length === 0 ? (
          <p className="text-sm opacity-60">Nenhuma venda no mês ainda.</p>
        ) : (
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={p.title} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: `hsl(280 70% 60% / 0.12)`, color: ACCENT }}>{i + 1}</span>
                  <span className="text-sm font-semibold truncate">{p.title}</span>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  <span className="opacity-60">{p.qty} un.</span>
                  <span className="font-bold">R$ {p.revenue.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreDashboard;
