import { useEffect, useRef } from "react";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import { usePlayHistoryStore } from "../stores/playHistoryStore";

const getTrackUrl = async (trackId: string | null) => {
  if (!trackId) {
    return null;
  }
  const track = useLibraryStore
    .getState()
    .tracks.find((item) => item.id === trackId);
  if (!track) {
    return null;
  }
  if (track.sourceType === "blob" && track.fileBlob) {
    return URL.createObjectURL(track.fileBlob);
  }
  if (track.sourceType === "handle" && track.fileHandle) {
    try {
      const file = await track.fileHandle.getFile();
      return URL.createObjectURL(file);
    } catch {
      return null;
    }
  }
  return null;
};

export const useAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousPlayRef = useRef<{ trackId: string; startedAt: number } | null>(null);
  const currentTrackId = usePlayerStore((state) => state.currentTrackId);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const volume = usePlayerStore((state) => state.volume);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const setDuration = usePlayerStore((state) => state.setDuration);
  const next = usePlayerStore((state) => state.next);
  const addPlay = usePlayHistoryStore((state) => state.addPlay);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.volume = volume;
  }, [volume]);

  const timeupdateThrottleRef = useRef<number>(0);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
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
      next();
    };
  }, [next, setCurrentTime, setDuration]);

  useEffect(() => {
    let currentUrl: string | null = null;
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
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
      if (!url) {
        return;
      }
      currentUrl = url;
      audio.src = url;
      audio.load();
      if (isPlaying) {
        void audio.play();
      }
    };
    void loadTrack();
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [currentTrackId, addPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (isPlaying) {
      void audio.play();
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (Math.abs(audio.currentTime - currentTime) > 1) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  return audioRef;
};
