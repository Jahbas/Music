import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { TrackList } from "../components/TrackList";
import { useDragContext } from "../hooks/useDragContext";
import { useImageUrl } from "../hooks/useImageUrl";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { usePlaylistStore } from "../stores/playlistStore";

export const PlaylistView = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const highlightTrackId = (location.state as { highlightTrackId?: string } | null)
    ?.highlightTrackId;
  const playlists = usePlaylistStore((state) => state.playlists);
  const addTracksToPlaylist = usePlaylistStore(
    (state) => state.addTracksToPlaylist
  );
  const removeTrackFromPlaylist = usePlaylistStore(
    (state) => state.removeTrackFromPlaylist
  );
  const tracks = useLibraryStore((state) => state.tracks);
  const addFiles = useLibraryStore((state) => state.addFiles);
  const toggleTrackLiked = useLibraryStore((state) => state.toggleTrackLiked);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const playTrackIds = usePlayerStore((state) => state.playTrackIds);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const { onDragStart, onDragEnd } = useDragContext();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const playlistNamesByTrackId = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const playlist of playlists) {
      for (const trackId of playlist.trackIds) {
        if (!map[trackId]) {
          map[trackId] = [];
        }
        map[trackId].push(playlist.name);
      }
    }
    return map;
  }, [playlists]);

  useEffect(() => {
    if (!highlightTrackId) return;
    const t = setTimeout(() => {
      navigate(location.pathname, { replace: true, state: {} });
    }, 600);
    return () => clearTimeout(t);
  }, [highlightTrackId, location.pathname, navigate]);

  const playlist = playlists.find((item) => item.id === id);
  const playlistTracks = useMemo(() => {
    if (!playlist) {
      return [];
    }
    const trackMap = new Map(tracks.map((track) => [track.id, track]));
    return playlist.trackIds
      .map((trackId) => trackMap.get(trackId))
      .filter((track): track is NonNullable<typeof track> => Boolean(track));
  }, [playlist, tracks]);

  const imageUrl = useImageUrl(playlist?.imageId);

  const handleToggleSelect = (trackId: string) => {
    setSelectedIds((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId]
    );
  };

  const handlePlay = (trackId: string) => {
    const queue = playlistTracks.map((track) => track.id);
    setQueue(queue);
    playTrack(trackId, queue);
  };

  const handleSelectAll = useCallback((trackIds: string[]) => {
    setSelectedIds((prev) => {
      const allSelected =
        trackIds.length > 0 && trackIds.every((id) => prev.includes(id));
      return allSelected ? [] : trackIds;
    });
  }, []);

  const handlePlayPlaylist = () => {
    if (playlistTracks.length === 0) return;
    playTrackIds(
      playlistTracks.map((t) => t.id),
      { shuffle }
    );
  };

  const handleDeleteSelected = useCallback(
    async (trackIds: string[]) => {
      if (!playlist) return;
      for (const trackId of trackIds) {
        await removeTrackFromPlaylist(playlist.id, trackId);
      }
      setSelectedIds([]);
    },
    [playlist, removeTrackFromPlaylist]
  );

  const hasFileTypes = useCallback((dataTransfer: DataTransfer) => {
    return dataTransfer.types.includes("Files");
  }, []);

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      if (!hasFileTypes(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsDraggingFiles(true);
    },
    [hasFileTypes]
  );

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDraggingFiles(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      setIsDraggingFiles(false);
      if (!playlist || !hasFileTypes(event.dataTransfer)) return;
      event.preventDefault();
      const files = event.dataTransfer.files;
      if (!files.length) return;
      const trackIds = await addFiles(files);
      if (trackIds.length > 0) {
        await addTracksToPlaylist(playlist.id, trackIds);
      }
    },
    [playlist, hasFileTypes, addFiles, addTracksToPlaylist]
  );

  if (!playlist) {
    return <div className="empty-state">Playlist not found.</div>;
  }

  return (
    <div
      className={`playlist-view ${isDraggingFiles ? "playlist-view--drop-target" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFiles && (
        <div className="playlist-view-drop-hint" aria-hidden>
          Drop files to add to playlist
        </div>
      )}
      <div className="playlist-header">
        <div className="playlist-cover-wrapper">
          <div
            className="playlist-cover"
            style={{
              backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
            }}
          />
        </div>
        <div className="playlist-header-info">
          <div className="muted">Playlist</div>
          <h1>{playlist.name}</h1>
          <div className="muted">
            {playlist.description || "No description"}
          </div>
          <div className="playlist-header-actions">
            <button
              type="button"
              className={`ghost-button playlist-header-shuffle ${shuffle ? "playlist-header-shuffle--on" : ""}`}
              onClick={toggleShuffle}
              title={shuffle ? "Shuffle on" : "Shuffle off"}
              aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
              aria-pressed={shuffle}
            >
              <ShuffleIcon />
            </button>
            <button
              type="button"
              className="primary-button playlist-header-play"
              onClick={handlePlayPlaylist}
              disabled={playlistTracks.length === 0}
              title="Play playlist"
              aria-label="Play playlist"
            >
              <PlayIcon />
              <span>Play</span>
            </button>
          </div>
        </div>
      </div>
      <TrackList
        title="Tracks"
        tracks={playlistTracks}
        playlistNamesByTrackId={playlistNamesByTrackId}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onPlay={handlePlay}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDeleteSelected={handleDeleteSelected}
        highlightTrackId={highlightTrackId}
        onToggleLike={toggleTrackLiked}
      />
    </div>
  );
};

function ShuffleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 3h5v5" />
      <path d="M4 20L21 3" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}
