import { useThemeStore } from "../stores/themeStore";
import { useAudioSettingsStore } from "../stores/audioSettingsStore";
import { usePlayerStore } from "../stores/playerStore";
import { usePlaylistStore } from "../stores/playlistStore";
import { useFolderStore } from "../stores/folderStore";

type ExportedSettings = {
  version: 1;
  exportedAt: string;
  theme: {
    mode: string;
    accent: string;
    density: string;
    motion: string;
  };
  audio: {
    crossfadeEnabled: boolean;
    crossfadeMs: number;
    gaplessEnabled: boolean;
    eqEnabled: boolean;
    eqPresetId: string;
    eqBands: { frequency: number; gain: number; q: number }[];
  };
  player: {
    shuffle: boolean;
    repeat: string;
    volume: number;
    playbackRate: number;
  };
  structure: {
    folders: Array<{
      id: string;
      name: string;
      description?: string;
      pinned?: boolean;
      order?: number | null;
    }>;
    playlists: Array<{
      id: string;
      name: string;
      description?: string;
      color?: string;
      folderId?: string;
    }>;
  };
};

export function exportSettingsToJson(): string {
  const themeState = useThemeStore.getState();
  const audioState = useAudioSettingsStore.getState();
  const playerState = usePlayerStore.getState();
  const playlistState = usePlaylistStore.getState();
  const folderState = useFolderStore.getState();

  const payload: ExportedSettings = {
    version: 1,
    exportedAt: new Date().toISOString(),
    theme: {
      mode: themeState.mode,
      accent: themeState.accent,
      density: themeState.density,
      motion: themeState.motion,
    },
    audio: {
      crossfadeEnabled: audioState.crossfadeEnabled,
      crossfadeMs: audioState.crossfadeMs,
      gaplessEnabled: audioState.gaplessEnabled,
      eqEnabled: audioState.eqEnabled,
      eqPresetId: audioState.eqPresetId,
      eqBands: audioState.eqBands,
    },
    player: {
      shuffle: playerState.shuffle,
      repeat: playerState.repeat,
      volume: playerState.volume,
      playbackRate: playerState.playbackRate,
    },
    structure: {
      folders: folderState.folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        description: folder.description,
        pinned: folder.pinned,
        order: folder.order ?? null,
      })),
      playlists: playlistState.playlists.map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        color: playlist.color,
        folderId: playlist.folderId,
      })),
    },
  };

  return JSON.stringify(payload, null, 2);
}

export async function importSettingsFromJson(json: string): Promise<void> {
  const parsed = JSON.parse(json) as ExportedSettings;
  if (!parsed || parsed.version !== 1) {
    throw new Error("Unsupported settings backup version.");
  }

  const themeState = useThemeStore.getState();
  const audioState = useAudioSettingsStore.getState();
  const playerState = usePlayerStore.getState();
  const playlistState = usePlaylistStore.getState();
  const folderState = useFolderStore.getState();

  themeState.setMode(parsed.theme.mode as any);
  themeState.setAccent(parsed.theme.accent);
  themeState.setDensity(parsed.theme.density as any);
  themeState.setMotion(parsed.theme.motion as any);

  audioState.setCrossfadeEnabled(parsed.audio.crossfadeEnabled);
  audioState.setCrossfadeMs(parsed.audio.crossfadeMs);
  audioState.setGaplessEnabled(parsed.audio.gaplessEnabled);
  audioState.setEqEnabled(parsed.audio.eqEnabled);
  audioState.setEqPresetId(parsed.audio.eqPresetId as any);
  audioState.setEqBands(parsed.audio.eqBands);

  playerState.setShuffle(parsed.player.shuffle);
  playerState.setRepeat(parsed.player.repeat as any);
  playerState.setVolume(parsed.player.volume);
  playerState.setPlaybackRate(parsed.player.playbackRate);

  if (parsed.structure.folders.length > 0) {
    const existingFoldersById = new Map(folderState.folders.map((f) => [f.id, f]));
    for (const folder of parsed.structure.folders) {
      const existing = existingFoldersById.get(folder.id);
      if (existing) {
        await folderDbPut({
          ...existing,
          name: folder.name,
          description: folder.description,
          pinned: folder.pinned,
          order: folder.order ?? undefined,
        });
      }
    }
  }

  if (parsed.structure.playlists.length > 0) {
    const existingPlaylistsById = new Map(playlistState.playlists.map((p) => [p.id, p]));
    for (const playlist of parsed.structure.playlists) {
      const existing = existingPlaylistsById.get(playlist.id);
      if (existing) {
        await playlistDbPut({
          ...existing,
          name: playlist.name,
          description: playlist.description,
          color: playlist.color,
          folderId: playlist.folderId,
        });
      }
    }
    await playlistState.hydrate();
    await folderState.hydrate();
  }
}

async function folderDbPut(folder: any): Promise<void> {
  const { folderDb } = await import("../db/db");
  await folderDb.put(folder);
}

async function playlistDbPut(playlist: any): Promise<void> {
  const { playlistDb } = await import("../db/db");
  await playlistDb.put(playlist);
}

