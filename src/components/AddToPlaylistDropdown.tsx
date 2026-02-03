import { useEffect, useRef, useState } from "react";
import { usePlaylistStore } from "../stores/playlistStore";

type AddToPlaylistDropdownProps = {
  trackIds: string[];
  label?: string;
};

export const AddToPlaylistDropdown = ({
  trackIds,
  label = "Add to playlist",
}: AddToPlaylistDropdownProps) => {
  const playlists = usePlaylistStore((state) => state.playlists);
  const addTracksToPlaylist = usePlaylistStore(
    (state) => state.addTracksToPlaylist
  );
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleAdd = async (playlistId: string) => {
    if (trackIds.length === 0) return;
    await addTracksToPlaylist(playlistId, trackIds);
    setIsOpen(false);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="secondary-button"
        onClick={handleToggle}
      >
        {label}
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          {trackIds.length === 0 ? (
            <div className="dropdown-item muted">
              Select one or more tracks first
            </div>
          ) : playlists.length === 0 ? (
            <div className="dropdown-item muted">No playlists yet</div>
          ) : (
            playlists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                className="dropdown-item"
                onClick={() => handleAdd(playlist.id)}
              >
                {playlist.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
