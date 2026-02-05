import { useEffect, useMemo, useState } from "react";
import { useTelemetryStore } from "../stores/telemetryStore";
import type { TelemetrySession, TelemetrySnapshot } from "../stores/telemetryStore";

function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)} sec`;
  const min = sec / 60;
  if (min < 60) return `${min.toFixed(1)} min`;
  const hr = min / 60;
  return `${hr.toFixed(1)} hr`;
}

function formatSeconds(sec: number): string {
  if (sec < 60) return `${Math.round(sec)} sec`;
  const min = sec / 60;
  if (min < 60) return `${min.toFixed(1)} min`;
  const hr = min / 60;
  return `${hr.toFixed(1)} hr`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export const TelemetryView = () => {
  const hydrate = useTelemetryStore((s) => s.hydrate);
  const getSnapshot = useTelemetryStore((s) => s.getSnapshot);
  const [exportCopied, setExportCopied] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const snapshot: TelemetrySnapshot = useMemo(() => getSnapshot(), [getSnapshot]);

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      ...snapshot,
    };
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json).then(
      () => {
        setExportCopied(true);
        setTimeout(() => setExportCopied(false), 2000);
      },
      () => {}
    );
  };

  const recentSessions = useMemo(
    () => [...snapshot.sessions].reverse().slice(0, 25),
    [snapshot.sessions]
  );

  return (
    <div className="wrapped-view telemetry-view">
      <div className="wrapped-header telemetry-header">
        <h1 className="wrapped-title">Session & usage telemetry</h1>
        <button
          type="button"
          className="secondary-button"
          onClick={handleExport}
          aria-pressed={exportCopied}
        >
          {exportCopied ? "Copied to clipboard" : "Export JSON"}
        </button>
      </div>
      <p className="telemetry-intro muted">
        Visit count, session length, listening time per session, pages visited, searches, and more. Data is stored locally only.
      </p>

      <div className="telemetry-grid">
        <div className="wrapped-hero">
          <div className="wrapped-hero-label">Total visits</div>
          <div className="wrapped-hero-value">{snapshot.totalVisits}</div>
        </div>
        <div className="wrapped-hero">
          <div className="wrapped-hero-label">Total sessions</div>
          <div className="wrapped-hero-value">{snapshot.totalSessions}</div>
        </div>
        <div className="wrapped-hero">
          <div className="wrapped-hero-label">Total listening time (all sessions)</div>
          <div className="wrapped-hero-value">
            {formatSeconds(snapshot.totalListeningSecondsAllTime)}
          </div>
        </div>
        <div className="wrapped-hero">
          <div className="wrapped-hero-label">Total time on app (all sessions)</div>
          <div className="wrapped-hero-value">
            {formatDurationMs(snapshot.totalSessionDurationMsAllTime)}
          </div>
        </div>
        <div className="wrapped-hero">
          <div className="wrapped-hero-label">Avg listening per session</div>
          <div className="wrapped-hero-value">
            {formatSeconds(snapshot.avgListeningSecondsPerSession)}
          </div>
        </div>
        <div className="wrapped-hero">
          <div className="wrapped-hero-label">Avg session duration</div>
          <div className="wrapped-hero-value">
            {formatDurationMs(snapshot.avgSessionDurationMs)}
          </div>
        </div>
      </div>

      {snapshot.lastVisitAt != null && (
        <p className="muted telemetry-meta">
          Last visit: {formatDate(snapshot.lastVisitAt)}
          {snapshot.lastSessionEndedAt != null && (
            <> · Last session ended: {formatDate(snapshot.lastSessionEndedAt)}</>
          )}
        </p>
      )}

      {snapshot.mostVisitedPaths.length > 0 && (
        <section className="wrapped-section">
          <h2 className="wrapped-section-title">Most visited pages</h2>
          <ul className="wrapped-list">
            {snapshot.mostVisitedPaths.slice(0, 15).map(({ path, count }) => (
              <li key={path} className="wrapped-list-item">
                <span className="wrapped-rank">{count}</span>
                <div className="wrapped-artist-info">
                  <span className="wrapped-track-title">{path || "/"}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {snapshot.recentSearchQueries.length > 0 && (
        <section className="wrapped-section">
          <h2 className="wrapped-section-title">Recent search queries</h2>
          <ul className="wrapped-list">
            {snapshot.recentSearchQueries.slice(-20).reverse().map((q, i) => (
              <li key={`${q}-${i}`} className="wrapped-list-item">
                <span className="wrapped-rank">—</span>
                <span className="wrapped-track-title">{q}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recentSessions.length > 0 && (
        <section className="wrapped-section">
          <h2 className="wrapped-section-title">Recent sessions</h2>
          <div className="telemetry-sessions-table-wrap">
            <table className="telemetry-sessions-table">
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Listening</th>
                  <th>Tracks played</th>
                  <th>Skip next</th>
                  <th>Skip prev</th>
                  <th>Play/pause</th>
                  <th>Pages</th>
                  <th>Searches</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s: TelemetrySession) => (
                  <tr key={s.id}>
                    <td>{formatDate(s.startedAt)}</td>
                    <td>{formatDurationMs(s.sessionDurationMs)}</td>
                    <td>{formatSeconds(s.listeningSeconds)}</td>
                    <td>{s.trackPlayCount}</td>
                    <td>{s.skipNextCount}</td>
                    <td>{s.skipPrevCount}</td>
                    <td>{s.playPauseToggleCount}</td>
                    <td>{s.pathHistory.length}</td>
                    <td>{s.searchQueries.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {snapshot.totalSessions === 0 && snapshot.totalVisits === 0 && (
        <div className="empty-state">
          No telemetry yet. Use the app (visit pages, play tracks, search) and close the tab or switch away to record sessions.
        </div>
      )}
    </div>
  );
};
