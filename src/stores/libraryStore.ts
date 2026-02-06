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
  setTrackTags: (id: string, tags: string[]) => Promise<void>;
};

const MAX_ARTWORK_DIMENSION = 512;

const stripFileBlob = (track: Track): Track => {
  if (track.sourceType === "blob" && track.fileBlob) {
    const { fileBlob, ...rest } = track;
    return { ...rest };
  }
  return track;
};

const compressArtwork = async (blob: Blob): Promise<Blob> => {
  try {
    const bitmap = await createImageBitmap(blob);
    const longestSide = Math.max(bitmap.width, bitmap.height);
    const scale =
      longestSide > MAX_ARTWORK_DIMENSION
        ? MAX_ARTWORK_DIMENSION / longestSide
        : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return blob;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const compressed = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (result) => {
          resolve(result);
        },
        "image/webp",
        0.85
      );
    });

    return compressed ?? blob;
  } catch {
    return blob;
  }
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  isLoading: true,
  addProgress: null,
  hydrate: async () => {
    const tracks = await trackDb.getAll();
    const lightTracks = tracks.map(stripFileBlob);
    set({ tracks: lightTracks, isLoading: false });
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
          const compressed = await compressArtwork(artworkBlob);
          await imageDb.put(artworkId, compressed);
          track.artworkId = artworkId;
        }
        newTracks.push(track);
        updateProgress(i + 1);
        await new Promise((r) => setTimeout(r, 0));
      }
      if (newTracks.length > 0) {
        await trackDb.putMany(newTracks);
        const lightTracks = newTracks.map(stripFileBlob);
        set({ tracks: [...get().tracks, ...lightTracks] });
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
          const compressed = await compressArtwork(artworkBlob);
          await imageDb.put(artworkId, compressed);
          track.artworkId = artworkId;
        }
        newTracks.push(track);
        updateProgress(i + 1);
        await new Promise((r) => setTimeout(r, 0));
      }
      if (newTracks.length > 0) {
        await trackDb.putMany(newTracks);
        const lightTracks = newTracks.map(stripFileBlob);
        set({ tracks: [...get().tracks, ...lightTracks] });
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
    const { toggle } = await import("./profileLikesStore").then((m) =>
      m.useProfileLikesStore.getState()
    );
    await toggle(id);
  },
  setTrackTags: async (id, tags) => {
    const cleaned = Array.from(
      new Set(
        tags
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      )
    );
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === id ? { ...track, tags: cleaned } : track
      ),
    }));
    const track = get().tracks.find((t) => t.id === id);
    if (track) {
      await trackDb.put({ ...track, tags: cleaned });
    }
  },
}));
