import { create } from "zustand";

const VOLUME_STORAGE_KEY = "player-volume";
const SHUFFLE_STORAGE_KEY = "player-shuffle";
const PLAYBACK_RATE_STORAGE_KEY = "player-playback-rate";
const REPEAT_STORAGE_KEY = "player-repeat";

export type RepeatMode = "off" | "queue" | "track";

function getStoredVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw == null) return 0.8;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  } catch {
    // ignore
  }
  return 0.8;
}

function getStoredShuffle(): boolean {
  try {
    return localStorage.getItem(SHUFFLE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getStoredPlaybackRate(): number {
  try {
    const raw = localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY);
    if (raw == null) return 1;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0.25 && n <= 2) return n;
  } catch {
    // ignore
  }
  return 1;
}

function getStoredRepeat(): RepeatMode {
  try {
    const raw = localStorage.getItem(REPEAT_STORAGE_KEY);
    if (raw === "queue" || raw === "track" || raw === "off") return raw;
  } catch {
    // ignore
  }
  return "off";
}

function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type PlayerState = {
  currentTrackId: string | null;
  queue: string[];
  isPlaying: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  currentTime: number;
  duration: number;
  playbackRate: number;
  setQueue: (queue: string[]) => void;
  playTrack: (trackId: string, queue?: string[]) => void;
  playTrackIds: (trackIds: string[], options?: { shuffle?: boolean }) => void;
  togglePlay: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setRepeat: (mode: RepeatMode) => void;
  pause: () => void;
  play: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (volume: number) => void;
  setShuffle: (value: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  clearQueue: () => void;
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrackId: null,
  queue: [],
  isPlaying: false,
  shuffle: getStoredShuffle(),
  repeat: getStoredRepeat(),
  volume: getStoredVolume(),
  currentTime: 0,
  duration: 0,
  playbackRate: getStoredPlaybackRate(),
  setQueue: (queue) => set({ queue }),
  playTrack: (trackId, queue) => {
    if (queue) {
      set({ queue });
    }
    set({ currentTrackId: trackId, isPlaying: true });
  },
  playTrackIds: (trackIds, options) => {
    if (trackIds.length === 0) return;
    const useShuffle = options?.shuffle ?? get().shuffle;
    const queue = useShuffle ? shuffleArray(trackIds) : trackIds;
    set({ queue });
    set({ currentTrackId: queue[0], isPlaying: true });
  },
  togglePlay: () => set({ isPlaying: !get().isPlaying }),
  toggleShuffle: () => {
    const next = !get().shuffle;
    set({ shuffle: next });
    try {
      localStorage.setItem(SHUFFLE_STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  },
  setShuffle: (value) => {
    set({ shuffle: value });
    try {
      localStorage.setItem(SHUFFLE_STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
  },
  cycleRepeat: () => {
    const next: RepeatMode =
      get().repeat === "off" ? "queue" : get().repeat === "queue" ? "track" : "off";
    set({ repeat: next });
    try {
      localStorage.setItem(REPEAT_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  },
  setRepeat: (mode) => {
    set({ repeat: mode });
    try {
      localStorage.setItem(REPEAT_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  },
  pause: () => set({ isPlaying: false }),
  play: () => set({ isPlaying: true }),
  next: () => {
    const { queue, currentTrackId, repeat } = get();
    if (!currentTrackId || queue.length === 0) {
      return;
    }
    const currentIndex = queue.indexOf(currentTrackId);
    const nextIndex = currentIndex + 1;
    if (repeat === "track") {
      set({ isPlaying: true });
      return;
    }
    if (nextIndex < queue.length) {
      set({ currentTrackId: queue[nextIndex], isPlaying: true });
      return;
    }
    if (repeat === "queue" && queue.length > 0) {
      set({ currentTrackId: queue[0], isPlaying: true });
    }
  },
  previous: () => {
    const { queue, currentTrackId } = get();
    if (!currentTrackId || queue.length === 0) {
      return;
    }
    const currentIndex = queue.indexOf(currentTrackId);
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      set({ currentTrackId: queue[prevIndex], isPlaying: true });
    }
  },
  setVolume: (volume) => {
    set({ volume });
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    } catch {
      // ignore
    }
  },
  setPlaybackRate: (rate) => {
    const clamped =
      Number.isFinite(rate) && rate > 0 ? Math.min(Math.max(rate, 0.25), 2) : 1;
    set({ playbackRate: clamped });
    try {
      localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(clamped));
    } catch {
      // ignore
    }
  },
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  clearQueue: () =>
    set({ queue: [], currentTrackId: null, isPlaying: false }),
}));
