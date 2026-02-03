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

