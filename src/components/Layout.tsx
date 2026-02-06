import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAudio } from "../hooks/useAudio";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayHistoryStore } from "../stores/playHistoryStore";
import { usePlaylistStore } from "../stores/playlistStore";
import { useProfileStore } from "../stores/profileStore";
import { useFolderStore } from "../stores/folderStore";
import { useProfileLikesStore } from "../stores/profileLikesStore";
import { useThemeStore } from "../stores/themeStore";
import { useTelemetry } from "../hooks/useTelemetry";
import { useShortcuts } from "../hooks/useShortcuts";
import { AddSongsProgress } from "./AddSongsProgress";
import { DragAddToPlaylistOverlay } from "./DragAddToPlaylistOverlay";
import { PlayerBar } from "./PlayerBar";
import { QueuePanel } from "./QueuePanel";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { SettingsModal } from "./SettingsModal";

export const Layout = () => {
  const navigate = useNavigate();
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const hydrateLibrary = useLibraryStore((state) => state.hydrate);
  const hydratePlaylists = usePlaylistStore((state) => state.hydrate);
  const hydrateProfiles = useProfileStore((state) => state.hydrate);
  const hydrateFolders = useFolderStore((state) => state.hydrate);
  const hydratePlayHistory = usePlayHistoryStore((state) => state.hydrate);
  const hydrateProfileLikes = useProfileLikesStore((state) => state.hydrate);
  useAudio();
  useTelemetry();
  useShortcuts();

  const [draggingTrackIds, setDraggingTrackIds] = useState<string[]>([]);
  const [queuePanelOpen, setQueuePanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (settingsOpen) setQueuePanelOpen(false);
  }, [settingsOpen]);

  useEffect(() => {
    void hydrateTheme();
    void hydrateLibrary();
    void hydratePlaylists();
    void (async () => {
      await hydrateProfiles();
      await hydrateFolders();
      await hydratePlayHistory();
      await hydrateProfileLikes();
    })();
  }, [
    hydrateTheme,
    hydrateLibrary,
    hydratePlaylists,
    hydrateProfiles,
    hydrateFolders,
    hydratePlayHistory,
    hydrateProfileLikes,
  ]);

  // Global shortcuts are handled by useShortcuts.

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
      className={`app-shell${settingsOpen ? " app-shell--settings-open" : ""}`}
      onDragOver={handleAppDragOver}
      onDrop={handleAppDrop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Sidebar
        dragContext={dragContext}
        onNavigate={(path) => navigate(path)}
      />
      <div className="app-main">
        <TopBar
          isSettingsOpen={settingsOpen}
          onOpenSettings={() => setSettingsOpen(true)}
          onCloseSettings={() => setSettingsOpen(false)}
        />
        <div className="app-content">
          <Outlet context={dragContext} />
        </div>
      </div>
      {!settingsOpen && (
        <PlayerBar
          queuePanelOpen={queuePanelOpen}
          onToggleQueuePanel={() => setQueuePanelOpen((v) => !v)}
        />
      )}
      {queuePanelOpen && (
        <QueuePanel onClose={() => setQueuePanelOpen(false)} />
      )}
      <AddSongsProgress />
      {dragActive && (
        <DragAddToPlaylistOverlay
          trackIds={draggingTrackIds}
          onClose={() => setDraggingTrackIds([])}
        />
      )}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};
