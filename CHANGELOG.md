## 1.3.0 - 2026-02-05

### New

- **Queue panel**: Open the queue from the player bar (queue icon) to see “Now playing” and “Next in queue.” Reorder upcoming tracks by drag-and-drop, remove individual items, or clear the queue. Drag tracks from any view (library, playlist, folder, liked, search) into the queue panel to add them to the end.
- **Session & usage telemetry**: Local-only analytics you can view under Settings → “Session & usage telemetry” (or `/telemetry`). Records per visit and per session: total visits and sessions, session duration, listening time (time spent with playback active), pages visited (path history), search queries, track play count, skip next/prev counts, and play/pause toggles. Sessions end when you close the tab or switch away. Shows aggregates: total listening time and total time on app (all sessions), averages per session, most visited pages, and recent search queries. Recent sessions are listed in a table. Data is stored only in your browser (localStorage); you can export a JSON snapshot to clipboard. No data is sent anywhere.

### Improvements

- **Drag add to playlist**: When dragging one or more tracks, an overlay appears listing your playlists; drop on a playlist to add the tracks.
- **Sidebar file/folder drop**: Drop audio files on the sidebar to add them to the library; drop on a playlist row to add to that playlist. Drop a folder on the sidebar to create a new playlist named after the folder, import all audio files from it, and navigate to that playlist.

### Internal

- **Queue**: Player store exposes `addToQueue`, `removeFromQueue`, `reorderQueue`, `clearQueue`; queue order and current track drive the queue panel and playback.
- **Telemetry**: New `telemetryStore` (localStorage) and `useTelemetry` hook; records visits, sessions (start/end on visibility change and pagehide), routes, search, and player actions; `TelemetryView` at `/telemetry` and snapshot export.

---

## 1.2.0 - 2026-02-05

### New

- **Repeat mode**: Player bar repeat button cycles through off, repeat queue (infinite play), and repeat track. Playlist and folder playback no longer stop at the end—enable repeat queue to loop indefinitely.
- **Multiple profiles**: Create and switch between profiles from the top bar. Folders are scoped per profile; only the current profile’s folders are shown in the sidebar and folder view. "New profile" creates a profile and switches to it; "Delete all data" in Settings clears profiles and folders and recreates a default profile.
- **Setting: expand playlists when playing folder**: In Settings under Folders, toggle "Expand all playlists when playing folder" on or off. When off, clicking Play on a folder no longer expands every playlist section.

### Improvements

- **Player bar**: All control buttons (shuffle, repeat, previous, play/pause, next, like, speed, volume) use rounded-square styling. Shuffle and repeat turn accent (e.g. purple) when active.
- **Play / Pause button**: Redesigned as a rounded square with accent background and white icon; clearer play and pause icons and hover/active states.
- **Speed button (collapsed)**: Playback speed trigger in the player bar is now a compact rounded square matching the volume and other controls, with muted text and hover styling.

### Internal

- **Player store**: Repeat state (`off` | `queue` | `track`) persisted in localStorage; `next()` implements repeat queue and repeat track behavior.
- **Audio hook**: On track end, repeat track restarts the same track; otherwise `next()` handles queue advance or loop.
- **Preferences**: New `preferences` helper for "expand playlists on folder play" (localStorage).
- **Profiles**: New `Profile` type and `profileDb`; `PlaylistFolder` has optional `profileId`; profile store with hydrate, setCurrentProfile, createProfile, updateProfile, deleteProfile; folder store filters by current profile and migrates folders without `profileId` to the default profile.
- **Project todos**: `TODO.md` added at project root for tracking planned work.

---

## 1.1.0 - 2026-02-03

### New

- **Playlist folders**: Create folders with names, descriptions, and optional icon and banner images, persisted in the app database.
- **Folder view**: Browse a dedicated view for each folder that aggregates tracks from all playlists in the folder, with play and shuffle controls for the entire folder.
- **Drag-and-drop playlists into folders**: Drag playlists in the sidebar to assign them to folders, with visual feedback for valid drop targets.
- **Liked Songs view**: See a smart "Liked Songs" playlist that automatically lists all liked tracks from your library, playlists, and search results, with play, shuffle, and drag-and-drop support.

### Improvements

- **Sidebar organization**: Playlists and folders can be pinned, ordered, and edited directly from the sidebar, with updated visuals for banners, icons, and context actions.
- **Selection and bulk actions**: Improved multi-select behavior for tracks in folder and liked views, including clearer select-all behavior and bulk delete operations.
- **Playback consistency**: Folder and liked views now integrate with the global player queue, shuffle state, and per-track play actions so playback behaves consistently across views.
- **Playback speed control**: Added an Apple-style speed menu next to the volume control with presets for 0.5×, 0.75×, 1×, 1.25×, and 1.5× that updates the audio playback rate in real time.

### Internal

- **State and persistence**: Added a dedicated folder store and related database layer to persist folder metadata and artwork, and wired these into existing library and playlist stores.

