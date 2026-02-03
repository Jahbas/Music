import { useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { TrackList } from "../components/TrackList";
import { useDragContext } from "../hooks/useDragContext";
import { useImageUrl } from "../hooks/useImageUrl";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { usePlaylistStore } from "../stores/playlistStore";
import { useFolderStore } from "../stores/folderStore";

export const FolderView = () => {
  const { id } = useParams();
  const { onDragStart, onDragEnd } = useDragContext();
  const tracks = useLibraryStore((state) => state.tracks);
  const removeTrack = useLibraryStore((state) => state.removeTrack);
  const toggleTrackLiked = useLibraryStore((state) => state.toggleTrackLiked);
  const playlists = usePlaylistStore((state) => state.playlists);
  const folders = useFolderStore((state) => state.folders);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const playTrackIds = usePlayerStore((state) => state.playTrackIds);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedPlaylistIds, setExpandedPlaylistIds] = useState<Set<string>>(
    () => new Set()
  );

  const folder = useMemo(
    () => folders.find((item) => item.id === id) ?? null,
    [folders, id]
  );

  const folderPlaylists = useMemo(
    () => playlists.filter((playlist) => playlist.folderId === folder?.id),
    [playlists, folder?.id]
  );

  const folderTrackIds = useMemo(() => {
    const collected = new Set<string>();
    for (const playlist of folderPlaylists) {
      for (const trackId of playlist.trackIds) {
        collected.add(trackId);
      }
    }
    return Array.from(collected);
  }, [folderPlaylists]);

  const folderTracks = useMemo(() => {
    if (!folder) {
      return [];
    }
    const trackMap = new Map(tracks.map((track) => [track.id, track]));
    return folderTrackIds
      .map((trackId) => trackMap.get(trackId))
      .filter((track): track is NonNullable<typeof track> => Boolean(track));
  }, [folder, tracks, folderTrackIds]);

  const tracksByPlaylistId = useMemo(() => {
    const trackMap = new Map(tracks.map((track) => [track.id, track]));
    const byPlaylistId: Record<string, typeof tracks> = {};
    for (const playlist of folderPlaylists) {
      const playlistTracks = playlist.trackIds
        .map((trackId) => trackMap.get(trackId))
        .filter((track): track is NonNullable<typeof track> => Boolean(track));
      byPlaylistId[playlist.id] = playlistTracks;
    }
    return byPlaylistId;
  }, [tracks, folderPlaylists]);

  const playlistNamesByTrackId = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const playlist of folderPlaylists) {
      for (const trackId of playlist.trackIds) {
        if (!map[trackId]) {
          map[trackId] = [];
        }
        map[trackId].push(playlist.name);
      }
    }
    return map;
  }, [folderPlaylists]);

  const bannerUrl = useImageUrl(folder?.bannerImageId);

  const togglePlaylistExpanded = useCallback((playlistId: string) => {
    setExpandedPlaylistIds((previous) => {
      const next = new Set(previous);
      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }
      return next;
    });
  }, []);

  const handleToggleSelect = (trackId: string) => {
    setSelectedIds((prev) =>
      prev.includes(trackId)
        ? prev.filter((existingId) => existingId !== trackId)
        : [...prev, trackId]
    );
  };

  const handleSelectAll = useCallback((trackIds: string[]) => {
    setSelectedIds((prev) => {
      const allSelected =
        trackIds.length > 0 && trackIds.every((trackId) => prev.includes(trackId));
      return allSelected ? [] : trackIds;
    });
  }, []);

  const handlePlayFolder = () => {
    if (folderTracks.length === 0) return;
    setExpandedPlaylistIds(new Set(folderPlaylists.map((playlist) => playlist.id)));
    playTrackIds(
      folderTracks.map((track) => track.id),
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

  if (!folder) {
    return <div className="empty-state">Folder not found.</div>;
  }

  return (
    <div className="playlist-view folder-view">
      <div className="playlist-header">
        <div className="playlist-cover-wrapper">
          <div
            className="playlist-cover"
            style={{
              backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
            }}
          />
        </div>
        <div className="playlist-header-info">
          <div className="muted">Folder</div>
          <h1>{folder.name}</h1>
          <div className="muted">
            {folder.description || "No description"}
          </div>
          <div className="muted">
            {folderPlaylists.length === 0
              ? "This folder does not contain any playlists yet."
              : `${folderPlaylists.length} ${
                  folderPlaylists.length === 1 ? "playlist" : "playlists"
                } · ${folderTracks.length} ${
                  folderTracks.length === 1 ? "track" : "tracks"
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
              onClick={handlePlayFolder}
              disabled={folderTracks.length === 0}
              title="Play folder"
              aria-label="Play folder"
            >
              <PlayIcon />
              <span>Play</span>
            </button>
          </div>
        </div>
      </div>
      {folderPlaylists.length === 0 ? (
        <div className="empty-state">
          Add playlists with tracks to this folder to see and play them all together.
        </div>
      ) : (
        <div className="folder-playlists-view">
          {folderPlaylists.map((playlist) => {
            const playlistTracks = tracksByPlaylistId[playlist.id] ?? [];
            const isExpanded = expandedPlaylistIds.has(playlist.id);

            const handlePlayPlaylist = () => {
              if (playlistTracks.length === 0) return;
              playTrackIds(
                playlistTracks.map((track) => track.id),
                { shuffle }
              );
            };

            const handlePlayTrackInPlaylist = (trackId: string) => {
              if (playlistTracks.length === 0) return;
              const queue = playlistTracks.map((track) => track.id);
              setQueue(queue);
              playTrack(trackId, queue);
            };

            return (
              <section
                key={playlist.id}
                className={`folder-playlist-section ${
                  isExpanded ? "folder-playlist-section--expanded" : ""
                }`}
              >
                <header className="folder-playlist-header">
                  <button
                    type="button"
                    className={`folder-playlist-toggle ${
                      isExpanded ? "folder-playlist-toggle--expanded" : ""
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      togglePlaylistExpanded(playlist.id);
                    }}
                    aria-label={
                      isExpanded
                        ? "Collapse playlist tracks"
                        : "Expand playlist tracks"
                    }
                    aria-expanded={isExpanded}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <div className="folder-playlist-title-block">
                    <div className="folder-playlist-title">{playlist.name}</div>
                    <div className="muted folder-playlist-meta">
                      {playlistTracks.length === 0
                        ? "No tracks"
                        : `${playlistTracks.length} ${
                            playlistTracks.length === 1 ? "track" : "tracks"
                          }`}
                    </div>
                  </div>
                  <div className="folder-playlist-header-actions">
                    <button
                      type="button"
                      className="secondary-button folder-playlist-play"
                      onClick={handlePlayPlaylist}
                      disabled={playlistTracks.length === 0}
                      title="Play this playlist"
                      aria-label="Play this playlist"
                    >
                      <PlayIcon />
                      <span>Play</span>
                    </button>
                  </div>
                </header>
                {isExpanded && (
                  <TrackList
                    title={undefined}
                    tracks={playlistTracks}
                    playlistNamesByTrackId={playlistNamesByTrackId}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    onPlay={handlePlayTrackInPlaylist}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onDeleteSelected={handleDeleteSelected}
                    onToggleLike={toggleTrackLiked}
                  />
                )}
              </section>
            );
          })}
        </div>
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

