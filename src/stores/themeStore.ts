import { create } from "zustand";
import type { ThemeMode } from "../types";
import { themeDb } from "../db/db";

const DEFAULT_MODE: ThemeMode = "dark";

const THEME_COLOR: Record<ThemeMode, string> = {
  dark: "#060608",
  light: "#f5f5f5",
  oled: "#000000",
};

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  hydrate: () => Promise<void>;
};

export const applyThemeToDocument = (mode: ThemeMode) => {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode === "light" ? "light" : "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[mode]);
};

applyThemeToDocument(DEFAULT_MODE);

export const useThemeStore = create<ThemeState>((set) => ({
  mode: DEFAULT_MODE,
  setMode: (mode) => {
    set({ mode });
    applyThemeToDocument(mode);
    void themeDb.set(mode);
  },
  hydrate: async () => {
    const stored = await themeDb.get();
    if (stored) {
      set({ mode: stored });
      applyThemeToDocument(stored);
      return;
    }
    applyThemeToDocument(DEFAULT_MODE);
  },
}));
