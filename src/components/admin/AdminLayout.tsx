import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
  LayoutDashboard,
  Scissors,
  CalendarDays,
  Tag,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Users,
  Settings,
  ShoppingBag,
  MessageSquare,
  Wallet,
  Building2,
  Star,
  Receipt,
  Banknote,
  Percent,
  CreditCard,
  Package,
  Truck,
  UserCog,
} from "lucide-react";
import { isSuperAdmin } from "@/lib/superAdmin";
import { clearAdminMysqlSession, getAdminMysqlSession } from "@/lib/adminMysqlSession";
import { clearPanelUserSession, getPanelUserSession } from "@/hooks/usePanelSession";
import WelcomeSetupModal from "@/components/admin/WelcomeSetupModal";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { Sparkles } from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Agendamentos", path: "/admin/appointments", icon: CalendarDays },
  { label: "Fila de espera", path: "/admin/fila", icon: Users },
  { label: "Comandas", path: "/admin/commands", icon: Receipt },
  { label: "Caixa", path: "/admin/cashier", icon: Banknote },
  { label: "Financeiro", path: "/admin/finance", icon: Wallet },
  { label: "Comissões", path: "/admin/commissions", icon: Percent },
  { label: "Fiados", path: "/admin/credit", icon: CreditCard },
  { label: "Serviços", path: "/admin/services", icon: Scissors },
  { label: "Barbeiros", path: "/admin/barbers", icon: Users },
  { label: "Loja", path: "/admin/store", icon: ShoppingBag },
  { label: "Estoque", path: "/admin/inventory", icon: Package },
  { label: "Fornecedores", path: "/admin/suppliers", icon: Truck },
  { label: "Cupons", path: "/admin/coupons", icon: Tag },
  { label: "Avaliações", path: "/admin/reviews", icon: Star },
  { label: "ChatPro", path: "/admin/confg", icon: MessageSquare, superAdminOnly: true },
  { label: "Usuários", path: "/admin/users", icon: UserCog, superAdminOnly: true },
  { label: "Configurações", path: "/admin/settings", icon: Settings },
];

// Mapeamento de path → permission key (para alguns onde a chave não bate com o slug)
const PATH_PERMISSION: Record<string, string> = {
  "/admin/confg": "chatpro",
  "/admin/cashier": "cashier",
  "/admin/commands": "commands",
  "/admin/commissions": "finance", // depende de finance
  "/admin/credit": "credit",
  "/admin/inventory": "inventory",
  "/admin/suppliers": "inventory",
  "/admin/fila": "fila",
};

