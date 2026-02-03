import { useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TrackList } from "../components/TrackList";
import { useDragContext } from "../hooks/useDragContext";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { usePlaylistStore } from "../stores/playlistStore";

export const SearchView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = (searchParams.get("q") ?? "").toLowerCase();
  const tracks = useLibraryStore((state) => state.tracks);
  const removeTrack = useLibraryStore((state) => state.removeTrack);
  const playlists = usePlaylistStore((state) => state.playlists);
  const { onDragStart, onDragEnd } = useDragContext();
  const playTrack = usePlayerStore((state) => state.playTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredTracks = useMemo(() => {
    if (!query) {
      return [];
    }
    return tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(query) ||
        track.artist.toLowerCase().includes(query) ||
        track.album.toLowerCase().includes(query)
    );
  }, [tracks, query]);

  const filteredPlaylists = useMemo(() => {
    if (!query) {
      return [];
    }
    return playlists.filter((playlist) =>
      playlist.name.toLowerCase().includes(query)
    );
  }, [playlists, query]);

  const handleToggleSelect = (trackId: string) => {
    setSelectedIds((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId]
    );
  };

  const handlePlay = (trackId: string) => {
    const queue = filteredTracks.map((track) => track.id);
    setQueue(queue);
    playTrack(trackId, queue);
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

  if (!query) {
    return <div className="empty-state">Search for tracks or playlists.</div>;
  }

  return (
    <div className="search-view">
      {filteredPlaylists.length > 0 && (
        <div className="playlist-search-results">
          <h2>Playlists</h2>
          <div className="playlist-grid">
            {filteredPlaylists.map((playlist) => (
              <div
                key={playlist.id}
                className="playlist-card"
                onClick={() => navigate(`/playlist/${playlist.id}`)}
              >
                <div className="playlist-cover small" />
                <div>{playlist.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <TrackList
        title="Tracks"
        tracks={filteredTracks}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onPlay={handlePlay}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDeleteSelected={handleDeleteSelected}
      />
    </div>
  );
};
