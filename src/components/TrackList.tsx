import { useMemo, useState, useCallback, useRef, useLayoutEffect, useEffect } from "react";
import type { Track } from "../types";
import { usePlayerStore } from "../stores/playerStore";
import { usePlaylistStore } from "../stores/playlistStore";

type SortKey = "title" | "album" | "dateAdded" | "duration" | "liked";
type SortDir = "asc" | "desc";

type TrackListProps = {
  title?: string;
  tracks: Track[];
  playlistNamesByTrackId?: Record<string, string[]>;
  selectedIds: string[];
  onToggleSelect: (trackId: string) => void;
  onSelectAll?: (trackIds: string[]) => void;
  onPlay: (trackId: string) => void;
  onDragStart: (trackIds: string[]) => void;
  onDragEnd: () => void;
  onDeleteSelected?: (trackIds: string[]) => void;
  onDeleteLibrary?: () => void;
  highlightTrackId?: string;
  onToggleLike?: (trackId: string) => void;
  /** When provided, used for like state and sort-by-liked instead of track.liked (per-profile likes). */
  likedTrackIds?: string[];
  onEditTags?: (trackId: string) => void;
};

const formatDuration = (seconds: number) => {
  if (!seconds) return "0:00";
  const totalSecs = Math.floor(Number(seconds));
  const minutes = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

function setTrackDragImage(dataTransfer: DataTransfer, count: number) {
  const label = count === 1 ? "1 song" : `${count} songs`;
  const el = document.createElement("div");
  el.textContent = label;
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed",
    top: "-1000px",
    left: "0",
    padding: "8px 12px",
    borderRadius: "8px",
    background: "var(--color-elevated)",
    color: "var(--color-text)",
    fontSize: "13px",
    fontWeight: "500",
    fontFamily: "var(--font-apple), sans-serif",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    border: "1px solid var(--color-border)",
    pointerEvents: "none",
    whiteSpace: "nowrap",
  });
  document.body.appendChild(el);
  dataTransfer.setDragImage(el, 0, 0);
  setTimeout(() => el.remove(), 0);
}

function sortTracks(
  tracks: Track[],
  sortBy: SortKey,
  sortDir: SortDir,
  playlistNamesByTrackId?: Record<string, string[]>,
  likedTrackIds?: string[]
): Track[] {
  const isLiked = (t: Track) =>
    likedTrackIds ? likedTrackIds.includes(t.id) : Boolean(t.liked);
  const sorted = [...tracks].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "duration") {
      cmp = a.duration - b.duration;
    } else if (sortBy === "title") {
      cmp = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    } else if (sortBy === "album") {
      const aPlaylists = playlistNamesByTrackId?.[a.id]?.join(", ") ?? "";
      const bPlaylists = playlistNamesByTrackId?.[b.id]?.join(", ") ?? "";
      cmp = aPlaylists.localeCompare(bPlaylists, undefined, {
        sensitivity: "base",
      });
    } else if (sortBy === "dateAdded") {
      cmp = a.addedAt - b.addedAt;
    } else if (sortBy === "liked") {
      const aLiked = isLiked(a) ? 1 : 0;
      const bLiked = isLiked(b) ? 1 : 0;
      cmp = aLiked - bLiked;
    }
    if (cmp !== 0) return sortDir === "asc" ? cmp : -cmp;
    return a.id.localeCompare(b.id);
  });
  return sorted;
}

