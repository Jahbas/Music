import { create } from "zustand";

const CROSSFADE_ENABLED_KEY = "audio-crossfade-enabled";
const CROSSFADE_MS_KEY = "audio-crossfade-ms";
const GAPLESS_ENABLED_KEY = "audio-gapless-enabled";

export type EqBand = {
  frequency: number;
  gain: number;
  q: number;
};

export type EqPresetId = "flat" | "bassBoost" | "trebleBoost" | "vocal" | "loudness";

export type AudioSettingsState = {
  crossfadeEnabled: boolean;
  crossfadeMs: number;
  gaplessEnabled: boolean;
  eqEnabled: boolean;
  eqPresetId: EqPresetId;
  eqBands: EqBand[];
  setCrossfadeEnabled: (value: boolean) => void;
  setCrossfadeMs: (value: number) => void;
  setGaplessEnabled: (value: boolean) => void;
  setEqEnabled: (value: boolean) => void;
  setEqPresetId: (preset: EqPresetId) => void;
  setEqBands: (bands: EqBand[]) => void;
};

function loadBoolean(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
}

function loadNumber(key: string, fallback: number, min: number, max: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  } catch {
    return fallback;
  }
}

function persistBoolean(key: string, value: boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

function persistNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

const DEFAULT_EQ_BANDS: EqBand[] = [
  { frequency: 60, gain: 0, q: 1 },
  { frequency: 170, gain: 0, q: 1 },
  { frequency: 350, gain: 0, q: 1 },
  { frequency: 1000, gain: 0, q: 1 },
  { frequency: 3500, gain: 0, q: 1 },
  { frequency: 10000, gain: 0, q: 1 },
];

function presetToBands(preset: EqPresetId): EqBand[] {
  switch (preset) {
    case "bassBoost":
      return [
        { frequency: 60, gain: 6, q: 1 },
        { frequency: 170, gain: 3, q: 1 },
        { frequency: 350, gain: 1, q: 1 },
        { frequency: 1000, gain: 0, q: 1 },
        { frequency: 3500, gain: -1, q: 1 },
        { frequency: 10000, gain: -2, q: 1 },
      ];
    case "trebleBoost":
      return [
        { frequency: 60, gain: -2, q: 1 },
        { frequency: 170, gain: -1, q: 1 },
        { frequency: 350, gain: 0, q: 1 },
        { frequency: 1000, gain: 1, q: 1 },
        { frequency: 3500, gain: 3, q: 1 },
        { frequency: 10000, gain: 5, q: 1 },
      ];
    case "vocal":
      return [
        { frequency: 60, gain: -3, q: 1 },
        { frequency: 170, gain: -1, q: 1 },
        { frequency: 350, gain: 1, q: 1 },
        { frequency: 1000, gain: 4, q: 1 },
        { frequency: 3500, gain: 3, q: 1 },
        { frequency: 10000, gain: 0, q: 1 },
      ];
    case "loudness":
      return [
        { frequency: 60, gain: 5, q: 1 },
        { frequency: 170, gain: 3, q: 1 },
        { frequency: 350, gain: 1, q: 1 },
        { frequency: 1000, gain: 0, q: 1 },
        { frequency: 3500, gain: 2, q: 1 },
        { frequency: 10000, gain: 4, q: 1 },
      ];
    case "flat":
    default:
      return DEFAULT_EQ_BANDS;
  }
}

export const useAudioSettingsStore = create<AudioSettingsState>((set, get) => ({
  crossfadeEnabled: loadBoolean(CROSSFADE_ENABLED_KEY, false),
  crossfadeMs: loadNumber(CROSSFADE_MS_KEY, 5000, 0, 12000),
  gaplessEnabled: loadBoolean(GAPLESS_ENABLED_KEY, true),
  eqEnabled: false,
  eqPresetId: "flat",
  eqBands: DEFAULT_EQ_BANDS,
  setCrossfadeEnabled: (value) => {
    set({ crossfadeEnabled: value });
    persistBoolean(CROSSFADE_ENABLED_KEY, value);
  },
  setCrossfadeMs: (value) => {
    const clamped = Math.min(12000, Math.max(0, value));
    set({ crossfadeMs: clamped });
    persistNumber(CROSSFADE_MS_KEY, clamped);
  },
  setGaplessEnabled: (value) => {
    set({ gaplessEnabled: value });
    persistBoolean(GAPLESS_ENABLED_KEY, value);
  },
  setEqEnabled: (value) => {
    set({ eqEnabled: value });
  },
  setEqPresetId: (preset) => {
    set({
      eqPresetId: preset,
      eqBands: presetToBands(preset),
    });
  },
  setEqBands: (bands) => {
    set({ eqBands: bands });
  },
}));

