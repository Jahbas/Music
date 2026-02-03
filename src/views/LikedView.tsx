import { useMemo, useState, useCallback } from "react";
import { TrackList } from "../components/TrackList";
import { useDragContext } from "../hooks/useDragContext";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { usePlaylistStore } from "../stores/playlistStore";

export const LikedView = () => {
  const { onDragStart, onDragEnd } = useDragContext();
  const tracks = useLibraryStore((state) => state.tracks);
  const removeTrack = useLibraryStore((state) => state.removeTrack);
  const toggleTrackLiked = useLibraryStore((state) => state.toggleTrackLiked);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const playTrackIds = usePlayerStore((state) => state.playTrackIds);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const playlists = usePlaylistStore((state) => state.playlists);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const likedTracks = useMemo(
    () => tracks.filter((track) => track.liked),
    [tracks]
  );

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

  const handleToggleSelect = (trackId: string) => {
    setSelectedIds((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId]
    );
  };

  const handlePlay = (trackId: string) => {
    const queue = likedTracks.map((track) => track.id);
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

  const handlePlayLiked = () => {
    if (likedTracks.length === 0) return;
    playTrackIds(
      likedTracks.map((t) => t.id),
      { shuffle }
    );
  };

  const handleDeleteSelected = useCallback(
    async (trackIds: string[]) => {
      for (const trackId of trackIds) {
        await removeTrack(trackId);
      }
      setSelectedIds([]);
    },
    [removeTrack]
  );

  return (
    <div className="playlist-view liked-view">
      <div className="playlist-header">
        <div className="playlist-header-info">
          <div className="muted">Playlist</div>
          <h1>Liked Songs</h1>
          <div className="muted">
            {likedTracks.length === 0
              ? "Like songs from your library, playlists, or search results to see them here."
              : `${likedTracks.length} liked ${
                  likedTracks.length === 1 ? "song" : "songs"
                }`}
          </div>
          <div className="playlist-header-actions">
            <button
              type="button"
              className={`ghost-button playlist-header-shuffle ${
                shuffle ? "playlist-header-shuffle--on" : ""
              }`}
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
              onClick={handlePlayLiked}
              disabled={likedTracks.length === 0}
              title="Play liked songs"
              aria-label="Play liked songs"
            >
              <PlayIcon />
              <span>Play</span>
            </button>
          </div>
        </div>
      </div>
      {likedTracks.length === 0 ? (
        <div className="empty-state">
          Like songs from your library, playlists, or search results to see them
          here.
        </div>
      ) : (
        <TrackList
          title="Tracks"
          tracks={likedTracks}
          playlistNamesByTrackId={playlistNamesByTrackId}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onPlay={handlePlay}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDeleteSelected={handleDeleteSelected}
          onToggleLike={toggleTrackLiked}
        />
      )}
    </div>
  );
};

function ShuffleIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
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
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}


