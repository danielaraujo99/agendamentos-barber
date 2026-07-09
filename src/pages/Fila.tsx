import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Clock,
  LogIn,
  UserPlus,
  X,
  CheckCircle2,
  Loader2,
  Bell,
  ChevronLeft,
  Scissors,
  Sparkles,
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

const statusMeta: Record<WaitStatus, { label: string; tone: string }> = {
  waiting: { label: "Aguardando", tone: "text-amber-300 bg-amber-500/10 border-amber-500/30" },
  calling: { label: "Chamando agora", tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/40 animate-pulse" },
  in_service: { label: "Em atendimento", tone: "text-sky-300 bg-sky-500/10 border-sky-500/30" },
  done: { label: "Concluído", tone: "text-white/60 bg-white/5 border-white/10" },
  cancelled: { label: "Cancelado", tone: "text-red-300 bg-red-500/10 border-red-500/30" },
  no_show: { label: "Não compareceu", tone: "text-orange-300 bg-orange-500/10 border-orange-500/30" },
};

const formatWait = (createdAt: string) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
};

const Fila = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; phone: string } | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [notes, setNotes] = useState("");
  const [joining, setJoining] = useState(false);
  const [tick, setTick] = useState(0);

  // auth
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const meta = session.user.user_metadata as any;
        setUserProfile({
          name: meta?.full_name || meta?.name || "Cliente",
          phone: meta?.phone || "",
        });
      }
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        const meta = session.user.user_metadata as any;
        setUserProfile({
          name: meta?.full_name || meta?.name || "Cliente",
          phone: meta?.phone || "",
        });
      } else {
        setUserId(null);
        setUserProfile(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // fetch
  const fetchEntries = async () => {
    const { data } = await supabase
      .from("waitlist_entries")
      .select("*")
      .in("status", ["waiting", "calling", "in_service"])
      .order("created_at", { ascending: true });
    setEntries((data || []) as Entry[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
    const channel = supabase
      .channel("waitlist-public")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waitlist_entries" },
        () => fetchEntries(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // update wait time every 30s
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const waiting = useMemo(() => entries.filter((e) => e.status === "waiting"), [entries]);
  const active = useMemo(
    () => entries.filter((e) => e.status === "calling" || e.status === "in_service"),
    [entries],
  );
  const myEntry = useMemo(
    () => (userId ? entries.find((e) => e.user_id === userId) : null),
    [entries, userId],
  );
  const myPosition = useMemo(() => {
    if (!myEntry || myEntry.status !== "waiting") return 0;
    return waiting.findIndex((e) => e.id === myEntry.id) + 1;
  }, [myEntry, waiting]);

  const handleJoin = async () => {
    if (!userId || !userProfile) {
      navigate("/login?redirect=/fila");
      return;
    }
    if (myEntry) {
      toast.info("Você já está na fila.");
      return;
    }
    setJoining(true);
    const { error } = await supabase.from("waitlist_entries").insert({
      user_id: userId,
      user_name: userProfile.name,
      user_phone: userProfile.phone || null,
      service_name: serviceName.trim() || null,
      notes: notes.trim() || null,
    });
    setJoining(false);
    if (error) {
      toast.error("Não foi possível entrar na fila.");
      return;
    }
    toast.success("Você entrou na fila!");
    setJoinOpen(false);
    setServiceName("");
    setNotes("");
  };

  const handleLeave = async () => {
    if (!myEntry) return;
    const { error } = await supabase
      .from("waitlist_entries")
      .update({ status: "cancelled" })
      .eq("id", myEntry.id);
    if (error) toast.error("Erro ao sair.");
    else toast.success("Você saiu da fila.");
  };

  // pull tick into dep so wait labels re-render
  void tick;

  return (
    <div className="min-h-screen w-full text-white" style={{ background: "hsl(220 25% 4%)" }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, hsl(38 92% 55%) 0%, transparent 65%)" }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-15"
          style={{ background: "radial-gradient(circle, hsl(200 90% 60%) 0%, transparent 65%)" }}
        />
      </div>

      {/* Top bar */}
      <div className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/5 bg-black/40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Link>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Tempo real
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-8 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 mb-4">
            <Users className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Fila de espera</h1>
          <p className="mt-2 text-white/60 text-sm">
            {waiting.length === 0 && active.length === 0
              ? "Nenhuma pessoa na fila no momento"
              : `${waiting.length + active.length} ${waiting.length + active.length === 1 ? "pessoa" : "pessoas"} na fila`}
          </p>
        </motion.div>

        {/* CTA / Minha posição */}
        {myEntry ? (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-3xl p-6 mb-6 border border-amber-500/30"
            style={{
              background:
                "linear-gradient(135deg, hsl(38 92% 55% / 0.15) 0%, hsl(220 25% 8%) 60%)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusMeta[myEntry.status].tone}`}>
                  {myEntry.status === "calling" && <Bell className="w-3 h-3" />}
                  {statusMeta[myEntry.status].label}
                </div>
                {myEntry.status === "waiting" ? (
                  <>
                    <div className="mt-3 text-xs uppercase tracking-wider text-white/50">Sua posição</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-amber-400 tabular-nums">
                        {myPosition}º
                      </span>
                      <span className="text-white/60 text-sm">
                        de {waiting.length}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-lg font-semibold">
                    {myEntry.status === "calling" ? "Sua vez chegou! 🎉" : "Você está sendo atendido"}
                  </div>
                )}
                <div className="mt-2 text-xs text-white/50 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  na fila há {formatWait(myEntry.created_at)}
                </div>
              </div>
              <button
                onClick={handleLeave}
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-red-500/40 hover:text-red-300 text-white/60 transition-colors"
              >
                Sair da fila
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-6 mb-6 border border-white/10 bg-white/[0.02]"
          >
            {userId ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Pronto para entrar?
                  </div>
                  <div className="text-sm text-white/60 mt-0.5">
                    Você será chamado por ordem de chegada.
                  </div>
                </div>
                <button
                  onClick={() => setJoinOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-xl font-semibold text-black bg-gradient-to-br from-amber-300 to-amber-500 hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Entrar na fila
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-between">
                <div>
                  <div className="font-semibold">Entre para reservar seu lugar</div>
                  <div className="text-sm text-white/60 mt-0.5">
                    É necessário estar logado para entrar na fila.
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/login?redirect=/fila"
                    className="inline-flex items-center justify-center gap-2 px-4 h-11 rounded-xl font-semibold text-black bg-gradient-to-br from-amber-300 to-amber-500 hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Em atendimento */}
        {active.length > 0 && (
          <div className="mb-6">
            <div className="text-[11px] uppercase tracking-wider text-white/40 px-1 mb-2">
              Agora
            </div>
            <div className="space-y-2">
              {active.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 border border-emerald-500/20 bg-emerald-500/[0.04]"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Scissors className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{e.user_name}</div>
                    {e.service_name && (
                      <div className="text-xs text-white/50 truncate">{e.service_name}</div>
                    )}
                  </div>
                  <div className={`text-[11px] px-2 py-1 rounded-full border ${statusMeta[e.status].tone}`}>
                    {statusMeta[e.status].label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting list */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="text-[11px] uppercase tracking-wider text-white/40">
              Aguardando ({waiting.length})
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-white/40" />
            </div>
          ) : waiting.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-white/40 text-sm">
              A fila está vazia. Seja o primeiro!
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {waiting.map((e, i) => {
                  const mine = e.user_id === userId;
                  return (
                    <motion.div
                      key={e.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 border transition-colors ${
                        mine
                          ? "border-amber-500/40 bg-amber-500/[0.06]"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold tabular-nums text-sm bg-white/5 border border-white/10">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate flex items-center gap-2">
                          {mine ? "Você" : e.user_name.split(" ")[0]}
                          {mine && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Você
                            </span>
                          )}
                        </div>
                        {e.service_name && (
                          <div className="text-xs text-white/50 truncate">{e.service_name}</div>
                        )}
                      </div>
                      <div className="text-[11px] text-white/40 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatWait(e.created_at)}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Join modal */}
      <AnimatePresence>
        {joinOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setJoinOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(ev) => ev.stopPropagation()}
              className="w-full sm:max-w-md bg-[hsl(220_25%_7%)] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">Entrar na fila</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Você entrará na posição {waiting.length + 1}º
                  </p>
                </div>
                <button
                  onClick={() => setJoinOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">Serviço desejado (opcional)</label>
                  <input
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="Ex: Corte degradê"
                    className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">Observação (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: prefiro barbeiro do lado da janela"
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 focus:outline-none text-sm resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleJoin}
                disabled={joining}
                className="mt-5 w-full h-12 rounded-xl font-semibold text-black bg-gradient-to-br from-amber-300 to-amber-500 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
              >
                {joining ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar entrada
                  </>
                )}
              </button>
              <p className="mt-3 text-[11px] text-white/40 text-center">
                Ao entrar, você aceita ser chamado por ordem de chegada.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Fila;