const AdminLayout = () => {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const t = useThemeColors();

  useEffect(() => {
    const checkAdmin = async () => {
      const panelSession = getPanelUserSession();
      if (panelSession) {
        setUserEmail(panelSession.email);
        setLoading(false);
        return;
      }
      const mysqlSession = getAdminMysqlSession();
      if (mysqlSession) {
        setUserEmail(mysqlSession.email);
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin");
      if (!roles || roles.length === 0) { await supabase.auth.signOut(); navigate("/admin/login"); return; }
      setUserEmail(session.user.email ?? null);
      setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  // Pré-carrega chunks da rota atual e adjacentes em idle (sem custo no 1º load)
  useEffect(() => {
    if (loading) return;
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
    const idle = (cb: () => void, delay = 1500) =>
      "requestIdleCallback" in window
        ? (window as any).requestIdleCallback(cb, { timeout: 3000 })
        : setTimeout(cb, delay);
    // Em mobile, só pré-carrega rotas mais usadas; desktop carrega todas
    idle(() => {
      void import("@/pages/admin/Dashboard");
      void import("@/pages/admin/Appointments");
      void import("@/pages/admin/Cashier");
      void import("@/pages/admin/Commands");
      if (!isMobile) {
        void import("@/pages/admin/Services");
        void import("@/pages/admin/Barbers");
        void import("@/pages/admin/Coupons");
        void import("@/pages/admin/StoreDashboard");
        void import("@/pages/admin/Finance");
        void import("@/pages/admin/Reviews");
        void import("@/pages/admin/Settings");
        void import("@/pages/admin/Commissions");
        void import("@/pages/admin/Credit");
        void import("@/pages/admin/Inventory");
        void import("@/pages/admin/Suppliers");
        void import("@/pages/admin/ChatProConfig");
        if (isSuperAdmin(userEmail)) void import("@/pages/admin/Barbershops");
      }
    }, 2500);
  }, [loading, userEmail]);


  // Hook de progresso (banner + welcome)
  const { steps, completedCount, totalCount, allDone, welcomeSeen, refresh } = useSetupProgress(userEmail);

  useEffect(() => {
    if (loading) return;
    if (welcomeSeen === false) setShowWelcome(true);
  }, [loading, welcomeSeen]);

  // Refresh progresso quando rota muda + fecha o menu mobile
  useEffect(() => { if (!loading) refresh(); setSidebarOpen(false); }, [location.pathname, loading, refresh]);

  const panelSession = getPanelUserSession();
  const mysqlSession = getAdminMysqlSession();
  // Permissões do usuário ativo: panel_users tem prioridade, senão mysql, senão tudo liberado
  const activePerms: Record<string, boolean> | null =
    panelSession?.permissions ?? (mysqlSession?.permissions as any) ?? null;
  const activeRole = panelSession?.role ?? mysqlSession?.role ?? "admin";

  const visibleNavItems = navItems.filter((it) => {
    if (it.superAdminOnly) return isSuperAdmin(userEmail);
    // Barbeiro: limitar a Dashboard, Agendamentos, Comissões, Configurações
    if (activeRole === "barber") {
      const allowedBarberPaths = new Set(["/admin", "/admin/appointments", "/admin/commissions", "/admin/settings"]);
      if (!allowedBarberPaths.has(it.path)) return false;
    }
    if (!activePerms) return true;
    const mapped = PATH_PERMISSION[it.path];
    const key = mapped || (it.path === "/admin" ? "dashboard" : it.path.split("/").pop() || "");
    return activePerms[key] !== false;
  });

  const handleLogout = async () => {
    clearPanelUserSession();
    clearAdminMysqlSession();
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: t.pageBgAlt }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'hsl(245 60% 55%)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{ background: t.pageBgAlt }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-[100dvh] w-[86vw] max-w-[300px] lg:w-64 lg:max-w-none flex flex-col transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: t.sidebarBg, borderRight: `1px solid ${t.border}` }}>
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'hsl(245 60% 55% / 0.15)', border: '1px solid hsl(245 60% 55% / 0.3)' }}>
              <Scissors className="w-4 h-4" style={{ color: 'hsl(245 60% 70%)' }} />
            </div>
            <span className="font-bold text-sm text-foreground">Admin Panel</span>
          </div>
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overscroll-contain scrollbar-hidden pb-6">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                style={isActive ? { background: 'hsl(245 60% 55% / 0.1)', border: '1px solid hsl(245 60% 55% / 0.15)' } : { border: '1px solid transparent' }}>
                <item.icon className="w-4 h-4" />
                {item.label}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto" style={{ color: 'hsl(245 60% 65%)' }} />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3" style={{ borderTop: `1px solid ${t.border}` }}>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive transition-all duration-200"
            style={{ border: '1px solid transparent' }}>
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>


      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 py-4"
          style={{ background: t.headerBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${t.border}` }}>
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex-1 min-w-0 truncate">
            {location.pathname === "/admin" ? (() => {
              const hour = new Date().getHours();
              const greeting = hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : hour >= 18 && hour < 24 ? "Boa noite" : "Boa madrugada";
              const who = panelSession?.full_name?.split(" ")[0] || (activeRole === "barber" ? "Barbeiro" : "Admin");
              return `${greeting}, ${who}.`;
            })() : navItems.find((i) => i.path === location.pathname)?.label || "Admin"}
          </h1>
          {activeRole !== "admin" && (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: 'hsl(245 60% 55% / 0.12)', color: 'hsl(245 60% 75%)', border: '1px solid hsl(245 60% 55% / 0.2)' }}>
              {activeRole === "barber" ? "Barbeiro" : "Gerente"}
            </span>
          )}
        </header>

        {welcomeSeen && !allDone && (
          <button
            onClick={() => setShowWelcome(true)}
            className="mx-4 sm:mx-6 mt-3 px-4 py-2.5 rounded-xl flex items-center gap-3 text-left transition hover:bg-white/[0.04]"
            style={{
              background: "hsl(0 0% 100% / 0.025)",
              border: "1px solid hsl(0 0% 100% / 0.06)",
            }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "hsl(0 0% 100% / 0.05)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
              <Sparkles className="w-4 h-4" style={{ color: "hsl(0 0% 70%)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                Configurações pendentes: {completedCount}/{totalCount}
              </p>
              <p className="text-[10px] text-muted-foreground">Clique aqui para retomar a configuração inicial</p>
            </div>
            <div className="hidden sm:block w-32 h-1 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.05)" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${(completedCount / totalCount) * 100}%`, background: "hsl(0 0% 70%)" }} />
            </div>
          </button>
        )}

        <main className="admin-mobile-stable flex-1 p-4 sm:p-6 overflow-auto"><Outlet /></main>
      </div>

      <WelcomeSetupModal
        open={showWelcome}
        adminName={userEmail?.split("@")[0] || null}
        adminEmail={userEmail}
        onClose={() => { setShowWelcome(false); refresh(); }}
      />
    </div>
  );
};

export default AdminLayout;
