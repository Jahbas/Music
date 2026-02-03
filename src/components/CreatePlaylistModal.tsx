import { useState, useRef } from "react";
import { usePlaylistStore } from "../stores/playlistStore";
import { useFolderStore } from "../stores/folderStore";
import { Modal } from "./Modal";
import { FolderSelect } from "./FolderSelect";

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
  const folders = useFolderStore((state) => state.folders);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);
  const [folderId, setFolderId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Playlist name is required.");
      return;
    }
    if (trimmed.length > 15) {
      setError("Playlist name must be 15 characters or fewer.");
      return;
    }
    const playlist = await createPlaylist({
      name: trimmed,
      description: description.trim() || undefined,
      imageFile,
      folderId: folderId || undefined,
    });
    setName("");
    setDescription("");
    setImageFile(undefined);
    setFolderId("");
    setError(null);
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
            onChange={(event) => {
              setName(event.target.value.slice(0, 15));
              if (error) {
                setError(null);
              }
            }}
            placeholder="My Playlist"
            maxLength={15}
            aria-invalid={error ? "true" : "false"}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <label>
          Description
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional description"
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
        {folders.length > 0 && (
          <label>
            Folder
            <FolderSelect value={folderId} onChange={setFolderId} />
          </label>
        )}
        <button className="primary-button" type="submit">
          Create playlist
        </button>
      </form>
    </Modal>
  );
};
