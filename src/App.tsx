import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { StoreThemeProvider } from "@/contexts/StoreThemeContext";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const VilaNova = lazy(() => import("./pages/VilaNova"));
import HostnameResolver from "./components/HostnameResolver";
import MemberRouteGuard from "./components/MemberRouteGuard";
import LoginRedirectGuard from "./components/LoginRedirectGuard";
import { installAdminMysqlBridge } from "./lib/adminMysqlSession";
import { installTenantPublicBridge } from "./lib/tenantPublicBridge";

// Lazy: rotas secundárias e admin
const NotFound = lazy(() => import("./pages/NotFound"));
const Index = lazy(() => import("./pages/Index"));
const StorePage = lazy(() => import("./pages/StorePage"));
const Navigation = lazy(() => import("./pages/Navigation"));
const DemoSite = lazy(() => import("./pages/DemoSite"));
const BaixarSource = lazy(() => import("./pages/BaixarSource"));
const MemberLogin = lazy(() => import("./pages/MemberLogin"));
const MemberArea = lazy(() => import("./pages/MemberArea"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const Avaliacao = lazy(() => import("./pages/Avaliacao"));
const AvaliarPedido = lazy(() => import("./pages/AvaliarPedido"));
const TenantResolver = lazy(() => import("./components/TenantResolver"));
const TenantSite = lazy(() => import("./pages/tenant/TenantSite"));
const TenantBooking = lazy(() => import("./pages/tenant/TenantBooking"));
const LyneCloud = lazy(() => import("./pages/LyneCloud"));
const AgendaDireto = lazy(() => import("./pages/AgendaDireto"));
const Portifolio = lazy(() => import("./pages/Portifolio"));
const MemberPreviewDemo = lazy(() => import("./pages/MemberPreviewDemo"));

const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Services = lazy(() => import("./pages/admin/Services"));
const Barbers = lazy(() => import("./pages/admin/Barbers"));
const Appointments = lazy(() => import("./pages/admin/Appointments"));
const Coupons = lazy(() => import("./pages/admin/Coupons"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const StoreDashboard = lazy(() => import("./pages/admin/StoreDashboard"));
const Finance = lazy(() => import("./pages/admin/Finance"));
const ChatProConfig = lazy(() => import("./pages/admin/ChatProConfig"));
const WhatsAppProviders = lazy(() => import("./pages/admin/WhatsAppProviders"));
const Barbershops = lazy(() => import("./pages/admin/Barbershops"));
const Reviews = lazy(() => import("./pages/admin/Reviews"));
const ProductReviews = lazy(() => import("./pages/admin/ProductReviews"));
const Cashier = lazy(() => import("./pages/admin/Cashier"));
const Commands = lazy(() => import("./pages/admin/Commands"));
const Commissions = lazy(() => import("./pages/admin/Commissions"));
const Credit = lazy(() => import("./pages/admin/Credit"));
const Inventory = lazy(() => import("./pages/admin/Inventory"));
const Suppliers = lazy(() => import("./pages/admin/Suppliers"));
const UsersAdmin = lazy(() => import("./pages/admin/Users"));
const WhatsAppTemplates = lazy(() => import("./pages/admin/WhatsAppTemplates"));
const GoogleCalendar = lazy(() => import("./pages/admin/GoogleCalendar"));
const Fila = lazy(() => import("./pages/Fila"));
const AdminFila = lazy(() => import("./pages/admin/AdminFila"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000, // 5min — evita refetch entre navegações curtas
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

installAdminMysqlBridge();
installTenantPublicBridge();

const PageLoader = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-background">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

const StoreAdminLogin = lazy(() => import("./pages/store-admin/StoreAdminLogin"));
const StoreAdminLayout = lazy(() => import("./components/store-admin/StoreAdminLayout"));
const StoreAdminDashboard = lazy(() => import("./pages/store-admin/StoreDashboard"));
const StoreAdminProducts = lazy(() => import("./pages/store-admin/StoreProducts"));
const StoreAdminCategories = lazy(() => import("./pages/store-admin/StoreCategories"));
const StoreAdminOrders = lazy(() => import("./pages/store-admin/StoreOrders"));
const StoreAdminCoupons = lazy(() => import("./pages/store-admin/StoreCoupons"));
const StoreAdminCustomers = lazy(() => import("./pages/store-admin/StoreCustomers"));
const StoreAdminInventory = lazy(() => import("./pages/store-admin/StoreInventory"));
const StoreAdminSuppliers = lazy(() => import("./pages/store-admin/StoreSuppliers"));
const StoreAdminFinance = lazy(() => import("./pages/store-admin/StoreFinance"));
const StoreAdminSettings = lazy(() => import("./pages/store-admin/StoreSettings"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider>
          <StoreThemeProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Fila agora é a home */}
              <Route path="/" element={<HostnameResolver mode="wrapper" />}>
                <Route index element={<Fila />} />
                <Route path="fila" element={<Fila />} />
              </Route>

              {/* Site comercial (antiga home) movido para /comercial */}
              <Route path="/comercial" element={<HostnameResolver fallback={<VilaNova />} />} />

              {/* Site comercial LyneCloud — sempre global, ignora tenant */}
              <Route path="/lynecloud" element={<LyneCloud />} />

              {/* Portfólio comercial — sempre global */}
              <Route path="/portifolio" element={<Portifolio />} />
              <Route path="/portfolio" element={<Portifolio />} />
              <Route path="/portifolio/preview/membro" element={<MemberPreviewDemo />} />
              <Route path="/portfolio/preview/membro" element={<MemberPreviewDemo />} />

              {/* Rotas públicas antigas bloqueadas — redirecionam para a fila */}
              <Route element={<HostnameResolver mode="wrapper" />}>
                <Route path="/agenda" element={<Navigate to="/" replace />} />
                <Route path="/agenda-direto" element={<Navigate to="/" replace />} />
                <Route path="/loja" element={<Navigate to="/" replace />} />
                <Route path="/navegacao" element={<Navigate to="/" replace />} />
                <Route path="/demo-site" element={<Navigate to="/" replace />} />
                <Route path="/avaliacao" element={<Navigate to="/" replace />} />
                <Route path="/avaliar-pedido/:token" element={<Navigate to="/" replace />} />
              </Route>

              {/* Loja Admin (totalmente separado do admin de barbearia) */}
              <Route path="/loja/admin/login" element={<StoreAdminLogin />} />
              <Route path="/loja/admin" element={<StoreAdminLayout />}>
                <Route index element={<StoreAdminDashboard />} />
                <Route path="products" element={<StoreAdminProducts />} />
                <Route path="categories" element={<StoreAdminCategories />} />
                <Route path="orders" element={<StoreAdminOrders />} />
                <Route path="reviews" element={<ProductReviews />} />
                <Route path="coupons" element={<StoreAdminCoupons />} />
                <Route path="inventory" element={<StoreAdminInventory />} />
                <Route path="suppliers" element={<StoreAdminSuppliers />} />
                <Route path="customers" element={<StoreAdminCustomers />} />
                <Route path="finance" element={<StoreAdminFinance />} />
                <Route path="whatsapp" element={<WhatsAppProviders />} />
                <Route path="settings" element={<StoreAdminSettings />} />
              </Route>

              {/* Site público por barbearia */}
              <Route path="/s/:slug" element={<TenantResolver />}>
                <Route path="agenda" element={<Index />} />
                <Route path="loja" element={<StorePage />} />
                <Route path="avaliacao" element={<Avaliacao />} />
                <Route path="navegacao" element={<Navigation />} />
                <Route element={<LoginRedirectGuard />}>
                  <Route path="login" element={<MemberLogin />} />
                </Route>
                <Route element={<MemberRouteGuard />}>
                  <Route path="membro" element={<MemberArea />} />
                  <Route path="membro/notificacoes" element={<NotificationsPage />} />
                </Route>
                <Route path="admin/login" element={<AdminLogin />} />
                <Route path="admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="finance" element={<Finance />} />
                  <Route path="services" element={<Services />} />
                  <Route path="barbers" element={<Barbers />} />
                  <Route path="appointments" element={<Appointments />} />
                  <Route path="fila" element={<AdminFila />} />
                  <Route path="coupons" element={<Coupons />} />
                  <Route path="store" element={<StoreDashboard />} />
                  <Route path="confg" element={<WhatsAppProviders />} />
                  <Route path="whatsapp-templates" element={<WhatsAppTemplates />} />
                  <Route path="google-calendar" element={<GoogleCalendar />} />
                  <Route path="reviews" element={<Reviews />} />
                  <Route path="product-reviews" element={<ProductReviews />} />
                  <Route path="cashier" element={<Cashier />} />
                  <Route path="commands" element={<Commands />} />
                  <Route path="commissions" element={<Commissions />} />
                  <Route path="credit" element={<Credit />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="suppliers" element={<Suppliers />} />
                  <Route path="users" element={<UsersAdmin />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route path="preview" element={<TenantSite />} />
                <Route path="preview/agenda" element={<TenantBooking />} />
              </Route>

              <Route element={<HostnameResolver mode="wrapper" />}>
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/membro" element={<Navigate to="/" replace />} />
                <Route path="/membro/notificacoes" element={<Navigate to="/" replace />} />
                <Route path="/baixar-source" element={<Navigate to="/" replace />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="finance" element={<Finance />} />
                  <Route path="services" element={<Services />} />
                  <Route path="barbers" element={<Barbers />} />
                  <Route path="appointments" element={<Appointments />} />
                  <Route path="fila" element={<AdminFila />} />
                  <Route path="coupons" element={<Coupons />} />
                  <Route path="store" element={<StoreDashboard />} />
                  <Route path="confg" element={<WhatsAppProviders />} />
                  <Route path="whatsapp-templates" element={<WhatsAppTemplates />} />
                  <Route path="google-calendar" element={<GoogleCalendar />} />
                  <Route path="barbershops" element={<Barbershops />} />
                  <Route path="reviews" element={<Reviews />} />
                  <Route path="product-reviews" element={<ProductReviews />} />
                  <Route path="cashier" element={<Cashier />} />
                  <Route path="commands" element={<Commands />} />
                  <Route path="commissions" element={<Commissions />} />
                  <Route path="credit" element={<Credit />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="suppliers" element={<Suppliers />} />
                  <Route path="users" element={<UsersAdmin />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Route>

              {/* Legacy redirects — bloqueados, vão para a fila */}
              <Route path="/vilanova" element={<Navigate to="/" replace />} />
              <Route path="/vilanova/login" element={<Navigate to="/" replace />} />
              <Route path="/vilanova/membro" element={<Navigate to="/" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </StoreThemeProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
