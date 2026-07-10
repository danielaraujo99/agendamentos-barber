import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Bell, Play, CheckCircle2, XCircle, UserX, Loader2, Trash2, MessageSquare, Clock,
  Settings as SettingsIcon, X, DoorOpen, DoorClosed, Save, Phone, Timer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useThemeColors } from "@/hooks/useThemeColors";


type WaitStatus = "waiting" | "calling" | "in_service" | "done" | "cancelled" | "no_show";

interface Entry {
  id: string; user_id: string; user_name: string; user_phone: string | null;
  service_name: string | null; notes: string | null; status: WaitStatus;
  called_at: string | null; started_at: string | null; finished_at: string | null;
  created_at: string;
}

const ACCENT = "hsl(245 60% 55%)";
const ACCENT_LIGHT = "hsl(245 60% 70%)";
const ACCENT_SOFT = "hsl(245 60% 55% / 0.10)";
const ACCENT_BORDER = "hsl(245 60% 55% / 0.25)";

const formatWait = (createdAt: string) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60); const m = mins % 60;
  return `${h}h${m ? `${m}m` : ""}`;
};

const statusLabel: Record<WaitStatus, string> = {
  waiting: "Aguardando", calling: "Chamando", in_service: "Atendendo",
  done: "Concluído", cancelled: "Cancelado", no_show: "Faltou",
};

const statusTone: Record<WaitStatus, { bg: string; text: string; border: string }> = {
  waiting: { bg: "hsl(43 90% 55% / 0.08)", text: "hsl(43 90% 70%)", border: "hsl(43 90% 55% / 0.25)" },
  calling: { bg: "hsl(142 65% 45% / 0.10)", text: "hsl(142 65% 65%)", border: "hsl(142 65% 45% / 0.30)" },
  in_service: { bg: "hsl(200 85% 55% / 0.08)", text: "hsl(200 85% 70%)", border: "hsl(200 85% 55% / 0.25)" },
  done: { bg: "hsl(0 0% 100% / 0.04)", text: "hsl(0 0% 60%)", border: "hsl(0 0% 100% / 0.08)" },
  cancelled: { bg: "hsl(0 70% 55% / 0.08)", text: "hsl(0 80% 72%)", border: "hsl(0 70% 55% / 0.25)" },
  no_show: { bg: "hsl(25 90% 55% / 0.08)", text: "hsl(25 90% 70%)", border: "hsl(25 90% 55% / 0.25)" },
};

const sendPush = async (user_ids: string[], title: string, body: string) => {
  if (!user_ids.length) return;
  try {
    await supabase.functions.invoke("send-push", { body: { user_ids, title, body, link: "/fila", tag: "queue" } });
  } catch (e) { console.error("push", e); }
};

