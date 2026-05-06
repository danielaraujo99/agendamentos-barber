import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { Wallet, TrendingUp, Receipt, DollarSign } from "lucide-react";

interface OrderRow { id: string; total_price: number; status: string; payment_method: string | null; created_at: string; }

const StoreFinance = () => {
  const t = useThemeColors();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("month");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("orders").select("id,total_price,status,payment_method,created_at").order("created_at", { ascending: false }).limit(500);
      setOrders((data || []) as OrderRow[]);
    })();
  }, []);

  const since = (() => {
    const d = new Date();
    if (period === "today") d.setHours(0, 0, 0, 0);
    else if (period === "week") d.setDate(d.getDate() - 7);
    else if (period === "month") d.setMonth(d.getMonth() - 1);
    else return new Date(0);
    return d;
  })();

  const filtered = orders.filter((o) => new Date(o.created_at) >= since);
  const total = filtered.reduce((s, o) => s + Number(o.total_price), 0);
  const paid = filtered.filter((o) => o.status === "delivered" || o.status === "completed");
  const totalPaid = paid.reduce((s, o) => s + Number(o.total_price), 0);
  const pending = filtered.filter((o) => o.status === "pending" || o.status === "processing");
  const totalPending = pending.reduce((s, o) => s + Number(o.total_price), 0);

  const byMethod = filtered.reduce((acc: Record<string, number>, o) => {
    const k = o.payment_method || "outro";
    acc[k] = (acc[k] || 0) + Number(o.total_price);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl sm:text-2xl font-black">Financeiro da Loja</h2>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: t.cardBgSubtle, border: `1px solid ${t.border}` }}>
          {[
            { k: "today", l: "Hoje" }, { k: "week", l: "7 dias" },
            { k: "month", l: "Mês" }, { k: "all", l: "Tudo" },
          ].map((p) => (
            <button key={p.k} onClick={() => setPeriod(p.k as any)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: period === p.k ? "hsl(280 70% 60%)" : "transparent", color: period === p.k ? "white" : t.textSecondary }}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl p-4" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider opacity-60">Total Vendido</span>
            <DollarSign className="w-4 h-4" style={{ color: "hsl(280 70% 60%)" }} />
          </div>
          <p className="text-2xl font-black">R$ {total.toFixed(2)}</p>
          <p className="text-xs opacity-60 mt-1">{filtered.length} pedidos</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider opacity-60">Concluídos</span>
            <TrendingUp className="w-4 h-4" style={{ color: "hsl(140 60% 50%)" }} />
          </div>
          <p className="text-2xl font-black">R$ {totalPaid.toFixed(2)}</p>
          <p className="text-xs opacity-60 mt-1">{paid.length} entregues</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider opacity-60">Em Aberto</span>
            <Receipt className="w-4 h-4" style={{ color: "hsl(40 80% 55%)" }} />
          </div>
          <p className="text-2xl font-black">R$ {totalPending.toFixed(2)}</p>
          <p className="text-xs opacity-60 mt-1">{pending.length} pendentes</p>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow }}>
        <h3 className="font-bold mb-3 flex items-center gap-2"><Wallet className="w-4 h-4" /> Por Método de Pagamento</h3>
        <div className="space-y-2">
          {Object.entries(byMethod).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: t.cardBgSubtle, border: `1px solid ${t.borderSubtle}` }}>
              <span className="text-sm font-semibold uppercase">{k}</span>
              <span className="font-bold">R$ {v.toFixed(2)}</span>
            </div>
          ))}
          {Object.keys(byMethod).length === 0 && <p className="text-sm opacity-60">Nenhum dado no período</p>}
        </div>
      </div>
    </div>
  );
};

export default StoreFinance;
