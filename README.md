## Music

**Music** is a fast, offline‑first, fully open source music player that runs entirely in your browser.  
Import local files, organize them into playlists and folders, and enjoy a clean, keyboard‑friendly UI with rich theming.

### Highlights

- **Local-first library**: All tracks, playlists, folders, and artwork are stored in IndexedDB in your browser.
- **Smart playlists**: Automatic **Liked Songs** view plus custom playlists with cover images.
- **Playlist folders**: Group playlists into folders with icons and banners; play or shuffle an entire folder at once.
- **Multiple profiles**: Switch between profiles in the top bar; each profile has its own folders so you can separate work, personal, or different libraries.
- **Repeat and shuffle**: Infinite loop (repeat queue or repeat track) and shuffle with one tap; active states shown in the player bar.
- **Beautiful themes**: Modern, glassy UI designed for long listening sessions.
- **No account, no tracking**: Everything stays on your machine.

### Latest changes

See the full **changelog and latest updates** in [`CHANGELOG.md`](./CHANGELOG.md).

### Getting started

#### 1. Install dependencies

```bash
npm install
```

#### 2. Run the dev server

```bash
npm run dev
```

Open the printed local URL in your browser.

#### 3. Build for production

```bash
npm run build
```

To preview the built app locally:

```bash
npm run preview
```

### Tech stack

- **Frontend**: React 18, React Router, TypeScript
- **State management**: Zustand
- **Tooling**: Vite 5
- **Storage & metadata**: IndexedDB via `idb`, `music-metadata-browser` for audio metadata

### Contributing

Bug reports, feature ideas, and pull requests are very welcome.  
If you have a feature request or found a bug, open an issue and it will be looked into.
