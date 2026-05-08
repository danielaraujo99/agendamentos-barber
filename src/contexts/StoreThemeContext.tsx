import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type StoreThemeName = "default" | "pink-dark" | "pink-light";

interface Ctx {
  theme: StoreThemeName;
  setTheme: (t: StoreThemeName) => Promise<void>;
  accent: string;
  accentLight: string;
  accentSoft: string;
  accentBorder: string;
  isLight: boolean;
}

const LS_KEY = "lovable.storeTheme";
const ACCENTS: Record<StoreThemeName, { accent: string; light: string; soft: string; border: string; isLight: boolean }> = {
  default:     { accent: "hsl(245 60% 55%)", light: "hsl(245 60% 70%)", soft: "hsl(245 60% 55% / 0.14)", border: "hsl(245 60% 55% / 0.28)", isLight: false },
  "pink-dark": { accent: "hsl(330 80% 60%)", light: "hsl(330 85% 72%)", soft: "hsl(330 80% 60% / 0.16)", border: "hsl(330 80% 60% / 0.32)", isLight: false },
  "pink-light":{ accent: "hsl(335 75% 55%)", light: "hsl(335 80% 68%)", soft: "hsl(335 75% 55% / 0.10)", border: "hsl(335 75% 55% / 0.28)", isLight: true  },
};

const StoreThemeCtx = createContext<Ctx | null>(null);

export const StoreThemeProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [theme, setThemeState] = useState<StoreThemeName>(() => {
    if (typeof window === "undefined") return "default";
    const v = localStorage.getItem(LS_KEY) as StoreThemeName;
    return v === "default" || v === "pink-dark" || v === "pink-light" ? v : "default";
  });

  // Aplica o atributo no <html> apenas em rotas /loja*
  useEffect(() => {
    const isStore = location.pathname.startsWith("/loja");
    const root = document.documentElement;
    // limpa antes para não vazar
    root.removeAttribute("data-store-theme");
    if (isStore && (theme === "pink-dark" || theme === "pink-light")) {
      root.setAttribute("data-store-theme", theme);
    }
    // tema light global precisa da classe light-theme — só na loja
    if (isStore && theme === "pink-light") {
      root.classList.add("light-theme");
    } else if (!isStore || theme !== "pink-light") {
      // só remove se foi aplicado por nós (evita conflito com outros toggles globais)
      // a pista é o data-store-theme=pink-light que já removemos acima
      if (!isStore) root.classList.remove("light-theme");
    }
    return () => {
      root.removeAttribute("data-store-theme");
      // ao desmontar/sair da loja, garantir que light-theme global some se foi por nós
      if (theme === "pink-light") root.classList.remove("light-theme");
    };
  }, [theme, location.pathname]);

  // Carrega do servidor 1x
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("value")
        .eq("key", "store_theme")
        .maybeSingle();
      if (!alive) return;
      const v = (data?.value as StoreThemeName) || "default";
      if (v === "default" || v === "pink-dark" || v === "pink-light") {
        setThemeState(v);
        localStorage.setItem(LS_KEY, v);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("store_theme_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_settings", filter: "key=eq.store_theme" },
        (payload) => {
          const v = (payload.new as any)?.value as StoreThemeName | undefined;
          if (v === "default" || v === "pink-dark" || v === "pink-light") {
            setThemeState(v);
            localStorage.setItem(LS_KEY, v);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const setTheme = async (t: StoreThemeName) => {
    setThemeState(t);
    localStorage.setItem(LS_KEY, t);
    const { data: exist } = await supabase.from("store_settings").select("id").eq("key", "store_theme").maybeSingle();
    if (exist) await supabase.from("store_settings").update({ value: t }).eq("id", exist.id);
    else await supabase.from("store_settings").insert({ key: "store_theme", value: t });
  };

  const value = useMemo<Ctx>(() => {
    const a = ACCENTS[theme];
    return { theme, setTheme, accent: a.accent, accentLight: a.light, accentSoft: a.soft, accentBorder: a.border, isLight: a.isLight };
  }, [theme]);

  return <StoreThemeCtx.Provider value={value}>{children}</StoreThemeCtx.Provider>;
};

export const useStoreTheme = () => {
  const v = useContext(StoreThemeCtx);
  if (!v) {
    return {
      theme: "default" as StoreThemeName,
      setTheme: async () => {},
      accent: ACCENTS.default.accent,
      accentLight: ACCENTS.default.light,
      accentSoft: ACCENTS.default.soft,
      accentBorder: ACCENTS.default.border,
      isLight: false,
    };
  }
  return v;
};
