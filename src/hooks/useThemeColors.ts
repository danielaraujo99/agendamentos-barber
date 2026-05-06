import { useEffect, useState } from "react";
import { useIsLightMode } from "@/contexts/ThemeContext";
import { DEFAULT_THEME, type ThemeId } from "@/theme/themes";

function getCurrentTheme(): ThemeId {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return ((document.documentElement.dataset.theme as ThemeId) || DEFAULT_THEME);
}

export const useThemeColors = () => {
  const legacyLight = useIsLightMode();
  const [theme, setTheme] = useState<ThemeId>(getCurrentTheme);

  useEffect(() => {
    const handler = () => setTheme(getCurrentTheme());
    window.addEventListener("themechange", handler);
    return () => window.removeEventListener("themechange", handler);
  }, []);

  const isLight = theme === "light-clean" || theme === "soft-beauty" || legacyLight;
  const isSoft = theme === "soft-beauty";

  // Soft Beauty palette overrides (rose-toned)
  if (isSoft) {
    return {
      isLight: true,
      pageBg: "hsl(340 30% 97%)",
      pageBgAlt: "hsl(340 25% 95%)",
      cardBg: "hsl(0 0% 100%)",
      cardBgSubtle: "hsl(0 0% 100%)",
      cardBgHover: "hsl(340 25% 97%)",
      cardBgActive: "hsl(340 25% 95%)",
      border: "hsl(340 20% 90%)",
      borderSubtle: "hsl(340 20% 92%)",
      borderStrong: "hsl(340 20% 85%)",
      textPrimary: "hsl(340 25% 18%)",
      textSecondary: "hsl(340 10% 42%)",
      textMuted: "hsl(340 10% 55%)",
      textSubtle: "hsl(340 10% 65%)",
      textLink: "hsl(340 65% 45%)",
      textInverse: "hsl(0 0% 100%)",
      btnBg: "hsl(340 65% 55%)",
      btnColor: "hsl(0 0% 100%)",
      btnShadow: "0 2px 8px hsl(340 65% 50% / 0.25)",
      btnGhostBg: "hsl(340 25% 95%)",
      btnGhostBorder: "hsl(340 20% 90%)",
      btnGhostColor: "hsl(340 25% 30%)",
      headerBg: "hsl(340 30% 97% / 0.92)",
      modalBg: "hsl(340 30% 97% / 0.95)",
      modalCardBg: "hsl(0 0% 100%)",
      sidebarBg: "hsl(0 0% 100%)",
      sidebarHeaderBorder: "hsl(340 20% 92%)",
      inputBg: "hsl(340 20% 97%)",
      inputBorder: "hsl(340 20% 88%)",
      cardShadow: "0 1px 3px hsl(340 30% 30% / 0.06), 0 1px 2px hsl(340 30% 30% / 0.04)",
      cardShadowMd: "0 4px 12px hsl(340 30% 30% / 0.08)",
      cardShadowLg: "0 8px 24px hsl(340 30% 30% / 0.1)",
      accentPurple: "hsl(340 65% 55%)",
      accentPurpleLight: "hsl(340 65% 65%)",
      accentPurpleBg: "hsl(340 65% 55% / 0.08)",
      accentPurpleBorder: "hsl(340 65% 55% / 0.15)",
      drawerBg: "hsl(0 0% 100%)",
      overlayBg: "hsl(340 30% 15% / 0.3)",
      tooltipBg: "hsl(0 0% 100%)",
      tooltipBorder: "hsl(340 20% 88%)",
      tooltipColor: "hsl(340 25% 18%)",
    };
  }

  return {
    isLight,
    pageBg: isLight ? "hsl(220 15% 97%)" : "hsl(220 20% 4%)",
    pageBgAlt: isLight ? "hsl(220 12% 95%)" : "hsl(220 18% 5%)",
    cardBg: isLight ? "hsl(0 0% 100%)" : "hsl(0 0% 100% / 0.03)",
    cardBgSubtle: isLight ? "hsl(0 0% 100%)" : "hsl(0 0% 100% / 0.04)",
    cardBgHover: isLight ? "hsl(220 12% 97%)" : "hsl(0 0% 100% / 0.06)",
    cardBgActive: isLight ? "hsl(220 12% 95%)" : "hsl(0 0% 100% / 0.08)",
    border: isLight ? "hsl(220 12% 88%)" : "hsl(0 0% 100% / 0.08)",
    borderSubtle: isLight ? "hsl(220 12% 90%)" : "hsl(0 0% 100% / 0.06)",
    borderStrong: isLight ? "hsl(220 12% 82%)" : "hsl(0 0% 100% / 0.12)",
    textPrimary: isLight ? "hsl(220 20% 12%)" : "hsl(0 0% 93%)",
    textSecondary: isLight ? "hsl(220 10% 42%)" : "hsl(0 0% 50%)",
    textMuted: isLight ? "hsl(220 10% 55%)" : "hsl(0 0% 40%)",
    textSubtle: isLight ? "hsl(220 10% 65%)" : "hsl(0 0% 100% / 0.35)",
    textLink: isLight ? "hsl(220 15% 30%)" : "hsl(0 0% 60%)",
    textInverse: isLight ? "hsl(0 0% 98%)" : "hsl(220 20% 7%)",
    btnBg: isLight ? "hsl(220 20% 12%)" : "hsl(0 0% 95%)",
    btnColor: isLight ? "hsl(0 0% 98%)" : "hsl(220 20% 7%)",
    btnShadow: isLight ? "0 2px 8px hsl(220 15% 20% / 0.12)" : "0 4px 20px hsl(0 0% 100% / 0.15)",
    btnGhostBg: isLight ? "hsl(220 10% 94%)" : "hsl(0 0% 100% / 0.06)",
    btnGhostBorder: isLight ? "hsl(220 12% 88%)" : "hsl(0 0% 100% / 0.08)",
    btnGhostColor: isLight ? "hsl(220 10% 42%)" : "hsl(0 0% 70%)",
    headerBg: isLight ? "hsl(220 15% 97% / 0.92)" : "hsl(220 20% 4% / 0.85)",
    modalBg: isLight ? "hsl(220 15% 97% / 0.95)" : "hsl(220 20% 4% / 0.9)",
    modalCardBg: isLight ? "hsl(0 0% 100%)" : "hsl(0 0% 100% / 0.04)",
    sidebarBg: isLight ? "hsl(0 0% 100%)" : "hsl(230 18% 8%)",
    sidebarHeaderBorder: isLight ? "hsl(220 12% 90%)" : "hsl(0 0% 100% / 0.06)",
    inputBg: isLight ? "hsl(220 15% 97%)" : "hsl(0 0% 100% / 0.04)",
    inputBorder: isLight ? "hsl(220 12% 87%)" : "hsl(0 0% 100% / 0.08)",
    cardShadow: isLight ? "0 1px 3px hsl(220 15% 20% / 0.06), 0 1px 2px hsl(220 15% 20% / 0.04)" : "none",
    cardShadowMd: isLight ? "0 4px 12px hsl(220 15% 20% / 0.08), 0 1px 3px hsl(220 15% 20% / 0.06)" : "none",
    cardShadowLg: isLight ? "0 8px 24px hsl(220 15% 20% / 0.1), 0 2px 6px hsl(220 15% 20% / 0.06)" : "none",
    accentPurple: "hsl(245 60% 55%)",
    accentPurpleLight: "hsl(245 60% 65%)",
    accentPurpleBg: isLight ? "hsl(245 60% 55% / 0.08)" : "hsl(245 60% 55% / 0.1)",
    accentPurpleBorder: isLight ? "hsl(245 60% 55% / 0.15)" : "hsl(245 60% 55% / 0.2)",
    drawerBg: isLight ? "hsl(0 0% 100%)" : "hsl(220 18% 6%)",
    overlayBg: isLight ? "hsl(0 0% 0% / 0.3)" : "hsl(0 0% 0% / 0.6)",
    tooltipBg: isLight ? "hsl(0 0% 100%)" : "hsl(230 18% 11%)",
    tooltipBorder: isLight ? "hsl(220 12% 88%)" : "hsl(0 0% 100% / 0.1)",
    tooltipColor: isLight ? "hsl(220 20% 12%)" : "hsl(0 0% 90%)",
  };
};
