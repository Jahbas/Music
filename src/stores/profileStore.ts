import { create } from "zustand";
import { profileDb, folderDb, playHistoryDb, profileLikesDb, playlistDb } from "../db/db";
import type { Profile } from "../types";

const CURRENT_PROFILE_ID_KEY = "profile-current-id";

function getStoredCurrentProfileId(): string | null {
  try {
    return localStorage.getItem(CURRENT_PROFILE_ID_KEY);
  } catch {
    return null;
  }
}

function setStoredCurrentProfileId(id: string): void {
  try {
    localStorage.setItem(CURRENT_PROFILE_ID_KEY, id);
  } catch {
    // ignore
  }
}

type ProfileState = {
  profiles: Profile[];
  currentProfileId: string | null;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  setCurrentProfile: (profileId: string) => void;
  createProfile: (name: string) => Promise<Profile>;
  updateProfile: (profileId: string, name: string) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  currentProfileId: getStoredCurrentProfileId(),
  isLoading: true,
  hydrate: async () => {
    let profiles = await profileDb.getAll();
    if (profiles.length === 0) {
      const defaultProfile: Profile = {
        id: crypto.randomUUID(),
        name: "Default",
        createdAt: Date.now(),
      };
      await profileDb.put(defaultProfile);
      profiles = [defaultProfile];
      setStoredCurrentProfileId(defaultProfile.id);
      set({ profiles, currentProfileId: defaultProfile.id, isLoading: false });
      return;
    }
    const storedId = getStoredCurrentProfileId();
    const validId =
      storedId && profiles.some((p) => p.id === storedId)
        ? storedId
        : profiles[0].id;
    if (validId !== getStoredCurrentProfileId()) {
      setStoredCurrentProfileId(validId);
    }
    set({ profiles, currentProfileId: validId, isLoading: false });
  },
  setCurrentProfile: (profileId) => {
    const { profiles } = get();
    if (!profiles.some((p) => p.id === profileId)) return;
    setStoredCurrentProfileId(profileId);
    set({ currentProfileId: profileId });
  },
  createProfile: async (name) => {
    const profile: Profile = {
      id: crypto.randomUUID(),
      name: name.trim() || "New profile",
      createdAt: Date.now(),
    };
    await profileDb.put(profile);
    set({ profiles: [...get().profiles, profile] });
    return profile;
  },
  updateProfile: async (profileId, name) => {
    const profiles = get().profiles.map((p) =>
      p.id === profileId ? { ...p, name: name.trim() || p.name } : p
    );
    const updated = profiles.find((p) => p.id === profileId);
    if (updated) {
      await profileDb.put(updated);
      set({ profiles });
    }
  },
  deleteProfile: async (profileId) => {
    const { profiles, currentProfileId } = get();
    if (profiles.length <= 1) return;
    if (currentProfileId === profileId) {
      const next = profiles.find((p) => p.id !== profileId);
      if (next) {
        setStoredCurrentProfileId(next.id);
        set({ currentProfileId: next.id });
      }
    }
    const foldersToRemove = (await folderDb.getAll()).filter(
      (f) => (f.profileId ?? null) === profileId
    );
    const playlists = await playlistDb.getAll();
    for (const folder of foldersToRemove) {
      for (const playlist of playlists) {
        if (playlist.folderId === folder.id) {
          await playlistDb.put({ ...playlist, folderId: undefined });
        }
      }
      await folderDb.remove(folder.id);
    }
    const historyEntries = (await playHistoryDb.getAll()).filter(
      (e) => e.profileId === profileId
    );
    for (const e of historyEntries) {
      await playHistoryDb.remove(e.id);
    }
    await profileLikesDb.clearForProfile(profileId);
    await profileDb.remove(profileId);
    set({ profiles: profiles.filter((p) => p.id !== profileId) });
  },
}));
