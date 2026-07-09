import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users, Clock, X, CheckCircle2, Loader2, Bell, ChevronLeft, ChevronRight,
  Scissors, Instagram, Eye, EyeOff, Phone, Lock, User as UserIcon, ArrowLeft,
  Sparkles, LogOut,
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
  created_at: string;
}

interface Service { id: string; title: string; price: number; duration: string | null; }
interface Barber { id: string; name: string; specialty: string | null; avatar_url: string | null; }
interface Settings { business_name?: string; about_description?: string; instagram?: string; hero_subtitle?: string; site_status?: string; }

const statusMeta: Record<WaitStatus, { label: string; tone: string }> = {
  waiting: { label: "Aguardando", tone: "text-amber-200 bg-amber-500/10 border-amber-500/25" },
  calling: { label: "Chamando", tone: "text-emerald-200 bg-emerald-500/10 border-emerald-500/30" },
  in_service: { label: "Em atendimento", tone: "text-sky-200 bg-sky-500/10 border-sky-500/25" },
  done: { label: "Concluído", tone: "text-white/50 bg-white/5 border-white/10" },
  cancelled: { label: "Cancelado", tone: "text-red-200 bg-red-500/10 border-red-500/25" },
  no_show: { label: "Não compareceu", tone: "text-orange-200 bg-orange-500/10 border-orange-500/25" },
};

const formatWait = (createdAt: string) => {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60); const m = mins % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
};

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
const firstName = (name: string) => name.trim().split(/\s+/)[0];
const phoneEmail = (ph: string) => `${ph.replace(/\D/g, "")}@genesis.barber`;

type Step = "service" | "barber" | "auth" | "confirm";
type AuthMode = "login" | "register";

