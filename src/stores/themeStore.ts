import { create } from "zustand";
import type { MotionPreference, ThemeDensity, ThemeMode, ThemeSettings } from "../types";
import { themeDb } from "../db/db";

const DEFAULT_MODE: ThemeMode = "dark";
const DEFAULT_ACCENT = "#1db954";
const DEFAULT_DENSITY: ThemeDensity = "cozy";
const DEFAULT_MOTION: MotionPreference = "normal";

const THEME_COLOR: Record<ThemeMode, string> = {
  dark: "#060608",
  light: "#f5f5f5",
  oled: "#000000",
};

type ThemeState = {
  mode: ThemeMode;
  accent: string;
  density: ThemeDensity;
  motion: MotionPreference;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: string) => void;
  setDensity: (density: ThemeDensity) => void;
  setMotion: (motion: MotionPreference) => void;
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

const normalizeSettings = (settings: ThemeSettings): ThemeSettings => ({
  mode: settings.mode ?? DEFAULT_MODE,
  accent: settings.accent || DEFAULT_ACCENT,
  density: settings.density ?? DEFAULT_DENSITY,
  motion: settings.motion ?? DEFAULT_MOTION,
});

const applyThemeToDocument = (rawSettings: ThemeSettings) => {
  const settings = normalizeSettings(rawSettings);
  const { mode, accent, density, motion } = settings;
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.dataset.themeDensity = density;
  root.dataset.motion = motion;
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
  density: DEFAULT_DENSITY,
  motion: DEFAULT_MOTION,
};

applyThemeToDocument(DEFAULT_SETTINGS);

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: DEFAULT_MODE,
  accent: DEFAULT_ACCENT,
  density: DEFAULT_DENSITY,
  motion: DEFAULT_MOTION,
  setMode: (mode) => {
    const current = get();
    const next: ThemeSettings = normalizeSettings({
      mode,
      accent: current.accent,
      density: current.density,
      motion: current.motion,
    });
    set({
      mode: next.mode,
      accent: next.accent,
      density: next.density,
      motion: next.motion,
    });
    applyThemeToDocument(next);
    void themeDb.set(next);
  },
  setAccent: (accent) => {
    const current = get();
    const next: ThemeSettings = normalizeSettings({
      mode: current.mode,
      accent,
      density: current.density,
      motion: current.motion,
    });
    set({
      mode: next.mode,
      accent: next.accent,
      density: next.density,
      motion: next.motion,
    });
    applyThemeToDocument(next);
    void themeDb.set(next);
  },
  setDensity: (density) => {
    const current = get();
    const next: ThemeSettings = normalizeSettings({
      mode: current.mode,
      accent: current.accent,
      density,
      motion: current.motion,
    });
    set({
      mode: next.mode,
      accent: next.accent,
      density: next.density,
      motion: next.motion,
    });
    applyThemeToDocument(next);
    void themeDb.set(next);
  },
  setMotion: (motion) => {
    const current = get();
    const next: ThemeSettings = normalizeSettings({
      mode: current.mode,
      accent: current.accent,
      density: current.density,
      motion,
    });
    set({
      mode: next.mode,
      accent: next.accent,
      density: next.density,
      motion: next.motion,
    });
    applyThemeToDocument(next);
    void themeDb.set(next);
  },
  resetTheme: () => {
    const normalized = normalizeSettings(DEFAULT_SETTINGS);
    set({
      mode: normalized.mode,
      accent: normalized.accent,
      density: normalized.density,
      motion: normalized.motion,
    });
    applyThemeToDocument(normalized);
    void themeDb.set(normalized);
  },
  hydrate: async () => {
    const stored = await themeDb.get();
    if (stored) {
      const isLegacyModeOnly = typeof (stored as unknown as ThemeSettings | ThemeMode) === "string";
      const settings: ThemeSettings = isLegacyModeOnly
        ? {
            mode: stored as unknown as ThemeMode,
            accent: DEFAULT_ACCENT,
            density: DEFAULT_DENSITY,
            motion: DEFAULT_MOTION,
          }
        : normalizeSettings(stored as ThemeSettings);

      const normalized = normalizeSettings(settings);
      set({
        mode: normalized.mode,
        accent: normalized.accent,
        density: normalized.density,
        motion: normalized.motion,
      });
      applyThemeToDocument(normalized);
      return;
    }
    const normalized = normalizeSettings(DEFAULT_SETTINGS);
    set({
      mode: normalized.mode,
      accent: normalized.accent,
      density: normalized.density,
      motion: normalized.motion,
    });
    applyThemeToDocument(normalized);
  },
}));

export { applyThemeToDocument };
