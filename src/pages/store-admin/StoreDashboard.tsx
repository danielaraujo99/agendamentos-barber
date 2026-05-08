import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag, DollarSign, Package, Users, TrendingUp, AlertTriangle, Receipt,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";

const ACCENT = "hsl(var(--store-accent))";
const COLORS = [
  "hsl(var(--store-accent))",
  "hsl(200 70% 50%)",
  "hsl(160 60% 45%)",
  "hsl(280 60% 55%)",
  "hsl(30 70% 50%)",
  "hsl(350 60% 50%)",
];

const StoreDashboard = () => {
  const t = useThemeColors();
  const [stats, setStats] = useState({
    salesToday: 0, salesMonth: 0, ordersToday: 0, ordersMonth: 0,
    customers: 0, products: 0, lowStock: 0, avgTicket: 0,
  });
  const [chartData, setChartData] = useState<{ day: string; pedidos: number; receita: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ title: string; qty: number; revenue: number }[]>([]);
  const [categoryDist, setCategoryDist] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const chartStart = new Date(); chartStart.setDate(chartStart.getDate() - 13); chartStart.setHours(0,0,0,0);

      const [ordRes, prodRes, custRes, itemsRes, ord14Res] = await Promise.all([
        supabase.from("orders").select("id,total_price,created_at,status").gte("created_at", monthStart.toISOString()),
        supabase.from("products").select("id,title,stock,active,category"),
        supabase.from("store_customers").select("id"),
        supabase.from("order_items").select("product_title,product_id,quantity,product_price,created_at").gte("created_at", monthStart.toISOString()),
        supabase.from("orders").select("total_price,created_at").gte("created_at", chartStart.toISOString()),
      ]);

      const orders = ordRes.data || [];
      const ordersToday = orders.filter((o: any) => new Date(o.created_at) >= today);
      const salesMonth = orders.reduce((s: number, o: any) => s + Number(o.total_price || 0), 0);
      const salesToday = ordersToday.reduce((s: number, o: any) => s + Number(o.total_price || 0), 0);
      const products = prodRes.data || [];
      const lowStock = products.filter((p: any) => p.active && (p.stock ?? 0) <= 5).length;

      // chart 14 days
      const chart: { day: string; pedidos: number; receita: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        const dayOrders = (ord14Res.data || []).filter((o: any) => {
          const oc = new Date(o.created_at);
          return oc >= d && oc < next;
        });
        chart.push({
          day: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
          pedidos: dayOrders.length,
          receita: dayOrders.reduce((s: number, o: any) => s + Number(o.total_price || 0), 0),
        });
      }

      // top products
      const map = new Map<string, { title: string; qty: number; revenue: number }>();
      for (const it of itemsRes.data || []) {
        const k = it.product_title;
        const cur = map.get(k) || { title: k, qty: 0, revenue: 0 };
        cur.qty += it.quantity;
        cur.revenue += Number(it.product_price) * it.quantity;
        map.set(k, cur);
      }

      // category distribution from order_items joined to products
      const prodById = new Map(products.map((p: any) => [p.id, p]));
      const catCounts: Record<string, number> = {};
      for (const it of itemsRes.data || []) {
        const p: any = prodById.get(it.product_id);
        const cat = p?.category || "outros";
        catCounts[cat] = (catCounts[cat] || 0) + it.quantity;
      }

      setStats({
        salesToday, salesMonth,
        ordersToday: ordersToday.length, ordersMonth: orders.length,
        customers: (custRes.data || []).length,
        products: products.filter((p: any) => p.active).length,
        lowStock,
        avgTicket: orders.length ? salesMonth / orders.length : 0,
      });
      setChartData(chart);
      setTopProducts(Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
      setCategoryDist(Object.entries(catCounts).map(([name, value]) => ({ name, value })));
      setLoading(false);
    };
    load();

    const channel = supabase.channel("store-dash-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const cards = [
    { label: "Vendas Hoje", value: `R$ ${stats.salesToday.toFixed(2)}`, icon: DollarSign, color: ACCENT },
    { label: "Pedidos Hoje", value: stats.ordersToday, icon: ShoppingBag, color: "hsl(200 70% 50%)" },
    { label: "Vendas no Mês", value: `R$ ${stats.salesMonth.toFixed(2)}`, icon: TrendingUp, color: "hsl(160 60% 45%)" },
    { label: "Pedidos no Mês", value: stats.ordersMonth, icon: Receipt, color: "hsl(40 80% 55%)" },
    { label: "Ticket Médio", value: `R$ ${stats.avgTicket.toFixed(2)}`, icon: DollarSign, color: "hsl(280 60% 55%)" },
    { label: "Clientes", value: stats.customers, icon: Users, color: "hsl(320 60% 55%)" },
    { label: "Produtos Ativos", value: stats.products, icon: Package, color: ACCENT },
    { label: "Estoque Baixo", value: stats.lowStock, icon: AlertTriangle, color: "hsl(0 70% 55%)" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="glass-card p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${c.color.replace(")", " / 0.15)")}`, border: `1px solid ${c.color.replace(")", " / 0.25)")}` }}>
                <c.icon className="w-4 h-4" style={{ color: c.color }} />
              </div>
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{loading ? "—" : c.value}</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Pedidos (14 dias)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradPed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: t.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: t.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 12, color: t.tooltipColor, fontSize: 12 }} />
                <Area type="monotone" dataKey="pedidos" stroke={ACCENT} fill="url(#gradPed)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Receita (14 dias)</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160 60% 45%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(160 60% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: t.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: t.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 12, color: t.tooltipColor, fontSize: 12 }} />
                <Area type="monotone" dataKey="receita" stroke="hsl(160 60% 45%)" fill="url(#gradRec)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top Produtos do Mês</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma venda no mês.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.title} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "hsl(var(--store-accent-soft))", color: ACCENT }}>{i + 1}</span>
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
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por Categoria</h3>
          {categoryDist.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem vendas para análise.</p>
          ) : (
            <div className="space-y-2">
              {categoryDist.sort((a, b) => b.value - a.value).map((item, index) => {
                const total = categoryDist.reduce((s, i) => s + i.value, 0);
                const percent = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-foreground flex-1 truncate capitalize">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.value} ({percent.toFixed(0)}%)</span>
                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: t.cardBgSubtle }}>
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, background: COLORS[index % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default StoreDashboard;
