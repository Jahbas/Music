import type { Track } from "../types";
import { parseAudioMetadata } from "./metadata";

const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "audio/x-flac",
  "audio/aac",
  "audio/mp4",
  "audio/webm",
]);

export const isSupportedAudioFile = (file: File) => {
  if (SUPPORTED_AUDIO_TYPES.has(file.type)) {
    return true;
  }
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return ["mp3", "wav", "ogg", "flac", "aac", "m4a", "webm"].includes(
    extension
  );
};

export const fileToTrack = async (
  file: File,
  sourceType: "blob" | "handle",
  fileHandle?: FileSystemFileHandle
): Promise<{ track: Track; artworkBlob?: Blob }> => {
  const { title, artist, album, duration, year, artworkBlob } =
    await parseAudioMetadata(file);
  const track: Track = {
    id: crypto.randomUUID(),
    title,
    artist,
    album,
    duration,
    addedAt: Date.now(),
    year,
    sourceType,
    fileBlob: sourceType === "blob" ? file : undefined,
    fileHandle: sourceType === "handle" ? fileHandle : undefined,
    liked: false,
  };
  return { track, artworkBlob };
};
