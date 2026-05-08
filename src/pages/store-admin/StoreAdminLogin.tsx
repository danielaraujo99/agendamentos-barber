import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, ShoppingBag, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useThemeColors } from "@/hooks/useThemeColors";
import { setStorePanelSession, clearStorePanelSession } from "@/lib/storePanelSession";
import { isSuperAdmin } from "@/lib/superAdmin";

const ACCENT = "hsl(var(--store-accent))";
const ACCENT_LIGHT = "hsl(var(--store-accent-light))";
const ACCENT_BG = "hsl(var(--store-accent-soft))";
const ACCENT_BORDER = "hsl(var(--store-accent-border))";

const StoreAdminLogin = () => {
  const t = useThemeColors();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearStorePanelSession();

    // 1. store_panel_users
    try {
      const { data: rows, error } = await (supabase as any)
        .rpc("verify_store_panel_login", { _email: email, _plain: password });
      if (!error && Array.isArray(rows) && rows.length > 0) {
        const u = rows[0];
        setStorePanelSession({
          id: u.id, email: u.email, full_name: u.full_name,
          role: (u.role as any) || "manager",
          permissions: u.permissions || {},
          source: "store_panel_users",
        });
        await supabase.auth.signOut();
        toast.success(`Bem-vindo, ${u.full_name}!`);
        navigate("/loja/admin");
        return;
      }
    } catch {}

    // 2. super-admin via supabase auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin");
      if (roles && roles.length > 0) {
        setStorePanelSession({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.email!.split("@")[0],
          role: "admin",
          permissions: {},
          source: "super_admin",
        });
        toast.success("Bem-vindo!");
        navigate("/loja/admin");
        return;
      }
      await supabase.auth.signOut();
    }

    toast.error("Credenciais inválidas");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: t.pageBg }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-5xl grid md:grid-cols-2 gap-0 glass-card-strong overflow-hidden relative z-10"
      >
        <div className="hidden md:flex flex-col justify-center p-10 lg:p-14 relative overflow-hidden" style={{ background: t.cardBgSubtle }}>
          <div className="absolute w-80 h-80 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${ACCENT_BG}, transparent 70%)`, filter: "blur(40px)", left: "-20%", top: "30%" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}>
                <ShoppingBag className="w-6 h-6" style={{ color: ACCENT_LIGHT }} />
              </div>
              <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: ACCENT_LIGHT }}>PAINEL DA LOJA</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-foreground leading-tight mb-3">
              Gerencie sua <span style={{ color: ACCENT }}>Loja Online.</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Produtos, estoque, pedidos, clientes, fornecedores e financeiro — tudo em um só lugar.
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              {["Produtos", "Estoque", "Pedidos", "Financeiro"].map((it) => (
                <span key={it} className="glass-chip px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground rounded-lg">
                  {it}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-14">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}>
              <ShoppingBag className="w-5 h-5" style={{ color: ACCENT_LIGHT }} />
            </div>
            <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: ACCENT_LIGHT }}>LOJA</span>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Acesse o painel</h2>
            <Sparkles className="w-5 h-5" style={{ color: ACCENT }} />
          </div>
          <p className="text-muted-foreground text-sm mb-8">Digite seus dados para entrar.</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="glass-input pl-11" required />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="glass-input pl-11" required />
              </div>
            </div>
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: ACCENT, color: "white" }}>
              {loading ? "Entrando..." : (<>ENTRAR <ArrowRight className="w-4 h-4" /></>)}
            </motion.button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-6">
            Painel exclusivo da loja online
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default StoreAdminLogin;
