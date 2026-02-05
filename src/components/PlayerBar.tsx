import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { useImageUrl } from "../hooks/useImageUrl";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { useProfileLikesStore } from "../stores/profileLikesStore";
import { QueuePanel } from "./QueuePanel";

const formatTime = (value: number) => {
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

type PlayerBarProps = {
  queuePanelOpen: boolean;
  onToggleQueuePanel: () => void;
};

export const PlayerBar = ({
  queuePanelOpen,
  onToggleQueuePanel,
}: PlayerBarProps) => {
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const previousVolumeRef = useRef<number>(0.8);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverlayLeaving, setIsOverlayLeaving] = useState(false);
  const [isOverlayEntered, setIsOverlayEntered] = useState(false);
  const playbackSpeedRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const tracks = useLibraryStore((state) => state.tracks);
  const toggleTrackLiked = useLibraryStore((state) => state.toggleTrackLiked);
  const {
    currentTrackId,
    queue,
    isPlaying,
    currentTime,
    duration,
    volume,
    shuffle,
    repeat,
    playbackRate,
    togglePlay,
    toggleShuffle,
    cycleRepeat,
    next,
    previous,
    setVolume,
    setCurrentTime,
  } = usePlayerStore();
  const queueCount = queue.length;

  const currentTrack = useMemo(
    () => tracks.find((track) => track.id === currentTrackId),
    [tracks, currentTrackId]
  );
  const likedTrackIds = useProfileLikesStore((state) => state.likedTrackIds);
  const currentTrackLiked = Boolean(
    currentTrack && likedTrackIds.includes(currentTrack.id)
  );
  const artworkUrl = useImageUrl(currentTrack?.artworkId);

  const displayTime = isDraggingProgress ? dragTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;
  const volumePercent = volume * 100;

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5] as const;

  const handleToggleSpeedMenu = useCallback(() => {
    setIsSpeedMenuOpen((prev) => !prev);
  }, []);

  const handleSelectSpeed = useCallback((value: number) => {
    usePlayerStore.getState().setPlaybackRate(value);
    setIsSpeedMenuOpen(false);
  }, []);

  const handleProgressClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const el = event.currentTarget;
      if (!el || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      setCurrentTime(ratio * duration);
    },
    [duration, setCurrentTime]
  );

  const handleMuteClick = useCallback(() => {
    if (volume > 0) {
      previousVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(previousVolumeRef.current || 0.8);
    }
  }, [volume, setVolume]);

  const handleProgressMouseDown = useCallback(() => {
    setIsDraggingProgress(true);
    setDragTime(currentTime);
  }, [currentTime]);

  const handleProgressChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setDragTime(value);
    },
    []
  );

  const handleProgressMouseUp = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return;
      setIsDraggingProgress(false);
      setCurrentTime(dragTime);
    },
    [dragTime, setCurrentTime]
  );

  const handleProgressPointerLeave = useCallback(() => {
    if (!isDraggingProgress) return;
    setIsDraggingProgress(false);
    setCurrentTime(dragTime);
  }, [isDraggingProgress, dragTime, setCurrentTime]);

  const dragTimeRef = useRef(dragTime);
  dragTimeRef.current = dragTime;
  useEffect(() => {
    if (!isDraggingProgress) return;
    const onGlobalMouseUp = () => {
      setIsDraggingProgress(false);
      setCurrentTime(dragTimeRef.current);
    };
    window.addEventListener("mouseup", onGlobalMouseUp);
    return () => window.removeEventListener("mouseup", onGlobalMouseUp);
  }, [isDraggingProgress, setCurrentTime]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const root = playbackSpeedRef.current;
      if (!root) return;
      if (event.target instanceof Node && root.contains(event.target)) {
        return;
      }
      setIsSpeedMenuOpen(false);
    };
    if (isSpeedMenuOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSpeedMenuOpen]);

  useEffect(() => {
    if (!isExpanded) {
      setIsOverlayEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsOverlayEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [isExpanded]);

  const handleExpand = useCallback(() => {
    setIsOverlayLeaving(false);
    setIsExpanded(true);
  }, []);

  const handleCollapse = useCallback(() => {
    setIsOverlayEntered(false);
    setIsOverlayLeaving(true);
  }, []);

  const handleOverlayTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      if (e.target !== overlayRef.current || e.propertyName !== "opacity") return;
      if (isOverlayLeaving) {
        setIsExpanded(false);
        setIsOverlayLeaving(false);
      }
    },
    [isOverlayLeaving]
  );

  useEffect(() => {
    if (!isExpanded && !isOverlayLeaving) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCollapse();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, isOverlayLeaving, handleCollapse]);

  const showOverlay = isExpanded || isOverlayLeaving;

  return (
    <>
      {showOverlay && (
        <div
          ref={overlayRef}
          className={`player-expanded-overlay ${isOverlayEntered && !isOverlayLeaving ? "player-expanded-overlay--open" : ""} ${isOverlayLeaving ? "player-expanded-overlay--leaving" : ""}`}
          onTransitionEnd={handleOverlayTransitionEnd}
          aria-modal="true"
          role="dialog"
          aria-label="Expanded player"
        >
          <div
            className="player-expanded-backdrop"
            onClick={handleCollapse}
            aria-hidden
          />
          <div className="player-expanded-content">
            <button
              type="button"
              className="ghost-button player-expanded-close"
              onClick={handleCollapse}
              title="Collapse player"
              aria-label="Collapse player"
            >
              <FullscreenExitIcon />
            </button>
            <div className="player-expanded-player">
              <div className="player-expanded-track">
                {currentTrack && artworkUrl && (
                  <div
                    className="player-expanded-artwork"
                    style={{ backgroundImage: `url(${artworkUrl})` }}
                  />
                )}
                <div className="player-expanded-track-text">
                  <div className="player-expanded-title">
                    {currentTrack?.title ?? ""}
                  </div>
                  {currentTrack?.artist &&
                    currentTrack.artist.trim().toLowerCase() !== "unknown artist" && (
                      <div className="player-expanded-artist">
                        {currentTrack.artist}
                      </div>
                    )}
                </div>
              </div>
              <div className="player-expanded-controls">
                <div className="control-row">
                  <button
                    type="button"
                    className={`ghost-button player-shuffle ${shuffle ? "player-shuffle--on" : ""}`}
                    onClick={toggleShuffle}
                    title={shuffle ? "Shuffle on" : "Shuffle off"}
                    aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
                    aria-pressed={shuffle}
                  >
                    <ShuffleIcon />
                  </button>
                  <button
                    type="button"
                    className={`ghost-button player-repeat ${repeat !== "off" ? "player-repeat--on" : ""}`}
                    onClick={cycleRepeat}
                    title={
                      repeat === "off"
                        ? "Repeat off"
                        : repeat === "queue"
                          ? "Repeat queue"
                          : "Repeat track"
                    }
                    aria-label={
                      repeat === "off"
                        ? "Repeat off"
                        : repeat === "queue"
                          ? "Repeat queue"
                          : "Repeat track"
                    }
                    aria-pressed={repeat !== "off"}
                  >
                    <RepeatIcon />
                  </button>
                  <button
                    type="button"
                    className="ghost-button player-previous"
                    onClick={previous}
                    title="Previous"
                    aria-label="Previous track"
                  >
                    <PreviousIcon />
                  </button>
                  <button
                    type="button"
                    className="play-pause-button"
                    onClick={togglePlay}
                    title={isPlaying ? "Pause" : "Play"}
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={next}
                    title="Next"
                    aria-label="Next track"
                  >
                    <NextIcon />
                  </button>
                  {currentTrack && (
                    <button
                      type="button"
                      className={`player-like-button${currentTrackLiked ? " player-like-button--active" : ""}`}
                      onClick={() => toggleTrackLiked(currentTrack.id)}
                      title={
                        currentTrackLiked
                          ? "Remove from Liked Songs"
                          : "Save to Liked Songs"
                      }
                      aria-label={
                        currentTrackLiked
                          ? "Remove from Liked Songs"
                          : "Save to Liked Songs"
                      }
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill={currentTrackLiked ? "currentColor" : "none"}
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
                <div className="progress-row">
                  <span className="progress-time">{formatTime(displayTime)}</span>
                  <div
                    ref={progressTrackRef}
                    className="slider-wrap slider-progress"
                    style={{ "--fill": `${progressPercent}%` } as React.CSSProperties}
                    onClick={handleProgressClick}
                    onMouseUp={handleProgressMouseUp}
                    onMouseLeave={handleProgressPointerLeave}
                  >
                    <input
                      type="range"
                      className="slider-input"
                      min={0}
                      max={duration || 0}
                      step={0.1}
                      value={displayTime}
                      onMouseDown={handleProgressMouseDown}
                      onChange={handleProgressChange}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <span className="progress-time">{formatTime(duration)}</span>
                </div>
              </div>
              <div className="player-expanded-volume">
                <div className="playback-speed" ref={playbackSpeedRef}>
                  <button
                    type="button"
                    className="playback-speed-button"
                    onClick={handleToggleSpeedMenu}
                    aria-haspopup="listbox"
                    aria-expanded={isSpeedMenuOpen}
                    title="Playback speed"
                  >
                    <span>{`${playbackRate.toFixed(2).replace(/\.00$/, "").replace(/0$/, "")}×`}</span>
                    <span className="playback-speed-chevron" aria-hidden>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>
                  {isSpeedMenuOpen && (
                    <div className="playback-speed-menu" role="listbox">
                      {speedOptions.map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`playback-speed-option${playbackRate === value ? " playback-speed-option--active" : ""}`}
                          onClick={() => handleSelectSpeed(value)}
                          role="option"
                          aria-selected={playbackRate === value}
                        >
                          {`${value}×`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="volume-mute ghost-button"
                  onClick={handleMuteClick}
                  title={volume > 0 ? "Mute" : "Unmute"}
                  aria-label={volume > 0 ? "Mute" : "Unmute"}
                >
                  {volume === 0 ? (
                    <VolumeMutedIcon />
                  ) : volume < 0.5 ? (
                    <VolumeLowIcon />
                  ) : (
                    <VolumeHighIcon />
                  )}
                </button>
                <div
                  className="slider-wrap slider-volume"
                  style={{ "--fill": `${volumePercent}%` } as React.CSSProperties}
                >
                  <input
                    type="range"
                    className="slider-input"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(event) => setVolume(Number(event.target.value))}
                  />
                </div>
              </div>
            </div>
            <div className="player-expanded-queue">
              <QueuePanel onClose={handleCollapse} embedInOverlay />
            </div>
          </div>
        </div>
      )}
      <div className={`player-bar${showOverlay ? " player-bar--maximized-hidden" : ""}`}>
        <button
          type="button"
          className="ghost-button player-fullscreen-button"
          onClick={handleExpand}
          title="Expand player"
          aria-label="Expand player"
        >
          <FullscreenIcon />
        </button>
      <div className="player-track">
        {currentTrack && artworkUrl && (
          <div
            className="track-artwork"
            style={{ backgroundImage: `url(${artworkUrl})` }}
          />
        )}
        <div className="player-track-main">
          <div className="player-track-text">
            <div className="player-track-title">
              {currentTrack?.title ?? ""}
            </div>
            {currentTrack?.artist &&
              currentTrack.artist.trim().toLowerCase() !== "unknown artist" && (
                <div className="player-track-artist">
                  {currentTrack.artist}
                </div>
              )}
          </div>
        </div>
      </div>
      <div className="player-controls">
        <div className="control-row">
          <button
            type="button"
            className={`ghost-button player-shuffle ${shuffle ? "player-shuffle--on" : ""}`}
            onClick={toggleShuffle}
            title={shuffle ? "Shuffle on" : "Shuffle off"}
            aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
            aria-pressed={shuffle}
          >
            <ShuffleIcon />
          </button>
          <button
            type="button"
            className={`ghost-button player-repeat ${repeat !== "off" ? "player-repeat--on" : ""}`}
            onClick={cycleRepeat}
            title={
              repeat === "off"
                ? "Repeat off"
                : repeat === "queue"
                  ? "Repeat queue"
                  : "Repeat track"
            }
            aria-label={
              repeat === "off"
                ? "Repeat off"
                : repeat === "queue"
                  ? "Repeat queue"
                  : "Repeat track"
            }
            aria-pressed={repeat !== "off"}
          >
            <RepeatIcon />
          </button>
          <button
            type="button"
            className="ghost-button player-previous"
            onClick={previous}
            title="Previous"
            aria-label="Previous track"
          >
            <PreviousIcon />
          </button>
          <button
            type="button"
            className="play-pause-button"
            onClick={togglePlay}
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={next}
            title="Next"
            aria-label="Next track"
          >
            <NextIcon />
          </button>
          {currentTrack && (
            <button
              type="button"
              className={`player-like-button${
                currentTrackLiked ? " player-like-button--active" : ""
              }`}
              onClick={() => toggleTrackLiked(currentTrack.id)}
              title={
                currentTrackLiked
                  ? "Remove from Liked Songs"
                  : "Save to Liked Songs"
              }
              aria-label={
                currentTrackLiked
                  ? "Remove from Liked Songs"
                  : "Save to Liked Songs"
              }
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={currentTrackLiked ? "currentColor" : "none"}
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
        <div className="progress-row">
          <span className="progress-time">{formatTime(displayTime)}</span>
          <div
            ref={progressTrackRef}
            className="slider-wrap slider-progress"
            style={{ "--fill": `${progressPercent}%` } as React.CSSProperties}
            onClick={handleProgressClick}
            onMouseUp={handleProgressMouseUp}
            onMouseLeave={handleProgressPointerLeave}
          >
            <input
              type="range"
              className="slider-input"
              min={0}
              max={duration || 0}
              step={0.1}
              value={displayTime}
              onMouseDown={handleProgressMouseDown}
              onChange={handleProgressChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <span className="progress-time">{formatTime(duration)}</span>
        </div>
      </div>
      <div className="player-volume">
        <button
          type="button"
          className="player-queue-button"
          onClick={onToggleQueuePanel}
          aria-pressed={queuePanelOpen}
          aria-label={queuePanelOpen ? "Close queue" : "Open queue"}
          title={queuePanelOpen ? "Close queue" : `Queue (${queueCount} track${queueCount === 1 ? "" : "s"})`}
        >
          <QueueIcon />
        </button>
        <div
          className="playback-speed"
          ref={playbackSpeedRef}
        >
          <button
            type="button"
            className="playback-speed-button"
            onClick={handleToggleSpeedMenu}
            aria-haspopup="listbox"
            aria-expanded={isSpeedMenuOpen}
            title="Playback speed"
          >
            <span>{`${playbackRate.toFixed(2).replace(/\.00$/, "").replace(/0$/, "")}×`}</span>
            <span className="playback-speed-chevron" aria-hidden>
              <svg
                width="10"
                height="10"
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
          {isSpeedMenuOpen && (
            <div className="playback-speed-menu" role="listbox">
              {speedOptions.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`playback-speed-option${
                    playbackRate === value ? " playback-speed-option--active" : ""
                  }`}
                  onClick={() => handleSelectSpeed(value)}
                  role="option"
                  aria-selected={playbackRate === value}
                >
                  {`${value}×`}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="volume-mute ghost-button"
          onClick={handleMuteClick}
          title={volume > 0 ? "Mute" : "Unmute"}
          aria-label={volume > 0 ? "Mute" : "Unmute"}
        >
          {volume === 0 ? (
            <VolumeMutedIcon />
          ) : volume < 0.5 ? (
            <VolumeLowIcon />
          ) : (
            <VolumeHighIcon />
          )}
        </button>
        <div
          className="slider-wrap slider-volume"
          style={{ "--fill": `${volumePercent}%` } as React.CSSProperties}
        >
          <input
            type="range"
            className="slider-input"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
        </div>
      </div>
    </div>
    </>
  );
};

function FullscreenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function FullscreenExitIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function QueueIcon() {
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

function ShuffleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 3h5v5" />
      <path d="M4 20L21 3" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function PreviousIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72c0 .8.87 1.3 1.54.84l11-6.86c.63-.39.63-1.29 0-1.68l-11-6.86C8.87 3.84 8 4.34 8 5.14z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 4h3v16H6V4zm9 0h3v16h-3V4z" />
    </svg>
  );
}

function VolumeHighIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function VolumeLowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 9v6h4l5 5V4L11 9H7zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
    </svg>
  );
}

function VolumeMutedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
  );
}
