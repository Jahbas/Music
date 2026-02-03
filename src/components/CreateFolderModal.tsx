import { useState, useRef } from "react";
import { useFolderStore } from "../stores/folderStore";
import { Modal } from "./Modal";

type CreateFolderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (folderId: string) => void;
};

export const CreateFolderModal = ({
  isOpen,
  onClose,
  onCreated,
}: CreateFolderModalProps) => {
  const createFolder = useFolderStore((state) => state.createFolder);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconImageFile, setIconImageFile] = useState<File | undefined>(undefined);
  const [bannerImageFile, setBannerImageFile] = useState<File | undefined>(undefined);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Folder name is required.");
      return;
    }
    if (trimmed.length > 32) {
      setError("Folder name must be 32 characters or fewer.");
      return;
    }
    const folder = await createFolder({
      name: trimmed,
      description: description.trim() || undefined,
      iconImageFile,
      bannerImageFile,
    });
    setName("");
    setDescription("");
    setIconImageFile(undefined);
    setBannerImageFile(undefined);
    setError(null);
    onCreated(folder.id);
    onClose();
  };

  return (
    <Modal title="Create folder" isOpen={isOpen} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Folder name
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value.slice(0, 32));
              if (error) {
                setError(null);
              }
            }}
            placeholder="My Folder"
            maxLength={32}
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
          <span className="form-image-upload-label">Icon image</span>
          <input
            ref={iconInputRef}
            type="file"
            accept="image/*"
            className="form-image-upload-input"
            aria-label="Choose icon image"
            onChange={(event) =>
              setIconImageFile(event.target.files?.[0] ?? undefined)
            }
          />
          <button
            type="button"
            className="upload-button form-image-upload-button"
            onClick={() => iconInputRef.current?.click()}
          >
            {iconImageFile ? iconImageFile.name : "Choose icon"}
          </button>
        </div>
        <div className="form-image-upload">
          <span className="form-image-upload-label">Banner image</span>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="form-image-upload-input"
            aria-label="Choose banner image"
            onChange={(event) =>
              setBannerImageFile(event.target.files?.[0] ?? undefined)
            }
          />
          <button
            type="button"
            className="upload-button form-image-upload-button"
            onClick={() => bannerInputRef.current?.click()}
          >
            {bannerImageFile ? bannerImageFile.name : "Choose banner"}
          </button>
        </div>
        <button className="primary-button" type="submit">
          Create folder
        </button>
      </form>
    </Modal>
  );
};
