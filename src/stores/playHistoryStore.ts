import { create } from "zustand";
import { playHistoryDb } from "../db/db";
import { useProfileStore } from "./profileStore";
import type { PlayHistoryEntry, Track } from "../types";

export type WrappedStats = {
  totalSeconds: number;
  topTrackIds: { trackId: string; seconds: number; plays: number }[];
  topArtists: { artist: string; seconds: number; plays: number }[];
  year: number | null;
};

const MAX_IN_MEMORY_ENTRIES = 1000;

type PlayHistoryState = {
  entries: PlayHistoryEntry[];
  isLoading: boolean;
  statsCache: Record<string, WrappedStats>;
  hydrate: () => Promise<void>;
  addPlay: (trackId: string, playedAt: number, listenedSeconds: number) => Promise<void>;
  getStats: (tracks: Track[], year: number | null) => WrappedStats;
  clearPlayHistory: () => Promise<void>;
};

export const usePlayHistoryStore = create<PlayHistoryState>((set, get) => ({
  entries: [],
  isLoading: true,
  statsCache: {},
  hydrate: async () => {
    const profileId = useProfileStore.getState().currentProfileId;
    const profiles = useProfileStore.getState().profiles;
    const sortedByCreated = [...profiles].sort((a, b) => a.createdAt - b.createdAt);
    const oldestProfile = sortedByCreated[0] ?? null;
    const defaultProfileId = oldestProfile?.id ?? profiles[0]?.id;
    const secondProfileCreatedAt = sortedByCreated[1]?.createdAt ?? Infinity;

    const allEntries = await playHistoryDb.getAll();

    let migratedEntries = allEntries;

    if (defaultProfileId) {
      const needsProfileId = migratedEntries.some((e) => e.profileId == null);
      if (needsProfileId) {
        migratedEntries = migratedEntries.map((e) =>
          e.profileId == null ? { ...e, profileId: defaultProfileId } : e
        );
      }
    }

    if (oldestProfile && migratedEntries.length > 0) {
      const secondCreated = secondProfileCreatedAt;
      const needsReassign = migratedEntries.some(
        (e) =>
          e.profileId != null &&
          e.profileId !== oldestProfile.id &&
          e.playedAt < secondCreated
      );
      if (needsReassign) {
        migratedEntries = migratedEntries.map((e) =>
          e.profileId != null &&
          e.profileId !== oldestProfile.id &&
          e.playedAt < secondCreated
            ? { ...e, profileId: oldestProfile.id }
            : e
        );
      }
    }

    if (migratedEntries !== allEntries) {
      await playHistoryDb.putMany(migratedEntries);
    }

    const filtered = profileId
      ? migratedEntries.filter((e) => (e.profileId ?? defaultProfileId) === profileId)
      : [];
    filtered.sort((a, b) => a.playedAt - b.playedAt);
    const limited = filtered.slice(-MAX_IN_MEMORY_ENTRIES);

    set({ entries: limited, isLoading: false, statsCache: {} });
  },
  addPlay: async (trackId, playedAt, listenedSeconds) => {
    if (listenedSeconds <= 0) return;
    const profileId = useProfileStore.getState().currentProfileId;
    if (!profileId) return;
    const entry: PlayHistoryEntry = {
      id: crypto.randomUUID(),
      trackId,
      playedAt,
      listenedSeconds: Math.round(listenedSeconds),
      profileId,
    };
    await playHistoryDb.add(entry);
    set((state) => {
      const merged = [...state.entries, entry].sort((a, b) => a.playedAt - b.playedAt);
      const limited = merged.slice(-MAX_IN_MEMORY_ENTRIES);
      return {
        entries: limited,
        statsCache: {},
      };
    });
  },
  getStats: (tracks, year) => {
    const { entries, statsCache } = get();
    const key = year === null ? "all" : String(year);
    const cached = statsCache[key];
    if (cached) {
      return cached;
    }

    const trackMap = new Map(tracks.map((t) => [t.id, t]));
    const filtered =
      year === null
        ? entries
        : entries.filter((e) => new Date(e.playedAt).getFullYear() === year);

    const totalSeconds = filtered.reduce((sum, e) => sum + e.listenedSeconds, 0);

    const byTrack = new Map<string, { seconds: number; plays: number }>();
    const byArtist = new Map<string, { seconds: number; plays: number }>();

    for (const e of filtered) {
      const track = trackMap.get(e.trackId);
      const artist = track?.artist ?? "Unknown Artist";

      const trackAgg = byTrack.get(e.trackId) ?? { seconds: 0, plays: 0 };
      trackAgg.seconds += e.listenedSeconds;
      trackAgg.plays += 1;
      byTrack.set(e.trackId, trackAgg);

      const artistAgg = byArtist.get(artist) ?? { seconds: 0, plays: 0 };
      artistAgg.seconds += e.listenedSeconds;
      artistAgg.plays += 1;
      byArtist.set(artist, artistAgg);
    }

    const topTrackIds = Array.from(byTrack.entries())
      .map(([trackId, data]) => ({ trackId, ...data }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 50);

    const topArtists = Array.from(byArtist.entries())
      .map(([artist, data]) => ({ artist, ...data }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 50);

    const stats: WrappedStats = { totalSeconds, topTrackIds, topArtists, year };
    set((state) => ({
      statsCache: { ...state.statsCache, [key]: stats },
    }));
    return stats;
  },
  clearPlayHistory: async () => {
    const profileId = useProfileStore.getState().currentProfileId;
    if (!profileId) return;
    const all = await playHistoryDb.getAll();
    const toRemove = all.filter((e) => e.profileId === profileId);
    for (const e of toRemove) {
      await playHistoryDb.remove(e.id);
    }
    set({ entries: [], statsCache: {} });
  },
}));
