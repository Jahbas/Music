import { openDB, type DBSchema } from "idb";
import type { PlayHistoryEntry, Profile, ProfileLike, Playlist, PlaylistFolder, ThemeSettings, Track } from "../types";

type ImageEntry = {
  id: string;
  blob: Blob;
};

interface SpotifyDb extends DBSchema {
  tracks: {
    key: string;
    value: Track;
  };
  playlists: {
    key: string;
    value: Playlist;
  };
  profiles: {
    key: string;
    value: Profile;
  };
  folders: {
    key: string;
    value: PlaylistFolder;
  };
  images: {
    key: string;
    value: ImageEntry;
  };
  theme: {
    key: string;
  value: ThemeSettings;
  };
  playHistory: {
    key: string;
    value: PlayHistoryEntry;
  };
  profileLikes: {
    key: [string, string];
    value: ProfileLike;
  };
}

const DB_NAME = "spotify-like-player";
const DB_VERSION = 6;

const dbPromise = openDB<SpotifyDb>(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    if (!db.objectStoreNames.contains("tracks")) {
      db.createObjectStore("tracks", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("playlists")) {
      db.createObjectStore("playlists", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("profiles")) {
      db.createObjectStore("profiles", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("folders")) {
      db.createObjectStore("folders", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("images")) {
      db.createObjectStore("images", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("theme")) {
      db.createObjectStore("theme");
    }
    if (oldVersion < 2 && !db.objectStoreNames.contains("playHistory")) {
      db.createObjectStore("playHistory", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("profileLikes")) {
      db.createObjectStore("profileLikes", { keyPath: ["profileId", "trackId"] });
    }
  },
});

export const trackDb = {
  async getAll() {
    return (await dbPromise).getAll("tracks");
  },
  async putMany(tracks: Track[]) {
    const db = await dbPromise;
    const tx = db.transaction("tracks", "readwrite");
    for (const track of tracks) {
      tx.store.put(track);
    }
    await tx.done;
  },
  async put(track: Track) {
    return (await dbPromise).put("tracks", track);
  },
  async remove(id: string) {
    return (await dbPromise).delete("tracks", id);
  },
  async clear() {
    const db = await dbPromise;
    const tx = db.transaction("tracks", "readwrite");
    await tx.store.clear();
    await tx.done;
  },
};

export const playlistDb = {
  async getAll() {
    return (await dbPromise).getAll("playlists");
  },
  async put(playlist: Playlist) {
    return (await dbPromise).put("playlists", playlist);
  },
  async putMany(playlists: Playlist[]) {
    const db = await dbPromise;
    const tx = db.transaction("playlists", "readwrite");
    for (const playlist of playlists) {
      tx.store.put(playlist);
    }
    await tx.done;
  },
  async remove(id: string) {
    return (await dbPromise).delete("playlists", id);
  },
  async clear() {
    const db = await dbPromise;
    const tx = db.transaction("playlists", "readwrite");
    await tx.store.clear();
    await tx.done;
  },
};

export const imageDb = {
  async get(id: string) {
    return (await dbPromise).get("images", id);
  },
  async put(id: string, blob: Blob) {
    return (await dbPromise).put("images", { id, blob });
  },
  async clear() {
    const db = await dbPromise;
    const tx = db.transaction("images", "readwrite");
    await tx.store.clear();
    await tx.done;
  },
};

export const themeDb = {
  async get() {
    return (await dbPromise).get("theme", "theme");
  },
  async set(settings: ThemeSettings) {
    return (await dbPromise).put("theme", settings, "theme");
  },
  async clear() {
    return (await dbPromise).delete("theme", "theme");
  },
};

export const profileDb = {
  async getAll() {
    return (await dbPromise).getAll("profiles");
  },
  async put(profile: Profile) {
    return (await dbPromise).put("profiles", profile);
  },
  async remove(id: string) {
    return (await dbPromise).delete("profiles", id);
  },
  async clear() {
    const db = await dbPromise;
    const tx = db.transaction("profiles", "readwrite");
    await tx.store.clear();
    await tx.done;
  },
};

export const folderDb = {
  async getAll() {
    return (await dbPromise).getAll("folders");
  },
  async put(folder: PlaylistFolder) {
    return (await dbPromise).put("folders", folder);
  },
  async putMany(folders: PlaylistFolder[]) {
    const db = await dbPromise;
    const tx = db.transaction("folders", "readwrite");
    for (const folder of folders) {
      tx.store.put(folder);
    }
    await tx.done;
  },
  async remove(id: string) {
    return (await dbPromise).delete("folders", id);
  },
  async clear() {
    const db = await dbPromise;
    const tx = db.transaction("folders", "readwrite");
    await tx.store.clear();
    await tx.done;
  },
};

export const playHistoryDb = {
  async getAll() {
    return (await dbPromise).getAll("playHistory");
  },
  async add(entry: PlayHistoryEntry) {
    return (await dbPromise).put("playHistory", entry);
  },
  async put(entry: PlayHistoryEntry) {
    return (await dbPromise).put("playHistory", entry);
  },
  async remove(id: string) {
    return (await dbPromise).delete("playHistory", id);
  },
  async clear() {
    const db = await dbPromise;
    const tx = db.transaction("playHistory", "readwrite");
    await tx.store.clear();
    await tx.done;
  },
};

export const profileLikesDb = {
  async getByProfileId(profileId: string): Promise<ProfileLike[]> {
    const all = await (await dbPromise).getAll("profileLikes");
    return all.filter((like) => like.profileId === profileId);
  },
  async add(profileId: string, trackId: string): Promise<void> {
    await (await dbPromise).put("profileLikes", { profileId, trackId });
  },
  async remove(profileId: string, trackId: string): Promise<void> {
    await (await dbPromise).delete("profileLikes", [profileId, trackId]);
  },
  async clearForProfile(profileId: string): Promise<void> {
    const all = await (await dbPromise).getAll("profileLikes");
    const toRemove = all.filter((like) => like.profileId === profileId);
    if (toRemove.length === 0) return;
    const db = await dbPromise;
    const tx = db.transaction("profileLikes", "readwrite");
    for (const like of toRemove) {
      tx.store.delete([like.profileId, like.trackId]);
    }
    await tx.done;
  },
  async clear() {
    const db = await dbPromise;
    const tx = db.transaction("profileLikes", "readwrite");
    await tx.store.clear();
    await tx.done;
  },
};
