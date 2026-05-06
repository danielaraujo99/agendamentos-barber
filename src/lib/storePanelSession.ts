/**
 * Sessão do painel administrativo da Loja (/loja/admin).
 * Totalmente separado de panel_users (admin de barbearia).
 */
const KEY = "lovable.storePanelSession";

export interface StorePanelSession {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "manager" | "staff";
  permissions: Record<string, boolean>;
  source: "store_panel_users" | "super_admin";
}

export const getStorePanelSession = (): StorePanelSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StorePanelSession) : null;
  } catch { return null; }
};

export const setStorePanelSession = (s: StorePanelSession) => {
  window.localStorage.setItem(KEY, JSON.stringify(s));
};

export const clearStorePanelSession = () => {
  window.localStorage.removeItem(KEY);
};
