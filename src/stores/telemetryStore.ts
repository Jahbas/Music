import { create } from "zustand";
import { getTelemetryEnabled } from "../utils/preferences";

const STORAGE_KEY = "app-telemetry";
const MAX_SESSIONS = 500;
const MAX_ROUTE_HISTORY = 200;
const MAX_SEARCH_HISTORY = 200;
const PERSIST_DEBOUNCE_MS = 2000;

let persistTimeout: number | null = null;

export type TelemetrySession = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  sessionDurationMs: number;
  listeningSeconds: number;
  pathHistory: string[];
  searchQueries: string[];
  trackPlayCount: number;
  skipNextCount: number;
  skipPrevCount: number;
  playPauseToggleCount: number;
};

export type TelemetrySnapshot = {
  totalVisits: number;
  totalSessions: number;
  sessions: TelemetrySession[];
  totalListeningSecondsAllTime: number;
  totalSessionDurationMsAllTime: number;
  avgListeningSecondsPerSession: number;
  avgSessionDurationMs: number;
  mostVisitedPaths: { path: string; count: number }[];
  recentSearchQueries: string[];
  lastVisitAt: number | null;
  lastSessionEndedAt: number | null;
};

type StoredTelemetry = {
  totalVisits: number;
  sessions: TelemetrySession[];
  lastVisitAt: number | null;
};

type TelemetryState = {
  totalVisits: number;
  lastVisitAt: number | null;
  sessions: TelemetrySession[];
  currentSession: {
    id: string;
    startedAt: number;
    pathHistory: string[];
    searchQueries: string[];
    listeningSeconds: number;
    trackPlayCount: number;
    skipNextCount: number;
    skipPrevCount: number;
    playPauseToggleCount: number;
    lastPlayResumedAt: number | null;
  } | null;
  snapshotCache: TelemetrySnapshot | null;
  snapshotDirty: boolean;
  recordVisit: () => void;
  startSession: () => void;
  endSession: () => void;
  setPlayState: (isPlaying: boolean) => void;
  flushListeningTime: () => void;
  recordRoute: (path: string) => void;
  recordSearch: (query: string) => void;
  recordTrackPlay: () => void;
  recordSkipNext: () => void;
  recordSkipPrev: () => void;
  recordPlayPauseToggle: () => void;
  clearAll: () => void;
  getSnapshot: () => TelemetrySnapshot;
  hydrate: () => void;
  persist: () => void;
};