const AdminFila = () => {
  const t = useThemeColors();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [history, setHistory] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

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
      .from("waitlist_entries").select("*")
      .in("status", ["waiting", "calling", "in_service"])
      .order("created_at", { ascending: true });
    const { data: histData } = await supabase
      .from("waitlist_entries").select("*")
      .in("status", ["done", "cancelled", "no_show"])
      .order("updated_at" as any, { ascending: false }).limit(20);
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
    fetchAll(); fetchSettings();
    const ch = supabase.channel("waitlist-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist_entries" }, () => fetchAll())
      .subscribe();
    const cs = supabase.channel("settings-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "business_settings" }, () => fetchSettings())
      .subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(cs); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const waiting = useMemo(() => entries.filter((e) => e.status === "waiting"), [entries]);
  const active = useMemo(() => entries.filter((e) => e.status === "calling" || e.status === "in_service"), [entries]);
  const nextEntry = waiting[0];
  const isOpen = (settings.site_status || "ativo") !== "inativo";

  const update = async (id: string, patch: Partial<Entry>) => {
    const { error } = await supabase.from("waitlist_entries").update(patch).eq("id", id);
    if (error) toast.error("Erro ao atualizar.");
  };

  const callEntry = async (e: Entry) => {
    await update(e.id, { status: "calling", called_at: new Date().toISOString() });
    sendPush([e.user_id], "É a sua vez!", `${e.user_name.split(" ")[0]}, o barbeiro está te chamando.`);
    const idx = waiting.findIndex((w) => w.id === e.id);
    const after = waiting[idx + 1];
    if (after) sendPush([after.user_id], "Você é o próximo", "Prepare-se, sua vez está chegando.");
    toast.success(`Chamando ${e.user_name}`);
  };
  const callNext = () => nextEntry ? callEntry(nextEntry) : toast.info("Fila vazia.");
  const startService = (e: Entry) => update(e.id, { status: "in_service", started_at: new Date().toISOString() });
  const finish = (e: Entry) => update(e.id, { status: "done", finished_at: new Date().toISOString() });
  const markNoShow = (e: Entry) => update(e.id, { status: "no_show", finished_at: new Date().toISOString() });
  const cancel = (e: Entry) => update(e.id, { status: "cancelled", finished_at: new Date().toISOString() });
  const remove = async (id: string) => {
    if (!confirm("Remover permanentemente?")) return;
    const { error } = await supabase.from("waitlist_entries").delete().eq("id", id);
    if (error) toast.error("Erro ao remover."); else toast.success("Removido.");
  };
  const openWhats = (phone: string | null) => {
    if (!phone) return toast.info("Sem telefone.");
    window.open(`https://wa.me/55${phone.replace(/\D/g, "")}?text=${encodeURIComponent("Sua vez chegou! 💈")}`, "_blank");
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

  const surface = { background: "hsl(0 0% 100% / 0.02)", border: `1px solid ${t.border}` };
  const surfaceStrong = { background: "hsl(0 0% 100% / 0.03)", border: `1px solid ${t.border}` };

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="grid grid-cols-1 sm:grid-cols-[auto_auto_1fr] gap-2">
        <div className="grid grid-cols-2 sm:contents gap-2">
          <button
            onClick={toggleOpen}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: isOpen ? "hsl(142 65% 45% / 0.10)" : "hsl(0 70% 55% / 0.10)",
              color: isOpen ? "hsl(142 65% 65%)" : "hsl(0 80% 72%)",
              border: `1px solid ${isOpen ? "hsl(142 65% 45% / 0.30)" : "hsl(0 70% 55% / 0.25)"}`,
            }}
          >
            {isOpen ? <DoorOpen className="w-4 h-4" /> : <DoorClosed className="w-4 h-4" />}
            <span className="truncate">{isOpen ? "Aberta" : "Fechada"}</span>
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            style={surfaceStrong}
          >
            <SettingsIcon className="w-4 h-4" /> <span className="truncate">Configurações</span>
          </button>
        </div>

        <button
          onClick={callNext}
          disabled={!nextEntry}
          className="sm:justify-self-end w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:brightness-110"
          style={{ background: ACCENT, boxShadow: `0 6px 20px -8px ${ACCENT}` }}
        >
          <Bell className="w-4 h-4" />
          <span className="truncate">Chamar próximo{nextEntry ? ` · ${nextEntry.user_name.split(" ")[0]}` : ""}</span>
        </button>
      </div>


      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Aguardando", value: waiting.length, color: "hsl(43 90% 65%)" },
          { label: "Em atendimento", value: active.length, color: "hsl(200 85% 70%)" },
          { label: "Total ativos", value: entries.length, color: "hsl(0 0% 95%)" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl p-4" style={surface}>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</div>
            <div className="text-2xl sm:text-3xl font-bold tabular-nums mt-1" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Ativos */}
      {active.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-1 mb-2">
            Agora ({active.length})
          </div>
          <div className="space-y-2">
            {active.map((e) => (
              <div key={e.id} className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                style={{ background: "hsl(142 65% 45% / 0.04)", border: "1px solid hsl(142 65% 45% / 0.20)" }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{e.user_name}</span>
                    <StatusBadge status={e.status} />
                  </div>
                  {e.service_name && <div className="text-xs text-muted-foreground mt-0.5">{e.service_name}</div>}
                  {e.notes && <div className="text-xs text-muted-foreground/70 mt-0.5 italic">"{e.notes}"</div>}
                </div>
                <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:justify-end">
                  {e.status === "calling" && (
                    <>
                      <MiniBtn onClick={() => openWhats(e.user_phone)}><MessageSquare className="w-3.5 h-3.5" /> WhatsApp</MiniBtn>
                      <MiniBtn primary onClick={() => startService(e)}><Play className="w-3.5 h-3.5" /> Iniciar</MiniBtn>
                      <MiniBtn danger onClick={() => markNoShow(e)}><UserX className="w-3.5 h-3.5" /> Faltou</MiniBtn>
                    </>
                  )}
                  {e.status === "in_service" && (
                    <MiniBtn primary onClick={() => finish(e)} full><CheckCircle2 className="w-3.5 h-3.5" /> Concluir atendimento</MiniBtn>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aguardando */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-1 mb-2">
          Aguardando ({waiting.length})
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : waiting.length === 0 ? (
          <div className="rounded-2xl py-10 text-center text-sm text-muted-foreground"
            style={{ border: `1px dashed ${t.border}` }}>
            Nenhum cliente aguardando.
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {waiting.map((e, i) => (
                <motion.div key={e.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={surface}>
                  <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold tabular-nums text-sm"
                    style={i === 0 ? { background: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_LIGHT }
                                   : { background: "hsl(0 0% 100% / 0.04)", border: `1px solid ${t.border}`, color: "hsl(0 0% 75%)" }}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate text-foreground">{e.user_name}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      {e.service_name && <span>{e.service_name}</span>}
                      {e.user_phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{e.user_phone}</span>}
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{formatWait(e.created_at)}</span>
                    </div>
                    {e.notes && <div className="text-xs text-muted-foreground/70 mt-1 italic">"{e.notes}"</div>}
                  </div>
                  <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:justify-end">
                    <MiniBtn primary onClick={() => callEntry(e)}><Bell className="w-3.5 h-3.5" /> Chamar</MiniBtn>
                    <MiniBtn danger onClick={() => cancel(e)}><XCircle className="w-3.5 h-3.5" /> Cancelar</MiniBtn>
                    <MiniBtn onClick={() => remove(e.id)}><Trash2 className="w-3.5 h-3.5" /> Remover</MiniBtn>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Histórico */}
      {history.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-1 mb-2">Histórico recente</div>
          <div className="space-y-1">
            {history.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm"
                style={{ background: "hsl(0 0% 100% / 0.015)", border: `1px solid ${t.border}` }}>
                <div className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-foreground">{e.user_name}</span>
                  {e.service_name && <span className="text-muted-foreground"> · {e.service_name}</span>}
                </div>
                <StatusBadge status={e.status} small />
                <button onClick={() => remove(e.id)} className="text-muted-foreground/50 hover:text-destructive transition-colors">
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
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md"
            onClick={() => !savingSettings && setSettingsOpen(false)}>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              onClick={(ev) => ev.stopPropagation()}
              className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col"
              style={{ background: t.pageBgAlt, border: `1px solid ${t.border}` }}>
              <div className="flex items-center justify-between px-5 h-14" style={{ borderBottom: `1px solid ${t.border}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: ACCENT_SOFT, border: `1px solid ${ACCENT_BORDER}` }}>
                    <SettingsIcon className="w-3.5 h-3.5" style={{ color: ACCENT_LIGHT }} />
                  </div>
                  <div className="text-sm font-bold text-foreground">Configurações da fila</div>
                </div>
                <button onClick={() => setSettingsOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-5">
                <div className="flex items-center justify-between gap-3 rounded-2xl p-4" style={surface}>
                  <div>
                    <div className="text-sm font-bold text-foreground">Status da barbearia</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Quando fechada, novos clientes não conseguem entrar na fila.</div>
                  </div>
                  <button
                    onClick={() => setForm((f) => ({ ...f, site_status: f.site_status === "ativo" ? "inativo" : "ativo" }))}
                    className="shrink-0 h-9 px-4 rounded-lg text-xs font-bold transition-colors"
                    style={{
                      background: form.site_status === "ativo" ? "hsl(142 65% 45% / 0.10)" : "hsl(0 70% 55% / 0.10)",
                      color: form.site_status === "ativo" ? "hsl(142 65% 65%)" : "hsl(0 80% 72%)",
                      border: `1px solid ${form.site_status === "ativo" ? "hsl(142 65% 45% / 0.30)" : "hsl(0 70% 55% / 0.25)"}`,
                    }}>
                    {form.site_status === "ativo" ? "Aberta" : "Fechada"}
                  </button>
                </div>

                <Field label="Mensagem informativa" hint="Aparece sempre na tela pública da fila.">
                  <textarea rows={3} value={form.queue_info_message}
                    onChange={(e) => setForm({ ...form, queue_info_message: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none text-foreground"
                    style={{ background: "hsl(0 0% 100% / 0.03)", border: `1px solid ${t.border}` }} />
                </Field>

                <Field label="Mensagem quando fechado" hint="Só aparece quando o status estiver Fechada.">
                  <textarea rows={3} value={form.queue_closed_message}
                    onChange={(e) => setForm({ ...form, queue_closed_message: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none text-foreground"
                    style={{ background: "hsl(0 0% 100% / 0.03)", border: `1px solid ${t.border}` }} />
                </Field>

                <Field label="Como usar esta página" hint="Texto expansível para orientar clientes.">
                  <textarea rows={4} value={form.queue_how_to_use}
                    onChange={(e) => setForm({ ...form, queue_how_to_use: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none text-foreground"
                    style={{ background: "hsl(0 0% 100% / 0.03)", border: `1px solid ${t.border}` }} />
                </Field>
              </div>

              <div className="p-5" style={{ borderTop: `1px solid ${t.border}` }}>
                <button onClick={saveSettings} disabled={savingSettings}
                  className="w-full h-12 rounded-xl font-bold text-white disabled:opacity-60 transition-all hover:brightness-110 inline-flex items-center justify-center gap-2"
                  style={{ background: ACCENT }}>
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><Save className="w-4 h-4" /> Salvar configurações</>)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatusBadge = ({ status, small }: { status: WaitStatus; small?: boolean }) => {
  const tone = statusTone[status];
  return (
    <span className={`inline-flex items-center rounded-full ${small ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2 py-0.5"}`}
      style={{ background: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}>
      {statusLabel[status]}
    </span>
  );
};

const MiniBtn = ({ children, onClick, primary, danger, full }: {
  children: React.ReactNode; onClick: () => void; primary?: boolean; danger?: boolean; full?: boolean;
}) => {
  const style = primary
    ? { background: ACCENT, color: "#fff", border: "1px solid transparent" }
    : danger
      ? { background: "hsl(0 70% 55% / 0.10)", color: "hsl(0 85% 75%)", border: "1px solid hsl(0 70% 55% / 0.28)" }
      : { background: "hsl(0 0% 100% / 0.04)", color: "hsl(0 0% 75%)", border: "1px solid hsl(0 0% 100% / 0.10)" };
  return (
    <button onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold transition-all hover:brightness-110 w-full ${full ? "col-span-3" : "sm:w-auto"}`}
      style={style}>
      {children}
    </button>
  );
};

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <label className="text-[12px] font-semibold text-foreground block mb-1">{label}</label>
    {hint && <div className="text-[11px] text-muted-foreground mb-2">{hint}</div>}
    {children}
  </div>
);

export default AdminFila;
