import { create } from "zustand";
import type { ThemeMode, ThemeSettings } from "../types";
import { themeDb } from "../db/db";

const DEFAULT_MODE: ThemeMode = "dark";
const DEFAULT_ACCENT = "#1db954";

const THEME_COLOR: Record<ThemeMode, string> = {
  dark: "#060608",
  light: "#f5f5f5",
  oled: "#000000",
};

type ThemeState = {
  mode: ThemeMode;
  accent: string;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: string) => void;
  resetTheme: () => void;
  hydrate: () => Promise<void>;
};

const parseHexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const cleaned = hex.replace(/^#/, "").trim();
  if (!/^[a-fA-F0-9]{6}$/.test(cleaned)) return null;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return { r, g, b };
};

const applyThemeToDocument = (settings: ThemeSettings) => {
  const { mode, accent } = settings;
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode === "light" ? "light" : "dark";

  root.style.setProperty("--color-accent", accent);
  const rgb = parseHexToRgb(accent);
  if (rgb) {
    root.style.setProperty("--color-accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[mode]);
};

const DEFAULT_SETTINGS: ThemeSettings = {
  mode: DEFAULT_MODE,
  accent: DEFAULT_ACCENT,
};

applyThemeToDocument(DEFAULT_SETTINGS);

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: DEFAULT_MODE,
  accent: DEFAULT_ACCENT,
  setMode: (mode) => {
    const next: ThemeSettings = { mode, accent: get().accent || DEFAULT_ACCENT };
    set({ mode: next.mode, accent: next.accent });
    applyThemeToDocument(next);
    void themeDb.set(next);
  },
  setAccent: (accent) => {
    const next: ThemeSettings = { mode: get().mode || DEFAULT_MODE, accent };
    set({ mode: next.mode, accent: next.accent });
    applyThemeToDocument(next);
    void themeDb.set(next);
  },
  resetTheme: () => {
    set({ mode: DEFAULT_SETTINGS.mode, accent: DEFAULT_SETTINGS.accent });
    applyThemeToDocument(DEFAULT_SETTINGS);
    void themeDb.set(DEFAULT_SETTINGS);
  },
  hydrate: async () => {
    const stored = await themeDb.get();
    if (stored) {
      const isLegacyModeOnly = typeof (stored as unknown as ThemeSettings | ThemeMode) === "string";
      const settings: ThemeSettings = isLegacyModeOnly
        ? { mode: stored as unknown as ThemeMode, accent: DEFAULT_ACCENT }
        : (stored as ThemeSettings);

      set({ mode: settings.mode, accent: settings.accent || DEFAULT_ACCENT });
      applyThemeToDocument({
        mode: settings.mode,
        accent: settings.accent || DEFAULT_ACCENT,
      });
      return;
    }
    set({ mode: DEFAULT_SETTINGS.mode, accent: DEFAULT_SETTINGS.accent });
    applyThemeToDocument(DEFAULT_SETTINGS);
  },
}));

export { applyThemeToDocument };
