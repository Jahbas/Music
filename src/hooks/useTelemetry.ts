import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTelemetryStore } from "../stores/telemetryStore";
import { usePlayerStore } from "../stores/playerStore";

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
    hydrate();
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      recordVisit();
      startSession();
    }
  }, [hydrate, recordVisit, startSession]);

  useEffect(() => {
    recordRoute(location.pathname);
  }, [location.pathname, recordRoute]);

  useEffect(() => {
    setPlayState(isPlaying);
  }, [isPlaying, setPlayState]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      flushListeningTime();
    }, LISTENING_FLUSH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPlaying, flushListeningTime]);

  useEffect(() => {
    const handleVisibility = () => {
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
