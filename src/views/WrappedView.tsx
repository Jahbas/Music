import { useMemo, useState, useEffect } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayHistoryStore } from "../stores/playHistoryStore";
import { usePlayerStore } from "../stores/playerStore";
import type { WrappedStats } from "../stores/playHistoryStore";

function formatTotalTime(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${Math.round(totalSeconds)} sec`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  }
  const days = Math.floor(hours / 24);
  const hrs = hours % 24;
  if (hrs > 0) {
    return `${days} day${days !== 1 ? "s" : ""} ${hrs} hr`;
  }
  return `${days} day${days !== 1 ? "s" : ""}`;
}

export const WrappedView = () => {
  const tracks = useLibraryStore((state) => state.tracks);
  const entries = usePlayHistoryStore((state) => state.entries);
  const isLoading = usePlayHistoryStore((state) => state.isLoading);
  const hydrate = usePlayHistoryStore((state) => state.hydrate);
  const getStats = usePlayHistoryStore((state) => state.getStats);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);

  const [yearFilter, setYearFilter] = useState<number | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const availableYears = useMemo(() => {
    const years = new Set(entries.map((e) => new Date(e.playedAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [entries]);

  const stats: WrappedStats = useMemo(
    () => getStats(tracks, yearFilter),
    [getStats, tracks, yearFilter]
  );

  const trackMap = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  const handlePlayTrack = (trackId: string) => {
    const queue = stats.topTrackIds.map((t) => t.trackId);
    setQueue(queue);
    playTrack(trackId, queue);
  };

  if (isLoading) {
    return <div className="empty-state">Loading your stats…</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="wrapped-view">
        <h1 className="wrapped-title">Your Wrapped</h1>
        <div className="empty-state">
          No listening history yet. Play some tracks and come back to see your
          stats.
        </div>
      </div>
    );
  }

  const yearLabel = yearFilter === null ? "All time" : String(yearFilter);

  return (
    <div className="wrapped-view">
      <div className="wrapped-header">
        <h1 className="wrapped-title">Your Wrapped</h1>
        <div className="wrapped-year-tabs">
          <button
            type="button"
            className={`wrapped-year-tab ${yearFilter === null ? "active" : ""}`}
            onClick={() => setYearFilter(null)}
          >
            All time
          </button>
          {availableYears.map((y) => (
            <button
              key={y}
              type="button"
              className={`wrapped-year-tab ${yearFilter === y ? "active" : ""}`}
              onClick={() => setYearFilter(y)}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="wrapped-hero">
        <div className="wrapped-hero-label">Total listening time ({yearLabel})</div>
        <div className="wrapped-hero-value">
          {formatTotalTime(stats.totalSeconds)}
        </div>
      </div>

      <div className="wrapped-sections">
        <section className="wrapped-section">
          <h2 className="wrapped-section-title">Top tracks</h2>
          {stats.topTrackIds.length === 0 ? (
            <p className="muted">No plays in this period.</p>
          ) : (
            <ul className="wrapped-list">
              {stats.topTrackIds.slice(0, 20).map((item, index) => {
                const track = trackMap.get(item.trackId);
                return (
                  <li key={item.trackId} className="wrapped-list-item">
                    <span className="wrapped-rank">{index + 1}</span>
                    <button
                      type="button"
                      className="wrapped-track-button"
                      onClick={() => handlePlayTrack(item.trackId)}
                    >
                      <span className="wrapped-track-title">
                        {track?.title ?? "Unknown track"}
                      </span>
                      <span className="muted">
                        {track?.artist ?? "Unknown artist"} ·{" "}
                        {formatTotalTime(item.seconds)} ({item.plays} plays)
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="wrapped-section">
          <h2 className="wrapped-section-title">Top artists</h2>
          {stats.topArtists.length === 0 ? (
            <p className="muted">No plays in this period.</p>
          ) : (
            <ul className="wrapped-list">
              {stats.topArtists.slice(0, 20).map((item, index) => (
                <li key={item.artist} className="wrapped-list-item">
                  <span className="wrapped-rank">{index + 1}</span>
                  <div className="wrapped-artist-info">
                    <span className="wrapped-track-title">{item.artist}</span>
                    <span className="muted">
                      {formatTotalTime(item.seconds)} ({item.plays} plays)
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
