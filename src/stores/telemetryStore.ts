import { create } from "zustand";

const STORAGE_KEY = "app-telemetry";
const MAX_SESSIONS = 500;
const MAX_ROUTE_HISTORY = 200;
const MAX_SEARCH_HISTORY = 200;

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

  recordVisit: () => {
    const { totalVisits, persist } = get();
    const now = Date.now();
    set({ totalVisits: totalVisits + 1, lastVisitAt: now });
    persist();
  },

  startSession: () => {
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
    set({
      currentSession: null,
      sessions: [...sessions, completed].slice(-MAX_SESSIONS),
    });
    persist();
  },

  setPlayState: (isPlaying: boolean) => {
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
    const { totalVisits, lastVisitAt, sessions, currentSession } = get();
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

    return {
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
  },

  hydrate: () => {
    const { totalVisits, sessions, lastVisitAt } = loadStored();
    set({ totalVisits, sessions, lastVisitAt });
  },

  persist: () => {
    try {
      const { totalVisits, sessions, lastVisitAt } = get();
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ totalVisits, sessions, lastVisitAt })
      );
    } catch {
      // ignore
    }
  },
}));
