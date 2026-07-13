import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Users, Clock, X, CheckCircle2, Loader2, Bell, BellOff, ChevronLeft, ChevronRight,
  Scissors, Instagram, Eye, EyeOff, Phone, Lock, User as UserIcon, ArrowLeft,
  Sparkles, LogOut, LogIn, Info, ChevronDown, HelpCircle, AlertTriangle, Timer, Download,
  Check, Share, Smartphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useWebPush } from "@/hooks/useWebPush";

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
  started_at?: string | null;
  called_at?: string | null;
}

// gold suave (não neon)
const GOLD = "#b8863d";
const GOLD_SOFT = "#c69447";
const isIos = () =>
  typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true);
const parseMinutes = (txt: string | null | undefined): number => {
  if (!txt) return 0;
  const m = String(txt).match(/(\d+)\s*h/i);
  const s = String(txt).match(/(\d+)\s*m/i);
  const plain = String(txt).match(/(\d+)/);
  const hours = m ? parseInt(m[1], 10) : 0;
  const mins = s ? parseInt(s[1], 10) : (m ? 0 : (plain ? parseInt(plain[1], 10) : 0));
  return hours * 60 + mins;
};

interface Service { id: string; title: string; price: number; duration: string | null; }
interface Barber { id: string; name: string; specialty: string | null; avatar_url: string | null; }
interface Settings {
  business_name?: string;
  about_description?: string;
  instagram?: string;
  hero_subtitle?: string;
  site_status?: string;
  logo_url?: string;
  queue_info_message?: string;
  queue_closed_message?: string;
  queue_how_to_use?: string;
}

