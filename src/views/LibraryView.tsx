import { useState, useCallback } from "react";
import { useDragContext } from "../hooks/useDragContext";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlaylistStore } from "../stores/playlistStore";
import { usePlayerStore } from "../stores/playerStore";
import { TrackList } from "../components/TrackList";
import { Modal } from "../components/Modal";

export const LibraryView = () => {
  const { onDragStart, onDragEnd } = useDragContext();
  const tracks = useLibraryStore((state) => state.tracks);
  const addFiles = useLibraryStore((state) => state.addFiles);
  const removeTrack = useLibraryStore((state) => state.removeTrack);
  const clearLibrary = useLibraryStore((state) => state.clearLibrary);
  const removeTrackIdsFromAllPlaylists = usePlaylistStore(
    (state) => state.removeTrackIdsFromAllPlaylists
  );
  const playTrack = usePlayerStore((state) => state.playTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const clearQueue = usePlayerStore((state) => state.clearQueue);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isDeleteLibraryModalOpen, setIsDeleteLibraryModalOpen] = useState(false);

  const hasFileTypes = useCallback((dataTransfer: DataTransfer) => {
    return dataTransfer.types.includes("Files");
  }, []);

  const handleToggleSelect = (trackId: string) => {
    setSelectedIds((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId]
    );
  };

  const handlePlay = (trackId: string) => {
    const queue = tracks.map((track) => track.id);
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

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    setIsDraggingFiles(false);
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      await addFiles(files);
    }
  };

  const handleConfirmDeleteLibrary = useCallback(async () => {
    const trackIds = tracks.map((t) => t.id);
    await clearLibrary();
    await removeTrackIdsFromAllPlaylists(trackIds);
    clearQueue();
    setSelectedIds([]);
    setIsDeleteLibraryModalOpen(false);
  }, [tracks, clearLibrary, removeTrackIdsFromAllPlaylists, clearQueue]);

  return (
    <div
      className={`library-view ${isDraggingFiles ? "library-view--drop-target" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFiles && (
        <div className="library-view-drop-hint" aria-hidden>
          Drop files to add to your library
        </div>
      )}
      <div className="drop-hint">
        Drag audio files here to add to your library
      </div>
      <TrackList
        tracks={tracks}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onPlay={handlePlay}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDeleteSelected={handleDeleteSelected}
        onDeleteLibrary={
          tracks.length > 0
            ? () => setIsDeleteLibraryModalOpen(true)
            : undefined
        }
      />
      <Modal
        title="Delete entire library?"
        isOpen={isDeleteLibraryModalOpen}
        onClose={() => setIsDeleteLibraryModalOpen(false)}
      >
        <p className="muted" style={{ marginBottom: 16 }}>
          This will remove all tracks from your library and from every playlist.
          You can add songs again by dragging files here or into a playlist.
        </p>
        <div className="form-actions" style={{ justifyContent: "flex-end" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsDeleteLibraryModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={handleConfirmDeleteLibrary}
          >
            Delete library
          </button>
        </div>
      </Modal>
    </div>
  );
};
