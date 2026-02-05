const EXPAND_PLAYLISTS_ON_FOLDER_PLAY_KEY = "settings-expand-playlists-on-folder-play";

export function getExpandPlaylistsOnFolderPlay(): boolean {
  try {
    const raw = localStorage.getItem(EXPAND_PLAYLISTS_ON_FOLDER_PLAY_KEY);
    if (raw == null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function setExpandPlaylistsOnFolderPlay(value: boolean): void {
  try {
    localStorage.setItem(EXPAND_PLAYLISTS_ON_FOLDER_PLAY_KEY, String(value));
  } catch {
    // ignore
  }
}
