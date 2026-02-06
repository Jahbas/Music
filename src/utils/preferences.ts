const EXPAND_PLAYLISTS_ON_FOLDER_PLAY_KEY = "settings-expand-playlists-on-folder-play";
const TELEMETRY_ENABLED_KEY = "settings-telemetry-enabled";

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

export function getTelemetryEnabled(): boolean {
  try {
    const raw = localStorage.getItem(TELEMETRY_ENABLED_KEY);
    if (raw == null) return false;
    return raw === "true";
  } catch {
    return false;
  }
}

export function setTelemetryEnabled(value: boolean): void {
  try {
    localStorage.setItem(TELEMETRY_ENABLED_KEY, String(value));
  } catch {
    // ignore
  }
}
