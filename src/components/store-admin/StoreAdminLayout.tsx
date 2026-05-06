import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingBag, LayoutDashboard, Package, Tag, Boxes, Truck, Users,
  Receipt, Wallet, Star, MessageSquare, Settings, LogOut, Menu, X, ChevronRight,
} from "lucide-react";
import { useThemeColors } from "@/hooks/useThemeColors";
import { clearStorePanelSession, getStorePanelSession } from "@/lib/storePanelSession";

const ACCENT = "hsl(280 70% 60%)";
const ACCENT_LIGHT = "hsl(280 70% 70%)";
const ACCENT_BG = "hsl(280 70% 60% / 0.1)";
const ACCENT_BORDER = "hsl(280 70% 60% / 0.15)";
const ACCENT_BORDER_STRONG = "hsl(280 70% 60% / 0.3)";

interface NavItem { label: string; path: string; icon: typeof LayoutDashboard; permKey?: string; }

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/loja/admin", icon: LayoutDashboard, permKey: "dashboard" },
  { label: "Pedidos", path: "/loja/admin/orders", icon: Receipt, permKey: "orders" },
  { label: "Produtos", path: "/loja/admin/products", icon: Package, permKey: "products" },
  { label: "Categorias", path: "/loja/admin/categories", icon: Tag, permKey: "categories" },
  { label: "Estoque", path: "/loja/admin/inventory", icon: Boxes, permKey: "inventory" },
  { label: "Fornecedores", path: "/loja/admin/suppliers", icon: Truck, permKey: "suppliers" },
  { label: "Clientes", path: "/loja/admin/customers", icon: Users, permKey: "customers" },
  { label: "Cupons", path: "/loja/admin/coupons", icon: Tag, permKey: "coupons" },
  { label: "Financeiro", path: "/loja/admin/finance", icon: Wallet, permKey: "finance" },
  { label: "Avaliações", path: "/loja/admin/reviews", icon: Star, permKey: "reviews" },
  { label: "WhatsApp", path: "/loja/admin/whatsapp", icon: MessageSquare, permKey: "whatsapp" },
  { label: "Configurações", path: "/loja/admin/settings", icon: Settings, permKey: "settings" },
];

const StoreAdminLayout = () => {
  const t = useThemeColors();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const session = getStorePanelSession();

  useEffect(() => {
    if (!session) navigate("/loja/admin/login");
  }, [session, navigate]);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  if (!session) return null;

  const perms = session.permissions || {};
  const visible = navItems.filter((it) => {
    if (session.source === "super_admin") return true;
    if (!it.permKey) return true;
    return perms[it.permKey] !== false;
  });

  const handleLogout = () => {
    clearStorePanelSession();
    navigate("/loja/admin/login");
  };

  const currentLabel = navItems.find((i) => i.path === location.pathname)?.label || "Loja";

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{ background: t.pageBgAlt }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-[100dvh] w-[86vw] max-w-[300px] lg:w-64 lg:max-w-none flex flex-col transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: t.sidebarBg, borderRight: `1px solid ${t.border}` }}
      >
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER_STRONG}` }}>
              <ShoppingBag className="w-4 h-4" style={{ color: ACCENT_LIGHT }} />
            </div>
            <span className="font-bold text-sm text-foreground">Painel Loja</span>
          </div>
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overscroll-contain scrollbar-hidden pb-6">
          {visible.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                style={isActive ? { background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` } : { border: "1px solid transparent" }}>
                <item.icon className="w-4 h-4" />
                {item.label}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto" style={{ color: ACCENT_LIGHT }} />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3" style={{ borderTop: `1px solid ${t.border}` }}>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive transition-all"
            style={{ border: "1px solid transparent" }}>
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 py-4"
          style={{ background: t.headerBg, backdropFilter: "blur(12px)", borderBottom: `1px solid ${t.border}` }}>
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex-1 min-w-0 truncate">
            {currentLabel}
          </h1>
          <span className="hidden sm:inline px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: ACCENT_BG, color: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}` }}>
            {session.source === "super_admin" ? "Super Admin" : session.role}
          </span>
        </header>

        <main className="admin-mobile-stable flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StoreAdminLayout;
