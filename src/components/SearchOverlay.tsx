import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Track } from "../types";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlaylistStore } from "../stores/playlistStore";
import { usePlayerStore } from "../stores/playerStore";
import { useImageUrl } from "../hooks/useImageUrl";

type SearchOverlayProps = {
  isOpen: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
};

function PlaylistRow({
  playlist,
  onClick,
}: {
  playlist: { id: string; name: string; imageId?: string };
  onClick: () => void;
}) {
  const imageUrl = useImageUrl(playlist.imageId);
  return (
    <button
      type="button"
      className="search-overlay-row search-overlay-playlist-row"
      onClick={onClick}
    >
      <div
        className="search-overlay-row-icon search-overlay-playlist-icon"
        style={{
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        }}
      />
      <span className="search-overlay-row-label">{playlist.name}</span>
    </button>
  );
}

const formatDuration = (seconds: number) => {
  if (!seconds) return "0:00";
  const totalSecs = Math.floor(Number(seconds));
  const minutes = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

function PlayIconSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

function TrackRow({
  track,
  playlistNames,
  onClick,
  onPlayClick,
}: {
  track: Track;
  playlistNames: string[];
  onClick: () => void;
  onPlayClick: (e: React.MouseEvent) => void;
}) {
  const artworkUrl = useImageUrl(track.artworkId);
  const sublabel = playlistNames.length > 0
    ? `${track.artist} · ${playlistNames.join(", ")} · ${formatDuration(track.duration)}`
    : `${track.artist} · ${formatDuration(track.duration)}`;
  return (
    <div className="search-overlay-row search-overlay-track-row">
      <button
        type="button"
        className="search-overlay-track-main"
        onClick={onClick}
      >
        <div
          className="search-overlay-row-icon search-overlay-track-icon"
          style={{
            backgroundImage: artworkUrl ? `url(${artworkUrl})` : undefined,
          }}
        />
        <div className="search-overlay-track-info">
          <span className="search-overlay-row-label">{track.title}</span>
          <span className="search-overlay-row-sublabel">{sublabel}</span>
        </div>
      </button>
      <button
        type="button"
        className="search-overlay-play-btn"
        onClick={onPlayClick}
        title="Play"
        aria-label={`Play ${track.title}`}
      >
        <PlayIconSmall />
      </button>
    </div>
  );
}

export const SearchOverlay = ({ isOpen, query, onQueryChange, onClose }: SearchOverlayProps) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tracks = useLibraryStore((state) => state.tracks);
  const playlists = usePlaylistStore((state) => state.playlists);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);

  const q = query.trim().toLowerCase();

  const filteredTracks = useMemo(() => {
    if (!q) return [];
    return tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(q) ||
        track.artist.toLowerCase().includes(q) ||
        track.album.toLowerCase().includes(q)
    );
  }, [tracks, q]);

  const filteredPlaylists = useMemo(() => {
    if (!q) return [];
    return playlists.filter((p) => p.name.toLowerCase().includes(q));
  }, [playlists, q]);

  const trackToPlaylists = useMemo(() => {
    const map = new Map<string, { names: string[]; firstId: string }>();
    for (const playlist of playlists) {
      for (const trackId of playlist.trackIds) {
        const existing = map.get(trackId);
        if (existing) {
          existing.names.push(playlist.name);
        } else {
          map.set(trackId, { names: [playlist.name], firstId: playlist.id });
        }
      }
    }
    return map;
  }, [playlists]);

  const recentPlaylists = useMemo(() => {
    return [...playlists]
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, 5);
  }, [playlists]);

  const hasQuery = q.length > 0;
  const hasResults =
    hasQuery &&
    (filteredTracks.length > 0 || filteredPlaylists.length > 0);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handlePlaylistClick = (playlistId: string) => {
    onClose();
    const doNav = () => navigate(`/playlist/${playlistId}`);
    if (typeof document.startViewTransition === "function") {
      document.startViewTransition(doNav);
    } else {
      doNav();
    }
  };

  const handleTrackClick = (track: Track) => {
    const info = trackToPlaylists.get(track.id);
    if (info) {
      onClose();
      const doNav = () =>
        navigate(`/playlist/${info.firstId}`, {
          state: { highlightTrackId: track.id },
        });
      if (typeof document.startViewTransition === "function") {
        document.startViewTransition(doNav);
      } else {
        doNav();
      }
    } else {
      const queue = q ? filteredTracks.map((t) => t.id) : [track.id];
      setQueue(queue);
      playTrack(track.id, queue);
      onClose();
    }
  };

  const handlePlayFromSearch = (track: Track) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const queue = filteredTracks.map((t) => t.id);
    setQueue(queue);
    playTrack(track.id, queue);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      const focusInput = () => inputRef.current?.focus();
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(focusInput);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Enter" && hasQuery && hasResults) {
        if (filteredTracks.length === 1) {
          event.preventDefault();
          handleTrackClick(filteredTracks[0]);
        } else if (
          filteredPlaylists.length === 1 &&
          filteredTracks.length === 0
        ) {
          event.preventDefault();
          handlePlaylistClick(filteredPlaylists[0].id);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    onClose,
    hasQuery,
    hasResults,
    filteredTracks,
    filteredPlaylists,
    handleTrackClick,
    handlePlaylistClick,
  ]);

  if (!isOpen) return null;

  const showEmptyHint = !hasQuery || !hasResults;

  return (
    <div
      className="search-overlay-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="search-overlay-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Search"
      >
        <div className="search-overlay-content">
          <input
            ref={inputRef}
            type="search"
            className="search-overlay-input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search for tracks or playlists."
            aria-label="Search for tracks or playlists"
            autoComplete="off"
          />
          {showEmptyHint && !hasQuery && recentPlaylists.length === 0 && (
            <div className="search-overlay-hint">
              Search for tracks or playlists.
            </div>
          )}
          {showEmptyHint && !hasQuery && recentPlaylists.length > 0 && (
            <div className="search-overlay-section">
              <h3 className="search-overlay-section-title">Recent playlists</h3>
              <div className="search-overlay-rows">
                {recentPlaylists.map((playlist) => (
                  <PlaylistRow
                    key={playlist.id}
                    playlist={playlist}
                    onClick={() => handlePlaylistClick(playlist.id)}
                  />
                ))}
              </div>
            </div>
          )}
          {hasQuery && !hasResults && (
            <div className="search-overlay-hint">
              No results for &quot;{query.trim()}&quot;.
            </div>
          )}
          {hasQuery && filteredPlaylists.length > 0 && (
            <div className="search-overlay-section">
              <h3 className="search-overlay-section-title">Playlists</h3>
              <div className="search-overlay-rows">
                {filteredPlaylists.slice(0, 5).map((playlist) => (
                  <PlaylistRow
                    key={playlist.id}
                    playlist={playlist}
                    onClick={() => handlePlaylistClick(playlist.id)}
                  />
                ))}
              </div>
            </div>
          )}
          {hasQuery && filteredTracks.length > 0 && (
            <div className="search-overlay-section">
              <h3 className="search-overlay-section-title">Tracks</h3>
              <div className="search-overlay-rows">
                {filteredTracks.slice(0, 8).map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    playlistNames={trackToPlaylists.get(track.id)?.names ?? []}
                    onClick={() => handleTrackClick(track)}
                    onPlayClick={handlePlayFromSearch(track)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
