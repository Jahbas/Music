import { parseBlob } from "music-metadata-browser";

export type ParsedMetadata = {
  title: string;
  artist: string;
  album: string;
  duration: number;
  artworkBlob?: Blob;
};

const readDurationWithAudio = (file: File) =>
  new Promise<number>((resolve) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });

export const parseAudioMetadata = async (file: File): Promise<ParsedMetadata> => {
  try {
    const metadata = await parseBlob(file);
    const common = metadata.common;
    const title = common.title?.trim() || file.name.replace(/\.[^/.]+$/, "");
    const artist = common.artist?.trim() || "Unknown Artist";
    const album = common.album?.trim() || "Unknown Album";
    const duration = metadata.format.duration
      ? Math.round(metadata.format.duration)
      : await readDurationWithAudio(file);
    const picture = common.picture?.[0];
    const artworkBlob = picture
      ? new Blob([picture.data], { type: picture.format })
      : undefined;
    return { title, artist, album, duration, artworkBlob };
  } catch {
    return {
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Unknown Artist",
      album: "Unknown Album",
      duration: await readDurationWithAudio(file),
    };
  }
};
