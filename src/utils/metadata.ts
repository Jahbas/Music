import { parseBlob } from "music-metadata-browser";

export type ParsedMetadata = {
  title: string;
  artist: string;
  album: string;
  duration: number;
  artworkBlob?: Blob;
};

const stripNullsAndTrim = (value?: string | null) =>
  value ? value.replace(/\0/g, "").trim() : "";

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

    // Title: try several fields before falling back to filename
    const rawTitle =
      stripNullsAndTrim(common.title) ||
      stripNullsAndTrim(
        // Some rippers put title-like info into other text fields
        (metadata.common as any).subtitle ??
          (metadata.common as any).series ??
          (metadata.common as any).show
      );
    const title = rawTitle || file.name.replace(/\.[^/.]+$/, "");

    // Artist: prefer explicit artist, then albumartist, then artists list, then composer
    const artistsJoined = Array.isArray(common.artists)
      ? common.artists.map((a) => stripNullsAndTrim(a)).filter(Boolean).join(", ")
      : "";
    const rawArtist =
      stripNullsAndTrim(common.artist) ||
      stripNullsAndTrim(common.albumartist) ||
      artistsJoined ||
      stripNullsAndTrim(
        // As a last resort, use composer or similar "author" fields
        (metadata.common as any).composer ??
          (metadata.common as any).writer ??
          (metadata.common as any).author
      );
    const artist = rawArtist || "Unknown Artist";

    // Album: fall back through a few possible fields that sometimes hold album/group info
    const rawAlbum =
      stripNullsAndTrim(common.album) ||
      stripNullsAndTrim(
        (metadata.common as any).series ??
          (metadata.common as any).show ??
          (metadata.common as any).grouping
      );
    const album = rawAlbum || "Unknown Album";

    const duration = metadata.format.duration
      ? Math.round(metadata.format.duration)
      : await readDurationWithAudio(file);

    // Artwork: prefer "front cover" type if available, otherwise first picture
    const pictures = common.picture ?? [];
    const preferredPicture =
      pictures.find((p) => {
        const type = (p.type || "").toLowerCase();
        return type.includes("front") || type.includes("cover");
      }) ?? pictures[0];

    const artworkBlob = preferredPicture
      ? new Blob([preferredPicture.data], { type: preferredPicture.format })
      : undefined;

    return { title, artist, album, duration, artworkBlob };
  } catch (error) {
    console.error("Failed to parse audio metadata", error);
    return {
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Unknown Artist",
      album: "Unknown Album",
      duration: await readDurationWithAudio(file),
    };
  }
};