const Fila = () => {
  const [settings, setSettings] = useState<Settings>({});
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; phone: string } | null>(null);
  const [, setTick] = useState(0);

  // Flow
  const [flowOpen, setFlowOpen] = useState(false);
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [notes, setNotes] = useState("");
  const [joining, setJoining] = useState(false);

  // Auth form
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [fName, setFName] = useState("");
  const [fSurname, setFSurname] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fPassword, setFPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // ---------- data ----------
  const loadBase = async () => {
    const [{ data: st }, { data: sv }, { data: br }] = await Promise.all([
      supabase.from("business_settings").select("key,value"),
      supabase.from("services").select("id,title,price,duration").eq("active", true).order("sort_order"),
      supabase.from("barbers").select("id,name,specialty,avatar_url").eq("active", true).order("sort_order"),
    ]);
    const s: Settings = {};
    (st || []).forEach((r: any) => { (s as any)[r.key] = r.value; });
    setSettings(s);
    setServices((sv || []).map((r: any) => ({ ...r, price: Number(r.price) })));
    setBarbers(br || []);
  };

  const fetchEntries = async () => {
    const { data } = await supabase
      .from("waitlist_entries").select("*")
      .in("status", ["waiting", "calling", "in_service"])
      .order("created_at", { ascending: true });
    setEntries((data || []) as Entry[]);
    setLoading(false);
  };

  useEffect(() => {
    loadBase();
    fetchEntries();
    const ch = supabase.channel("waitlist-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist_entries" }, () => fetchEntries())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const load = (session: any) => {
      if (session?.user) {
        setUserId(session.user.id);
        const meta = session.user.user_metadata || {};
        setUserProfile({ name: meta.full_name || meta.name || "Cliente", phone: meta.phone || "" });
      } else { setUserId(null); setUserProfile(null); }
    };
    supabase.auth.getSession().then(({ data: { session } }) => load(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => load(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const waiting = useMemo(() => entries.filter((e) => e.status === "waiting"), [entries]);
  const active = useMemo(() => entries.filter((e) => e.status === "calling" || e.status === "in_service"), [entries]);
  const myEntry = useMemo(() => (userId ? entries.find((e) => e.user_id === userId) : null), [entries, userId]);
  const myPosition = useMemo(() => {
    if (!myEntry || myEntry.status !== "waiting") return 0;
    return waiting.findIndex((e) => e.id === myEntry.id) + 1;
  }, [myEntry, waiting]);

  const isOpen = settings.site_status !== "inativo";

  // ---------- actions ----------
  const openFlow = () => {
    if (myEntry) { toast.info("Você já está na fila."); return; }
    setStep("service");
    setSelectedService(null);
    setSelectedBarber(null);
    setNotes("");
    setFlowOpen(true);
  };

  const handleAuth = async () => {
    const digits = fPhone.replace(/\D/g, "");
    if (digits.length < 10) return toast.error("Telefone inválido.");
    if (fPassword.length < 6) return toast.error("Senha mínima de 6 caracteres.");
    setAuthLoading(true);
    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: phoneEmail(fPhone), password: fPassword });
      setAuthLoading(false);
      if (error) return toast.error("Telefone ou senha incorretos.");
      toast.success("Bem-vindo!");
      setStep("confirm");
    } else {
      if (fName.trim().length < 2) { setAuthLoading(false); return toast.error("Informe seu nome."); }
      const full = `${fName.trim()} ${fSurname.trim()}`.trim();
      const { error } = await supabase.auth.signUp({
        email: phoneEmail(fPhone), password: fPassword,
        options: { data: { full_name: full, phone: fPhone } },
      });
      setAuthLoading(false);
      if (error) {
        if (error.message?.includes("already")) { toast.error("Telefone já cadastrado. Faça login."); setAuthMode("login"); }
        else toast.error("Erro ao criar conta.");
        return;
      }
      toast.success("Conta criada!");
      setStep("confirm");
    }
  };

  const confirmJoin = async () => {
    if (!userId || !userProfile || !selectedService) return;
    setJoining(true);
    const barberTag = selectedBarber ? `Barbeiro: ${selectedBarber.name}` : "";
    const obs = notes.trim();
    const combined = [barberTag, obs && `Obs: ${obs}`].filter(Boolean).join(" · ") || null;
    const { error } = await supabase.from("waitlist_entries").insert({
      user_id: userId,
      user_name: userProfile.name,
      user_phone: userProfile.phone || null,
      service_name: `${selectedService.title} · ${money(selectedService.price)}`,
      notes: combined,
    });
    setJoining(false);
    if (error) return toast.error("Não foi possível entrar na fila.");
    toast.success("Você entrou na fila!");
    setFlowOpen(false);
  };

  const handleLeave = async () => {
    if (!myEntry) return;
    if (!confirm("Deseja realmente sair da fila?")) return;
    const { error } = await supabase.from("waitlist_entries").update({ status: "cancelled" }).eq("id", myEntry.id);
    if (error) toast.error("Erro ao sair."); else toast.success("Você saiu da fila.");
  };

  // Advance step gates
  const next = () => {
    if (step === "service") { if (!selectedService) return toast.info("Escolha um serviço."); setStep(barbers.length > 0 ? "barber" : userId ? "confirm" : "auth"); }
    else if (step === "barber") { setStep(userId ? "confirm" : "auth"); }
  };
  const back = () => {
    if (step === "barber") setStep("service");
    else if (step === "auth") setStep(barbers.length > 0 ? "barber" : "service");
    else if (step === "confirm") setStep(userId ? (barbers.length > 0 ? "barber" : "service") : "auth");
  };

  // Auto-advance if user logs in mid-flow
  useEffect(() => { if (flowOpen && step === "auth" && userId) setStep("confirm"); }, [userId, flowOpen, step]);

  const insta = (settings.instagram || "").replace(/^@/, "");
  const bizName = settings.business_name || "Barbearia";
  const bizDesc = settings.about_description || settings.hero_subtitle || "";

  return (
    <div className="min-h-screen w-full text-white" style={{ background: "hsl(220 25% 4%)", fontFamily: "'Montserrat', sans-serif" }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-3xl opacity-[0.08]"
          style={{ background: "radial-gradient(circle, hsl(38 92% 55%) 0%, transparent 70%)" }} />
      </div>

      {/* Top bar */}
      <div className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/5 bg-black/50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Link>
          <div className="flex items-center gap-2 text-[11px] text-white/50 font-medium tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            AO VIVO
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        {/* Business header card */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-500/25 flex items-center justify-center">
            <Scissors className="w-6 h-6 text-amber-300" />
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">{bizName}</h1>
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-amber-300/90 uppercase">
            <span className="w-1 h-1 rounded-full bg-amber-400" /> Fila em tempo real
          </div>
          {bizDesc && <p className="mt-3 text-sm text-white/60 max-w-md mx-auto leading-relaxed">{bizDesc}</p>}
          {insta && (
            <a href={`https://instagram.com/${insta}`} target="_blank" rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-xs font-medium text-white/80 transition-colors">
              <Instagram className="w-3.5 h-3.5" /> @{insta}
            </a>
          )}
        </motion.div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-3 text-center">
            <div className="text-lg font-bold tabular-nums">{waiting.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">Na fila</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-3 text-center">
            <div className="text-lg font-bold tabular-nums">{active.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">Atendendo</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-3 text-center">
            <div className={`text-lg font-bold ${isOpen ? "text-emerald-300" : "text-red-300"}`}>{isOpen ? "Aberta" : "Fechada"}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">Status</div>
          </div>
        </div>

        {/* My status / CTA */}
        <div className="mt-5">
          {myEntry ? (
            <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-3xl p-5 border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] to-transparent">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusMeta[myEntry.status].tone}`}>
                    {myEntry.status === "calling" && <Bell className="w-3 h-3" />}
                    {statusMeta[myEntry.status].label}
                  </div>
                  {myEntry.status === "waiting" ? (
                    <>
                      <div className="mt-3 text-[10px] uppercase tracking-widest text-white/40">Sua posição</div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-4xl font-black text-amber-300 tabular-nums">{myPosition}º</span>
                        <span className="text-white/50 text-sm">de {waiting.length}</span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 text-lg font-bold">
                      {myEntry.status === "calling" ? "Sua vez chegou! 🎉" : "Você está sendo atendido"}
                    </div>
                  )}
                  {myEntry.service_name && <div className="mt-1 text-xs text-white/50">{myEntry.service_name}</div>}
                  <div className="mt-1 text-[11px] text-white/40 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> na fila há {formatWait(myEntry.created_at)}
                  </div>
                </div>
                <button onClick={handleLeave}
                  className="shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-white/10 hover:border-red-400/40 hover:text-red-300 text-white/60 transition-colors">
                  Sair da fila
                </button>
              </div>
            </motion.div>
          ) : (
            <button onClick={openFlow} disabled={!isOpen}
              className="w-full h-14 rounded-2xl font-bold text-black bg-amber-400 hover:bg-amber-300 disabled:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2">
              {isOpen ? (<><Sparkles className="w-4 h-4" /> Entrar na fila</>) : "Barbearia fechada"}
            </button>
          )}
          {userId && userProfile && (
            <div className="mt-3 flex items-center justify-between text-[11px] text-white/40 px-1">
              <span>Logado como <span className="text-white/70">{userProfile.name}</span></span>
              <button onClick={() => supabase.auth.signOut()} className="inline-flex items-center gap-1 hover:text-white/70 transition-colors">
                <LogOut className="w-3 h-3" /> Sair
              </button>
            </div>
          )}
        </div>

        {/* Now serving */}
        {active.length > 0 && (
          <div className="mt-8">
            <div className="text-[10px] uppercase tracking-widest text-white/40 px-1 mb-2">Atendendo agora</div>
            <div className="space-y-2">
              {active.map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-2xl px-4 py-3 border border-emerald-500/20 bg-emerald-500/[0.04]">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center font-bold text-emerald-200 text-sm">
                    {initials(e.user_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{firstName(e.user_name)}</div>
                    {e.service_name && <div className="text-xs text-white/50 truncate">{e.service_name}</div>}
                  </div>
                  <div className={`text-[10px] px-2 py-1 rounded-full border ${statusMeta[e.status].tone}`}>
                    {statusMeta[e.status].label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting queue */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="text-[10px] uppercase tracking-widest text-white/40">Fila de espera</div>
            <div className="text-[10px] text-white/40">{waiting.length} {waiting.length === 1 ? "pessoa" : "pessoas"}</div>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-white/40" /></div>
          ) : waiting.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-white/40 text-sm">
              A fila está vazia — seja o próximo!
            </div>
          ) : (
            <div className="space-y-1.5">
              <AnimatePresence initial={false}>
                {waiting.map((e, i) => {
                  const mine = e.user_id === userId;
                  const isNext = i === 0;
                  return (
                    <motion.div key={e.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                      className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 border transition-colors ${
                        mine ? "border-amber-500/40 bg-amber-500/[0.06]"
                             : isNext ? "border-white/15 bg-white/[0.04]"
                             : "border-white/10 bg-white/[0.02]"}`}>
                      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold tabular-nums text-sm ${
                        isNext ? "bg-amber-400/15 border border-amber-400/30 text-amber-200"
                               : "bg-white/5 border border-white/10 text-white/70"}`}>
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate flex items-center gap-1.5">
                          {mine ? "Você" : firstName(e.user_name)}
                          {isNext && !mine && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-200 border border-amber-400/25 uppercase tracking-wider">Próximo</span>}
                          {mine && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/30 uppercase tracking-wider">Você</span>}
                        </div>
                        {e.service_name && <div className="text-[11px] text-white/45 truncate">{e.service_name}</div>}
                      </div>
                      <div className="text-[11px] text-white/40 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" /> {formatWait(e.created_at)}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-[11px] text-white/30">
          A ordem de chegada é sempre respeitada. Você será chamado assim que for sua vez.
        </p>
      </div>

      {/* Flow modal */}
      <AnimatePresence>
        {flowOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md"
            onClick={() => !joining && !authLoading && setFlowOpen(false)}>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              onClick={(ev) => ev.stopPropagation()}
              className="w-full sm:max-w-lg bg-[hsl(220_25%_6%)] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-5 h-14 border-b border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  {step !== "service" && (
                    <button onClick={back} className="w-8 h-8 -ml-1 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div>
                    <div className="text-sm font-bold">
                      {step === "service" && "Escolha o serviço"}
                      {step === "barber" && "Escolha o profissional"}
                      {step === "auth" && (authMode === "login" ? "Entrar" : "Criar conta")}
                      {step === "confirm" && "Confirmar entrada"}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mt-0.5">
                      Passo {["service", "barber", "auth", "confirm"].filter((s) => (s !== "auth" || !userId) && (s !== "barber" || barbers.length > 0)).indexOf(step) + 1} de {["service", "barber", "auth", "confirm"].filter((s) => (s !== "auth" || !userId) && (s !== "barber" || barbers.length > 0)).length}
                    </div>
                  </div>
                </div>
                <button onClick={() => !joining && !authLoading && setFlowOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto">
                {/* SERVICE */}
                {step === "service" && (
                  <div className="space-y-2">
                    {services.length === 0 && <div className="text-sm text-white/50 text-center py-8">Nenhum serviço cadastrado.</div>}
                    {services.map((s) => {
                      const sel = selectedService?.id === s.id;
                      return (
                        <button key={s.id} onClick={() => setSelectedService(s)}
                          className={`w-full text-left flex items-center gap-3 rounded-2xl p-4 border transition-all ${
                            sel ? "border-amber-400/50 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${sel ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-white/10 bg-white/5 text-white/60"}`}>
                            <Scissors className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold truncate">{s.title}</div>
                            {s.duration && <div className="text-[11px] text-white/45 mt-0.5">{s.duration}</div>}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-amber-300 tabular-nums">{money(s.price)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* BARBER */}
                {step === "barber" && (
                  <div className="space-y-2">
                    <button onClick={() => setSelectedBarber(null)}
                      className={`w-full text-left flex items-center gap-3 rounded-2xl p-4 border transition-all ${
                        !selectedBarber ? "border-amber-400/50 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"}`}>
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">Sem preferência</div>
                        <div className="text-[11px] text-white/45 mt-0.5">Qualquer profissional disponível</div>
                      </div>
                    </button>
                    {barbers.map((b) => {
                      const sel = selectedBarber?.id === b.id;
                      return (
                        <button key={b.id} onClick={() => setSelectedBarber(b)}
                          className={`w-full text-left flex items-center gap-3 rounded-2xl p-4 border transition-all ${
                            sel ? "border-amber-400/50 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"}`}>
                          {b.avatar_url ? (
                            <img src={b.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white/70">
                              {initials(b.name)}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-semibold">{b.name}</div>
                            {b.specialty && <div className="text-[11px] text-white/45 mt-0.5">{b.specialty}</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* AUTH inline */}
                {step === "auth" && (
                  <div>
                    <div className="grid grid-cols-2 rounded-xl border border-white/10 p-1 mb-5 bg-white/[0.02]">
                      {(["login", "register"] as const).map((m) => (
                        <button key={m} onClick={() => setAuthMode(m)}
                          className={`h-9 rounded-lg text-xs font-bold transition-colors ${authMode === m ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}>
                          {m === "login" ? "Entrar" : "Criar conta"}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {authMode === "register" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-white/60 flex items-center gap-1 mb-1.5"><UserIcon className="w-3 h-3" /> Nome</label>
                            <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="João"
                              className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-400/50 focus:outline-none text-sm" />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-white/60 flex items-center gap-1 mb-1.5"><UserIcon className="w-3 h-3" /> Sobrenome</label>
                            <input value={fSurname} onChange={(e) => setFSurname(e.target.value)} placeholder="Silva"
                              className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-400/50 focus:outline-none text-sm" />
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-[11px] font-semibold text-white/60 flex items-center gap-1 mb-1.5"><Phone className="w-3 h-3" /> WhatsApp</label>
                        <input type="tel" value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="(27) 99999-9999"
                          className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-400/50 focus:outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-white/60 flex items-center gap-1 mb-1.5"><Lock className="w-3 h-3" /> Senha</label>
                        <div className="relative">
                          <input type={showPass ? "text" : "password"} value={fPassword} onChange={(e) => setFPassword(e.target.value)} placeholder="••••••••"
                            className="w-full h-11 px-3 pr-11 rounded-xl bg-white/5 border border-white/10 focus:border-amber-400/50 focus:outline-none text-sm" />
                          <button onClick={() => setShowPass(!showPass)} type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white/50 hover:text-white">
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CONFIRM */}
                {step === "confirm" && selectedService && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <Row label="Serviço" value={selectedService.title} extra={money(selectedService.price)} />
                      {selectedService.duration && <Row label="Duração" value={selectedService.duration} />}
                      <Row label="Profissional" value={selectedBarber?.name || "Sem preferência"} />
                      <Row label="Cliente" value={userProfile?.name || "—"} />
                      <Row label="Posição" value={`${waiting.length + 1}º de ${waiting.length + 1}`} />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-white/60 mb-1.5 block">Observação (opcional)</label>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                        placeholder="Alguma preferência ou observação..."
                        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-400/50 focus:outline-none text-sm resize-none" />
                    </div>
                    <p className="text-[11px] text-white/40 text-center pt-1">
                      Ao confirmar, você aceita ser chamado por ordem de chegada.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-white/5">
                {step === "service" && (
                  <button onClick={next} disabled={!selectedService}
                    className="w-full h-12 rounded-xl font-bold text-black bg-amber-400 hover:bg-amber-300 disabled:bg-white/5 disabled:text-white/30 transition-colors inline-flex items-center justify-center gap-2">
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                {step === "barber" && (
                  <button onClick={next}
                    className="w-full h-12 rounded-xl font-bold text-black bg-amber-400 hover:bg-amber-300 transition-colors inline-flex items-center justify-center gap-2">
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                {step === "auth" && (
                  <button onClick={handleAuth} disabled={authLoading}
                    className="w-full h-12 rounded-xl font-bold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
                    {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (authMode === "login" ? "Entrar e continuar" : "Criar conta e continuar")}
                  </button>
                )}
                {step === "confirm" && (
                  <button onClick={confirmJoin} disabled={joining}
                    className="w-full h-12 rounded-xl font-bold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
                    {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><CheckCircle2 className="w-4 h-4" /> Confirmar entrada na fila</>)}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Row = ({ label, value, extra }: { label: string; value: string; extra?: string }) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="text-white/50 text-xs uppercase tracking-wider">{label}</span>
    <span className="font-medium text-right">
      {value}
      {extra && <span className="ml-2 text-amber-300 font-bold tabular-nums">{extra}</span>}
    </span>
  </div>
);

export default Fila;
