import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTelemetryStore } from "../stores/telemetryStore";
import { usePlayerStore } from "../stores/playerStore";
import { getTelemetryEnabled } from "../utils/preferences";

const LISTENING_FLUSH_INTERVAL_MS = 5000;

export function useTelemetry() {
  const location = useLocation();
  const hydrate = useTelemetryStore((s) => s.hydrate);
  const recordVisit = useTelemetryStore((s) => s.recordVisit);
  const startSession = useTelemetryStore((s) => s.startSession);
  const endSession = useTelemetryStore((s) => s.endSession);
  const recordRoute = useTelemetryStore((s) => s.recordRoute);
  const setPlayState = useTelemetryStore((s) => s.setPlayState);
  const flushListeningTime = useTelemetryStore((s) => s.flushListeningTime);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!getTelemetryEnabled()) {
      return;
    }
    hydrate();
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      recordVisit();
      startSession();
    }
  }, [hydrate, recordVisit, startSession]);

  useEffect(() => {
    if (!getTelemetryEnabled()) {
      return;
    }
    recordRoute(location.pathname);
  }, [location.pathname, recordRoute]);

  useEffect(() => {
    if (!getTelemetryEnabled()) {
      return;
    }
    setPlayState(isPlaying);
  }, [isPlaying, setPlayState]);

  useEffect(() => {
    if (!getTelemetryEnabled()) {
      return;
    }
    if (!isPlaying) return;
    const interval = setInterval(() => {
      flushListeningTime();
    }, LISTENING_FLUSH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPlaying, flushListeningTime]);

  useEffect(() => {
    if (!getTelemetryEnabled()) {
      return;
    }
    const handleVisibility = () => {
      // #region agent log
      fetch("http://127.0.0.1:7242/ingest/93a2f2cb-65cc-49d7-a7e3-1399a3dc801c", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "initial",
          hypothesisId: "H3",
          location: "src/hooks/useTelemetry.ts:62",
          message: "Document visibility changed",
          data: {
            visibilityState: document.visibilityState,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (document.visibilityState === "hidden") {
        endSession();
      } else if (document.visibilityState === "visible") {
        startSession();
      }
    };
    const handlePageHide = () => {
      endSession();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [endSession, startSession]);
}
