## 1.4.0 - 2026-02-06

### New

- **Crossfade playback**: Optional crossfade engine that uses a dual-lane audio pipeline to smoothly overlap the end of one track with the start of the next. Configure crossfade length (up to 12 seconds) from Settings → Audio.
- **Gapless playback toggle**: New "Gapless playback" switch in Settings → Audio that minimizes gaps between tracks when crossfade is off. Uses background preloading to keep transitions tight where the browser and file formats allow.
- **Equalizer with presets**: Six-band parametric EQ with presets (Flat, Bass boost, Treble boost, Vocal, Loudness). Enable and pick a preset from the Equalizer section in Settings → Audio; settings are stored per device.
- **Advanced EQ editor & graph**: Advanced EQ view with a graphical curve editor. Drag points on the frequency curve or adjust per-band gain and Q sliders to fine-tune your sound. "Reset to preset" snaps bands back to the currently selected preset.
- **Theme + audio + player profiles**: Save named profiles that capture theme (mode, accent, density, motion), audio settings (crossfade, gapless, EQ), player behavior (shuffle, repeat, volume, speed, auto-play on load), and preferences (expand playlists on folder play, telemetry). Apply profiles from Settings → Profiles to instantly switch setups.
- **Settings backup JSON**: Export a JSON snapshot of theme, audio, player settings, and library structure (folders and playlists) from Settings → Data ("Download JSON"). Import the file on the same device/browser profile to update existing folders and playlists and restore your setup.

### Improvements

- **Settings layout**: Settings is now a full-screen, tabbed experience ("General", "Appearance", "Profiles", "Audio", "Player", "Data & privacy", "Support") with clearer descriptions and better grouping of controls.
- **Data & privacy tools**: New "Delete unused tracks" action that removes tracks not referenced by any playlist and not in the current queue, plus improved storage info explaining how and where data is stored. Clearer, stronger warnings for clearing history and deleting all website data.
- **Sidebar drag-and-drop**: More robust sidebar drag-and-drop handling for playlists, folders, and track/file drops. Visual highlights make it clearer where items will land, and playlist moves into folders reset drag state reliably after drops.
- **Audio engine integration**: The crossfade/gapless engine is wired into the player store and audio hook, keeping playback state, volume, speed, and repeat behavior consistent across normal, crossfaded, and gapless playback.

### Internal

- **Audio settings store**: Centralized audio settings in a dedicated store with persisted crossfade, gapless, and EQ state, plus preset-to-band mapping for the EQ.
- **Theme store profiles**: Theme profiles now include audio, player, and behavior preferences and can apply those back into their respective stores, including helper preferences (auto-play on load, expand playlists on folder play, telemetry enabled).
- **Settings backup utilities**: Added utilities for exporting/importing settings and structure, including internal helpers for updating folder and playlist records in the IndexedDB-backed stores.

---

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

