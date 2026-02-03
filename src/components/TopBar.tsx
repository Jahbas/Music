import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { SearchOverlay } from "./SearchOverlay";
import { SettingsModal } from "./SettingsModal";

export const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      if (location.pathname === "/search") {
        navigate("/");
      }
      return;
    }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setIsSearchOverlayOpen(false);
  };

  const topbarInputRef = useRef<HTMLInputElement>(null);

  const handleTopbarSearchFocus = () => {
    setIsSearchOverlayOpen(true);
    requestAnimationFrame(() => {
      topbarInputRef.current?.blur();
    });
  };

  return (
    <div className="topbar">
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          ref={topbarInputRef}
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={handleTopbarSearchFocus}
          placeholder="What do you want to play?"
          aria-expanded={isSearchOverlayOpen}
          aria-haspopup="dialog"
          readOnly={isSearchOverlayOpen}
        />
      </form>
      <SearchOverlay
        isOpen={isSearchOverlayOpen}
        query={query}
        onQueryChange={setQuery}
        onClose={() => setIsSearchOverlayOpen(false)}
      />
      <button
        type="button"
        className="topbar-settings-button"
        onClick={() => setIsSettingsOpen(true)}
        title="Settings"
        aria-label="Open settings"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
