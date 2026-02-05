export type TrackSourceType = "blob" | "handle";

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  addedAt: number;
  sourceType: TrackSourceType;
  fileBlob?: Blob;
  fileHandle?: FileSystemFileHandle;
  artworkId?: string;
  liked?: boolean;
};

export type Playlist = {
  id: string;
  name: string;
  description?: string;
  imageId?: string;
  bannerImageId?: string;
  color?: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  order?: number;
  folderId?: string;
};

export type Profile = {
  id: string;
  name: string;
  createdAt: number;
};

export type PlaylistFolder = {
  id: string;
  name: string;
  description?: string;
  iconImageId?: string;
  bannerImageId?: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  order?: number;
  profileId?: string;
};

export type ThemeMode = "dark" | "light" | "oled";

export type ThemeSettings = {
  mode: ThemeMode;
  accent: string;
};

export type PlayHistoryEntry = {
  id: string;
  trackId: string;
  playedAt: number;
  listenedSeconds: number;
  profileId?: string;
};

export type ProfileLike = {
  profileId: string;
  trackId: string;
};