const statusMeta: Record<WaitStatus, { label: string; tone: string }> = {
  waiting: { label: "Aguardando", tone: "text-[#e5b877] bg-[#c69447]/10 border-[#c69447]/25" },
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
  const [howOpen, setHowOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const push = useWebPush(userId);

  // Flow
  const [flowOpen, setFlowOpen] = useState(false);
  const [authOnlyOpen, setAuthOnlyOpen] = useState(false);
  const [step, setStep] = useState<Step>("service");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [notes, setNotes] = useState("");
  const [joining, setJoining] = useState(false);
  const [iosHintOpen, setIosHintOpen] = useState(false);

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
    const cs = supabase.channel("settings-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "business_settings" }, () => loadBase())
      .subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(cs); };
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

  // ---------- ETA / previsão automática ----------
  // Prefere "Dur: NNmin" nas notes (multi-serviço); senão tenta casar service_name → duration do serviço
  const findDurationMinutes = (entry: Entry | null | undefined): number => {
    if (!entry) return 0;
    const m = (entry.notes || "").match(/Dur:\s*(\d+)\s*min/i);
    if (m) return parseInt(m[1], 10) || 0;
    if (!entry.service_name) return 0;
    const head = entry.service_name.split("·")[0].trim().toLowerCase();
    // pode ter "A + B"; soma se casar múltiplos
    const parts = head.split(/\s*\+\s*/);
    let total = 0;
    for (const p of parts) {
      const svc = services.find((s) => s.title.trim().toLowerCase() === p);
      total += parseMinutes(svc?.duration);
    }
    return total;
  };

  const activeInService = useMemo(
    () => entries.find((e) => e.status === "in_service" && e.started_at) || null,
    [entries]
  );

  // Hora prevista do fim do atendimento atual (base para o contador do próximo)
  const nextStartAt = useMemo<number | null>(() => {
    if (!activeInService?.started_at) return null;
    const mins = findDurationMinutes(activeInService) || 30;
    return new Date(activeInService.started_at).getTime() + mins * 60000;
  }, [activeInService, services]);

  const showEta = !!myEntry && myEntry.status === "waiting" && myPosition === 1 && !!nextStartAt;


  // ---------- actions ----------
  const openFlow = () => {
    if (!isOpen) return;
    if (myEntry) { toast.info("Você já está na fila."); return; }
    setStep("service");
    setSelectedServices([]);
    setSelectedBarber(null);
    setNotes("");
    setFlowOpen(true);
  };

  const openAuthOnly = () => {
    setAuthMode("login");
    setFName(""); setFSurname(""); setFPhone(""); setFPassword("");
    setAuthOnlyOpen(true);
  };

  const toggleService = (svc: Service) => {
    setSelectedServices((prev) =>
      prev.some((s) => s.id === svc.id) ? prev.filter((s) => s.id !== svc.id) : [...prev, svc]
    );
  };

  const totalPrice = useMemo(
    () => selectedServices.reduce((acc, s) => acc + Number(s.price || 0), 0),
    [selectedServices]
  );
  const totalDurationMin = useMemo(
    () => selectedServices.reduce((acc, s) => acc + (parseMinutes(s.duration) || 0), 0),
    [selectedServices]
  );

  const handleAuth = async (afterAuth: () => void) => {
    const digits = fPhone.replace(/\D/g, "");
    if (digits.length < 10) return toast.error("Telefone inválido.");
    if (fPassword.length < 6) return toast.error("Senha mínima de 6 caracteres.");
    setAuthLoading(true);
    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: phoneEmail(fPhone), password: fPassword });
      setAuthLoading(false);
      if (error) return toast.error("Telefone ou senha incorretos.");
      toast.success("Bem-vindo!");
      afterAuth();
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
      afterAuth();
    }
  };

  const confirmJoin = async () => {
    if (!userId || !userProfile || selectedServices.length === 0) return;
    setJoining(true);
    const barberTag = selectedBarber ? `Barbeiro: ${selectedBarber.name}` : "";
    const obs = notes.trim();
    // encoda duração total no início das notes para o ETA respeitar múltiplos serviços
    const durTag = totalDurationMin > 0 ? `Dur: ${totalDurationMin}min` : "";
    const combined = [durTag, barberTag, obs && `Obs: ${obs}`].filter(Boolean).join(" · ") || null;
    const titles = selectedServices.map((s) => s.title).join(" + ");
    const { error } = await supabase.from("waitlist_entries").insert({
      user_id: userId,
      user_name: userProfile.name,
      user_phone: userProfile.phone || null,
      service_name: `${titles} · ${money(totalPrice)}`,
      notes: combined,
    });
    setJoining(false);
    if (error) return toast.error("Não foi possível entrar na fila.");
    toast.success("Você entrou na fila!");
    setFlowOpen(false);
    // sugerir push
    if (push.supported && !push.subscribed) {
      setTimeout(() => {
        if (isIos() && !isStandalone()) { setIosHintOpen(true); return; }
        push.subscribe();
      }, 400);
    }
  };

  const handleLeave = async () => {
    if (!myEntry) return;
    if (!confirm("Deseja realmente sair da fila?")) return;
    const { error } = await supabase.from("waitlist_entries").update({ status: "cancelled" }).eq("id", myEntry.id);
    if (error) toast.error("Erro ao sair."); else toast.success("Você saiu da fila.");
  };

  const next = () => {
    if (step === "service") { if (selectedServices.length === 0) return toast.info("Escolha ao menos um serviço."); setStep(barbers.length > 0 ? "barber" : userId ? "confirm" : "auth"); }
    else if (step === "barber") { setStep(userId ? "confirm" : "auth"); }
  };
  const back = () => {
    if (step === "barber") setStep("service");
    else if (step === "auth") setStep(barbers.length > 0 ? "barber" : "service");
    else if (step === "confirm") setStep(userId ? (barbers.length > 0 ? "barber" : "service") : "auth");
  };

  useEffect(() => { if (flowOpen && step === "auth" && userId) setStep("confirm"); }, [userId, flowOpen, step]);
  useEffect(() => { if (authOnlyOpen && userId) setAuthOnlyOpen(false); }, [userId, authOnlyOpen]);

  const insta = (settings.instagram || "").replace(/^@/, "");
  const bizName = settings.business_name || "Barbearia";
  const bizDesc = settings.about_description || settings.hero_subtitle || "";
  const logoUrl = settings.logo_url;
  const infoMsg = settings.queue_info_message || "";
  const closedMsg = settings.queue_closed_message || "";
  const howMsg = settings.queue_how_to_use || "";

  return (
    <div className="min-h-screen w-full text-white" style={{ background: "hsl(220 25% 4%)", fontFamily: "'Montserrat', sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-3xl opacity-[0.08]"
          style={{ background: "radial-gradient(circle, hsl(38 92% 55%) 0%, transparent 70%)" }} />
      </div>

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

      <div className="max-w-3xl mx-auto px-4 pt-8 pb-24 space-y-5">
        {/* Título + contador + botões duplos */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Fila de espera</h1>
          <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/60">
            <Users className="w-4 h-4" />
            <span className="tabular-nums">{waiting.length}</span> {waiting.length === 1 ? "pessoa" : "pessoas"} na fila
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 max-w-md mx-auto">
            {userId ? (
              <button
                onClick={() => supabase.auth.signOut()}
                className="h-11 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/80 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sair da conta
              </button>
            ) : (
              <button
                onClick={openAuthOnly}
                className="h-11 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/85 transition-colors"
              >
                <LogIn className="w-4 h-4" /> Entrar na minha conta
              </button>
            )}
            <button
              onClick={openFlow}
              disabled={!isOpen || !!myEntry}
              className={`h-11 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors ${
                isOpen && !myEntry
                  ? "bg-[#c69447] hover:bg-[#d4a656] text-black"
                  : "border border-white/10 bg-white/[0.02] text-white/30 opacity-50 cursor-not-allowed"
              }`}
            >
              <Users className="w-4 h-4" /> Entrar na fila
            </button>
          </div>

        </div>

        {/* Business header card */}
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 text-center overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c69447]/70 to-transparent" />
          <div className="mx-auto w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={bizName} className="w-full h-full object-cover" />
            ) : (
              <Scissors className="w-7 h-7 text-[#e5b877]" />
            )}
          </div>
          <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[#e5b877]">{bizName}</h2>
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-white/60 uppercase">
            <span className="w-1 h-1 rounded-full bg-[#c69447]" /> Fila em tempo real
          </div>
          {bizDesc && <p className="mt-3 text-sm text-white/70 max-w-md mx-auto leading-relaxed">{bizDesc}</p>}
          {insta && (
            <a href={`https://instagram.com/${insta}`} target="_blank" rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-white/10 bg-black/40 hover:bg-black/60 text-sm font-medium text-white/90 transition-colors">
              <Instagram className="w-4 h-4" /> Instagram
            </a>
          )}
        </motion.div>

        {/* Serviços disponíveis — abre bottom sheet */}
        <button
          onClick={() => setServicesOpen(true)}
          className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] px-4 py-3.5 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-[#c69447]/25 bg-[#c69447]/[0.08] text-[#e5b877] shrink-0">
            <Scissors className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">Serviços disponíveis</div>
            <div className="text-[11px] text-white/50 mt-0.5">Toque para ver preços e durações</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-md bg-[#c69447]/10 text-[#e5b877] border border-[#c69447]/25">
              {services.length}
            </span>
            <ChevronRight className="w-4 h-4 text-white/40" />
          </div>
        </button>

        {/* Info card (custom) */}
        {infoMsg && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 text-center">
            <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed">{infoMsg}</p>
          </div>
        )}

        {/* Closed message */}
        {!isOpen && closedMsg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] px-5 py-4 text-center">
            <div className="text-sm font-bold text-red-200">Fechados no momento</div>
            <p className="mt-1.5 text-xs text-white/60 whitespace-pre-line leading-relaxed">{closedMsg}</p>
          </motion.div>
        )}

        {/* How to use */}
        {howMsg && (
          <div className="rounded-2xl border-l-2 border-[#c69447]/40 border-y border-r border-white/10 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => setHowOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-[#e5b877] shrink-0" />
              <span className="flex-1 font-bold text-sm">Como usar esta página</span>
              <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${howOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
              {howOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                  className="overflow-hidden border-t border-white/5">
                  <p className="px-4 py-3.5 text-sm text-white/70 whitespace-pre-line leading-relaxed">{howMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Big status button */}
        {!isOpen ? (
          <button disabled
            className="w-full h-14 rounded-2xl font-bold text-lg border border-white/10 bg-white/[0.03] text-white/40 cursor-not-allowed">
            Barbearia fechada
          </button>
        ) : myEntry ? (
          <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-3xl p-5 border border-[#c69447]/30 bg-gradient-to-br from-[#c69447]/[0.08] to-transparent">
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
                      <span className="text-4xl font-black text-[#e5b877] tabular-nums">{myPosition}º</span>
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

            {/* Push toggle */}
            {push.supported && (
              <button
                onClick={push.subscribed ? push.unsubscribe : push.subscribe}
                disabled={push.busy}
                className={`mt-4 w-full h-10 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 border transition-colors ${
                  push.subscribed
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                    : "border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"
                }`}
              >
                {push.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : push.subscribed ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                {push.subscribed ? "Notificações ativas — te avisamos no celular" : "Ativar notificações no celular"}
              </button>
            )}
          </motion.div>
        ) : (
          <button onClick={openFlow}
            className="w-full h-14 rounded-2xl font-bold text-black bg-[#c69447] hover:bg-[#d4a656] transition-colors inline-flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" /> Entrar na fila
          </button>
        )}

        {/* ETA / Previsão automática para o 1º da fila */}
        {showEta && nextStartAt && (
          <EtaCountdown endTs={nextStartAt} userId={userId} onNotify={(kind, title, body) => {
            if (push.subscribed && userId) {
              supabase.functions.invoke("send-push", {
                body: { user_ids: [userId], title, body, link: "/fila", tag: `eta-${kind}` },
              }).catch(() => {});
            }
            toast(title, { description: body });
          }} />
        )}


        {userId && userProfile && (
          <div className="flex items-center justify-between text-[11px] text-white/40 px-1">
            <span>Logado como <span className="text-white/70">{userProfile.name}</span></span>
          </div>
        )}

        {/* Now serving */}
        {active.length > 0 && (
          <div>
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
        <div>
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
                        mine ? "border-[#c69447]/40 bg-[#c69447]/[0.08]"
                             : isNext ? "border-white/15 bg-white/[0.04]"
                             : "border-white/10 bg-white/[0.02]"}`}>
                      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold tabular-nums text-sm ${
                        isNext ? "bg-[#c69447]/20 border border-[#c69447]/30 text-[#e5b877]"
                               : "bg-white/5 border border-white/10 text-white/70"}`}>
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate flex items-center gap-1.5">
                          {mine ? "Você" : firstName(e.user_name)}
                          {isNext && !mine && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#c69447]/20 text-[#e5b877] border border-[#c69447]/25 uppercase tracking-wider">Próximo</span>}
                          {mine && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#c69447]/20 text-[#e5b877] border border-[#c69447]/30 uppercase tracking-wider">Você</span>}
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

        <p className="text-center text-[11px] text-white/30">
          A ordem de chegada é sempre respeitada. Você será chamado assim que for sua vez.
        </p>
      </div>

      <PwaInstallBanner />


      {/* Auth-only modal */}
      <AnimatePresence>
        {authOnlyOpen && !userId && (
          <ModalShell onClose={() => !authLoading && setAuthOnlyOpen(false)}
            title={authMode === "login" ? "Entrar na sua conta" : "Criar sua conta"}>
            <AuthForm
              authMode={authMode} setAuthMode={setAuthMode}
              fName={fName} setFName={setFName}
              fSurname={fSurname} setFSurname={setFSurname}
              fPhone={fPhone} setFPhone={setFPhone}
              fPassword={fPassword} setFPassword={setFPassword}
              showPass={showPass} setShowPass={setShowPass}
            />
            <div className="p-5 border-t border-white/5">
              <button onClick={() => handleAuth(() => setAuthOnlyOpen(false))} disabled={authLoading}
                className="w-full h-12 rounded-xl font-bold text-black bg-[#c69447] hover:bg-[#d4a656] disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (authMode === "login" ? "Entrar" : "Criar conta")}
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Flow modal */}
      <AnimatePresence>
        {flowOpen && (
          <ModalShell onClose={() => !joining && !authLoading && setFlowOpen(false)}
            title={
              step === "service" ? "Escolha o serviço"
                : step === "barber" ? "Escolha o profissional"
                : step === "auth" ? (authMode === "login" ? "Entrar" : "Criar conta")
                : "Confirmar entrada"
            }
            onBack={step !== "service" ? back : undefined}
            subtitle={`Passo ${["service", "barber", "auth", "confirm"].filter((s) => (s !== "auth" || !userId) && (s !== "barber" || barbers.length > 0)).indexOf(step) + 1} de ${["service", "barber", "auth", "confirm"].filter((s) => (s !== "auth" || !userId) && (s !== "barber" || barbers.length > 0)).length}`}>
            {step === "service" && (
              <div className="space-y-2">
                <div className="text-[11px] text-white/50 px-1 pb-1">
                  Selecione um ou mais serviços.
                </div>
                {services.length === 0 && <div className="text-sm text-white/50 text-center py-8">Nenhum serviço cadastrado.</div>}
                {services.map((s) => {
                  const sel = selectedServices.some((x) => x.id === s.id);
                  return (
                    <button key={s.id} onClick={() => toggleService(s)}
                      className={`w-full text-left flex items-start gap-3 rounded-2xl p-4 border transition-all ${
                        sel ? "border-[#c69447]/50 bg-[#c69447]/[0.06]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"}`}>
                      <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                        sel ? "border-[#c69447] bg-[#c69447] text-black" : "border-white/25 bg-white/5"}`}>
                        {sel && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold break-words leading-snug">{s.title}</div>
                        {s.duration && <div className="text-[11px] text-white/45 mt-0.5">{s.duration}</div>}
                      </div>
                      <div className="font-bold text-[#e5b877] tabular-nums shrink-0 whitespace-nowrap">{money(s.price)}</div>
                    </button>
                  );
                })}
                {selectedServices.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-[#c69447]/25 bg-[#c69447]/[0.05] px-4 py-3 flex items-center justify-between">
                    <div className="text-xs text-white/70">
                      <span className="font-bold text-white">{selectedServices.length}</span> selecionado{selectedServices.length > 1 ? "s" : ""}
                      {totalDurationMin > 0 && <> · ~{totalDurationMin} min</>}
                    </div>
                    <div className="font-bold text-[#e5b877] tabular-nums">{money(totalPrice)}</div>
                  </div>
                )}
              </div>
            )}
            {step === "barber" && (
              <div className="space-y-2">
                <button onClick={() => setSelectedBarber(null)}
                  className={`w-full text-left flex items-center gap-3 rounded-2xl p-4 border transition-all ${
                    !selectedBarber ? "border-[#c69447]/40 bg-[#c69447]/[0.08]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"}`}>
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
                        sel ? "border-[#c69447]/40 bg-[#c69447]/[0.08]" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"}`}>
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
            {step === "auth" && (
              <AuthForm
                authMode={authMode} setAuthMode={setAuthMode}
                fName={fName} setFName={setFName}
                fSurname={fSurname} setFSurname={setFSurname}
                fPhone={fPhone} setFPhone={setFPhone}
                fPassword={fPassword} setFPassword={setFPassword}
                showPass={showPass} setShowPass={setShowPass}
              />
            )}
            {step === "confirm" && selectedServices.length > 0 && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2.5">
                  <div className="text-[10px] uppercase tracking-widest text-white/40">Serviços</div>
                  <ul className="space-y-1.5">
                    {selectedServices.map((s) => (
                      <li key={s.id} className="flex items-start justify-between gap-3 text-sm">
                        <span className="min-w-0 break-words leading-snug text-white/90">{s.title}</span>
                        <span className="shrink-0 tabular-nums text-[#e5b877] font-semibold">{money(s.price)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-white/10 pt-2.5 space-y-2">
                    {totalDurationMin > 0 && <Row label="Duração total" value={`~${totalDurationMin} min`} />}
                    <Row label="Profissional" value={selectedBarber?.name || "Sem preferência"} />
                    <Row label="Cliente" value={userProfile?.name || "—"} />
                    <Row label="Posição" value={`${waiting.length + 1}º de ${waiting.length + 1}`} />
                    <Row label="Total" value={money(totalPrice)} />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-white/60 mb-1.5 block">Observação (opcional)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    placeholder="Alguma preferência ou observação..."
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#c69447]/50 focus:outline-none text-sm resize-none" />
                </div>
                <p className="text-[11px] text-white/40 text-center pt-1">
                  Ao confirmar, você aceita ser chamado por ordem de chegada.
                </p>
              </div>
            )}

            <div className="p-5 border-t border-white/5">
              {step === "service" && (
                <button onClick={next} disabled={selectedServices.length === 0}
                  className="w-full h-12 rounded-xl font-bold text-black bg-[#c69447] hover:bg-[#d4a656] disabled:bg-white/5 disabled:text-white/30 transition-colors inline-flex items-center justify-center gap-2">
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {step === "barber" && (
                <button onClick={next}
                  className="w-full h-12 rounded-xl font-bold text-black bg-[#c69447] hover:bg-[#d4a656] transition-colors inline-flex items-center justify-center gap-2">
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {step === "auth" && (
                <button onClick={() => handleAuth(() => setStep("confirm"))} disabled={authLoading}
                  className="w-full h-12 rounded-xl font-bold text-black bg-[#c69447] hover:bg-[#d4a656] disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
                  {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (authMode === "login" ? "Entrar e continuar" : "Criar conta e continuar")}
                </button>
              )}
              {step === "confirm" && (
                <button onClick={confirmJoin} disabled={joining}
                  className="w-full h-12 rounded-xl font-bold text-black bg-[#c69447] hover:bg-[#d4a656] disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
                  {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><CheckCircle2 className="w-4 h-4" /> Confirmar entrada na fila</>)}
                </button>
              )}
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Serviços disponíveis — bottom sheet */}
      <AnimatePresence>
        {servicesOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setServicesOpen(false)}>
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col"
              style={{ background: "hsl(220 25% 6% / 0.85)", backdropFilter: "blur(24px)" }}>
              <div className="flex items-center justify-center pt-2.5 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-white/15" />
              </div>
              <div className="flex items-center justify-between px-5 h-14 border-b border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <Scissors className="w-4 h-4 text-[#e5b877]" />
                  <div className="font-bold truncate">Serviços disponíveis</div>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60 tabular-nums">{services.length}</span>
                </div>
                <button onClick={() => setServicesOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2 scrollbar-thin" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}>
                {services.length === 0 && (
                  <div className="text-sm text-white/50 text-center py-10">Nenhum serviço cadastrado.</div>
                )}
                {services.map((s) => (
                  <div key={s.id}
                    className="flex items-start gap-3 rounded-2xl p-4 border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-[#c69447]/25 bg-[#c69447]/[0.08] text-[#e5b877] shrink-0">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold break-words leading-snug">{s.title}</div>
                      {s.duration && (
                        <div className="text-[11px] text-white/45 mt-0.5 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {s.duration}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-[#e5b877] tabular-nums whitespace-nowrap">{money(s.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
              {isOpen && !myEntry && (
                <div className="p-4 border-t border-white/5">
                  <button onClick={() => { setServicesOpen(false); openFlow(); }}
                    className="w-full h-12 rounded-xl font-bold text-black bg-[#c69447] hover:bg-[#d4a656] transition-colors inline-flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> Entrar na fila
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ModalShell = ({ children, onClose, title, subtitle, onBack }: {
  children: React.ReactNode; onClose: () => void; title: string; subtitle?: string; onBack?: () => void;
}) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md"
    onClick={onClose}>
    <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
      onClick={(e) => e.stopPropagation()}
      className="w-full sm:max-w-lg bg-[hsl(220_25%_6%)] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">
      <div className="flex items-center justify-between px-5 h-14 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button onClick={onBack} className="w-8 h-8 -ml-1 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="text-sm font-bold">{title}</div>
            {subtitle && <div className="text-[10px] uppercase tracking-widest text-white/40 mt-0.5">{subtitle}</div>}
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 overflow-y-auto flex-1">{children}</div>
    </motion.div>
  </motion.div>
);

const AuthForm = ({
  authMode, setAuthMode, fName, setFName, fSurname, setFSurname, fPhone, setFPhone, fPassword, setFPassword, showPass, setShowPass,
}: any) => (
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
            <input value={fName} onChange={(e: any) => setFName(e.target.value)} placeholder="João"
              className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#c69447]/40 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-white/60 flex items-center gap-1 mb-1.5"><UserIcon className="w-3 h-3" /> Sobrenome</label>
            <input value={fSurname} onChange={(e: any) => setFSurname(e.target.value)} placeholder="Silva"
              className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#c69447]/40 focus:outline-none text-sm" />
          </div>
        </div>
      )}
      <div>
        <label className="text-[11px] font-semibold text-white/60 flex items-center gap-1 mb-1.5"><Phone className="w-3 h-3" /> WhatsApp</label>
        <input type="tel" value={fPhone} onChange={(e: any) => setFPhone(e.target.value)} placeholder="(27) 99999-9999"
          className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#c69447]/40 focus:outline-none text-sm" />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-white/60 flex items-center gap-1 mb-1.5"><Lock className="w-3 h-3" /> Senha</label>
        <div className="relative">
          <input type={showPass ? "text" : "password"} value={fPassword} onChange={(e: any) => setFPassword(e.target.value)} placeholder="••••••••"
            className="w-full h-11 px-3 pr-11 rounded-xl bg-white/5 border border-white/10 focus:border-[#c69447]/40 focus:outline-none text-sm" />
          <button onClick={() => setShowPass(!showPass)} type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white/50 hover:text-white">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  </div>
);

const Row = ({ label, value, extra }: { label: string; value: string; extra?: string }) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="text-white/50 text-xs uppercase tracking-wider">{label}</span>
    <span className="font-medium text-right">
      {value}
      {extra && <span className="ml-2 text-[#e5b877] font-bold tabular-nums">{extra}</span>}
    </span>
  </div>
);

// ---------- ETA Countdown (baseado em timestamp do servidor) ----------
const EtaCountdown = ({ endTs, userId, onNotify }: {
  endTs: number;
  userId: string | null;
  onNotify: (kind: "15" | "5" | "0", title: string, body: string) => void;
}) => {
  const [now, setNow] = useState(() => Date.now());
  const firedRef = (globalThis as any).__etaFired || ((globalThis as any).__etaFired = new Set<string>());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, Math.floor((endTs - now) / 1000));
  const mm = Math.floor(diff / 60);
  const ss = diff % 60;
  const isAlert = diff <= 15 * 60 && diff > 5 * 60;
  const isNext = diff <= 5 * 60 && diff > 0;
  const isDue = diff === 0;

  // Notificações nos thresholds
  useEffect(() => {
    if (!userId) return;
    const remaining = Math.floor((endTs - Date.now()) / 1000);
    const check = (threshold: number, key: string, title: string, body: string) => {
      const tag = `${userId}-${endTs}-${key}`;
      if (remaining <= threshold && !firedRef.has(tag)) {
        firedRef.add(tag);
        onNotify(key as any, title, body);
      }
    };
    check(15 * 60, "15", "Seu atendimento está se aproximando", "Recomendamos que você vá para a barbearia.");
    check(5 * 60, "5", "Você será o próximo", "Prepare-se, sua vez está chegando.");
    check(0, "0", "Sua vez chegou!", "Dirija-se à barbearia agora.");
  }, [now, endTs, userId]);

  const palette = isDue
    ? { border: "border-emerald-500/40", bg: "bg-emerald-500/[0.06]", text: "text-emerald-200", num: "text-emerald-200", icon: <CheckCircle2 className="w-4 h-4" /> }
    : isNext
      ? { border: "border-red-500/50", bg: "bg-red-500/[0.08]", text: "text-red-200", num: "text-red-300", icon: <AlertTriangle className="w-4 h-4" /> }
      : isAlert
        ? { border: "border-red-500/40", bg: "bg-red-500/[0.05]", text: "text-red-200", num: "text-red-300", icon: <AlertTriangle className="w-4 h-4" /> }
        : { border: "border-[#c69447]/35", bg: "bg-[#c69447]/[0.06]", text: "text-[#e5b877]", num: "text-[#e5b877]", icon: <Timer className="w-4 h-4" /> };

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl p-5 border ${palette.border} ${palette.bg} transition-colors`}>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${palette.border} ${palette.text} bg-black/20`}>
          {palette.icon}
          {isDue ? "Sua vez chegou" : isNext ? "Dirija-se para a barbearia" : isAlert ? "Vá para a barbearia agora" : "Prepare-se"}
        </span>
      </div>
      <div className="mt-3 text-sm text-white/70 leading-relaxed">
        {isDue
          ? "Sua vez chegou. Aguardando o barbeiro iniciar seu atendimento."
          : isNext
            ? "Você será o próximo atendimento."
            : isAlert
              ? "Sua vez está chegando. Recomendamos que você vá para a barbearia agora."
              : "Seu atendimento está se aproximando."}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <div className="text-[10px] uppercase tracking-widest text-white/40">Início previsto em</div>
      </div>
      <div className={`mt-1 text-5xl font-black tabular-nums tracking-tight ${palette.num}`}>
        {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
      </div>
    </motion.div>
  );
};

// ---------- Banner PWA de instalação ----------
const PwaInstallBanner = () => {
  const [prompt, setPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    const dismissed = Number(localStorage.getItem("pwa_banner_dismissed_at") || 0);
    const days = (Date.now() - dismissed) / (1000 * 60 * 60 * 24);
    if (dismissed && days < 7) return;

    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
    setVisible(false);
  };
  const dismiss = () => {
    localStorage.setItem("pwa_banner_dismissed_at", String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-[440px] z-40">
      <div className="rounded-2xl border border-white/10 bg-[hsl(220_25%_6%)]/95 backdrop-blur-xl shadow-2xl p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#c69447]/15 border border-[#c69447]/30 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-[#e5b877]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-white">Instalar aplicativo</div>
          <div className="text-[11px] text-white/60 leading-snug mt-0.5">
            Receba notificações em tempo real e acompanhe sua posição na fila.
          </div>
        </div>
        <button onClick={dismiss}
          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5">
          <X className="w-4 h-4" />
        </button>
        <button onClick={install}
          className="shrink-0 h-9 px-3.5 rounded-lg text-xs font-bold text-black bg-[#c69447] hover:bg-[#d4a656] transition-colors">
          Instalar
        </button>
      </div>
    </motion.div>
  );
};

export default Fila;

