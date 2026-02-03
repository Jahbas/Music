import { create } from "zustand";
import { playHistoryDb } from "../db/db";
import type { PlayHistoryEntry, Track } from "../types";

export type WrappedStats = {
  totalSeconds: number;
  topTrackIds: { trackId: string; seconds: number; plays: number }[];
  topArtists: { artist: string; seconds: number; plays: number }[];
  year: number | null;
};

type PlayHistoryState = {
  entries: PlayHistoryEntry[];
  isLoading: boolean;
  hydrate: () => Promise<void>;
  addPlay: (trackId: string, playedAt: number, listenedSeconds: number) => Promise<void>;
  getStats: (tracks: Track[], year: number | null) => WrappedStats;
  clearPlayHistory: () => Promise<void>;
};

export const usePlayHistoryStore = create<PlayHistoryState>((set, get) => ({
  entries: [],
  isLoading: true,
  hydrate: async () => {
    const entries = await playHistoryDb.getAll();
    entries.sort((a, b) => a.playedAt - b.playedAt);
    set({ entries, isLoading: false });
  },
  addPlay: async (trackId, playedAt, listenedSeconds) => {
    if (listenedSeconds <= 0) return;
    const entry: PlayHistoryEntry = {
      id: crypto.randomUUID(),
      trackId,
      playedAt,
      listenedSeconds: Math.round(listenedSeconds),
    };
    await playHistoryDb.add(entry);
    set((state) => ({
      entries: [...state.entries, entry].sort((a, b) => a.playedAt - b.playedAt),
    }));
  },
  getStats: (tracks, year) => {
    const { entries } = get();
    const trackMap = new Map(tracks.map((t) => [t.id, t]));
    const filtered = year === null
      ? entries
      : entries.filter((e) => new Date(e.playedAt).getFullYear() === year);

    const totalSeconds = filtered.reduce((sum, e) => sum + e.listenedSeconds, 0);

    const byTrack = new Map<string, { seconds: number; plays: number }>();
    for (const e of filtered) {
      const cur = byTrack.get(e.trackId) ?? { seconds: 0, plays: 0 };
      cur.seconds += e.listenedSeconds;
      cur.plays += 1;
      byTrack.set(e.trackId, cur);
    }
    const topTrackIds = Array.from(byTrack.entries())
      .map(([trackId, data]) => ({ trackId, ...data }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 50);

    const byArtist = new Map<string, { seconds: number; plays: number }>();
    for (const e of filtered) {
      const track = trackMap.get(e.trackId);
      const artist = track?.artist ?? "Unknown Artist";
      const cur = byArtist.get(artist) ?? { seconds: 0, plays: 0 };
      cur.seconds += e.listenedSeconds;
      cur.plays += 1;
      byArtist.set(artist, cur);
    }
    const topArtists = Array.from(byArtist.entries())
      .map(([artist, data]) => ({ artist, ...data }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 50);

    return { totalSeconds, topTrackIds, topArtists, year };
  },
  clearPlayHistory: async () => {
    await playHistoryDb.clear();
    set({ entries: [] });
  },
}));
