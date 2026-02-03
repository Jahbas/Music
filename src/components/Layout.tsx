import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAudio } from "../hooks/useAudio";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayHistoryStore } from "../stores/playHistoryStore";
import { usePlayerStore } from "../stores/playerStore";
import { usePlaylistStore } from "../stores/playlistStore";
import { useFolderStore } from "../stores/folderStore";
import { useThemeStore } from "../stores/themeStore";
import { AddSongsProgress } from "./AddSongsProgress";
import { DragAddToPlaylistOverlay } from "./DragAddToPlaylistOverlay";
import { PlayerBar } from "./PlayerBar";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export const Layout = () => {
  const navigate = useNavigate();
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const hydrateLibrary = useLibraryStore((state) => state.hydrate);
  const hydratePlaylists = usePlaylistStore((state) => state.hydrate);
  const hydrateFolders = useFolderStore((state) => state.hydrate);
  const hydratePlayHistory = usePlayHistoryStore((state) => state.hydrate);
  useAudio();

  const [draggingTrackIds, setDraggingTrackIds] = useState<string[]>([]);

  useEffect(() => {
    void hydrateTheme();
    void hydrateLibrary();
    void hydratePlaylists();
    void hydrateFolders();
    void hydratePlayHistory();
  }, [hydrateTheme, hydrateLibrary, hydratePlaylists, hydrateFolders, hydratePlayHistory]);

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
        usePlayerStore.getState().togglePlay();
        return;
      }
      if (event.code === "ArrowUp") {
        event.preventDefault();
        const { volume, setVolume } = usePlayerStore.getState();
        setVolume(Math.min(1, volume + 0.05));
        return;
      }
      if (event.code === "ArrowDown") {
        event.preventDefault();
        const { volume, setVolume } = usePlayerStore.getState();
        setVolume(Math.max(0, volume - 0.05));
        return;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const dragActive = draggingTrackIds.length > 0;

  const dragContext = useMemo(
    () => ({
      dragActive,
      draggingTrackIds,
      onDragStart: (trackIds: string[]) => setDraggingTrackIds(trackIds),
      onDragEnd: () => setDraggingTrackIds([]),
    }),
    [dragActive, draggingTrackIds]
  );

  const handleAppDragOver = (event: React.DragEvent) => {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleAppDrop = (event: React.DragEvent) => {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
    }
  };

  return (
    <div
      className="app-shell"
      onDragOver={handleAppDragOver}
      onDrop={handleAppDrop}
    >
      <Sidebar
        dragContext={dragContext}
        onNavigate={(path) => navigate(path)}
      />
      <div className="app-main">
        <TopBar />
        <div className="app-content">
          <Outlet context={dragContext} />
        </div>
      </div>
      <PlayerBar />
      <AddSongsProgress />
      {dragActive && (
        <DragAddToPlaylistOverlay
          trackIds={draggingTrackIds}
          onClose={() => setDraggingTrackIds([])}
        />
      )}
    </div>
  );
};
