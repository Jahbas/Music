import { useState, useEffect, useRef } from "react";
import { useFolderStore } from "../stores/folderStore";
import { Modal } from "./Modal";
import type { PlaylistFolder } from "../types";

const NAME_MAX_LENGTH = 32;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type EditFolderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  folder: PlaylistFolder | null;
  onDeleted?: () => void;
};

export const EditFolderModal = ({
  isOpen,
  onClose,
  folder,
  onDeleted,
}: EditFolderModalProps) => {
  const updateFolder = useFolderStore((state) => state.updateFolder);
  const updateFolderIcon = useFolderStore(
    (state) => state.updateFolderIcon
  );
  const updateFolderBanner = useFolderStore(
    (state) => state.updateFolderBanner
  );
  const deleteFolder = useFolderStore((state) => state.deleteFolder);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pinned, setPinned] = useState(false);
  const [iconFile, setIconFile] = useState<File | undefined>(undefined);
  const [bannerFile, setBannerFile] = useState<File | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setDescription(folder.description ?? "");
      setPinned(folder.pinned ?? false);
      setIconFile(undefined);
      setBannerFile(undefined);
      setConfirmDelete(false);
    }
  }, [folder, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!folder || !trimmed || trimmed.length > NAME_MAX_LENGTH) {
      return;
    }
    await updateFolder(folder.id, {
      name: trimmed,
      description: description.trim() || undefined,
      pinned,
    });
    if (iconFile) {
      await updateFolderIcon(folder.id, iconFile);
    }
    if (bannerFile) {
      await updateFolderBanner(folder.id, bannerFile);
    }
    onClose();
  };

  const handleRemoveIcon = async () => {
    if (!folder) return;
    await updateFolderIcon(folder.id, null);
    setIconFile(undefined);
    if (iconInputRef.current) iconInputRef.current.value = "";
  };

  const handleRemoveBanner = async () => {
    if (!folder) return;
    await updateFolderBanner(folder.id, null);
    setBannerFile(undefined);
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  };

  const handleDelete = async () => {
    if (!folder) {
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteFolder(folder.id);
    setConfirmDelete(false);
    onClose();
    onDeleted?.();
  };

  if (!folder) {
    return null;
  }

  const hasIcon = folder.iconImageId || iconFile;
  const hasBanner = folder.bannerImageId || bannerFile;

  return (
    <Modal
      title="Folder settings"
      isOpen={isOpen}
      onClose={onClose}
      className="settings-modal"
    >
      <form className="form" onSubmit={handleSubmit}>
        <div className="settings-sections">
          <section className="settings-section">
            <h4 className="settings-section-title">Basic</h4>
            <label>
              Folder name
              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value.slice(0, NAME_MAX_LENGTH))
                }
                placeholder="My Folder"
                maxLength={NAME_MAX_LENGTH}
              />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </label>
          </section>

          <section className="settings-section">
            <h4 className="settings-section-title">Appearance</h4>
            <div className="form-image-upload">
              <span className="form-image-upload-label">Icon image</span>
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                className="form-image-upload-input"
                aria-label="Choose icon image"
                onChange={(event) =>
                  setIconFile(event.target.files?.[0] ?? undefined)
                }
              />
              <div className="form-image-upload-row">
                <button
                  type="button"
                  className="upload-button form-image-upload-button"
                  onClick={() => iconInputRef.current?.click()}
                >
                  {iconFile
                    ? iconFile.name
                    : folder.iconImageId
                      ? "Change icon"
                      : "Choose icon"}
                </button>
                {hasIcon && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleRemoveIcon}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="form-image-upload">
              <span className="form-image-upload-label">Banner image</span>
              <p className="settings-description">
                Shown in the sidebar next to this folder.
              </p>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="form-image-upload-input"
                aria-label="Choose banner image"
                onChange={(event) =>
                  setBannerFile(event.target.files?.[0] ?? undefined)
                }
              />
              <div className="form-image-upload-row">
                <button
                  type="button"
                  className="upload-button form-image-upload-button"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  {bannerFile
                    ? bannerFile.name
                    : folder.bannerImageId
                      ? "Change banner"
                      : "Choose banner"}
                </button>
                {hasBanner && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleRemoveBanner}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="settings-section">
            <h4 className="settings-section-title">Sidebar</h4>
            <div className="settings-row">
              <span className="settings-row-label">Pin to top</span>
              <button
                type="button"
                role="checkbox"
                aria-checked={pinned}
                className={`custom-checkbox ${pinned ? "custom-checkbox--checked" : ""}`}
                onClick={() => setPinned(!pinned)}
                aria-label="Pin to top"
              >
                <span className="custom-checkbox-box" aria-hidden>
                  {pinned ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </span>
              </button>
            </div>
          </section>

          <section className="settings-section settings-section-collapsible">
            <button
              type="button"
              className="settings-collapse-trigger"
              onClick={() => setInfoExpanded(!infoExpanded)}
              aria-expanded={infoExpanded}
            >
              <h4 className="settings-section-title">Info</h4>
              <span className="settings-collapse-icon" aria-hidden>
                {infoExpanded ? "−" : "+"}
              </span>
            </button>
            {infoExpanded && (
              <div className="settings-collapse-content">
                <div className="settings-row settings-row-readonly">
                  <span className="settings-row-label">Created</span>
                  <span className="settings-row-value">
                    {formatDate(folder.createdAt)}
                  </span>
                </div>
                <div className="settings-row settings-row-readonly">
                  <span className="settings-row-label">Updated</span>
                  <span className="settings-row-value">
                    {formatDate(folder.updatedAt)}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="form-actions form-actions-with-danger">
          <button className="primary-button" type="submit">
            Save
          </button>
          <button
            className={confirmDelete ? "danger-button" : "secondary-button"}
            type="button"
            onClick={handleDelete}
          >
            {confirmDelete
              ? "Click again to delete folder"
              : "Delete folder"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
