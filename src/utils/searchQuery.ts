import type { Track } from "../types";

export type ParsedSearch = {
  terms: string[];
  required: string[];
  excluded: string[];
  artist: string[];
  album: string[];
  year: number[];
  tags: string[];
  excludedArtist: string[];
  excludedAlbum: string[];
  excludedTags: string[];
};

export function parseSearchQuery(raw: string): ParsedSearch {
  const result: ParsedSearch = {
    terms: [],
    required: [],
    excluded: [],
    artist: [],
    album: [],
    year: [],
    tags: [],
    excludedArtist: [],
    excludedAlbum: [],
    excludedTags: [],
  };

  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      if (!inQuotes && current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
      continue;
    }
    if (/\s/.test(ch) && !inQuotes) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    tokens.push(current.trim());
  }

  for (const token of tokens) {
    const isExcluded = token.startsWith("-");
    const core = isExcluded ? token.slice(1) : token;
    const [field, ...rest] = core.split(":");
    const value = rest.join(":").trim();

    if (!value) {
      if (isExcluded) {
        result.excluded.push(field.toLowerCase());
      } else {
        result.terms.push(field.toLowerCase());
      }
      continue;
    }

    const lowerField = field.toLowerCase();
    const lowerValue = value.toLowerCase();

    if (lowerField === "artist") {
      (isExcluded ? result.excludedArtist : result.artist).push(lowerValue);
    } else if (lowerField === "album") {
      (isExcluded ? result.excludedAlbum : result.album).push(lowerValue);
    } else if (lowerField === "tag" || lowerField === "tags") {
      (isExcluded ? result.excludedTags : result.tags).push(lowerValue);
    } else if (lowerField === "year") {
      const maybeYear = Number.parseInt(value, 10);
      if (Number.isFinite(maybeYear)) {
        result.year.push(maybeYear);
      }
    } else {
      if (isExcluded) {
        result.excluded.push(core.toLowerCase());
      } else {
        result.terms.push(core.toLowerCase());
      }
    }
  }

  return result;
}

type SearchFields = {
  title: string;
  artist: string;
  album: string;
  tags: string[];
};

const searchFieldCache = new WeakMap<Track, SearchFields>();

function getSearchFields(track: Track): SearchFields {
  const existing = searchFieldCache.get(track);
  if (existing) {
    return existing;
  }
  const fields: SearchFields = {
    title: track.title.toLowerCase(),
    artist: track.artist.toLowerCase(),
    album: track.album.toLowerCase(),
    tags: (track.tags ?? []).map((t) => t.toLowerCase()),
  };
  searchFieldCache.set(track, fields);
  return fields;
}

export function matchesTrack(query: ParsedSearch, track: Track): boolean {
  const { title, artist, album, tags } = getSearchFields(track);

  for (const term of query.terms) {
    const inFields =
      title.includes(term) ||
      artist.includes(term) ||
      album.includes(term) ||
      tags.some((tag) => tag.includes(term));
    if (!inFields) {
      return false;
    }
  }

  for (const term of query.required) {
    const inFields =
      title.includes(term) ||
      artist.includes(term) ||
      album.includes(term) ||
      tags.some((tag) => tag.includes(term));
    if (!inFields) {
      return false;
    }
  }

  for (const term of query.excluded) {
    if (
      title.includes(term) ||
      artist.includes(term) ||
      album.includes(term) ||
      tags.some((tag) => tag.includes(term))
    ) {
      return false;
    }
  }

  if (query.artist.length > 0) {
    const ok = query.artist.some((needle) => artist.includes(needle));
    if (!ok) return false;
  }

  if (query.album.length > 0) {
    const ok = query.album.some((needle) => album.includes(needle));
    if (!ok) return false;
  }

  if (query.tags.length > 0) {
    const ok = query.tags.every((needle) =>
      tags.some((tag) => tag.includes(needle))
    );
    if (!ok) return false;
  }

  if (query.year.length > 0) {
    if (!track.year || !query.year.includes(track.year)) {
      return false;
    }
  }

  for (const needle of query.excludedArtist) {
    if (artist.includes(needle)) return false;
  }
  for (const needle of query.excludedAlbum) {
    if (album.includes(needle)) return false;
  }
  for (const needle of query.excludedTags) {
    if (tags.some((tag) => tag.includes(needle))) return false;
  }

  return true;
}

