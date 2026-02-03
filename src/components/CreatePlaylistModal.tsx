import { useState, useRef } from "react";
import { usePlaylistStore } from "../stores/playlistStore";
import { Modal } from "./Modal";
import { ColorPicker } from "./ColorPicker";

type CreatePlaylistModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (playlistId: string) => void;
};

export const CreatePlaylistModal = ({
  isOpen,
  onClose,
  onCreated,
}: CreatePlaylistModalProps) => {
  const createPlaylist = usePlaylistStore((state) => state.createPlaylist);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 15) {
      return;
    }
    const playlist = await createPlaylist({
      name: trimmed,
      description: description.trim() || undefined,
      imageFile,
      color: color || undefined,
    });
    setName("");
    setDescription("");
    setColor("");
    setImageFile(undefined);
    onCreated(playlist.id);
    onClose();
  };

  return (
    <Modal title="Create playlist" isOpen={isOpen} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Playlist name
          <input
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 15))}
            placeholder="My Playlist"
            maxLength={15}
          />
        </label>
        <label>
          Description
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional description"
          />
        </label>
        <label className="form-color-label">
          Color
          <ColorPicker
            value={color || "#1db954"}
            onChange={setColor}
            ariaLabel="Playlist color"
          />
        </label>
        <div className="form-image-upload">
          <span className="form-image-upload-label">Playlist image</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="form-image-upload-input"
            aria-label="Choose playlist image"
            onChange={(event) =>
              setImageFile(event.target.files?.[0] ?? undefined)
            }
          />
          <button
            type="button"
            className="upload-button form-image-upload-button"
            onClick={() => fileInputRef.current?.click()}
          >
            {imageFile ? imageFile.name : "Choose image"}
          </button>
        </div>
        <button className="primary-button" type="submit">
          Create playlist
        </button>
      </form>
    </Modal>
  );
};
