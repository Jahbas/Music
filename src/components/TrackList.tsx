import { useMemo, useState, useCallback, useRef, useLayoutEffect, useEffect } from "react";
import type { Track } from "../types";

type SortKey = "title" | "album" | "dateAdded" | "duration";
type SortDir = "asc" | "desc";

type TrackListProps = {
  title?: string;
  tracks: Track[];
  selectedIds: string[];
  onToggleSelect: (trackId: string) => void;
  onPlay: (trackId: string) => void;
  onDragStart: (trackIds: string[]) => void;
  onDragEnd: () => void;
  onDeleteSelected?: (trackIds: string[]) => void;
  onDeleteLibrary?: () => void;
  highlightTrackId?: string;
};

const formatDuration = (seconds: number) => {
  if (!seconds) return "0:00";
  const totalSecs = Math.floor(Number(seconds));
  const minutes = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

function sortTracks(tracks: Track[], sortBy: SortKey, sortDir: SortDir): Track[] {
  const sorted = [...tracks].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "duration") {
      cmp = a.duration - b.duration;
    } else if (sortBy === "title") {
      cmp = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    } else if (sortBy === "album") {
      cmp = a.album.localeCompare(b.album, undefined, { sensitivity: "base" });
    } else if (sortBy === "dateAdded") {
      cmp = a.addedAt - b.addedAt;
    }
    if (cmp !== 0) return sortDir === "asc" ? cmp : -cmp;
    return a.id.localeCompare(b.id);
  });
  return sorted;
}

