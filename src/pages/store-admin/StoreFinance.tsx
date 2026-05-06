import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { Wallet, TrendingUp, Receipt, DollarSign, ShoppingBag } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";

interface OrderRow { id: string; total_price: number; status: string; payment_method: string | null; created_at: string; }

const ACCENT = "hsl(245 60% 55%)";

const StoreFinance = () => {
  const t = useThemeColors();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("orders")
        .select("id,total_price,status,payment_method,created_at")
        .order("created_at", { ascending: false }).limit(2000);
      setOrders((data || []) as OrderRow[]);
      setLoading(false);
    })();
  }, []);

  const since = useMemo(() => {
    const d = new Date();
    if (period === "today") d.setHours(0, 0, 0, 0);
    else if (period === "week") d.setDate(d.getDate() - 7);
    else if (period === "month") d.setMonth(d.getMonth() - 1);
    else return new Date(0);
    return d;
  }, [period]);

  const filtered = orders.filter((o) => new Date(o.created_at) >= since);
  const total = filtered.reduce((s, o) => s + Number(o.total_price), 0);
  const paid = filtered.filter((o) => ["delivered", "completed", "paid"].includes(o.status));
  const totalPaid = paid.reduce((s, o) => s + Number(o.total_price), 0);
  const pending = filtered.filter((o) => ["pending", "confirmed", "preparing", "delivering"].includes(o.status));
  const totalPending = pending.reduce((s, o) => s + Number(o.total_price), 0);
  const cancelled = filtered.filter((o) => o.status === "cancelled");
  const avgTicket = filtered.length ? total / filtered.length : 0;

  // chart over the period (group by day, max 30 buckets)
  const chartData = useMemo(() => {
    const buckets: Record<string, { day: string; receita: number; pedidos: number }> = {};
    for (const o of filtered) {
      const d = new Date(o.created_at);
      const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets[key]) buckets[key] = { day: key, receita: 0, pedidos: 0 };
      buckets[key].receita += Number(o.total_price);
      buckets[key].pedidos += 1;
    }
    return Object.values(buckets).reverse();
  }, [filtered]);

  const byMethod = filtered.reduce((acc: Record<string, number>, o) => {
    const k = (o.payment_method || "outro").toLowerCase();
    acc[k] = (acc[k] || 0) + Number(o.total_price);
    return acc;
  }, {});

  const cards = [
    { label: "Total Vendido", value: `R$ ${total.toFixed(2)}`, sub: `${filtered.length} pedidos`, icon: DollarSign, color: ACCENT },
    { label: "Concluídos", value: `R$ ${totalPaid.toFixed(2)}`, sub: `${paid.length} entregues`, icon: TrendingUp, color: "hsl(140 60% 45%)" },
    { label: "Em Aberto", value: `R$ ${totalPending.toFixed(2)}`, sub: `${pending.length} pendentes`, icon: Receipt, color: "hsl(40 80% 55%)" },
    { label: "Ticket Médio", value: `R$ ${avgTicket.toFixed(2)}`, sub: `${cancelled.length} cancelados`, icon: ShoppingBag, color: "hsl(200 70% 50%)" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-0.5">Financeiro</p>
          <h2 className="text-xl sm:text-2xl font-black text-foreground">Visão financeira da loja</h2>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: t.cardBgSubtle, border: `1px solid ${t.border}` }}>
          {[
            { k: "today", l: "Hoje" }, { k: "week", l: "7 dias" },
            { k: "month", l: "Mês" }, { k: "all", l: "Tudo" },
          ].map((p) => (
            <button key={p.k} onClick={() => setPeriod(p.k as any)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: period === p.k ? ACCENT : "transparent", color: period === p.k ? "white" : t.textSecondary }}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: c.color.replace(")", " / 0.15)"), border: `1px solid ${c.color.replace(")", " / 0.25)")}` }}>
                <c.icon className="w-4 h-4" style={{ color: c.color }} />
              </div>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{loading ? "—" : c.value}</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{c.label}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{c.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Receita no período</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="storeRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: t.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: t.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 12, color: t.tooltipColor, fontSize: 12 }} />
                <Area type="monotone" dataKey="receita" stroke={ACCENT} fill="url(#storeRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Pedidos no período</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.borderSubtle} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: t.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: t.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 12, color: t.tooltipColor, fontSize: 12 }} />
                <Bar dataKey="pedidos" fill="hsl(200 70% 50%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Wallet className="w-4 h-4" /> Por Método de Pagamento</h3>
        {Object.keys(byMethod).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dado no período</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(byMethod).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
                <span className="text-sm font-semibold uppercase">{k}</span>
                <span className="font-bold" style={{ color: ACCENT }}>R$ {v.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreFinance;
