import { useState, useEffect, useRef } from "react";
import { useProfileStore } from "../stores/profileStore";
import { Modal } from "./Modal";

type CreateProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (profileId: string) => void;
};

export const CreateProfileModal = ({
  isOpen,
  onClose,
  onCreated,
}: CreateProfileModalProps) => {
  const createProfile = useProfileStore((state) => state.createProfile);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setError(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Profile name is required.");
      return;
    }
    const profile = await createProfile(trimmed);
    setName("");
    setError(null);
    onCreated?.(profile.id);
    onClose();
  };

  return (
    <Modal title="New profile" isOpen={isOpen} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Profile name
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Work, Personal"
            maxLength={50}
            aria-invalid={error ? "true" : "false"}
            autoComplete="off"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={!name.trim()}>
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
};
