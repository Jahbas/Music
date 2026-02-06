import { useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TrackList } from "../components/TrackList";
import { useDragContext } from "../hooks/useDragContext";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { usePlaylistStore } from "../stores/playlistStore";
import { useProfileLikesStore } from "../stores/profileLikesStore";
import { parseSearchQuery, matchesTrack } from "../utils/searchQuery";
import { TagEditorModal } from "../components/TagEditorModal";

export const SearchView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") ?? "";
  const tracks = useLibraryStore((state) => state.tracks);
  const removeTrack = useLibraryStore((state) => state.removeTrack);
  const toggleTrackLiked = useLibraryStore((state) => state.toggleTrackLiked);
  const likedTrackIds = useProfileLikesStore((state) => state.likedTrackIds);
  const playlists = usePlaylistStore((state) => state.playlists);
  const { onDragStart, onDragEnd } = useDragContext();
  const playTrack = usePlayerStore((state) => state.playTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tagEditorTrackId, setTagEditorTrackId] = useState<string | null>(null);

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

  const filteredTracks = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }
    const parsed = parseSearchQuery(trimmed);
    return tracks.filter((track) => matchesTrack(parsed, track));
  }, [tracks, query]);

  const filteredPlaylists = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return [];
    }
    return playlists.filter((playlist) =>
      playlist.name.toLowerCase().includes(trimmed)
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

  const handleSelectAll = useCallback((trackIds: string[]) => {
    setSelectedIds((prev) => {
      const allSelected =
        trackIds.length > 0 && trackIds.every((id) => prev.includes(id));
      return allSelected ? [] : trackIds;
    });
  }, []);

  const handleDeleteSelected = useCallback(
    async (trackIds: string[]) => {
      for (const trackId of trackIds) {
        await removeTrack(trackId);
      }
      setSelectedIds([]);
    },
    [removeTrack]
  );

  const activeTrackForTags = useMemo(
    () => tracks.find((t) => t.id === tagEditorTrackId) ?? null,
    [tracks, tagEditorTrackId]
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
        playlistNamesByTrackId={playlistNamesByTrackId}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onPlay={handlePlay}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDeleteSelected={handleDeleteSelected}
        onToggleLike={toggleTrackLiked}
        likedTrackIds={likedTrackIds}
        onEditTags={(trackId) => setTagEditorTrackId(trackId)}
      />
      <TagEditorModal
        isOpen={tagEditorTrackId !== null && activeTrackForTags !== null}
        onClose={() => setTagEditorTrackId(null)}
        initialTags={activeTrackForTags?.tags ?? []}
        onSave={async (tags) => {
          if (!activeTrackForTags) return;
          await useLibraryStore.getState().setTrackTags(
            activeTrackForTags.id,
            tags
          );
        }}
      />
    </div>
  );
};
