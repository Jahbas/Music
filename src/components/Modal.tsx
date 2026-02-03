import { type ReactNode } from "react";

type ModalProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export const Modal = ({ title, isOpen, onClose, children, className }: ModalProps) => {
  if (!isOpen) {
    return null;
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${className ?? ""}`.trim()} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="ghost-button modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
