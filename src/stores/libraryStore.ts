import { create } from "zustand";
import { imageDb, trackDb } from "../db/db";
import type { Track } from "../types";
import { fileToTrack, isSupportedAudioFile } from "../utils/track";

export type AddProgress = {
  total: number;
  loaded: number;
  startedAt: number;
};

type LibraryState = {
  tracks: Track[];
  isLoading: boolean;
  addProgress: AddProgress | null;
  hydrate: () => Promise<void>;
  addFiles: (files: FileList | File[]) => Promise<string[]>;
  addFileHandles: (handles: FileSystemFileHandle[]) => Promise<string[]>;
  removeTrack: (id: string) => Promise<void>;
  clearLibrary: () => Promise<void>;
  toggleTrackLiked: (id: string) => Promise<void>;
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  isLoading: true,
  addProgress: null,
  hydrate: async () => {
    const tracks = await trackDb.getAll();
    set({ tracks, isLoading: false });
  },
  addFiles: async (files) => {
    const list = Array.from(files);
    const newTracks: Track[] = [];
    set({
      addProgress: {
        total: list.length,
        loaded: 0,
        startedAt: Date.now(),
      },
    });
    const updateProgress = (loaded: number) => {
      set((state) =>
        state.addProgress
          ? {
              addProgress: {
                ...state.addProgress,
                loaded,
              },
            }
          : state
      );
    };
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        if (!isSupportedAudioFile(file)) {
          updateProgress(i + 1);
          await new Promise((r) => setTimeout(r, 0));
          continue;
        }
        const { track, artworkBlob } = await fileToTrack(file, "blob");
        if (artworkBlob) {
          const artworkId = crypto.randomUUID();
          await imageDb.put(artworkId, artworkBlob);
          track.artworkId = artworkId;
        }
        newTracks.push(track);
        updateProgress(i + 1);
        await new Promise((r) => setTimeout(r, 0));
      }
      if (newTracks.length > 0) {
        await trackDb.putMany(newTracks);
        set({ tracks: [...get().tracks, ...newTracks] });
      }
      return newTracks.map((t) => t.id);
    } finally {
      set({ addProgress: null });
    }
  },
  addFileHandles: async (handles) => {
    const list = Array.from(handles);
    const newTracks: Track[] = [];
    set({
      addProgress: {
        total: list.length,
        loaded: 0,
        startedAt: Date.now(),
      },
    });
    const updateProgress = (loaded: number) => {
      set((state) =>
        state.addProgress
          ? {
              addProgress: {
                ...state.addProgress,
                loaded,
              },
            }
          : state
      );
    };
    try {
      for (let i = 0; i < list.length; i++) {
        const handle = list[i];
        const file = await handle.getFile();
        if (!isSupportedAudioFile(file)) {
          updateProgress(i + 1);
          await new Promise((r) => setTimeout(r, 0));
          continue;
        }
        const { track, artworkBlob } = await fileToTrack(
          file,
          "handle",
          handle
        );
        if (artworkBlob) {
          const artworkId = crypto.randomUUID();
          await imageDb.put(artworkId, artworkBlob);
          track.artworkId = artworkId;
        }
        newTracks.push(track);
        updateProgress(i + 1);
        await new Promise((r) => setTimeout(r, 0));
      }
      if (newTracks.length > 0) {
        await trackDb.putMany(newTracks);
        set({ tracks: [...get().tracks, ...newTracks] });
      }
      return newTracks.map((t) => t.id);
    } finally {
      set({ addProgress: null });
    }
  },
  removeTrack: async (id) => {
    await trackDb.remove(id);
    set({ tracks: get().tracks.filter((track) => track.id !== id) });
  },
  clearLibrary: async () => {
    await trackDb.clear();
    set({ tracks: [] });
  },
  toggleTrackLiked: async (id) => {
    const { toggle } = await import("./profileLikesStore").then((m) => m.useProfileLikesStore.getState());
    await toggle(id);
  },
}));
