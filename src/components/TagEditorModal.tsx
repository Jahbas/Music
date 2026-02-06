import { useState, useEffect } from "react";
import { Modal } from "./Modal";

type TagEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTags: string[];
  onSave: (tags: string[]) => void;
};

export const TagEditorModal = ({
  isOpen,
  onClose,
  initialTags,
  onSave,
}: TagEditorModalProps) => {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setValue(initialTags.join(", "));
    }
  }, [isOpen, initialTags]);

  const handleSave = () => {
    const tags = value
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    onSave(tags);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal title="Edit tags" isOpen={isOpen} onClose={onClose}>
      <div className="tag-editor-modal">
        <label className="tag-editor-label">
          Tags
          <input
            className="tag-editor-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="rock, workout, chill"
          />
        </label>
        <p className="settings-description">
          Comma-separated list of tags. Use in search with{" "}
          <code>tag:rock</code> or <code>-tag:live</code>.
        </p>
        <div className="tag-editor-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