export const TrackList = ({
  title,
  tracks,
  playlistNamesByTrackId,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onPlay,
  onDragStart,
  onDragEnd,
  onDeleteSelected,
  onDeleteLibrary,
  highlightTrackId,
  onToggleLike,
  likedTrackIds,
  onEditTags,
}: TrackListProps) => {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    trackIds: string[];
    primaryTrackId: string;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [contextMenuPlaylistOpen, setContextMenuPlaylistOpen] = useState(false);
  const queue = usePlayerStore((state) => state.queue);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
  const playlists = usePlaylistStore((state) => state.playlists);
  const addTracksToPlaylist = usePlaylistStore(
    (state) => state.addTracksToPlaylist
  );
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

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current?.contains(e.target as Node)) return;
      setContextMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    const handleScroll = () => setContextMenu(null);
    const scrollContainer = document.querySelector(".app-content");
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    scrollContainer?.addEventListener("scroll", handleScroll, { capture: true });
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
      scrollContainer?.removeEventListener("scroll", handleScroll, {
        capture: true,
      });
    };
  }, [contextMenu]);

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
    return sortTracks(tracks, sortState.key, sortState.dir, playlistNamesByTrackId, likedTrackIds);
  }, [tracks, sortState, playlistNamesByTrackId, likedTrackIds]);

  const allTrackIds = useMemo(() => sortedTracks.map((track) => track.id), [sortedTracks]);
  const allSelected = useMemo(
    () => allTrackIds.length > 0 && allTrackIds.every((id) => selectedSet.has(id)),
    [allTrackIds, selectedSet]
  );

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

  const handleContextMenuAction = useCallback(
    (fn: () => void) => {
      fn();
      setContextMenu(null);
    },
    []
  );

  return (
    <div className="track-list">
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="track-list-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          <button
            type="button"
            className="dropdown-item"
            role="menuitem"
            onClick={() =>
              handleContextMenuAction(() => onPlay(contextMenu.primaryTrackId))
            }
          >
            Play
          </button>
          <button
            type="button"
            className="dropdown-item"
            role="menuitem"
            onClick={() =>
              handleContextMenuAction(() =>
                addToQueue(contextMenu.trackIds, "next")
              )
            }
          >
            Play next
          </button>
          <button
            type="button"
            className="dropdown-item"
            role="menuitem"
            onClick={() =>
              handleContextMenuAction(() =>
                addToQueue(contextMenu.trackIds, "end")
              )
            }
          >
            Add to queue
          </button>
          {onToggleLike && (
            <button
              type="button"
              className="dropdown-item"
              role="menuitem"
              onClick={() =>
                handleContextMenuAction(() => {
                  contextMenu.trackIds.forEach((id) => onToggleLike(id));
                })
              }
            >
              {likedTrackIds?.includes(contextMenu.primaryTrackId)
                ? "Remove from Liked Songs"
                : "Save to Liked Songs"}
            </button>
          )}
          {playlists.length > 0 && (
            <div className="track-list-context-menu-submenu-wrap">
              <button
                type="button"
                className="dropdown-item dropdown-item--submenu-trigger"
                role="menuitem"
                aria-expanded={contextMenuPlaylistOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenuPlaylistOpen((prev) => !prev);
                }}
              >
                Add to playlist
              </button>
              {contextMenuPlaylistOpen && (
                <div className="track-list-context-menu track-list-context-menu--submenu">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      className="dropdown-item"
                      role="menuitem"
                      onClick={() =>
                        handleContextMenuAction(() =>
                          addTracksToPlaylist(playlist.id, contextMenu.trackIds)
                        )
                      }
                    >
                      {playlist.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {contextMenu.trackIds.some((id) => queue.includes(id)) && (
            <button
              type="button"
              className="dropdown-item"
              role="menuitem"
              onClick={() =>
                handleContextMenuAction(() => {
                  contextMenu.trackIds.forEach((id) => removeFromQueue(id));
                })
              }
            >
              Remove from queue
            </button>
          )}
        </div>
      )}
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
      <div
        className="track-table"
        ref={trackTableRef}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-track-ids")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
      >
        <div className="track-row track-head">
          <div className="track-row-col-index">
            {onSelectAll ? (
              <button
                type="button"
                className="track-checkbox"
                role="checkbox"
                aria-checked={allSelected}
                aria-label={allSelected ? "Deselect all tracks" : "Select all tracks"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectAll(allTrackIds);
                }}
              >
                {(allSelected || selectedIds.length > 0) && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ) : (
              <span className="track-head-spacer" aria-hidden />
            )}
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
            className="track-head-sort track-like-header-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSort("liked");
            }}
            title="Sort by liked"
            aria-label="Sort by liked"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M20.8 4.6a5 5 0 0 0-7.1 0L12 6.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l1.7 1.7L12 21l7.1-7.6 1.7-1.7a5 5 0 0 0 0-7.1z" />
            </svg>
            {sortState?.key === "liked" && (
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
            Playlists
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
              onContextMenu={(e) => {
                e.preventDefault();
                const trackIds = isSelected ? selectedIds : [track.id];
                setContextMenuPlaylistOpen(false);
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  trackIds,
                  primaryTrackId: track.id,
                });
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
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("application/x-track-ids")) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }
              }}
              onDragStart={(event) => {
                const dragIds = isSelected
                  ? selectedIds
                  : [track.id];
                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData(
                  "application/x-track-ids",
                  JSON.stringify(dragIds)
                );
                event.dataTransfer.setData(
                  "text/plain",
                  dragIds.length === 1 ? "1 song" : `${dragIds.length} songs`
                );
                setTrackDragImage(event.dataTransfer, dragIds.length);
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
              <div className="track-like-cell">
                {onToggleLike && (
                  <button
                    type="button"
                    className={`track-like-button${(likedTrackIds ? likedTrackIds.includes(track.id) : track.liked) ? " track-like-button--active" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleLike(track.id);
                    }}
                    title={(likedTrackIds ? likedTrackIds.includes(track.id) : track.liked) ? "Remove from Liked Songs" : "Save to Liked Songs"}
                    aria-label={(likedTrackIds ? likedTrackIds.includes(track.id) : track.liked) ? "Remove from Liked Songs" : "Save to Liked Songs"}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={(likedTrackIds ? likedTrackIds.includes(track.id) : track.liked) ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M20.8 4.6a5 5 0 0 0-7.1 0L12 6.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l1.7 1.7L12 21l7.1-7.6 1.7-1.7a5 5 0 0 0 0-7.1z" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="track-album muted">
                {playlistNamesByTrackId?.[track.id]
                  ? playlistNamesByTrackId[track.id].join(", ")
                  : ""}
              </div>
              <div className="muted">
                <span>{new Date(track.addedAt).toLocaleDateString()}</span>
                {onEditTags && (
                  <button
                    type="button"
                    className="track-tags-button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEditTags(track.id);
                    }}
                    title={
                      track.tags && track.tags.length > 0
                        ? `Tags: ${track.tags.join(", ")}`
                        : "Add tags"
                    }
                    aria-label={
                      track.tags && track.tags.length > 0
                        ? `Edit tags: ${track.tags.join(", ")}`
                        : "Add tags"
                    }
                  >
                    #
                  </button>
                )}
              </div>
              <div className="track-row-col-duration">{formatDuration(track.duration)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
