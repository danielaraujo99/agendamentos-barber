import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Search, Package, Sparkles, Truck, ShieldCheck, Star, User, CreditCard, QrCode, BadgeCheck, RotateCcw, Headphones, Shirt, MapPin } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useProductRatings } from "@/hooks/useProductRatings";
import storeHero from "@/assets/vilanova-hero-1.jpg";
import type { User as AuthUser } from "@supabase/supabase-js";

// Lazy: modais e telas que só abrem por interação
const CheckoutModal = lazy(() => import("@/components/store/CheckoutModal"));
const OrderTracker = lazy(() => import("@/components/store/OrderTracker"));
const AuthRequiredModal = lazy(() => import("@/components/store/AuthRequiredModal"));
const ProductDetailModal = lazy(() => import("@/components/store/ProductDetailModal"));
const CartDrawer = lazy(() => import("@/components/store/CartDrawer"));
const AccountInline = lazy(() => import("@/components/store/AccountInline"));
const PromoModal = lazy(() => import("@/components/store/PromoModal"));

interface DBProduct {
  id: string; title: string; description: string | null; price: number;
  image_url: string | null; active: boolean; sort_order: number;
  category?: string | null;
  long_description?: string | null; brand?: string | null; weight?: string | null;
  stock?: number | null; highlights?: string[] | null; gallery?: string[] | null;
  created_at?: string | null;
}

const FALLBACK_CATEGORY_LABELS: Record<string, string> = {
  camisetas: "Camisetas Premium",
  roupas: "Camisetas Premium",
  bermudas: "Bermudas & Shorts",
  tenis: "Tênis & Calçados",
  moletons: "Moletons & Jaquetas",
  cabelo: "Finalizadores de Cabelo",
  barba: "Cuidados para Barba",
  pos_barba: "Pós-barba",
  combos: "Kits & Combos",
  acessorios: "Acessórios Masculinos",
  fragrancias: "Perfumes & Fragrâncias",
  geral: "Coleção Geral",
};

