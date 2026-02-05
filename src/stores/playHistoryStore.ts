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
    const profileId = useProfileStore.getState().currentProfileId;
    const profiles = useProfileStore.getState().profiles;
    const sortedByCreated = [...profiles].sort((a, b) => a.createdAt - b.createdAt);
    const oldestProfile = sortedByCreated[0] ?? null;
    const defaultProfileId = oldestProfile?.id ?? profiles[0]?.id;
    const secondProfileCreatedAt = sortedByCreated[1]?.createdAt ?? Infinity;
    let entries = await playHistoryDb.getAll();
    const toMigrate = entries.filter((e) => e.profileId == null);
    if (toMigrate.length > 0 && defaultProfileId) {
      for (const e of toMigrate) {
        const updated = { ...e, profileId: defaultProfileId };
        await playHistoryDb.put(updated);
      }
      entries = await playHistoryDb.getAll();
    }
    if (oldestProfile && entries.length > 0) {
      const wronglyAssigned = entries.filter(
        (e) =>
          e.profileId != null &&
          e.profileId !== oldestProfile.id &&
          e.playedAt < secondProfileCreatedAt
      );
      for (const e of wronglyAssigned) {
        await playHistoryDb.put({ ...e, profileId: oldestProfile.id });
      }
      if (wronglyAssigned.length > 0) {
        entries = await playHistoryDb.getAll();
      }
    }
    const filtered = profileId
      ? entries.filter((e) => (e.profileId ?? defaultProfileId) === profileId)
      : [];
    filtered.sort((a, b) => a.playedAt - b.playedAt);
    set({ entries: filtered, isLoading: false });
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
    const profileId = useProfileStore.getState().currentProfileId;
    if (!profileId) return;
    const all = await playHistoryDb.getAll();
    const toRemove = all.filter((e) => e.profileId === profileId);
    for (const e of toRemove) {
      await playHistoryDb.remove(e.id);
    }
    set({ entries: [] });
  },
}));
