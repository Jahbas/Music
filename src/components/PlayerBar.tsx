import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { useImageUrl } from "../hooks/useImageUrl";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";

const formatTime = (value: number) => {
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const PlayerBar = () => {
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const previousVolumeRef = useRef<number>(0.8);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  const tracks = useLibraryStore((state) => state.tracks);
  const toggleTrackLiked = useLibraryStore((state) => state.toggleTrackLiked);
  const {
    currentTrackId,
    isPlaying,
    currentTime,
    duration,
    volume,
    shuffle,
    togglePlay,
    toggleShuffle,
    next,
    previous,
    setVolume,
    setCurrentTime,
  } = usePlayerStore();

  const currentTrack = useMemo(
    () => tracks.find((track) => track.id === currentTrackId),
    [tracks, currentTrackId]
  );
  const artworkUrl = useImageUrl(currentTrack?.artworkId);

  const displayTime = isDraggingProgress ? dragTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;
  const volumePercent = volume * 100;

  const handleProgressClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const el = progressTrackRef.current;
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

  return (
    <div className="player-bar">
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
            className="ghost-button player-previous"
            onClick={previous}
            title="Previous"
            aria-label="Previous track"
          >
            <PreviousIcon />
          </button>
          <button
            type="button"
            className="primary-button play-pause-button"
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
                currentTrack.liked ? " player-like-button--active" : ""
              }`}
              onClick={() => toggleTrackLiked(currentTrack.id)}
              title={
                currentTrack.liked
                  ? "Remove from Liked Songs"
                  : "Save to Liked Songs"
              }
              aria-label={
                currentTrack.liked
                  ? "Remove from Liked Songs"
                  : "Save to Liked Songs"
              }
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={currentTrack.liked ? "currentColor" : "none"}
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
          className="volume-mute ghost-button"
          onClick={handleMuteClick}
          title={volume > 0 ? "Mute" : "Unmute"}
          aria-label={volume > 0 ? "Mute" : "Unmute"}
        >
          {currentTrack
            ? volume === 0
              ? <VolumeMutedIcon />
              : volume < 0.5
                ? <VolumeLowIcon />
                : <VolumeHighIcon />
            : null}
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
  );
};

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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
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