function loadStored(): StoredTelemetry {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { totalVisits: 0, sessions: [], lastVisitAt: null };
    const parsed = JSON.parse(raw) as Partial<StoredTelemetry>;
    const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    const totalVisits = Number(parsed.totalVisits) || 0;
    const lastVisitAt =
      typeof parsed.lastVisitAt === "number" ? parsed.lastVisitAt : null;
    return {
      totalVisits,
      sessions: sessions.slice(-MAX_SESSIONS),
      lastVisitAt,
    };
  } catch {
    return { totalVisits: 0, sessions: [], lastVisitAt: null };
  }
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  totalVisits: 0,
  lastVisitAt: null,
  sessions: [],
  currentSession: null,
  snapshotCache: null,
  snapshotDirty: true,

  recordVisit: () => {
    if (!getTelemetryEnabled()) return;
    const { totalVisits, persist } = get();
    const now = Date.now();
    set({ totalVisits: totalVisits + 1, lastVisitAt: now, snapshotDirty: true });
    persist();
  },

  startSession: () => {
    if (!getTelemetryEnabled()) return;
    const { sessions, persist } = get();
    const id = generateSessionId();
    const startedAt = Date.now();
    set({
      currentSession: {
        id,
        startedAt,
        pathHistory: [],
        searchQueries: [],
        listeningSeconds: 0,
        trackPlayCount: 0,
        skipNextCount: 0,
        skipPrevCount: 0,
        playPauseToggleCount: 0,
        lastPlayResumedAt: null,
      },
    });
    persist();
  },

  endSession: () => {
    if (!getTelemetryEnabled()) return;
    const { currentSession, sessions, persist } = get();
    if (!currentSession) return;
    get().flushListeningTime();
    const endedAt = Date.now();
    const sessionDurationMs = endedAt - currentSession.startedAt;
    const completed: TelemetrySession = {
      id: currentSession.id,
      startedAt: currentSession.startedAt,
      endedAt,
      sessionDurationMs,
      listeningSeconds: currentSession.listeningSeconds,
      pathHistory: currentSession.pathHistory.slice(-MAX_ROUTE_HISTORY),
      searchQueries: currentSession.searchQueries.slice(-MAX_SEARCH_HISTORY),
      trackPlayCount: currentSession.trackPlayCount,
      skipNextCount: currentSession.skipNextCount,
      skipPrevCount: currentSession.skipPrevCount,
      playPauseToggleCount: currentSession.playPauseToggleCount,
    };
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/93a2f2cb-65cc-49d7-a7e3-1399a3dc801c", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "initial",
        hypothesisId: "H1",
        location: "src/stores/telemetryStore.ts:142",
        message: "Telemetry session ended",
        data: {
          id: completed.id,
          sessionDurationMs,
          listeningSeconds: completed.listeningSeconds,
          pathHistoryLength: completed.pathHistory.length,
          searchQueriesLength: completed.searchQueries.length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    set({
      currentSession: null,
      sessions: [...sessions, completed].slice(-MAX_SESSIONS),
      snapshotDirty: true,
    });
    persist();
  },

  setPlayState: (isPlaying: boolean) => {
    if (!getTelemetryEnabled()) return;
    const { currentSession, flushListeningTime } = get();
    if (!currentSession) return;
    if (isPlaying) {
      set({
        currentSession: {
          ...currentSession,
          lastPlayResumedAt: Date.now(),
        },
      });
    } else {
      flushListeningTime();
      set({
        currentSession: {
          ...currentSession,
          lastPlayResumedAt: null,
        },
      });
    }
  },

  flushListeningTime: () => {
    if (!getTelemetryEnabled()) return;
    const { currentSession } = get();
    if (!currentSession?.lastPlayResumedAt) return;
    const now = Date.now();
    const added = (now - currentSession.lastPlayResumedAt) / 1000;
    set({
      currentSession: {
        ...currentSession,
        listeningSeconds: currentSession.listeningSeconds + added,
        lastPlayResumedAt: now,
      },
    });
  },

  recordRoute: (path: string) => {
    if (!getTelemetryEnabled()) return;
    const { currentSession } = get();
    if (!currentSession) return;
    const pathHistory = [...currentSession.pathHistory];
    if (pathHistory[pathHistory.length - 1] !== path) {
      pathHistory.push(path);
    }
    set({
      currentSession: {
        ...currentSession,
        pathHistory: pathHistory.slice(-MAX_ROUTE_HISTORY),
      },
    });
  },

  recordSearch: (query: string) => {
    if (!getTelemetryEnabled()) return;
    const trimmed = query.trim();
    if (!trimmed) return;
    const { currentSession } = get();
    if (!currentSession) return;
    const searchQueries = [...currentSession.searchQueries, trimmed];
    set({
      currentSession: {
        ...currentSession,
        searchQueries: searchQueries.slice(-MAX_SEARCH_HISTORY),
      },
    });
  },

  recordTrackPlay: () => {
    if (!getTelemetryEnabled()) return;
    const { currentSession } = get();
    if (!currentSession) return;
    set({
      currentSession: {
        ...currentSession,
        trackPlayCount: currentSession.trackPlayCount + 1,
      },
    });
  },

  recordSkipNext: () => {
    if (!getTelemetryEnabled()) return;
    const { currentSession } = get();
    if (!currentSession) return;
    set({
      currentSession: {
        ...currentSession,
        skipNextCount: currentSession.skipNextCount + 1,
      },
    });
  },

  recordSkipPrev: () => {
    if (!getTelemetryEnabled()) return;
    const { currentSession } = get();
    if (!currentSession) return;
    set({
      currentSession: {
        ...currentSession,
        skipPrevCount: currentSession.skipPrevCount + 1,
      },
    });
  },

  recordPlayPauseToggle: () => {
    if (!getTelemetryEnabled()) return;
    const { currentSession } = get();
    if (!currentSession) return;
    set({
      currentSession: {
        ...currentSession,
        playPauseToggleCount: currentSession.playPauseToggleCount + 1,
      },
    });
  },

  getSnapshot: (): TelemetrySnapshot => {
    const { totalVisits, lastVisitAt, sessions, currentSession, snapshotCache, snapshotDirty } =
      get();

    if (!snapshotDirty && snapshotCache) {
      return snapshotCache;
    }

    const completed = sessions;
    const totalListeningSecondsAllTime = completed.reduce(
      (sum, s) => sum + s.listeningSeconds,
      0
    );
    const totalSessionDurationMsAllTime = completed.reduce(
      (sum, s) => sum + s.sessionDurationMs,
      0
    );
    const sessionCount = completed.length;
    const avgListeningSecondsPerSession =
      sessionCount > 0 ? totalListeningSecondsAllTime / sessionCount : 0;
    const avgSessionDurationMs =
      sessionCount > 0 ? totalSessionDurationMsAllTime / sessionCount : 0;

    const pathCounts = new Map<string, number>();
    for (const s of completed) {
      for (const p of s.pathHistory) {
        pathCounts.set(p, (pathCounts.get(p) ?? 0) + 1);
      }
    }
    const mostVisitedPaths = Array.from(pathCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    const recentSearchQueries = Array.from(
      new Set(
        completed.flatMap((s) => s.searchQueries).slice(-MAX_SEARCH_HISTORY)
      )
    ).slice(-50);

    const lastSessionEndedAt =
      completed.length > 0
        ? Math.max(...completed.map((s) => s.endedAt ?? 0))
        : null;

    const snapshot: TelemetrySnapshot = {
      totalVisits,
      totalSessions: sessionCount,
      sessions: completed,
      totalListeningSecondsAllTime,
      totalSessionDurationMsAllTime,
      avgListeningSecondsPerSession,
      avgSessionDurationMs,
      mostVisitedPaths,
      recentSearchQueries,
      lastVisitAt,
      lastSessionEndedAt,
    };

    set({ snapshotCache: snapshot, snapshotDirty: false });

    return snapshot;
  },

  clearAll: () => {
    set({
      totalVisits: 0,
      lastVisitAt: null,
      sessions: [],
      currentSession: null,
      snapshotCache: null,
      snapshotDirty: true,
    });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },

  hydrate: () => {
    const { totalVisits, sessions, lastVisitAt } = loadStored();
    set({ totalVisits, sessions, lastVisitAt, snapshotDirty: true, snapshotCache: null });
  },

  persist: () => {
    try {
      const { totalVisits, sessions, lastVisitAt } = get();
      const payload: StoredTelemetry = {
        totalVisits,
        sessions: sessions.slice(-MAX_SESSIONS),
        lastVisitAt,
      };

      if (persistTimeout != null) {
        window.clearTimeout(persistTimeout);
      }

      persistTimeout = window.setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
          // #region agent log
          fetch("http://127.0.0.1:7242/ingest/93a2f2cb-65cc-49d7-a7e3-1399a3dc801c", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: "debug-session",
              runId: "initial",
              hypothesisId: "H2",
              location: "src/stores/telemetryStore.ts:384",
              message: "Telemetry persisted to localStorage",
              data: {
                totalVisits,
                sessionCount: sessions.length,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
        } catch {
        } finally {
          persistTimeout = null;
        }
      }, PERSIST_DEBOUNCE_MS);
    } catch {
      if (persistTimeout != null) {
        window.clearTimeout(persistTimeout);
        persistTimeout = null;
      }
    }
  },
}));
