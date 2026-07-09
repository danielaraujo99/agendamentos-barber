import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Bell, Play, CheckCircle2, XCircle, UserX, Loader2, Trash2, Phone, MessageSquare, Clock,
  Settings as SettingsIcon, X, DoorOpen, DoorClosed, Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type WaitStatus = "waiting" | "calling" | "in_service" | "done" | "cancelled" | "no_show";

interface Entry {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string | null;
  service_name: string | null;
  notes: string | null;
  status: WaitStatus;
  called_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

const formatWait = (createdAt: string) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? `${m}m` : ""}`;
};

const statusBadge: Record<WaitStatus, string> = {
  waiting: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  calling: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 animate-pulse",
  in_service: "bg-sky-500/10 border-sky-500/30 text-sky-300",
  done: "bg-white/5 border-white/10 text-white/50",
  cancelled: "bg-red-500/10 border-red-500/30 text-red-300",
  no_show: "bg-orange-500/10 border-orange-500/30 text-orange-300",
};

const statusLabel: Record<WaitStatus, string> = {
  waiting: "Aguardando",
  calling: "Chamando",
  in_service: "Atendendo",
  done: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou",
};

const sendPush = async (user_ids: string[], title: string, body: string) => {
  if (!user_ids.length) return;
  try {
    await supabase.functions.invoke("send-push", { body: { user_ids, title, body, link: "/fila", tag: "queue" } });
  } catch (e) { console.error("push", e); }
};

const AdminFila = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [history, setHistory] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [form, setForm] = useState({
    site_status: "ativo",
    queue_info_message: "",
    queue_closed_message: "",
    queue_how_to_use: "",
  });

  const fetchAll = async () => {
    const { data: activeData } = await supabase
      .from("waitlist_entries")
      .select("*")
      .in("status", ["waiting", "calling", "in_service"])
      .order("created_at", { ascending: true });
    const { data: histData } = await supabase
      .from("waitlist_entries")
      .select("*")
      .in("status", ["done", "cancelled", "no_show"])
      .order("updated_at" as any, { ascending: false })
      .limit(20);
    setEntries((activeData || []) as Entry[]);
    setHistory((histData || []) as Entry[]);
    setLoading(false);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("business_settings").select("key,value");
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => { map[r.key] = r.value || ""; });
    setSettings(map);
    setForm({
      site_status: map.site_status || "ativo",
      queue_info_message: map.queue_info_message || "",
      queue_closed_message: map.queue_closed_message || "",
      queue_how_to_use: map.queue_how_to_use || "",
    });
  };

  useEffect(() => {
    fetchAll();
    fetchSettings();
    const ch = supabase
      .channel("waitlist-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist_entries" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(t);
  }, []);
  void tick;

  const waiting = useMemo(() => entries.filter((e) => e.status === "waiting"), [entries]);
  const active = useMemo(() => entries.filter((e) => e.status === "calling" || e.status === "in_service"), [entries]);
  const nextEntry = waiting[0];
  const isOpen = (settings.site_status || "ativo") !== "inativo";

  const updateStatus = async (id: string, patch: Partial<Entry>) => {
    const { error } = await supabase.from("waitlist_entries").update(patch).eq("id", id);
    if (error) toast.error("Erro ao atualizar.");
  };

  const callEntry = async (e: Entry) => {
    await updateStatus(e.id, { status: "calling", called_at: new Date().toISOString() });
    sendPush([e.user_id], "É a sua vez! 💈", `${e.user_name.split(" ")[0]}, o barbeiro está te chamando.`);
    // avisa o próximo depois dele também
    const idx = waiting.findIndex((w) => w.id === e.id);
    const after = waiting[idx + 1];
    if (after) sendPush([after.user_id], "Você é o próximo", "Prepare-se, sua vez está chegando.");
    toast.success(`Chamando ${e.user_name}`);
  };

  const callNext = () => {
    if (!nextEntry) return toast.info("Fila vazia.");
    callEntry(nextEntry);
  };

  const startService = (e: Entry) =>
    updateStatus(e.id, { status: "in_service", started_at: new Date().toISOString() });

  const finish = (e: Entry) =>
    updateStatus(e.id, { status: "done", finished_at: new Date().toISOString() });

  const markNoShow = (e: Entry) =>
    updateStatus(e.id, { status: "no_show", finished_at: new Date().toISOString() });

  const cancel = (e: Entry) =>
    updateStatus(e.id, { status: "cancelled", finished_at: new Date().toISOString() });

  const remove = async (id: string) => {
    if (!confirm("Remover esta entrada permanentemente?")) return;
    const { error } = await supabase.from("waitlist_entries").delete().eq("id", id);
    if (error) toast.error("Erro ao remover.");
    else toast.success("Removido.");
  };

  const openWhats = (phone: string | null) => {
    if (!phone) return toast.info("Sem telefone cadastrado.");
    const digits = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${digits}?text=${encodeURIComponent("Sua vez chegou na barbearia! 💈")}`, "_blank");
  };

  const toggleOpen = async () => {
    const next = isOpen ? "inativo" : "ativo";
    const { error } = await supabase.from("business_settings").upsert({ key: "site_status", value: next }, { onConflict: "key" });
    if (error) return toast.error("Erro ao alternar status.");
    setSettings((s) => ({ ...s, site_status: next }));
    toast.success(next === "ativo" ? "Barbearia aberta." : "Barbearia fechada.");
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const rows = Object.entries(form).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from("business_settings").upsert(rows, { onConflict: "key" });
    setSavingSettings(false);
    if (error) return toast.error("Erro ao salvar.");
    toast.success("Configurações salvas.");
    setSettings((s) => ({ ...s, ...form }));
    setSettingsOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto text-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            Fila de espera
          </h1>
          <p className="text-sm text-white/60 mt-1">
            A fila avança automaticamente. Ao concluir/cancelar, o próximo é chamado sozinho.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleOpen}
            className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold border transition-colors ${
              isOpen
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                : "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15"
            }`}
          >
            {isOpen ? <DoorOpen className="w-4 h-4" /> : <DoorClosed className="w-4 h-4" />}
            {isOpen ? "Barbearia aberta" : "Barbearia fechada"}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-medium border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/80 transition-colors"
          >
            <SettingsIcon className="w-4 h-4" /> Configurações
          </button>
          <button
            onClick={callNext}
            disabled={!nextEntry}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl font-semibold text-black bg-gradient-to-br from-amber-300 to-amber-500 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 transition-all"
          >
            <Bell className="w-4 h-4" />
            Chamar próximo {nextEntry ? `(${nextEntry.user_name.split(" ")[0]})` : ""}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Aguardando", value: waiting.length, color: "text-amber-400" },
          { label: "Em atendimento", value: active.length, color: "text-sky-400" },
          { label: "Total ativos", value: entries.length, color: "text-white" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-[11px] uppercase tracking-wider text-white/40">{k.label}</div>
            <div className={`text-3xl font-bold tabular-nums mt-1 ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Ativos */}
      {active.length > 0 && (
        <div className="mb-6">
          <div className="text-[11px] uppercase tracking-wider text-white/40 px-1 mb-2">
            Agora ({active.length})
          </div>
          <div className="space-y-2">
            {active.map((e) => (
              <div key={e.id} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{e.user_name}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusBadge[e.status]}`}>
                      {statusLabel[e.status]}
                    </span>
                  </div>
                  {e.service_name && <div className="text-xs text-white/50 mt-0.5">{e.service_name}</div>}
                  {e.notes && <div className="text-xs text-white/40 mt-0.5 italic">"{e.notes}"</div>}
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {e.status === "calling" && (
                    <>
                      <button onClick={() => openWhats(e.user_phone)} className="btn-mini">
                        <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                      </button>
                      <button onClick={() => startService(e)} className="btn-mini-primary">
                        <Play className="w-3.5 h-3.5" /> Iniciar
                      </button>
                      <button onClick={() => markNoShow(e)} className="btn-mini-danger">
                        <UserX className="w-3.5 h-3.5" /> Faltou
                      </button>
                    </>
                  )}
                  {e.status === "in_service" && (
                    <button onClick={() => finish(e)} className="btn-mini-primary">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Concluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aguardando */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-white/40 px-1 mb-2">
          Aguardando ({waiting.length})
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/40" /></div>
        ) : waiting.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-white/40 text-sm">
            Nenhum cliente aguardando.
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {waiting.map((e, i) => (
                <motion.div key={e.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold tabular-nums bg-white/5 border border-white/10">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{e.user_name}</div>
                    <div className="text-xs text-white/50 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      {e.service_name && <span>{e.service_name}</span>}
                      {e.user_phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{e.user_phone}</span>}
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{formatWait(e.created_at)}</span>
                    </div>
                    {e.notes && <div className="text-xs text-white/40 mt-1 italic">"{e.notes}"</div>}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button onClick={() => callEntry(e)} className="btn-mini-primary">
                      <Bell className="w-3.5 h-3.5" /> Chamar
                    </button>
                    <button onClick={() => cancel(e)} className="btn-mini-danger">
                      <XCircle className="w-3.5 h-3.5" /> Cancelar
                    </button>
                    <button onClick={() => remove(e.id)} className="btn-mini text-red-300/70 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Histórico */}
      {history.length > 0 && (
        <div className="mt-8">
          <div className="text-[11px] uppercase tracking-wider text-white/40 px-1 mb-2">Histórico recente</div>
          <div className="space-y-1">
            {history.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl px-3 py-2 border border-white/5 bg-white/[0.01] text-sm">
                <div className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{e.user_name}</span>
                  {e.service_name && <span className="text-white/40"> • {e.service_name}</span>}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadge[e.status]}`}>
                  {statusLabel[e.status]}
                </span>
                <button onClick={() => remove(e.id)} className="text-white/30 hover:text-red-300 transition-colors" title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings modal */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md"
            onClick={() => !savingSettings && setSettingsOpen(false)}>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg bg-[hsl(220_25%_6%)] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">
              <div className="flex items-center justify-between px-5 h-14 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4 text-amber-300" />
                  <div className="text-sm font-bold">Configurações da fila</div>
                </div>
                <button onClick={() => setSettingsOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-5">
                {/* Toggle */}
                <div className="flex items-center justify-between gap-3 rounded-2xl p-4 border border-white/10 bg-white/[0.02]">
                  <div>
                    <div className="text-sm font-bold">Status da barbearia</div>
                    <div className="text-xs text-white/50 mt-0.5">Quando fechada, novos clientes não conseguem entrar na fila.</div>
                  </div>
                  <button
                    onClick={() => setForm((f) => ({ ...f, site_status: f.site_status === "ativo" ? "inativo" : "ativo" }))}
                    className={`shrink-0 h-9 px-4 rounded-lg text-xs font-bold border transition-colors ${
                      form.site_status === "ativo"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : "border-red-500/30 bg-red-500/10 text-red-200"
                    }`}
                  >
                    {form.site_status === "ativo" ? "Aberta" : "Fechada"}
                  </button>
                </div>

                <Field label="Mensagem informativa (aparece sempre na tela de fila)"
                  hint="Ex: Fila on-line disponível apenas quando estiver atendendo na barbearia.">
                  <textarea rows={3} value={form.queue_info_message}
                    onChange={(e) => setForm({ ...form, queue_info_message: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-400/50 focus:outline-none text-sm resize-none" />
                </Field>

                <Field label="Mensagem quando fechado"
                  hint="Aparece apenas quando a barbearia está com status Fechada.">
                  <textarea rows={3} value={form.queue_closed_message}
                    onChange={(e) => setForm({ ...form, queue_closed_message: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-400/50 focus:outline-none text-sm resize-none" />
                </Field>

                <Field label="Como usar esta página"
                  hint="Texto explicativo que aparece expansível para os clientes.">
                  <textarea rows={4} value={form.queue_how_to_use}
                    onChange={(e) => setForm({ ...form, queue_how_to_use: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-400/50 focus:outline-none text-sm resize-none" />
                </Field>
              </div>

              <div className="p-5 border-t border-white/5">
                <button onClick={saveSettings} disabled={savingSettings}
                  className="w-full h-12 rounded-xl font-bold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><Save className="w-4 h-4" /> Salvar configurações</>)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .btn-mini { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.75rem; border-radius: 0.6rem; font-size: 12px; font-weight: 500; background: hsl(0 0% 100% / 0.04); border: 1px solid hsl(0 0% 100% / 0.1); color: hsl(0 0% 100% / 0.7); transition: all 150ms; }
        .btn-mini:hover { background: hsl(0 0% 100% / 0.08); color: white; }
        .btn-mini-primary { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.85rem; border-radius: 0.6rem; font-size: 12px; font-weight: 600; color: #000; background: linear-gradient(135deg, hsl(38 92% 65%), hsl(38 92% 55%)); transition: all 150ms; }
        .btn-mini-primary:hover { filter: brightness(1.1); }
        .btn-mini-danger { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.75rem; border-radius: 0.6rem; font-size: 12px; font-weight: 500; background: hsl(0 70% 55% / 0.1); border: 1px solid hsl(0 70% 55% / 0.3); color: hsl(0 90% 75%); transition: all 150ms; }
        .btn-mini-danger:hover { background: hsl(0 70% 55% / 0.2); }
      `}</style>
    </div>
  );
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <label className="text-[12px] font-semibold text-white/80 block mb-1.5">{label}</label>
    {hint && <div className="text-[11px] text-white/40 mb-2">{hint}</div>}
    {children}
  </div>
);

export default AdminFila;
