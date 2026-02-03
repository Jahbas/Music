import { useMemo, useState } from "react";
import { usePlaylistStore } from "../stores/playlistStore";
import { useFolderStore } from "../stores/folderStore";
import { useLibraryStore } from "../stores/libraryStore";
import { CreatePlaylistModal } from "./CreatePlaylistModal";
import { EditPlaylistModal } from "./EditPlaylistModal";
import { CreateFolderModal } from "./CreateFolderModal";
import { EditFolderModal } from "./EditFolderModal";
import { useImageUrl } from "../hooks/useImageUrl";
import type { DragContext } from "../hooks/useDragContext";
import type { Playlist, PlaylistFolder } from "../types";
import { getFilesFromDataTransfer } from "../utils/folderDrop";

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

function sortFolders(folders: PlaylistFolder[]): PlaylistFolder[] {
  return [...folders].sort((a, b) => {
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
  onEdit: (playlist: Playlist) => void;
  indent?: boolean;
  onDragStart?: (playlistId: string) => void;
  onDragEnd?: () => void;
};

function SidebarPlaylistRow({
  playlist,
  isDragOver,
  onNavigate,
  onEdit,
  indent = false,
  onDragStart,
  onDragEnd,
}: Omit<SidebarPlaylistRowProps, "onDragOver" | "onDragLeave" | "onDrop">) {
  const bannerUrl = useImageUrl(playlist.bannerImageId);
  const hasBanner = Boolean(playlist.bannerImageId);
  
  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-playlist-id", playlist.id);
    onDragStart?.(playlist.id);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <div
      className={`sidebar-playlist ${isDragOver ? "sidebar-playlist--drag-over" : ""} ${indent ? "sidebar-playlist--indent" : ""}`}
      data-playlist-id={playlist.id}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onNavigate(`/playlist/${playlist.id}`)}
    >
      {hasBanner && bannerUrl && (
        <div
          className="sidebar-playlist-banner"
          style={{ backgroundImage: `url(${bannerUrl})` }}
          aria-hidden
        />
      )}
      <span
        className="playlist-name"
        title={playlist.name}
      >
        {playlist.name.length > 24
          ? `${playlist.name.slice(0, 24)}…`
          : playlist.name}
      </span>
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

type SidebarFolderRowProps = {
  folder: PlaylistFolder;
  playlists: Playlist[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isDragOver: boolean;
  onNavigate: (path: string) => void;
  onEdit: (folder: PlaylistFolder) => void;
  onPlaylistEdit: (playlist: Playlist) => void;
  dragOverPlaylistId: string | null;
  onPlaylistDrop?: (playlistId: string, folderId: string) => void;
};

function SidebarFolderRow({
  folder,
  playlists,
  isExpanded,
  onToggleExpand,
  isDragOver,
  onNavigate,
  onEdit,
  onPlaylistEdit,
  dragOverPlaylistId,
  onPlaylistDrop,
}: SidebarFolderRowProps) {
  const iconUrl = useImageUrl(folder.iconImageId);
  const bannerUrl = useImageUrl(folder.bannerImageId);
  const hasBanner = Boolean(folder.bannerImageId);
  const folderPlaylists = playlists.filter((p) => p.folderId === folder.id);
  const sortedFolderPlaylists = sortPlaylists(folderPlaylists);

  const handleDragOver = (event: React.DragEvent) => {
    const hasPlaylist = event.dataTransfer.types.includes("application/x-playlist-id");
    if (hasPlaylist) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      if (!isExpanded) {
        onToggleExpand();
      }
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    const hasPlaylist = event.dataTransfer.types.includes("application/x-playlist-id");
    if (hasPlaylist) {
      event.preventDefault();
      event.stopPropagation();
      const playlistId = event.dataTransfer.getData("application/x-playlist-id");
      if (playlistId && onPlaylistDrop) {
        onPlaylistDrop(playlistId, folder.id);
      }
    }
  };

  return (
    <div className="sidebar-folder">
      <div
        className={`sidebar-folder-header ${isDragOver ? "sidebar-folder-header--drag-over" : ""}`}
        data-folder-id={folder.id}
        onClick={() => onNavigate(`/folder/${folder.id}`)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {hasBanner && bannerUrl && (
          <div
            className="sidebar-folder-banner"
            style={{ backgroundImage: `url(${bannerUrl})` }}
            aria-hidden
          />
        )}
        <button
          className="sidebar-folder-toggle"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
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
            style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            aria-hidden
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        {iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            className="sidebar-folder-icon"
            aria-hidden
          />
        ) : null}
        <span
          className="playlist-name"
          title={folder.name}
        >
          {folder.name.length > 20
            ? `${folder.name.slice(0, 20)}…`
            : folder.name}
        </span>
        <button
          className="playlist-settings"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(folder);
          }}
          title="Edit folder"
          aria-label="Edit folder"
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
      {isExpanded && (
        <div className="sidebar-folder-playlists">
          {sortedFolderPlaylists.map((playlist) => (
            <SidebarPlaylistRow
              key={playlist.id}
              playlist={playlist}
              isDragOver={dragOverPlaylistId === playlist.id}
              onNavigate={onNavigate}
              onEdit={onPlaylistEdit}
              indent
            />
          ))}
        </div>
      )}
    </div>
  );
}

type SidebarProps = {
  dragContext: DragContext;
  onNavigate: (path: string) => void;
};

export const Sidebar = ({ dragContext, onNavigate }: SidebarProps) => {
  const addFiles = useLibraryStore((state) => state.addFiles);
  const addFileHandles = useLibraryStore((state) => state.addFileHandles);
  const playlists = usePlaylistStore((state) => state.playlists);
  const folders = useFolderStore((state) => state.folders);
  const createPlaylist = usePlaylistStore((state) => state.createPlaylist);
  const addTracksToPlaylist = usePlaylistStore(
    (state) => state.addTracksToPlaylist
  );
  const updatePlaylist = usePlaylistStore((state) => state.updatePlaylist);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editingFolder, setEditingFolder] = useState<PlaylistFolder | null>(null);
  const [dragOverPlaylistId, setDragOverPlaylistId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState(false);
  const [draggingPlaylistId, setDraggingPlaylistId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [foldersCollapsed, setFoldersCollapsed] = useState(false);
  const [playlistsCollapsed, setPlaylistsCollapsed] = useState(false);

  const sortedFolders = useMemo(() => sortFolders(folders), [folders]);
  const playlistsWithoutFolder = useMemo(
    () => sortPlaylists(playlists.filter((p) => !p.folderId)),
    [playlists]
  );

  const toggleFolderExpanded = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleSidebarDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const types = event.dataTransfer.types;
    const hasTracks = types.includes("application/x-track-ids");
    const hasPlaylist = types.includes("application/x-playlist-id");
    const hasFiles = types.includes("Files") || (event.dataTransfer.items?.length ?? 0) > 0;
    event.dataTransfer.dropEffect = hasFiles ? "copy" : "move";
    const playlistRow = (event.target as HTMLElement).closest?.(".sidebar-playlist");
    const folderRow = (event.target as HTMLElement).closest?.(".sidebar-folder-header");
    const playlistId = playlistRow?.getAttribute("data-playlist-id");
    const folderId = folderRow?.getAttribute("data-folder-id");
    
    if (hasPlaylist && folderId) {
      setDragOverFolderId(folderId);
      setDragOverPlaylistId(null);
      setDragOverSection(false);
      if (!expandedFolders.has(folderId)) {
        toggleFolderExpanded(folderId);
      }
    } else if (playlistId && (hasTracks || hasFiles)) {
      setDragOverPlaylistId(playlistId);
      setDragOverFolderId(null);
      setDragOverSection(false);
    } else if (folderId && (hasTracks || hasFiles)) {
      setDragOverFolderId(folderId);
      setDragOverPlaylistId(null);
      setDragOverSection(false);
    } else if (hasTracks || hasFiles) {
      setDragOverSection(true);
      setDragOverPlaylistId(null);
      setDragOverFolderId(null);
    } else if (hasPlaylist) {
      setDragOverSection(true);
      setDragOverPlaylistId(null);
      setDragOverFolderId(null);
    }
  };

  const handleSidebarDragLeave = (event: React.DragEvent) => {
    const related = event.relatedTarget as Node | null;
    if (!related || !event.currentTarget.contains(related)) {
      setDragOverSection(false);
      setDragOverPlaylistId(null);
      setDragOverFolderId(null);
    }
  };

  const processFileDrop = async (
    result: NonNullable<Awaited<ReturnType<typeof getFilesFromDataTransfer>>>
  ): Promise<string[]> => {
    if (result.kind === "folder") {
      if (result.fileHandles.length === 0) return [];
      return addFileHandles(result.fileHandles);
    }
    if (result.files.length === 0) return [];
    return addFiles(result.files);
  };

  const handlePlaylistDrop = async (playlistId: string, folderId: string | null) => {
    await updatePlaylist(playlistId, { folderId: folderId ?? null });
    // Ensure all drag-over visuals are cleared when a playlist drop completes.
    // Folder headers handle their own drop events and stop propagation, so the
    // sidebar-level onDrop handler does not always run.
    setDraggingPlaylistId(null);
    setDragOverPlaylistId(null);
    setDragOverFolderId(null);
    setDragOverSection(false);
  };

  const handleSidebarDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverPlaylistId(null);
    setDragOverFolderId(null);
    setDragOverSection(false);

    const types = event.dataTransfer.types;
    const hasTracks = types.includes("application/x-track-ids");
    const hasPlaylist = types.includes("application/x-playlist-id");
    let hasFiles = types.includes("Files") || (event.dataTransfer.items?.length ?? 0) > 0;
    if (!hasFiles && event.dataTransfer.files?.length) hasFiles = true;
    const playlistRow = (event.target as HTMLElement).closest?.(".sidebar-playlist");
    const folderRow = (event.target as HTMLElement).closest?.(".sidebar-folder-header");
    const playlistId = playlistRow?.getAttribute("data-playlist-id") ?? null;
    const folderId = folderRow?.getAttribute("data-folder-id") ?? null;

    if (hasPlaylist) {
      const draggedPlaylistId = event.dataTransfer.getData("application/x-playlist-id");
      if (draggedPlaylistId && folderId) {
        await handlePlaylistDrop(draggedPlaylistId, folderId);
      } else if (draggedPlaylistId && !folderId && !playlistId) {
        await handlePlaylistDrop(draggedPlaylistId, null);
      }
      setDraggingPlaylistId(null);
      return;
    }

    if (hasTracks) {
      const data = event.dataTransfer.getData("application/x-track-ids");
      if (!data || !playlistId) return;
      const trackIds = JSON.parse(data) as string[];
      await addTracksToPlaylist(playlistId, trackIds);
      dragContext.onDragEnd();
      return;
    }

    if (!hasFiles) return;

    const result = await getFilesFromDataTransfer(event.dataTransfer);
    if (!result) return;

    if (result.kind === "folder") {
      const trackIds = await processFileDrop(result);
      if (trackIds.length > 0) {
        const playlist = await createPlaylist({ name: result.folderName });
        await addTracksToPlaylist(playlist.id, trackIds);
        onNavigate(`/playlist/${playlist.id}`);
      }
      return;
    }

    const trackIds = await processFileDrop(result);
    if (trackIds.length > 0 && playlistId) {
      await addTracksToPlaylist(playlistId, trackIds);
    }
  };

  return (
    <aside
      className={`sidebar ${dragOverSection || dragOverPlaylistId || dragOverFolderId ? "sidebar--drag-over" : ""}`}
      onDragOver={handleSidebarDragOver}
      onDragLeave={handleSidebarDragLeave}
      onDrop={handleSidebarDrop}
    >
      <div className="sidebar-actions">
        <button
          className="secondary-button"
          onClick={() => setIsPlaylistModalOpen(true)}
        >
          Create playlist
        </button>
        <button
          className="secondary-button"
          onClick={() => setIsFolderModalOpen(true)}
        >
          Create folder
        </button>
      </div>
      <div
        className={`sidebar-section ${dragOverSection ? "sidebar-section--drag-over" : ""}`}
      >
        <button
          type="button"
          className="sidebar-section-header"
          onClick={() => setFoldersCollapsed((prev) => !prev)}
          aria-expanded={!foldersCollapsed}
        >
          <span className="sidebar-section-title">Folders</span>
          <span
            className={`sidebar-section-chevron ${foldersCollapsed ? "sidebar-section-chevron--collapsed" : ""}`}
            aria-hidden
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
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>
        {!foldersCollapsed && (
          <div className="sidebar-playlists">
            {sortedFolders.map((folder) => (
              <SidebarFolderRow
                key={folder.id}
                folder={folder}
                playlists={playlists}
                isExpanded={expandedFolders.has(folder.id)}
                onToggleExpand={() => toggleFolderExpanded(folder.id)}
                isDragOver={dragOverFolderId === folder.id}
                onNavigate={onNavigate}
                onEdit={setEditingFolder}
                onPlaylistEdit={setEditingPlaylist}
                dragOverPlaylistId={dragOverPlaylistId}
                onPlaylistDrop={handlePlaylistDrop}
              />
            ))}
          </div>
        )}
      </div>
      <div
        className={`sidebar-section ${dragOverSection ? "sidebar-section--drag-over" : ""}`}
      >
        <button
          type="button"
          className="sidebar-section-header"
          onClick={() => setPlaylistsCollapsed((prev) => !prev)}
          aria-expanded={!playlistsCollapsed}
        >
          <span className="sidebar-section-title">Playlists</span>
          <span
            className={`sidebar-section-chevron ${playlistsCollapsed ? "sidebar-section-chevron--collapsed" : ""}`}
            aria-hidden
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
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>
        {!playlistsCollapsed && (
          <div className="sidebar-playlists">
            <div className="sidebar-playlist" onClick={() => onNavigate("/liked")}>
              <span className="playlist-name" title="Liked Songs">
                Liked Songs
              </span>
            </div>
            {playlistsWithoutFolder.map((playlist) => (
              <SidebarPlaylistRow
                key={playlist.id}
                playlist={playlist}
                isDragOver={dragOverPlaylistId === playlist.id}
                onNavigate={onNavigate}
                onEdit={setEditingPlaylist}
                onDragStart={setDraggingPlaylistId}
                onDragEnd={() => setDraggingPlaylistId(null)}
              />
            ))}
          </div>
        )}
      </div>
      <CreatePlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        onCreated={(playlistId) => onNavigate(`/playlist/${playlistId}`)}
      />
      <EditPlaylistModal
        isOpen={editingPlaylist !== null}
        onClose={() => setEditingPlaylist(null)}
        playlist={editingPlaylist}
        onDeleted={() => onNavigate("/")}
      />
      <CreateFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onCreated={() => setIsFolderModalOpen(false)}
      />
      <EditFolderModal
        isOpen={editingFolder !== null}
        onClose={() => setEditingFolder(null)}
        folder={editingFolder}
        onDeleted={() => setEditingFolder(null)}
      />
    </aside>
  );
};
