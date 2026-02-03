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
};

export type ThemeMode = "dark" | "light" | "oled";

export type PlayHistoryEntry = {
  id: string;
  trackId: string;
  playedAt: number;
  listenedSeconds: number;
};
