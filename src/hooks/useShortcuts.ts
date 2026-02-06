import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayerStore } from "../stores/playerStore";

export const useShortcuts = () => {
  const navigate = useNavigate();
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isInput) return;

      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
        return;
      }
      if (event.code === "ArrowUp") {
        event.preventDefault();
        setVolume(Math.min(1, volume + 0.05));
        return;
      }
      if (event.code === "ArrowDown") {
        event.preventDefault();
        setVolume(Math.max(0, volume - 0.05));
        return;
      }
      if (event.key === "n" || event.key === "N") {
        next();
        return;
      }
      if (event.key === "p" || event.key === "P") {
        previous();
        return;
      }
      if (event.key === "s" || event.key === "S") {
        toggleShuffle();
        return;
      }
      if (event.key === "r" || event.key === "R") {
        cycleRepeat();
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        navigate("/search");
        return;
      }
      if (event.key === "g" || event.key === "G") {
        // simple `g`-based navigation: GL library, GK liked, GS search
        const listener = (e: KeyboardEvent) => {
          if (e.key === "l" || e.key === "L") {
            navigate("/");
          } else if (e.key === "k" || e.key === "K") {
            navigate("/liked");
          } else if (e.key === "s" || e.key === "S") {
            navigate("/search");
          }
          window.removeEventListener("keydown", listener, true);
        };
        window.addEventListener("keydown", listener, true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    navigate,
    togglePlay,
    next,
    previous,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
    volume,
    setVolume,
  ]);
};

