import { create } from "zustand";
import type { MotionPreference, ThemeDensity, ThemeMode, ThemeSettings } from "../types";
import { themeDb } from "../db/db";
import { useAudioSettingsStore } from "./audioSettingsStore";
import { usePlayerStore } from "./playerStore";
import {
  getAutoPlayOnLoad,
  getExpandPlaylistsOnFolderPlay,
  getTelemetryEnabled,
  setAutoPlayOnLoad,
  setExpandPlaylistsOnFolderPlay,
  setTelemetryEnabled,
} from "../utils/preferences";

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
  profiles: ThemeSettings[];
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: string) => void;
  setDensity: (density: ThemeDensity) => void;
  setMotion: (motion: MotionPreference) => void;
  saveProfile: (name: string) => void;
  applyProfile: (name: string) => void;
  deleteProfile: (name: string) => void;
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
  name: settings.name,
  audio: settings.audio,
  player: settings.player,
  preferences: settings.preferences,
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

const THEME_PROFILES_KEY = "theme-profiles";

function loadProfiles(): ThemeSettings[] {
  try {
    const raw = localStorage.getItem(THEME_PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ThemeSettings[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSettings);
  } catch {
    return [];
  }
}

function persistProfiles(profiles: ThemeSettings[]): void {
  try {
    localStorage.setItem(THEME_PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // ignore
  }
}

applyThemeToDocument(DEFAULT_SETTINGS);

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: DEFAULT_MODE,
  accent: DEFAULT_ACCENT,
  density: DEFAULT_DENSITY,
  motion: DEFAULT_MOTION,
  profiles: loadProfiles(),
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
  saveProfile: (name) => {
    const current = get();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const audioState = useAudioSettingsStore.getState();
    const playerState = usePlayerStore.getState();
    const nextProfile: ThemeSettings = {
      mode: current.mode,
      accent: current.accent,
      density: current.density,
      motion: current.motion,
      name: trimmed,
      audio: {
        crossfadeEnabled: audioState.crossfadeEnabled,
        crossfadeMs: audioState.crossfadeMs,
        gaplessEnabled: audioState.gaplessEnabled,
        eqEnabled: audioState.eqEnabled,
        eqPresetId: String(audioState.eqPresetId),
        eqBands: audioState.eqBands,
      },
      player: {
        shuffle: playerState.shuffle,
        repeat: String(playerState.repeat),
        volume: playerState.volume,
        playbackRate: playerState.playbackRate,
        autoPlayOnLoad: getAutoPlayOnLoad(),
      },
      preferences: {
        expandPlaylistsOnFolderPlay: getExpandPlaylistsOnFolderPlay(),
        telemetryEnabled: getTelemetryEnabled(),
      },
    } as ThemeSettings;
    const existing = current.profiles.filter((p: any) => p.name !== trimmed);
    const updated = [...existing, nextProfile];
    set({ profiles: updated });
    persistProfiles(updated);
  },
  applyProfile: (name) => {
    const current = get();
    const profile = (current.profiles as any[]).find((p) => p.name === name);
    if (!profile) {
      return;
    }
    const normalized = normalizeSettings(profile as ThemeSettings);
    set({
      mode: normalized.mode,
      accent: normalized.accent,
      density: normalized.density,
      motion: normalized.motion,
    });
    if (normalized.audio) {
      const audioState = useAudioSettingsStore.getState();
      audioState.setCrossfadeEnabled(normalized.audio.crossfadeEnabled);
      audioState.setCrossfadeMs(normalized.audio.crossfadeMs);
      audioState.setGaplessEnabled(normalized.audio.gaplessEnabled);
      audioState.setEqEnabled(normalized.audio.eqEnabled);
      if (normalized.audio.eqPresetId) {
        audioState.setEqPresetId(normalized.audio.eqPresetId as any);
      }
      if (normalized.audio.eqBands && normalized.audio.eqBands.length > 0) {
        audioState.setEqBands(normalized.audio.eqBands);
      }
    }
    if (normalized.player) {
      const playerState = usePlayerStore.getState();
      playerState.setShuffle(normalized.player.shuffle);
      playerState.setRepeat(normalized.player.repeat as any);
      playerState.setVolume(normalized.player.volume);
      playerState.setPlaybackRate(normalized.player.playbackRate);
      if (normalized.player.autoPlayOnLoad != null) {
        setAutoPlayOnLoad(normalized.player.autoPlayOnLoad);
      }
    }
    if (normalized.preferences) {
      setExpandPlaylistsOnFolderPlay(normalized.preferences.expandPlaylistsOnFolderPlay);
      setTelemetryEnabled(normalized.preferences.telemetryEnabled);
    }
    applyThemeToDocument(normalized);
    void themeDb.set(normalized);
  },
  deleteProfile: (name) => {
    const current = get();
    const updated = (current.profiles as any[]).filter((p) => p.name !== name);
    set({ profiles: updated });
    persistProfiles(updated);
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
