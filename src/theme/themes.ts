export type ThemeId = "dark-premium" | "light-clean" | "soft-beauty";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  preview: [string, string, string]; // bg, surface, brand
  mode: "dark" | "light";
}

export const THEMES: ThemeMeta[] = [
  {
    id: "dark-premium",
    name: "Dark Premium",
    description: "Visual moderno e sofisticado",
    preview: ["#0d1014", "#16191f", "#facc15"],
    mode: "dark",
  },
  {
    id: "light-clean",
    name: "Light Clean",
    description: "Profissional e institucional",
    preview: ["#f5f6f8", "#ffffff", "#1f2937"],
    mode: "light",
  },
  {
    id: "soft-beauty",
    name: "Soft Beauty",
    description: "Elegante e acolhedor",
    preview: ["#fbf2f3", "#ffffff", "#d6789a"],
    mode: "light",
  },
];

export const DEFAULT_THEME: ThemeId = "dark-premium";
export const THEME_STORAGE_KEY = "lovable.userTheme";
