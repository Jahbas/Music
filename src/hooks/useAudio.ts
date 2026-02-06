import { useEffect, useRef } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { usePlayHistoryStore } from "../stores/playHistoryStore";
import { useAudioSettingsStore } from "../stores/audioSettingsStore";
import { trackDb } from "../db/db";

const getTrackUrl = async (trackId: string | null) => {
  if (!trackId) {
    return null;
  }
  const trackInStore = useLibraryStore
    .getState()
    .tracks.find((item) => item.id === trackId);

  const sourceType = trackInStore?.sourceType;

  if (sourceType === "blob") {
    const dbTrack = await trackDb.get(trackId);
    if (!dbTrack || !dbTrack.fileBlob) {
      return null;
    }
    return URL.createObjectURL(dbTrack.fileBlob);
  }

  if (sourceType === "handle" && trackInStore?.fileHandle) {
    try {
      const file = await trackInStore.fileHandle.getFile();
      return URL.createObjectURL(file);
    } catch {
      return null;
    }
  }

  return null;
};

type Lane = {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  filters: BiquadFilterNode[];
  currentUrl: string | null;
};

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioContext;
}

export const useAudio = () => {
  const lanesRef = useRef<{ a: Lane | null; b: Lane | null }>({ a: null, b: null });
  const activeLaneRef = useRef<"a" | "b">("a");
  const crossfadeTimeoutRef = useRef<number | null>(null);
  const isCrossfadingRef = useRef(false);
  const ignoreOnEndedRef = useRef(false);
  const previousPlayRef = useRef<{ trackId: string; startedAt: number } | null>(null);
  const gaplessPreloadedRef = useRef<{ laneKey: "a" | "b"; trackId: string } | null>(null);
  const currentTrackId = usePlayerStore((state) => state.currentTrackId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const volume = usePlayerStore((state) => state.volume);
  const playbackRate = usePlayerStore((state) => state.playbackRate);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const setDuration = usePlayerStore((state) => state.setDuration);
  const next = usePlayerStore((state) => state.next);
  const addPlay = usePlayHistoryStore((state) => state.addPlay);
  const { crossfadeEnabled, crossfadeMs, eqEnabled, eqBands, gaplessEnabled } = useAudioSettingsStore();

  const applyEqToLane = (lane: Lane) => {
    const ctx = getAudioContext();

    try {
      lane.source.disconnect();
    } catch {
    }

    try {
      lane.gain.disconnect();
    } catch {
    }

    for (const filter of lane.filters) {
      try {
        filter.disconnect();
      } catch {
      }
    }

    lane.filters = [];

    if (!eqEnabled || eqBands.length === 0) {
      lane.source.connect(lane.gain);
      lane.gain.connect(ctx.destination);
      return;
    }

    const filters = eqBands.map((band) => {
      const filter = ctx.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.q;
      return filter;
    });

    lane.source.connect(filters[0]);
    for (let index = 0; index < filters.length - 1; index += 1) {
      filters[index].connect(filters[index + 1]);
    }
    filters[filters.length - 1].connect(lane.gain);
    lane.gain.connect(ctx.destination);
    lane.filters = filters;
  };

  const ensureLane = (key: "a" | "b"): Lane => {
    const existing = lanesRef.current[key];
    if (existing) {
      return existing;
    }
    const ctx = getAudioContext();
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    const source = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();
    source.connect(gain);
    gain.connect(ctx.destination);

    const lane: Lane = { audio, source, gain, filters: [], currentUrl: null };
    if (eqEnabled && eqBands.length > 0) {
      applyEqToLane(lane);
    }
    lanesRef.current[key] = lane;
    return lane;
  };

  const getActiveLane = () => ensureLane(activeLaneRef.current);
  const getInactiveLane = () => ensureLane(activeLaneRef.current === "a" ? "b" : "a");

  useEffect(() => {
    const laneA = ensureLane("a");
    applyEqToLane(laneA);

    if (crossfadeEnabled || gaplessEnabled) {
      const laneB = ensureLane("b");
      applyEqToLane(laneB);
    }
  }, [eqEnabled, eqBands, crossfadeEnabled, gaplessEnabled]);

  useEffect(() => {
    const laneA = ensureLane("a");
    laneA.audio.volume = volume;
    laneA.audio.playbackRate = playbackRate;

    if (crossfadeEnabled || gaplessEnabled) {
      const laneB = ensureLane("b");
      laneB.audio.volume = volume;
      laneB.audio.playbackRate = playbackRate;
    } else if (lanesRef.current.b) {
      const laneB = lanesRef.current.b;
      if (laneB.currentUrl) {
        URL.revokeObjectURL(laneB.currentUrl);
        laneB.currentUrl = null;
      }
      laneB.audio.pause();
      lanesRef.current.b = null;
      gaplessPreloadedRef.current = null;
    }
  }, [volume, playbackRate, crossfadeEnabled, gaplessEnabled]);

  const timeupdateThrottleRef = useRef<number>(0);
  useEffect(() => {
    const lane = getActiveLane();
    const audio = lane.audio;
    const THROTTLE_MS = 100;

    audio.ontimeupdate = () => {
      const now = performance.now();
      if (now - timeupdateThrottleRef.current < THROTTLE_MS) {
        return;
      }
      timeupdateThrottleRef.current = now;
      setCurrentTime(audio.currentTime || 0);
      setDuration(audio.duration || 0);
    };

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0);
    };

    audio.onended = () => {
      if (ignoreOnEndedRef.current) {
        ignoreOnEndedRef.current = false;
        return;
      }
      if (crossfadeEnabled && isCrossfadingRef.current) {
        return;
      }

      if (gaplessEnabled && !crossfadeEnabled && gaplessPreloadedRef.current) {
        const info = gaplessPreloadedRef.current;
        gaplessPreloadedRef.current = null;

        const currentLane = getActiveLane();
        const newLaneKey: "a" | "b" = info.laneKey;
        const newLane = ensureLane(newLaneKey);
        const newAudio = newLane.audio;
        const ctx = getAudioContext();

        currentLane.audio.pause();
        if (currentLane.currentUrl) {
          URL.revokeObjectURL(currentLane.currentUrl);
          currentLane.currentUrl = null;
        }

        activeLaneRef.current = newLaneKey;

        newAudio.currentTime = 0;
        void (async () => {
          try {
            if (ctx.state === "suspended") {
              await ctx.resume();
            }
            await newAudio.play();
          } catch {
          }
        })();

        const playerState = usePlayerStore.getState();
        playerState.setCurrentTime(newAudio.currentTime || 0);
        playerState.setDuration(newAudio.duration || 0);
        usePlayerStore.setState({
          currentTrackId: info.trackId,
          isPlaying: true,
        });

        return;
      }

      const repeat = usePlayerStore.getState().repeat;
      if (repeat === "track") {
        audio.currentTime = 0;
        void audio.play();
        return;
      }
      next();
    };
  }, [next, setCurrentTime, setDuration, crossfadeEnabled, gaplessEnabled, getActiveLane]);

  useEffect(() => {
    let cancelled = false;
    const lane = getActiveLane();
    const audio = lane.audio;

    const prev = previousPlayRef.current;
    if (prev && prev.trackId !== currentTrackId) {
      const listenedSeconds = Math.floor(audio.currentTime || 0);
      if (listenedSeconds > 0) {
        void addPlay(prev.trackId, prev.startedAt, listenedSeconds);
      }
    }
    previousPlayRef.current =
      currentTrackId != null
        ? { trackId: currentTrackId, startedAt: Date.now() }
        : null;

    const loadTrack = async () => {
      const url = await getTrackUrl(currentTrackId);
      if (!url || cancelled) {
        return;
      }
      if (lane.currentUrl) {
        URL.revokeObjectURL(lane.currentUrl);
      }
      lane.currentUrl = url;
      audio.src = url;
      audio.load();
      if (isPlaying) {
        try {
          const ctx = getAudioContext();
          if (ctx.state === "suspended") {
            void ctx.resume();
          }
          await audio.play();
        } catch {
        }
      }
    };
    void loadTrack();

    return () => {
      cancelled = true;
    };
  }, [currentTrackId, isPlaying, addPlay]);

  useEffect(() => {
    const lane = getActiveLane();
    const audio = lane.audio;
    if (!audio) {
      return;
    }
    if (isPlaying) {
      try {
        const ctx = getAudioContext();
        if (ctx.state === "suspended") {
          void ctx.resume();
        }
        void audio.play();
      } catch {
      }
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const lane = getActiveLane();
    const audio = lane.audio;
    if (!audio) {
      return;
    }
    if (Math.abs(audio.currentTime - currentTime) > 1) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  useEffect(() => {
    if (!crossfadeEnabled || crossfadeMs <= 0) {
      return;
    }
    const lane = getActiveLane();
    const audio = lane.audio;
    const ctx = getAudioContext();

    const checkAndSchedule = () => {
      if (isCrossfadingRef.current) {
        return;
      }
      if (!crossfadeEnabled || !audio.duration || !currentTrackId) {
        return;
      }
      const remaining = (audio.duration - audio.currentTime) * 1000;
      const fadeMs = Math.min(crossfadeMs, remaining);
      if (fadeMs <= 0) return;

      const state = usePlayerStore.getState();
      const { queue, currentTrackId: activeId, isPlaying: playing } = state;
      if (!playing || !activeId) return;
      const index = queue.indexOf(activeId);
      const nextId = index >= 0 ? queue[index + 1] : null;
      if (!nextId) return;

      const inactive = getInactiveLane();

      const startCrossfade = async () => {
        isCrossfadingRef.current = true;
        ignoreOnEndedRef.current = true;
        const url = await getTrackUrl(nextId);
        if (!url) {
          isCrossfadingRef.current = false;
          return;
        }
        if (inactive.currentUrl) {
          URL.revokeObjectURL(inactive.currentUrl);
        }
        inactive.currentUrl = url;
        inactive.audio.src = url;
        inactive.audio.load();
        inactive.audio.currentTime = 0;
        inactive.gain.gain.setValueAtTime(0, ctx.currentTime);
        try {
          if (ctx.state === "suspended") {
            await ctx.resume();
          }
          await inactive.audio.play();
        } catch {
          isCrossfadingRef.current = false;
          return;
        }

        const fadeSeconds = fadeMs / 1000;
        lane.gain.gain.cancelScheduledValues(ctx.currentTime);
        inactive.gain.gain.cancelScheduledValues(ctx.currentTime);
        lane.gain.gain.setValueAtTime(lane.gain.gain.value, ctx.currentTime);
        inactive.gain.gain.setValueAtTime(0, ctx.currentTime);
        lane.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeSeconds);
        inactive.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeSeconds);

        setTimeout(() => {
          lane.audio.pause();
          if (lane.currentUrl) {
            URL.revokeObjectURL(lane.currentUrl);
            lane.currentUrl = null;
          }
          activeLaneRef.current = activeLaneRef.current === "a" ? "b" : "a";
          const playerState = usePlayerStore.getState();
          playerState.setCurrentTime(inactive.audio.currentTime || 0);
          playerState.setDuration(inactive.audio.duration || 0);
          usePlayerStore.setState({
            currentTrackId: nextId,
            isPlaying: true,
          });
          isCrossfadingRef.current = false;
        }, fadeMs + 100);
      };

      if (crossfadeTimeoutRef.current != null) {
        window.clearTimeout(crossfadeTimeoutRef.current);
      }
      crossfadeTimeoutRef.current = window.setTimeout(startCrossfade, remaining - fadeMs);
    };

    const id = window.setInterval(checkAndSchedule, 500);
    return () => {
      window.clearInterval(id);
      if (crossfadeTimeoutRef.current != null) {
        window.clearTimeout(crossfadeTimeoutRef.current);
        crossfadeTimeoutRef.current = null;
      }
      isCrossfadingRef.current = false;
    };
  }, [crossfadeEnabled, crossfadeMs, currentTrackId]);

  useEffect(() => {
    if (!gaplessEnabled || crossfadeEnabled) {
      gaplessPreloadedRef.current = null;
      return;
    }

    let cancelled = false;
    let preloading = false;

    const lane = getActiveLane();
    const audio = lane.audio;

    const checkAndPreload = async () => {
      if (preloading || cancelled) {
        return;
      }
      const state = usePlayerStore.getState();
      const { queue, currentTrackId: activeId, isPlaying: playing } = state;
      if (!playing || !activeId || activeId !== currentTrackId) {
        return;
      }
      if (!audio.duration || Number.isNaN(audio.duration)) {
        return;
      }
      const remainingMs = (audio.duration - audio.currentTime) * 1000;
      const PRELOAD_WINDOW_MS = 4000;
      if (remainingMs <= 0 || remainingMs > PRELOAD_WINDOW_MS) {
        return;
      }

      const index = queue.indexOf(activeId);
      const nextId = index >= 0 ? queue[index + 1] : null;
      if (!nextId) {
        return;
      }

      if (gaplessPreloadedRef.current && gaplessPreloadedRef.current.trackId === nextId) {
        return;
      }

      preloading = true;
      try {
        const inactiveLane = getInactiveLane();
        if (inactiveLane.currentUrl) {
          URL.revokeObjectURL(inactiveLane.currentUrl);
          inactiveLane.currentUrl = null;
        }
        const url = await getTrackUrl(nextId);
        if (!url || cancelled) {
          return;
        }
        inactiveLane.currentUrl = url;
        inactiveLane.audio.src = url;
        inactiveLane.audio.load();

        const nextLaneKey: "a" | "b" = activeLaneRef.current === "a" ? "b" : "a";
        gaplessPreloadedRef.current = { laneKey: nextLaneKey, trackId: nextId };
      } finally {
        preloading = false;
      }
    };

    const id = window.setInterval(() => {
      void checkAndPreload();
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [gaplessEnabled, crossfadeEnabled, currentTrackId, getActiveLane, getInactiveLane]);

  useEffect(() => {
    return () => {
      const lanes = lanesRef.current;
      const keys: Array<"a" | "b"> = ["a", "b"];
      for (const key of keys) {
        const lane = lanes[key];
        if (!lane) continue;
        if (lane.currentUrl) {
          URL.revokeObjectURL(lane.currentUrl);
          lane.currentUrl = null;
        }
        lane.audio.pause();
      }
    };
  }, []);

  return null;
};

