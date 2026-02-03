import { create } from "zustand";
import { imageDb, folderDb } from "../db/db";
import type { PlaylistFolder } from "../types";

type FolderState = {
  folders: PlaylistFolder[];
  isLoading: boolean;
  hydrate: () => Promise<void>;
  createFolder: (input: {
    name: string;
    description?: string;
    iconImageFile?: File;
    bannerImageFile?: File;
  }) => Promise<PlaylistFolder>;
  updateFolderIcon: (
    folderId: string,
    imageFile: File | null
  ) => Promise<void>;
  updateFolderBanner: (
    folderId: string,
    imageFile: File | null
  ) => Promise<void>;
  updateFolder: (
    folderId: string,
    input: {
      name?: string;
      description?: string;
      pinned?: boolean;
      order?: number | null;
    }
  ) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
};

export const useFolderStore = create<FolderState>((set, get) => ({
  folders: [],
  isLoading: true,
  hydrate: async () => {
    const folders = await folderDb.getAll();
    set({ folders, isLoading: false });
  },
  createFolder: async ({ name, description, iconImageFile, bannerImageFile }) => {
    const now = Date.now();
    const folder: PlaylistFolder = {
      id: crypto.randomUUID(),
      name,
      description,
      iconImageId: undefined,
      bannerImageId: undefined,
      createdAt: now,
      updatedAt: now,
    };
    if (iconImageFile) {
      const imageId = crypto.randomUUID();
      await imageDb.put(imageId, iconImageFile);
      folder.iconImageId = imageId;
    }
    if (bannerImageFile) {
      const imageId = crypto.randomUUID();
      await imageDb.put(imageId, bannerImageFile);
      folder.bannerImageId = imageId;
    }
    await folderDb.put(folder);
    set({ folders: [...get().folders, folder] });
    return folder;
  },
  updateFolderIcon: async (folderId, imageFile) => {
    let imageId: string | undefined;
    if (imageFile !== null) {
      imageId = crypto.randomUUID();
      await imageDb.put(imageId, imageFile);
    }
    const folders = get().folders.map((folder) => {
      if (folder.id !== folderId) {
        return folder;
      }
      return {
        ...folder,
        iconImageId: imageId ?? undefined,
        updatedAt: Date.now(),
      };
    });
    const updated = folders.find((f) => f.id === folderId);
    if (updated) {
      await folderDb.put(updated);
    }
    set({ folders });
  },
  updateFolderBanner: async (folderId, imageFile) => {
    let bannerImageId: string | undefined;
    if (imageFile !== null) {
      bannerImageId = crypto.randomUUID();
      await imageDb.put(bannerImageId, imageFile);
    }
    const folders = get().folders.map((folder) => {
      if (folder.id !== folderId) {
        return folder;
      }
      return {
        ...folder,
        bannerImageId: imageFile === null ? undefined : bannerImageId,
        updatedAt: Date.now(),
      };
    });
    const updated = folders.find((f) => f.id === folderId);
    if (updated) {
      await folderDb.put(updated);
    }
    set({ folders });
  },
  updateFolder: async (
    folderId,
    { name, description, pinned, order }
  ) => {
    const resolvedOrder =
      order === null ? undefined : order !== undefined ? order : undefined;
    const hasOrder = order !== undefined;
    const folders = get().folders.map((folder) => {
      if (folder.id !== folderId) {
        return folder;
      }
      return {
        ...folder,
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(pinned !== undefined && { pinned }),
        ...(hasOrder && { order: resolvedOrder }),
        updatedAt: Date.now(),
      };
    });
    const updated = folders.find((f) => f.id === folderId);
    if (updated) {
      await folderDb.put(updated);
    }
    set({ folders });
  },
  deleteFolder: async (folderId) => {
    await folderDb.remove(folderId);
    const folders = get().folders.filter((f) => f.id !== folderId);
    set({ folders });
  },
}));
