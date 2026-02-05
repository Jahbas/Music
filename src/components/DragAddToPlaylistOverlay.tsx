import { usePlaylistStore } from "../stores/playlistStore";

type DragAddToPlaylistOverlayProps = {
  trackIds: string[];
  onClose: () => void;
};

export const DragAddToPlaylistOverlay = ({
  trackIds,
  onClose,
}: DragAddToPlaylistOverlayProps) => {
  const playlists = usePlaylistStore((state) => state.playlists);
  const addTracksToPlaylist = usePlaylistStore(
    (state) => state.addTracksToPlaylist
  );

  const handleAdd = async (playlistId: string) => {
    await addTracksToPlaylist(playlistId, trackIds);
    onClose();
  };

  const handleOverlayDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  return (
    <div
      className="drag-overlay"
      onDragOver={handleOverlayDragOver}
    >
      <div className="drag-overlay-card">
        <div className="drag-overlay-title">Add to playlist</div>
        <div className="drag-overlay-list">
          {playlists.length === 0 && (
            <div className="muted">Create a playlist to drop tracks here.</div>
          )}
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              className="drag-overlay-item"
              onClick={() => handleAdd(playlist.id)}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleAdd(playlist.id);
              }}
            >
              {playlist.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
