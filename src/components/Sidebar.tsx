import { useMemo, useState } from "react";
import { usePlaylistStore } from "../stores/playlistStore";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import { EditPlaylistModal } from "./EditPlaylistModal";
import { useImageUrl } from "../hooks/useImageUrl";
import type { DragContext } from "../hooks/useDragContext";
import type { Playlist } from "../types";

function sortPlaylists(playlists: Playlist[]): Playlist[] {
  return [...playlists].sort((a, b) => {
    const aPinned = a.pinned === true ? 1 : 0;
    const bPinned = b.pinned === true ? 1 : 0;
    if (bPinned !== aPinned) return bPinned - aPinned;
    const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || a.name.localeCompare(b.name);
  });
}

type SidebarPlaylistRowProps = {
  playlist: Playlist;
  isDragOver: boolean;
  onNavigate: (path: string) => void;
  onPlay: (playlist: Playlist) => void;
  onDragOver: (e: React.DragEvent, playlistId: string) => void;
  onDragLeave: (e: React.DragEvent, playlistId: string) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>, playlistId: string) => void;
  onEdit: (playlist: Playlist) => void;
};

function SidebarPlaylistRow({
  playlist,
  isDragOver,
  onNavigate,
  onPlay,
  onDragOver,
  onDragLeave,
  onDrop,
  onEdit,
}: SidebarPlaylistRowProps) {
  const bannerUrl = useImageUrl(playlist.bannerImageId);
  const hasBanner = Boolean(playlist.bannerImageId);
  const hasTracks = playlist.trackIds.length > 0;
  return (
    <div
      className={`sidebar-playlist ${isDragOver ? "sidebar-playlist--drag-over" : ""}`}
      onClick={() => onNavigate(`/playlist/${playlist.id}`)}
      onDragOver={(e) => onDragOver(e, playlist.id)}
      onDragLeave={(e) => onDragLeave(e, playlist.id)}
      onDrop={(event) => onDrop(event, playlist.id)}
    >
      {hasBanner && bannerUrl && (
        <div
          className="sidebar-playlist-banner"
          style={{ backgroundImage: `url(${bannerUrl})` }}
          aria-hidden
        />
      )}
      <span
        className="playlist-dot"
        style={
          playlist.color
            ? { background: playlist.color }
            : undefined
        }
      />
      <span
        className="playlist-name"
        title={playlist.name}
      >
        {playlist.name.length > 24
          ? `${playlist.name.slice(0, 24)}…`
          : playlist.name}
      </span>
      {hasTracks && (
        <button
          className="sidebar-playlist-play ghost-button"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPlay(playlist);
          }}
          title="Play playlist"
          aria-label={`Play ${playlist.name}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        </button>
      )}
      <button
        className="playlist-settings"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEdit(playlist);
        }}
        title="Edit playlist"
        aria-label="Edit playlist"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>
    </div>
  );
}

type SidebarProps = {
  dragContext: DragContext;
  onNavigate: (path: string) => void;
};

export const Sidebar = ({ dragContext, onNavigate }: SidebarProps) => {
  const addFiles = useLibraryStore((state) => state.addFiles);
  const playlists = usePlaylistStore((state) => state.playlists);
  const playTrackIds = usePlayerStore((state) => state.playTrackIds);
  const sortedPlaylists = useMemo(() => sortPlaylists(playlists), [playlists]);
  const addTracksToPlaylist = usePlaylistStore(
    (state) => state.addTracksToPlaylist
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [dragOverPlaylistId, setDragOverPlaylistId] = useState<string | null>(null);

  const handlePlayPlaylist = (playlist: Playlist) => {
    if (playlist.trackIds.length === 0) return;
    playTrackIds(playlist.trackIds);
  };

  const handlePlaylistDragOver = (event: React.DragEvent, playlistId: string) => {
    const hasTracks = event.dataTransfer.types.includes("application/x-track-ids");
    const hasFiles = event.dataTransfer.types.includes("Files");
    if (hasTracks || hasFiles) {
      event.preventDefault();
      event.dataTransfer.dropEffect = hasFiles ? "copy" : "move";
      setDragOverPlaylistId(playlistId);
    }
  };

  const handlePlaylistDragLeave = (event: React.DragEvent, playlistId: string) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragOverPlaylistId((id) => (id === playlistId ? null : id));
    }
  };

  const handleDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    playlistId: string
  ) => {
    event.preventDefault();
    const hasTracks = event.dataTransfer.types.includes("application/x-track-ids");
    const hasFiles = event.dataTransfer.types.includes("Files");

    if (hasTracks) {
      setDragOverPlaylistId(null);
      const data = event.dataTransfer.getData("application/x-track-ids");
      if (!data) return;
      const trackIds = JSON.parse(data) as string[];
      await addTracksToPlaylist(playlistId, trackIds);
      dragContext.onDragEnd();
      return;
    }

    if (hasFiles && event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files);
      const trackIds = await addFiles(files);
      if (trackIds.length > 0) {
        await addTracksToPlaylist(playlistId, trackIds);
      }
    }
    setDragOverPlaylistId(null);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-actions">
        <button
          className="secondary-button"
          onClick={() => setIsModalOpen(true)}
        >
          Create playlist
        </button>
      </div>
      <div className="sidebar-section">
        <div className="sidebar-section-title">Playlists</div>
        <div className="sidebar-playlists">
          {sortedPlaylists.map((playlist) => (
            <SidebarPlaylistRow
              key={playlist.id}
              playlist={playlist}
              isDragOver={dragOverPlaylistId === playlist.id}
              onNavigate={onNavigate}
              onPlay={handlePlayPlaylist}
              onDragOver={handlePlaylistDragOver}
              onDragLeave={handlePlaylistDragLeave}
              onDrop={handleDrop}
              onEdit={setEditingPlaylist}
            />
          ))}
        </div>
      </div>
      <CreatePlaylistModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(playlistId) => onNavigate(`/playlist/${playlistId}`)}
      />
      <EditPlaylistModal
        isOpen={editingPlaylist !== null}
        onClose={() => setEditingPlaylist(null)}
        playlist={editingPlaylist}
        onDeleted={() => onNavigate("/")}
      />
    </aside>
  );
};
