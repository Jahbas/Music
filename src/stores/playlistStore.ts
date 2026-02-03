import { create } from "zustand";
import { imageDb, playlistDb } from "../db/db";
import type { Playlist } from "../types";
import { useLibraryStore } from "./libraryStore";

type PlaylistState = {
  playlists: Playlist[];
  isLoading: boolean;
  hydrate: () => Promise<void>;
  createPlaylist: (input: {
    name: string;
    description?: string;
    imageFile?: File;
    color?: string;
    folderId?: string;
  }) => Promise<Playlist>;
  addTracksToPlaylist: (playlistId: string, trackIds: string[]) => Promise<void>;
  removeTrackFromPlaylist: (
    playlistId: string,
    trackId: string
  ) => Promise<void>;
  updatePlaylistImage: (
    playlistId: string,
    imageFile: File | null
  ) => Promise<void>;
  updatePlaylistBanner: (
    playlistId: string,
    imageFile: File | null
  ) => Promise<void>;
  updatePlaylist: (
    playlistId: string,
    input: {
      name?: string;
      description?: string;
      color?: string;
      bannerImageId?: string;
      pinned?: boolean;
      order?: number | null;
      folderId?: string | null;
    }
  ) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  removeTrackIdsFromAllPlaylists: (trackIds: string[]) => Promise<void>;
};

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  isLoading: true,
  hydrate: async () => {
    const playlists = await playlistDb.getAll();
    set({ playlists, isLoading: false });
  },
  createPlaylist: async ({ name, description, imageFile, color, folderId }) => {
    const now = Date.now();
    const playlist: Playlist = {
      id: crypto.randomUUID(),
      name,
      description,
      imageId: undefined,
      color,
      trackIds: [],
      createdAt: now,
      updatedAt: now,
      folderId,
    };
    if (imageFile) {
      const imageId = crypto.randomUUID();
      await imageDb.put(imageId, imageFile);
      playlist.imageId = imageId;
    }
    await playlistDb.put(playlist);
    set({ playlists: [...get().playlists, playlist] });
    return playlist;
  },
  addTracksToPlaylist: async (playlistId, trackIds) => {
    const playlists = get().playlists.map((playlist) => {
      if (playlist.id !== playlistId) {
        return playlist;
      }
      const unique = new Set([...playlist.trackIds, ...trackIds]);
      return {
        ...playlist,
        trackIds: Array.from(unique),
        updatedAt: Date.now(),
      };
    });
    set({ playlists });
    const updated = playlists.find((p) => p.id === playlistId);
    if (updated) {
      await playlistDb.put(updated);
    }
  },
  removeTrackFromPlaylist: async (playlistId, trackId) => {
    const playlists = get().playlists.map((playlist) => {
      if (playlist.id !== playlistId) {
        return playlist;
      }
      return {
        ...playlist,
        trackIds: playlist.trackIds.filter((id) => id !== trackId),
        updatedAt: Date.now(),
      };
    });
    const updated = playlists.find((p) => p.id === playlistId);
    if (updated) {
      await playlistDb.put(updated);
    }
    set({ playlists });
    const stillInPlaylist = playlists.some((p) => p.trackIds.includes(trackId));
    if (!stillInPlaylist) {
      await useLibraryStore.getState().removeTrack(trackId);
    }
  },
  updatePlaylistImage: async (playlistId, imageFile) => {
    let imageId: string | undefined;
    if (imageFile !== null) {
      imageId = crypto.randomUUID();
      await imageDb.put(imageId, imageFile);
    }
    const playlists = get().playlists.map((playlist) => {
      if (playlist.id !== playlistId) {
        return playlist;
      }
      return {
        ...playlist,
        imageId: imageId ?? undefined,
        updatedAt: Date.now(),
      };
    });
    const updated = playlists.find((p) => p.id === playlistId);
    if (updated) {
      await playlistDb.put(updated);
    }
    set({ playlists });
  },
  updatePlaylistBanner: async (playlistId, imageFile) => {
    let bannerImageId: string | undefined;
    if (imageFile !== null) {
      bannerImageId = crypto.randomUUID();
      await imageDb.put(bannerImageId, imageFile);
    }
    const playlists = get().playlists.map((playlist) => {
      if (playlist.id !== playlistId) {
        return playlist;
      }
      return {
        ...playlist,
        bannerImageId: imageFile === null ? undefined : bannerImageId,
        updatedAt: Date.now(),
      };
    });
    const updated = playlists.find((p) => p.id === playlistId);
    if (updated) {
      await playlistDb.put(updated);
    }
    set({ playlists });
  },
  updatePlaylist: async (
    playlistId,
    { name, description, color, bannerImageId, pinned, order, folderId }
  ) => {
    const resolvedOrder =
      order === null ? undefined : order !== undefined ? order : undefined;
    const hasOrder = order !== undefined;
    const playlists = get().playlists.map((playlist) => {
      if (playlist.id !== playlistId) {
        return playlist;
      }
      return {
        ...playlist,
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(bannerImageId !== undefined && { bannerImageId }),
        ...(pinned !== undefined && { pinned }),
        ...(hasOrder && { order: resolvedOrder }),
        ...(folderId !== undefined && { folderId: folderId === null ? undefined : folderId }),
        updatedAt: Date.now(),
      };
    });
    const updated = playlists.find((p) => p.id === playlistId);
    if (updated) {
      await playlistDb.put(updated);
    }
    set({ playlists });
  },
  deletePlaylist: async (playlistId) => {
    const playlist = get().playlists.find((p) => p.id === playlistId);
    const trackIdsInDeletedPlaylist = playlist?.trackIds ?? [];
    await playlistDb.remove(playlistId);
    const playlists = get().playlists.filter((p) => p.id !== playlistId);
    set({ playlists });
    const remainingTrackIds = new Set(
      playlists.flatMap((p) => p.trackIds)
    );
    for (const trackId of trackIdsInDeletedPlaylist) {
      if (!remainingTrackIds.has(trackId)) {
        await useLibraryStore.getState().removeTrack(trackId);
      }
    }
  },
  removeTrackIdsFromAllPlaylists: async (trackIds) => {
    const idSet = new Set(trackIds);
    const playlists = get().playlists.map((playlist) => ({
      ...playlist,
      trackIds: playlist.trackIds.filter((id) => !idSet.has(id)),
      updatedAt: Date.now(),
    }));
    set({ playlists });
    await playlistDb.putMany(playlists);
    for (const trackId of trackIds) {
      await useLibraryStore.getState().removeTrack(trackId);
    }
  },
}));
