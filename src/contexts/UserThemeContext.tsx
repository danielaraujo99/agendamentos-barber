import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_THEME, THEMES, THEME_STORAGE_KEY, type ThemeId } from "@/theme/themes";

interface UserThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  themes: typeof THEMES;
}

const UserThemeContext = createContext<UserThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  themes: THEMES,
});

export const useUserTheme = () => useContext(UserThemeContext);

function readStored(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const v = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  if (v && THEMES.some((t) => t.id === v)) return v;
  return DEFAULT_THEME;
}

function applyTheme(id: ThemeId) {
  const html = document.documentElement;
  html.dataset.theme = id;
  // Compat: keep legacy .light-theme class for components still keyed on it
  const meta = THEMES.find((t) => t.id === id);
  if (meta?.mode === "light") {
    html.classList.add("light-theme");
  } else {
    html.classList.remove("light-theme");
  }
  // Notify inline-style consumers
  window.dispatchEvent(new CustomEvent("themechange", { detail: { id } }));
}

export const UserThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => readStored());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((id: ThemeId) => {
    localStorage.setItem(THEME_STORAGE_KEY, id);
    setThemeState(id);
  }, []);

  return (
    <UserThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </UserThemeContext.Provider>
  );
};
