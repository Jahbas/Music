import { create } from "zustand";
import { profileLikesDb } from "../db/db";
import { useProfileStore } from "./profileStore";
import { useLibraryStore } from "./libraryStore";

type ProfileLikesState = {
  likedTrackIds: string[];
  isLoading: boolean;
  hydrate: () => Promise<void>;
  toggle: (trackId: string) => Promise<void>;
  isLiked: (trackId: string) => boolean;
};

export const useProfileLikesStore = create<ProfileLikesState>((set, get) => ({
  likedTrackIds: [],
  isLoading: true,
  hydrate: async () => {
    const profileId = useProfileStore.getState().currentProfileId;
    if (!profileId) {
      set({ likedTrackIds: [], isLoading: false });
      return;
    }
    const likes = await profileLikesDb.getByProfileId(profileId);
    const likedTrackIds = likes.map((l) => l.trackId);
    const profiles = useProfileStore.getState().profiles;
    const defaultProfileId = profiles[0]?.id;
    if (likedTrackIds.length === 0 && profileId === defaultProfileId) {
      const tracks = useLibraryStore.getState().tracks;
      const legacyLiked = tracks.filter((t) => t.liked === true);
      for (const track of legacyLiked) {
        await profileLikesDb.add(profileId, track.id);
        likedTrackIds.push(track.id);
      }
    }
    set({ likedTrackIds, isLoading: false });
  },
  toggle: async (trackId) => {
    const profileId = useProfileStore.getState().currentProfileId;
    if (!profileId) return;
    const { likedTrackIds } = get();
    const isCurrentlyLiked = likedTrackIds.includes(trackId);
    if (isCurrentlyLiked) {
      await profileLikesDb.remove(profileId, trackId);
      set({ likedTrackIds: likedTrackIds.filter((id) => id !== trackId) });
    } else {
      await profileLikesDb.add(profileId, trackId);
      set({ likedTrackIds: [...likedTrackIds, trackId] });
    }
  },
  isLiked: (trackId) => get().likedTrackIds.includes(trackId),
}));