export const TrackList = ({
  title,
  tracks,
  selectedIds,
  onToggleSelect,
  onPlay,
  onDragStart,
  onDragEnd,
  onDeleteSelected,
  onDeleteLibrary,
  highlightTrackId,
}: TrackListProps) => {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const trackTableRef = useRef<HTMLDivElement>(null);
  const previousPositionsRef = useRef<Map<string, { top: number; left: number }>>(new Map());
  const flipPendingRef = useRef(false);
  const highlightDoneRef = useRef(false);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!onDeleteSelected || selectedIds.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement;
      if (target.closest("input") || target.closest("textarea") || target.closest("[contenteditable]")) return;
      e.preventDefault();
      onDeleteSelected(selectedIds);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDeleteSelected, selectedIds]);

  const handleSort = useCallback((key: SortKey) => {
    const table = trackTableRef.current;
    if (table) {
      const rows = table.querySelectorAll<HTMLElement>("[data-track-id]");
      const positions = new Map<string, { top: number; left: number }>();
      rows.forEach((row) => {
        const id = row.dataset.trackId;
        if (id) {
          const rect = row.getBoundingClientRect();
          positions.set(id, { top: rect.top, left: rect.left });
        }
      });
      previousPositionsRef.current = positions;
      flipPendingRef.current = positions.size > 0;
    }
    setSortState((prev) => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  }, []);

  const sortedTracks = useMemo(() => {
    if (!sortState) return tracks;
    return sortTracks(tracks, sortState.key, sortState.dir);
  }, [tracks, sortState]);

  useLayoutEffect(() => {
    if (!flipPendingRef.current || !trackTableRef.current) return;
    const table = trackTableRef.current;
    const positions = previousPositionsRef.current;
    const rows = table.querySelectorAll<HTMLElement>("[data-track-id]");

    rows.forEach((row) => {
      const id = row.dataset.trackId;
      if (!id) return;
      const newRect = row.getBoundingClientRect();
      const old = positions.get(id);
      if (old) {
        const deltaX = old.left - newRect.left;
        const deltaY = old.top - newRect.top;
        row.style.transition = "none";
        row.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      }
    });

    table.offsetHeight;

    rows.forEach((row) => {
      row.style.transition = "transform 0.35s ease-out";
      row.style.transform = "";
    });

    const clearTransition = () => {
      rows.forEach((row) => {
        row.style.transition = "";
      });
    };
    const t = setTimeout(clearTransition, 400);
    previousPositionsRef.current = new Map();
    flipPendingRef.current = false;
    return () => clearTimeout(t);
  }, [sortedTracks]);

  useLayoutEffect(() => {
    if (!highlightTrackId || !trackTableRef.current || highlightDoneRef.current) return;
    const table = trackTableRef.current;
    const row = table.querySelector<HTMLElement>(
      `[data-track-id="${highlightTrackId}"]`
    );
    if (!row) return;
    highlightDoneRef.current = true;

    const scrollContainer = document.querySelector(".app-content");
    let shouldScroll = true;
    if (scrollContainer) {
      const rowRect = row.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const padding = 60;
      const inView =
        rowRect.top >= containerRect.top - padding &&
        rowRect.bottom <= containerRect.bottom + padding;
      shouldScroll = !inView;
    }

    const runBlink = () => {
      row.classList.add("track-row--bump");
      highlightTimeoutRef.current = setTimeout(() => {
        row.classList.remove("track-row--bump");
        highlightTimeoutRef.current = null;
      }, 520);
    };

    if (shouldScroll) {
      row.scrollIntoView({ block: "center", behavior: "smooth" });
      const scrollDelayId = setTimeout(runBlink, 350);
      return () => {
        clearTimeout(scrollDelayId);
        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      };
    }
    runBlink();
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, [highlightTrackId]);

  return (
    <div className="track-list">
      <div className="track-list-header">
        {title && <h2>{title}</h2>}
        <div className="track-list-header-actions">
          {onDeleteSelected && selectedIds.length > 0 && (
            <button
              type="button"
              className="track-list-delete-btn ghost-button"
              onClick={() => onDeleteSelected(selectedIds)}
              title={`Remove ${selectedIds.length} selected from list`}
              aria-label={`Remove ${selectedIds.length} selected`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          )}
          {onDeleteLibrary && (
            <button
              type="button"
              className="danger-button track-list-delete-library-btn"
              onClick={onDeleteLibrary}
              title="Delete entire library"
              aria-label="Delete entire library"
            >
              Delete library
            </button>
          )}
        </div>
      </div>
      <div className="track-table" ref={trackTableRef}>
        <div className="track-row track-head">
          <div className="track-row-col-index">
            <span className="track-head-spacer" aria-hidden />
            <span>#</span>
          </div>
          <button
            type="button"
            className="track-head-sort"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSort("title");
            }}
          >
            Title
            {sortState?.key === "title" && (
              <span className="track-head-sort-icon" aria-hidden>
                {sortState.dir === "asc" ? "↑" : "↓"}
              </span>
            )}
          </button>
          <button
            type="button"
            className="track-head-sort"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSort("album");
            }}
          >
            Album
            {sortState?.key === "album" && (
              <span className="track-head-sort-icon" aria-hidden>
                {sortState.dir === "asc" ? "↑" : "↓"}
              </span>
            )}
          </button>
          <button
            type="button"
            className="track-head-sort"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSort("dateAdded");
            }}
          >
            Date added
            {sortState?.key === "dateAdded" && (
              <span className="track-head-sort-icon" aria-hidden>
                {sortState.dir === "asc" ? "↑" : "↓"}
              </span>
            )}
          </button>
          <button
            type="button"
            className="track-head-sort track-row-col-duration"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSort("duration");
            }}
          >
            Duration
            {sortState?.key === "duration" && (
              <span className="track-head-sort-icon" aria-hidden>
                {sortState.dir === "asc" ? "↑" : "↓"}
              </span>
            )}
          </button>
        </div>
        {sortedTracks.map((track, index) => {
          const isSelected = selectedSet.has(track.id);
          return (
            <div
              key={track.id}
              className={`track-row ${isSelected ? "selected" : ""}`}
              data-track-id={track.id}
              draggable
              tabIndex={0}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  onToggleSelect(track.id);
                } else {
                  onPlay(track.id);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (e.ctrlKey || e.metaKey) {
                    onToggleSelect(track.id);
                  } else {
                    onPlay(track.id);
                  }
                }
              }}
              onDragStart={(event) => {
                const dragIds = isSelected
                  ? selectedIds
                  : [track.id];
                event.dataTransfer.setData(
                  "application/x-track-ids",
                  JSON.stringify(dragIds)
                );
                onDragStart(dragIds);
              }}
              onDragEnd={() => onDragEnd()}
            >
              <div className="track-row-col-index">
                <button
                  type="button"
                  className="track-checkbox"
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={isSelected ? "Deselect track" : "Select track"}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleSelect(track.id);
                  }}
                >
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <span className="track-index">{index + 1}</span>
              </div>
              <div className="track-title">
                <span className="track-title-button">
                  {track.title}
                </span>
                <span className="track-title-sep" aria-hidden>·</span>
                <span className="muted track-title-artist">{track.artist}</span>
              </div>
              <div className="track-album muted">{track.album}</div>
              <div className="muted">
                {new Date(track.addedAt).toLocaleDateString()}
              </div>
              <div className="track-row-col-duration">{formatDuration(track.duration)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
