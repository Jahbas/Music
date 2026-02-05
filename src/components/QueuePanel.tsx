import { useCallback, useEffect, useMemo, useState } from "react";
import { useImageUrl } from "../hooks/useImageUrl";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";

const QUEUE_DRAG_TYPE = "application/x-queue-index";
const TRACK_IDS_TYPE = "application/x-track-ids";

type QueuePanelProps = {
  onClose: () => void;
  embedInOverlay?: boolean;
};

function QueueListIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export const QueuePanel = ({ onClose, embedInOverlay = false }: QueuePanelProps) => {
  const tracks = useLibraryStore((state) => state.tracks);
  const trackMap = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);
  const {
    queue,
    currentTrackId,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
  } = usePlayerStore();

  const currentIndex =
    currentTrackId != null ? queue.indexOf(currentTrackId) : -1;
  const nextInQueue = useMemo(
    () => (currentIndex >= 0 ? queue.slice(currentIndex + 1) : queue),
    [queue, currentIndex]
  );

  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingQueueIndex, setDraggingQueueIndex] = useState<number | null>(
    null
  );

  const displayOrder = useMemo(() => {
    if (
      draggingQueueIndex == null ||
      dragOverIndex == null ||
      draggingQueueIndex === dragOverIndex
    ) {
      return nextInQueue;
    }
    const fromPos = draggingQueueIndex - currentIndex - 1;
    const toPos = dragOverIndex - currentIndex - 1;
    if (fromPos < 0 || toPos < 0 || fromPos >= nextInQueue.length || toPos >= nextInQueue.length) {
      return nextInQueue;
    }
    const reordered = [...nextInQueue];
    const [item] = reordered.splice(fromPos, 1);
    reordered.splice(toPos, 0, item);
    return reordered;
  }, [nextInQueue, currentIndex, draggingQueueIndex, dragOverIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePanelDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(TRACK_IDS_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      return;
    }
    if (e.dataTransfer.types.includes(QUEUE_DRAG_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  }, []);

  const handlePanelDrop = useCallback(
    (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(TRACK_IDS_TYPE)) return;
      e.preventDefault();
      try {
        const raw = e.dataTransfer.getData(TRACK_IDS_TYPE);
        const ids = JSON.parse(raw) as string[];
        if (Array.isArray(ids) && ids.length > 0) {
          addToQueue(ids, "end");
        }
      } catch {
        // ignore
      }
    },
    [addToQueue]
  );

  const handleRowDragStart = useCallback(
    (e: React.DragEvent, queueIndex: number) => {
      setDraggingQueueIndex(queueIndex);
      e.dataTransfer.setData(QUEUE_DRAG_TYPE, String(queueIndex));
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleRowDragEnd = useCallback(() => {
    setDraggingQueueIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleRowDragOver = useCallback(
    (e: React.DragEvent, queueIndex: number) => {
      if (e.dataTransfer.types.includes(TRACK_IDS_TYPE)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        return;
      }
      if (!e.dataTransfer.types.includes(QUEUE_DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(queueIndex);
    },
    []
  );

  const handleRowDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleRowDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);
      if (!e.dataTransfer.types.includes(QUEUE_DRAG_TYPE)) return;
      const fromIndex = Number(e.dataTransfer.getData(QUEUE_DRAG_TYPE));
      if (Number.isFinite(fromIndex) && fromIndex !== toIndex) {
        reorderQueue(fromIndex, toIndex);
      }
      setDraggingQueueIndex(null);
    },
    [reorderQueue]
  );

  const currentTrack =
    currentTrackId != null ? trackMap.get(currentTrackId) : undefined;
  const currentArtworkUrl = useImageUrl(currentTrack?.artworkId);

  return (
    <>
      {!embedInOverlay && (
        <div
          className="queue-panel-backdrop"
          onClick={onClose}
          aria-hidden
        />
      )}
      <div
        className={`queue-panel ${embedInOverlay ? "queue-panel--embedded" : ""}`}
        onDragOver={handlePanelDragOver}
        onDrop={handlePanelDrop}
      >
        <div className="queue-panel-header">
          <div className="queue-panel-title">
            <QueueListIcon />
            <span>Queue</span>
          </div>
          <button
            type="button"
            className="queue-panel-close ghost-button"
            onClick={onClose}
            title="Close queue"
            aria-label="Close queue"
          >
            <CloseIcon />
          </button>
        </div>
        <div
          className="queue-panel-content"
          onDragOver={handlePanelDragOver}
        >
          {currentTrack && (
            <div className="queue-panel-now">
              <span className="queue-panel-section-label">Now playing</span>
              <div className="queue-panel-now-row">
                {currentArtworkUrl && (
                  <div
                    className="queue-panel-artwork"
                    style={{ backgroundImage: `url(${currentArtworkUrl})` }}
                  />
                )}
                <div className="queue-panel-now-info">
                  <div className="queue-panel-now-title">{currentTrack.title}</div>
                  {currentTrack.artist &&
                    currentTrack.artist.trim().toLowerCase() !== "unknown artist" && (
                      <div className="queue-panel-now-artist">
                        {currentTrack.artist}
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
          <div className="queue-panel-next">
            <span className="queue-panel-section-label">Next in queue</span>
            {nextInQueue.length === 0 ? (
              <p className="queue-panel-empty">
                No more tracks. Add from your library or playlists.
              </p>
            ) : (
              <div
                className="queue-panel-list"
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes(QUEUE_DRAG_TYPE)) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }
                }}
              >
                {displayOrder.map((trackId, rowIndex) => {
                  const queueIndex = currentIndex + 1 + rowIndex;
                  const track = trackMap.get(trackId);
                  const isDragOver = dragOverIndex === queueIndex;
                  const isDragging = draggingQueueIndex === queueIndex;
                  return (
                    <QueueRow
                      key={trackId}
                      trackId={trackId}
                      track={track}
                      queueIndex={queueIndex}
                      isDragOver={isDragOver}
                      isDragging={isDragging}
                      onDragStart={handleRowDragStart}
                      onDragEnd={handleRowDragEnd}
                      onDragOver={handleRowDragOver}
                      onDragLeave={handleRowDragLeave}
                      onDrop={handleRowDrop}
                      onRemove={() => removeFromQueue(trackId)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="queue-panel-footer">
          <button
            type="button"
            className="queue-panel-clear secondary-button"
            onClick={() => clearQueue()}
            disabled={queue.length === 0}
          >
            Clear queue
          </button>
        </div>
      </div>
    </>
  );
};

type QueueRowProps = {
  trackId: string;
  track: { title: string; artist: string; artworkId?: string } | undefined;
  queueIndex: number;
  isDragOver: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, queueIndex: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, queueIndex: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, toIndex: number) => void;
  onRemove: () => void;
};

function QueueRow({
  trackId: _trackId,
  track,
  queueIndex,
  isDragOver,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
}: QueueRowProps) {
  const artworkUrl = useImageUrl(track?.artworkId);

  return (
    <div
      className={`queue-panel-row ${isDragOver ? "queue-panel-row--drag-over" : ""} ${isDragging ? "queue-panel-row--dragging" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, queueIndex)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, queueIndex)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, queueIndex)}
    >
      <div
        className="queue-panel-row-artwork"
        style={
          artworkUrl
            ? { backgroundImage: `url(${artworkUrl})` }
            : undefined
        }
      />
      <div className="queue-panel-row-info">
        <div className="queue-panel-row-title">
          {track?.title ?? "Unknown track"}
        </div>
        <div className="queue-panel-row-artist muted">
          {track?.artist ?? ""}
        </div>
      </div>
      <button
        type="button"
        className="queue-panel-row-remove ghost-button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Remove from queue"
        aria-label="Remove from queue"
      >
        <RemoveIcon />
      </button>
    </div>
  );
}
