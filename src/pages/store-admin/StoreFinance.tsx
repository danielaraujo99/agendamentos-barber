import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useStoreTheme } from "@/contexts/StoreThemeContext";
import { Wallet, TrendingUp, Receipt, DollarSign, ShoppingBag } from "lucide-react";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface OrderRow { id: string; total_price: number; status: string; payment_method: string | null; created_at: string; }

const PAY_COLORS = ["hsl(245 60% 55%)", "hsl(140 60% 45%)", "hsl(40 90% 55%)", "hsl(0 70% 55%)", "hsl(200 70% 50%)", "hsl(280 60% 60%)"];

const StoreFinance = () => {
  const t = useThemeColors();
  const { accent } = useStoreTheme();
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

  const filtered = useMemo(() => orders.filter((o) => new Date(o.created_at) >= since), [orders, since]);
  const total = filtered.reduce((s, o) => s + Number(o.total_price), 0);
  const paid = filtered.filter((o) => ["delivered", "completed", "paid"].includes(o.status));
  const totalPaid = paid.reduce((s, o) => s + Number(o.total_price), 0);
  const pending = filtered.filter((o) => ["pending", "confirmed", "preparing", "delivering"].includes(o.status));
  const totalPending = pending.reduce((s, o) => s + Number(o.total_price), 0);
  const cancelled = filtered.filter((o) => o.status === "cancelled");
  const avgTicket = filtered.length ? total / filtered.length : 0;

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

  const byMethod = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const o of filtered) {
      const k = (o.payment_method || "outro").toLowerCase();
      acc[k] = (acc[k] || 0) + Number(o.total_price);
    }
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const topDays = useMemo(() => [...chartData].sort((a, b) => b.receita - a.receita).slice(0, 5), [chartData]);

  const cards = [
    { label: "Total Vendido", value: `R$ ${total.toFixed(2)}`, sub: `${filtered.length} pedidos`, icon: DollarSign, color: accent },
    { label: "Concluídos", value: `R$ ${totalPaid.toFixed(2)}`, sub: `${paid.length} entregues`, icon: TrendingUp, color: "hsl(140 60% 45%)" },
    { label: "Em Aberto", value: `R$ ${totalPending.toFixed(2)}`, sub: `${pending.length} pendentes`, icon: Receipt, color: "hsl(40 90% 55%)" },
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
              style={{ background: period === p.k ? accent : "transparent", color: period === p.k ? "white" : t.textSecondary }}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-4 sm:p-5" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
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

      <div className="grid lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Receita & pedidos no período</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="storeRevA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={t.borderSubtle} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: t.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" tick={{ fill: t.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="p" orientation="right" tick={{ fill: t.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 12, color: t.tooltipColor, fontSize: 12 }} />
                <Area yAxisId="r" type="monotone" dataKey="receita" stroke={accent} strokeWidth={2.5} fill="url(#storeRevA)" />
                <Bar yAxisId="p" dataKey="pedidos" fill="hsl(200 70% 50% / 0.7)" radius={[6, 6, 0, 0]} barSize={14} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Por método
          </h3>
          {byMethod.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Sem dados</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byMethod} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {byMethod.map((_, i) => <Cell key={i} fill={PAY_COLORS[i % PAY_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 12, color: t.tooltipColor, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: t.textSecondary }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 dias do período</h3>
        {topDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados</p>
        ) : (
          <div className="grid sm:grid-cols-5 gap-2">
            {topDays.map((d, i) => (
              <div key={d.day} className="rounded-xl p-3" style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">#{i + 1} • {d.day}</p>
                <p className="text-base font-bold mt-1" style={{ color: accent }}>R$ {d.receita.toFixed(2)}</p>
                <p className="text-[10px] opacity-60">{d.pedidos} pedidos</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreFinance;