const StorePage = () => {
  const navigate = useNavigate();
  const t = useThemeColors();
  const ratings = useProductRatings();
  const cartHook = useCart();
  const { items: cart, total: cartTotal, count: cartCount, add: cartAdd, updateQty, remove, clear, user: cartUser } = cartHook;

  const [products, setProducts] = useState<DBProduct[]>([]);
  const [search, setSearch] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [showOrderTracker, setShowOrderTracker] = useState(false);
  const [authAfter, setAuthAfter] = useState<"checkout" | "account">("checkout");
  const [showCart, setShowCart] = useState(false);
  const [detailProduct, setDetailProduct] = useState<DBProduct | null>(null);
  const [storeEnabled, setStoreEnabled] = useState(true);
  const [storeOrderMode, setStoreOrderMode] = useState<"ifood" | "whatsapp">("whatsapp");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixType, setPixType] = useState("cpf");
  const [businessName, setBusinessName] = useState("Sua Loja");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [categoryMap, setCategoryMap] = useState<Record<string, { label: string; sort: number; icon?: string }>>({});
  const [activeCategory, setActiveCategory] = useState("todos");
  const [heroIndex, setHeroIndex] = useState(0);
  const [view, setView] = useState<"shop" | "account">("shop");

  const formatCategoryLabel = (key: string) =>
    categoryMap[key]?.label ||
    FALLBACK_CATEGORY_LABELS[key] ||
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      const [productsRes, settingsRes, catsRes] = await Promise.all([
        supabase.from("products")
          .select("id,title,description,price,image_url,active,sort_order,category,brand,stock,highlights,gallery,long_description,weight,created_at")
          .eq("active", true).order("sort_order"),
        supabase.from("business_settings").select("key,value")
          .in("key", ["store_enabled","store_order_mode","whatsapp_number","pix_key","pix_type","business_name"]),
        (supabase as any).from("product_categories").select("slug,label,icon,sort_order").eq("active", true).order("sort_order"),
      ]);
      if (productsRes.data) setProducts(productsRes.data as DBProduct[]);
      if (catsRes?.data) {
        const m: Record<string, { label: string; sort: number; icon?: string }> = {};
        for (const c of catsRes.data as any[]) m[c.slug] = { label: c.label, sort: c.sort_order, icon: c.icon };
        setCategoryMap(m);
      }
      if (settingsRes.data) {
        const map: Record<string, string> = {};
        for (const row of settingsRes.data) map[row.key] = row.value || "";
        setStoreEnabled(map.store_enabled !== "false");
        setStoreOrderMode((map.store_order_mode as any) || "whatsapp");
        setWhatsappNumber(map.whatsapp_number || "");
        setPixKey(map.pix_key || "");
        setPixType(map.pix_type || "cpf");
        if (map.business_name) setBusinessName(map.business_name);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Título independente da loja (não herda da barbearia)
  useEffect(() => {
    const previous = document.title;
    document.title = `${businessName} — Loja Online`;
    return () => { document.title = previous; };
  }, [businessName]);

  const categoryOptions = useMemo(() => {
    const keys = Array.from(new Set(products.map((p) => (p.category || "geral").toLowerCase())));
    return keys.sort((a, b) => (categoryMap[a]?.sort ?? 999) - (categoryMap[b]?.sort ?? 999));
  }, [products, categoryMap]);

  const heroProducts = useMemo(() => products.filter((p) => p.image_url).slice(0, 6), [products]);
  const currentHero = heroProducts[heroIndex] || null;

  const newArrivals = useMemo(() => {
    return [...products]
      .filter((p) => p.image_url)
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
      .slice(0, 8);
  }, [products]);

  const topRated = useMemo(() => {
    return [...products]
      .filter((p) => p.image_url && (ratings[p.id]?.count ?? 0) > 0)
      .sort((a, b) => (ratings[b.id]?.avg ?? 0) - (ratings[a.id]?.avg ?? 0))
      .slice(0, 8);
  }, [products, ratings]);

  useEffect(() => {
    if (heroProducts.length <= 1) return;
    const timer = window.setInterval(() => setHeroIndex((i) => (i + 1) % heroProducts.length), 4500);
    return () => window.clearInterval(timer);
  }, [heroProducts.length]);

  const filteredProducts = useMemo(() => {
    const byCategory = activeCategory === "todos"
      ? products
      : products.filter((p) => (p.category || "geral").toLowerCase() === activeCategory);
    if (!search) return byCategory;
    const q = search.toLowerCase();
    return byCategory.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q)
    );
  }, [search, products, activeCategory]);

  // Group filtered products by category, ordered by category sort_order
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, DBProduct[]>();
    for (const p of filteredProducts) {
      const key = (p.category || "geral").toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return Array.from(groups.entries()).sort((a, b) => {
      const sa = categoryMap[a[0]]?.sort ?? 999;
      const sb = categoryMap[b[0]]?.sort ?? 999;
      return sa - sb;
    });
  }, [filteredProducts, categoryMap]);

  const handleAddToCart = (product: DBProduct, qty: number = 1) => {
    cartAdd({ id: product.id, title: product.title, price: Number(product.price), image_url: product.image_url }, qty);
    setShowCart(true);
  };

  const openCheckout = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setAuthAfter("checkout");
      setShowAuthGate(true);
      return;
    }
    setUser(session.user);
    setShowCheckout(true);
  };

  const openOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) setUser(session.user);
    setShowOrderTracker(true);
  };

  const openAccount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setAuthAfter("account");
      setShowAuthGate(true);
      return;
    }
    setUser(session.user);
    setView("account");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const userPrefill = user ? {
    name: (user.user_metadata?.full_name as string) || "",
    phone: (user.user_metadata?.phone as string) || "",
    email: user.email || "",
  } : undefined;

  if (!loading && !storeEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: t.pageBg, color: t.textPrimary }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5" style={{ background: t.cardBgSubtle }}>
            <ShoppingBag className="w-7 h-7 opacity-60" />
          </div>
          <h1 className="text-2xl font-black mb-2">Loja indisponível</h1>
          <p className="text-sm opacity-60">Nossa loja online está temporariamente fora do ar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh]" style={{ background: t.pageBg, color: t.textPrimary, fontFamily: "'Montserrat', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 w-full" style={{ background: t.headerBg, backdropFilter: "blur(20px)", borderBottom: `1px solid ${t.border}` }}>
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ShoppingBag className="w-4 h-4 shrink-0" style={{ color: t.textLink }} />
            <span className="text-sm font-bold truncate">{businessName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowCart(true)} aria-label="Carrinho"
              className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all"
              style={{ background: t.btnGhostBg, color: t.btnGhostColor, border: `1px solid ${t.btnGhostBorder}` }}>
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Carrinho</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center" style={{ background: t.btnBg, color: t.btnColor }}>
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={openAccount}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all"
              style={{ background: view === "account" ? t.btnBg : t.btnGhostBg, color: view === "account" ? t.btnColor : t.btnGhostColor, border: `1px solid ${t.btnGhostBorder}` }}>
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Conta</span>
            </button>
            <button onClick={openOrders}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all"
              style={{ background: t.btnGhostBg, color: t.btnGhostColor, border: `1px solid ${t.btnGhostBorder}` }}>
              <Package className="w-3.5 h-3.5" />
              <span>Pedidos</span>
            </button>
          </div>
        </div>
      </header>

      {view === "account" && user ? (
        <Suspense fallback={<div className="min-h-[60vh]" />}>
          <AccountInline user={user} t={t} onBack={() => setView("shop")} onSignedOut={() => { setUser(null); setView("shop"); }} />
        </Suspense>
      ) : (
      <>
      {/* Hero compacto */}
      <section className="relative w-full">

        <div className="relative w-full h-[200px] sm:h-[260px] lg:h-[320px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img key={currentHero?.id || "hero"} src={currentHero?.image_url || storeHero} alt={currentHero?.title || businessName} className="absolute inset-0 w-full h-full object-cover" fetchPriority="high"
              initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} />
          </AnimatePresence>
          <div className="absolute inset-0" style={{
            background: "linear-gradient(180deg, hsl(220 20% 4% / 0.6) 0%, hsl(220 20% 4% / 0.4) 50%, hsl(220 20% 4% / 0.92) 100%)"
          }} />
          <div className="relative h-full w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 flex flex-col justify-end pb-7 sm:pb-10">
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase mb-2.5" style={{ background: "hsl(0 0% 100% / 0.12)", border: "1px solid hsl(0 0% 100% / 0.2)", color: "hsl(0 0% 95%)", backdropFilter: "blur(8px)" }}>
                <Sparkles className="w-3 h-3" /> Loja oficial
              </span>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.05]">
                {businessName}
              </h1>
              {currentHero && (
                <button onClick={() => setDetailProduct(currentHero)} className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white"
                  style={{ background: "hsl(0 0% 100% / 0.14)", border: "1px solid hsl(0 0% 100% / 0.22)", backdropFilter: "blur(10px)" }}>
                  <Shirt className="w-3.5 h-3.5" /> {currentHero.title}
                </button>
              )}
            </motion.div>
          </div>
        </div>

        {/* Trust strip — responsivo, ícones sempre cabem */}
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 -mt-5 sm:-mt-7 relative z-10">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 rounded-2xl p-2.5 sm:p-4" style={{ background: t.cardBg, border: `1px solid ${t.border}`, boxShadow: t.cardShadow, backdropFilter: "blur(12px)" }}>
            {[
              { icon: Truck, label: "Entrega", sub: "Coqueiral" },
              { icon: ShieldCheck, label: "Pagamento", sub: "PIX/Entrega" },
              { icon: Star, label: "Avaliada 5★", sub: "Pelos clientes" },
            ].map((it) => (
              <div key={it.label} className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.cardBgSubtle }}>
                  <it.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: t.textLink }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-bold truncate" style={{ color: t.textPrimary }}>{it.label}</p>
                  <p className="text-[9px] sm:text-[10px] opacity-60 truncate" style={{ color: t.textSecondary }}>{it.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 py-7 sm:py-10">
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-1">Catálogo</p>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Produtos</h2>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.textMuted }} />
              <input type="text" placeholder="Buscar produtos..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-foreground/15"
                style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.textPrimary }} />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: t.cardBgSubtle, height: 220 }} />
              ))}
            </div>
          ) : groupedProducts.length > 0 ? (
            <>
              {activeCategory === "todos" && !search && (newArrivals.length > 0 || topRated.length > 0) && (
                <div className="space-y-8 mb-10">
                  {newArrivals.length > 0 && (
                    <div>
                      <div className="flex items-end justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" style={{ color: t.textLink }} />
                          <h3 className="text-base sm:text-lg font-black tracking-tight">Novidades</h3>
                        </div>
                        <span className="text-[11px] opacity-60">Recém-chegados</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2 snap-x snap-mandatory">
                        {newArrivals.map((p, i) => (
                          <div key={p.id} className="snap-start shrink-0 w-[46%] sm:w-[28%] md:w-[22%] lg:w-[18%]">
                            <ProductCard
                              product={{ ...p, description: p.description || "" }}
                              onSelect={() => setDetailProduct(p)}
                              index={i}
                              rating={ratings[p.id]}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {topRated.length > 0 && (
                    <div>
                      <div className="flex items-end justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4" style={{ color: t.textLink }} />
                          <h3 className="text-base sm:text-lg font-black tracking-tight">Mais avaliados</h3>
                        </div>
                        <span className="text-[11px] opacity-60">Favoritos dos clientes</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2 snap-x snap-mandatory">
                        {topRated.map((p, i) => (
                          <div key={p.id} className="snap-start shrink-0 w-[46%] sm:w-[28%] md:w-[22%] lg:w-[18%]">
                            <ProductCard
                              product={{ ...p, description: p.description || "" }}
                              onSelect={() => setDetailProduct(p)}
                              index={i}
                              rating={ratings[p.id]}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {categoryOptions.length > 1 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3 -mx-1 px-1">
                  {["todos", ...categoryOptions].map((key) => {
                    const active = activeCategory === key;
                    const total = key === "todos" ? products.length : products.filter((p) => (p.category || "geral").toLowerCase() === key).length;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveCategory(key)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all hover:translate-y-[-1px]"
                        style={{ background: active ? t.btnBg : t.cardBgSubtle, color: active ? t.btnColor : t.textSecondary, border: `1px solid ${active ? t.btnBg : t.borderSubtle}` }}
                      >
                        {key === "todos" ? "Todos" : formatCategoryLabel(key)}
                        <span className="opacity-60">{total}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-10 sm:space-y-12">
                {groupedProducts.map(([catKey, items]) => (
                  <section key={catKey} id={`cat-${catKey}`} className="scroll-mt-20">
                    <div className="flex items-end justify-between gap-3 mb-3 sm:mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <h3 className="text-base sm:text-lg font-black tracking-tight truncate" style={{ color: t.textPrimary }}>
                          {formatCategoryLabel(catKey)}
                        </h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: t.cardBgSubtle, color: t.textMuted }}>
                          {items.length}
                        </span>
                      </div>
                      <div className="hidden sm:block flex-1 h-px" style={{ background: t.borderSubtle }} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                      {items.map((product, i) => (
                        <ProductCard
                          key={product.id}
                          product={{ ...product, description: product.description || "" }}
                          onSelect={() => setDetailProduct(product)}
                          index={i}
                          rating={ratings[product.id]}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl p-10 text-center" style={{ background: t.cardBg, border: `1px solid ${t.borderSubtle}` }}>
              <ShoppingBag className="w-10 h-10 mx-auto mb-3" style={{ color: t.textMuted }} />
              <p className="text-sm font-medium" style={{ color: t.textSecondary }}>Nenhum produto encontrado.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="w-full mt-4 pb-[calc(96px+env(safe-area-inset-bottom))] sm:pb-0" style={{ background: t.cardBg, borderTop: `1px solid ${t.border}` }}>
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 py-8 grid gap-6 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2 mb-2"><ShoppingBag className="w-4 h-4" style={{ color: t.textLink }} /><span className="text-sm font-black">{businessName}</span></div>
            <p className="text-xs leading-relaxed max-w-md" style={{ color: t.textMuted }}>Loja oficial com catálogo atualizado, carrinho salvo, pedidos acompanháveis e atendimento direto.</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Pagamentos</p>
            <div className="flex flex-wrap gap-2">
              {[{ label: "PIX", icon: QrCode }, { label: "VISA", icon: CreditCard }, { label: "Mastercard", icon: CreditCard }, { label: "Cartão", icon: CreditCard }].map((p) => (
                <span key={p.label} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: t.cardBgSubtle, color: t.textSecondary, border: `1px solid ${t.borderSubtle}` }}>
                  <p.icon className="w-3.5 h-3.5" /> {p.label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>Compra segura</p>
            <div className="grid gap-2 text-[11px]" style={{ color: t.textSecondary }}>
              <span className="flex items-center gap-2"><BadgeCheck className="w-3.5 h-3.5" /> Produtos conferidos</span>
              <span className="flex items-center gap-2"><RotateCcw className="w-3.5 h-3.5" /> Trocas combinadas no atendimento</span>
              <span className="flex items-center gap-2"><Headphones className="w-3.5 h-3.5" /> Suporte pelo WhatsApp</span>
              <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Retirada ou entrega local</span>
            </div>
          </div>
        </div>
      </footer>
      </>
      )}

      {/* Bottom nav mobile */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-[60] flex items-center justify-around px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]"
        style={{ background: t.headerBg, borderTop: `1px solid ${t.border}`, backdropFilter: "blur(20px)" }}>
        {[
          { id: "shop" as const, label: "Loja", icon: ShoppingBag, onClick: () => { setView("shop"); setActiveCategory("todos"); window.scrollTo({ top: 0, behavior: "smooth" }); } },
          { id: "cart" as const, label: "Carrinho", icon: ShoppingBag, onClick: () => setShowCart(true), badge: cartCount },
          { id: "orders" as const, label: "Pedidos", icon: Truck, onClick: () => openOrders() },
          { id: "account" as const, label: "Conta", icon: User, onClick: () => openAccount() },
        ].map((it) => {
          const active = (it.id === "shop" && view === "shop") || (it.id === "account" && view === "account");
          return (
            <button key={it.id} onClick={it.onClick}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-all"
              style={{ color: active ? t.textPrimary : t.textMuted }}>
              <span className="relative">
                <it.icon className="w-5 h-5" />
                {it.badge && it.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-black flex items-center justify-center leading-none" style={{ background: t.btnBg, color: t.btnColor }}>{it.badge}</span>
                ) : null}
              </span>
              <span className="text-[10px] font-bold">{it.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Floating cart — apenas em telas maiores (no mobile há bottom nav) */}
      <AnimatePresence>
        {cartCount > 0 && !showCart && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="hidden sm:block fixed bottom-6 left-4 right-4 max-w-md sm:max-w-lg mx-auto z-40">
            <button onClick={() => setShowCart(true)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl font-bold text-sm transition-all hover:translate-y-[-1px] active:scale-[0.99]"
              style={{ background: t.btnBg, color: t.btnColor, boxShadow: "0 12px 32px hsl(0 0% 0% / 0.25)" }}>
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {cartCount} {cartCount === 1 ? "item" : "itens"} · ver carrinho
              </span>
              <span>R$ {cartTotal.toFixed(2).replace(".", ",")}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        {showCart && (
          <CartDrawer
            open={showCart}
            onClose={() => setShowCart(false)}
            items={cart}
            total={cartTotal}
            count={cartCount}
            updateQty={updateQty}
            remove={remove}
            clear={clear}
            isLogged={!!cartUser}
            onCheckout={() => { setShowCart(false); openCheckout(); }}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <AnimatePresence>
          {detailProduct && (
            <ProductDetailModal
              product={{
                ...detailProduct,
                highlights: Array.isArray(detailProduct.highlights) ? detailProduct.highlights : [],
                gallery: Array.isArray(detailProduct.gallery) ? detailProduct.gallery : [],
              }}
              onClose={() => setDetailProduct(null)}
              onAdd={(qty) => handleAddToCart(detailProduct, qty)}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <Suspense fallback={null}>
        <AnimatePresence>
          {showAuthGate && (
            <AuthRequiredModal
              onClose={() => setShowAuthGate(false)}
              onAuthenticated={async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) setUser(session.user);
                setShowAuthGate(false);
                if (authAfter === "account") { setView("account"); window.scrollTo({ top: 0 }); }
                else setShowCheckout(true);
              }}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <Suspense fallback={null}>
        <AnimatePresence>
          {showOrderTracker && (
            <OrderTracker
              onClose={() => setShowOrderTracker(false)}
              customerPhone=""
              customerEmail={user?.email || undefined}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <Suspense fallback={null}>
        <AnimatePresence>
          {showCheckout && (
            <CheckoutModal
              items={cart}
              onClose={() => setShowCheckout(false)}
              onSuccess={() => { setShowCheckout(false); clear(); }}
              mode={storeOrderMode}
              whatsappNumber={whatsappNumber}
              pixKey={pixKey}
              pixType={pixType}
              prefill={userPrefill}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <Suspense fallback={null}><PromoModal /></Suspense>
    </div>
  );
};

export default StorePage;
