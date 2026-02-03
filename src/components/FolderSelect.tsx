import { useEffect, useRef, useState } from "react";
import { useFolderStore } from "../stores/folderStore";

type FolderSelectProps = {
  value: string;
  onChange: (folderId: string) => void;
};

export const FolderSelect = ({ value, onChange }: FolderSelectProps) => {
  const folders = useFolderStore((state) => state.folders);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedFolder =
    folders.find((folder) => folder.id === value) ?? null;

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

  if (folders.length === 0) {
    return null;
  }

  const handleSelect = (folderId: string) => {
    onChange(folderId);
    setIsOpen(false);
  };

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="form-select" ref={dropdownRef}>
      <button
        type="button"
        className="form-select-trigger"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span
          className={
            selectedFolder ? "form-select-value" : "form-select-placeholder"
          }
        >
          {selectedFolder ? selectedFolder.name : "None"}
        </span>
        <span className="form-select-chevron" aria-hidden>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div className="form-select-menu" role="listbox">
          <button
            type="button"
            className={`form-select-option ${
              value === "" ? "form-select-option--selected" : ""
            }`}
            onClick={() => handleSelect("")}
          >
            None
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              className={`form-select-option ${
                folder.id === value ? "form-select-option--selected" : ""
              }`}
              onClick={() => handleSelect(folder.id)}
            >
              {folder.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

