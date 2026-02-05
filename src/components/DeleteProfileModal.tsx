import { Modal } from "./Modal";

type DeleteProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profileName: string;
  onConfirm: () => void | Promise<void>;
};

export const DeleteProfileModal = ({
  isOpen,
  onClose,
  profileName,
  onConfirm,
}: DeleteProfileModalProps) => {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal title="Delete profile" isOpen={isOpen} onClose={onClose} className="delete-profile-modal">
      <p className="delete-profile-message">
        Delete profile &quot;{profileName}&quot;? Its folders, play history, and liked songs will be removed. This cannot be undone.
      </p>
      <div className="form-actions form-actions-with-danger">
        <button type="button" className="secondary-button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="danger-button" onClick={handleConfirm}>
          Delete profile
        </button>
      </div>
    </Modal>
  );
};
