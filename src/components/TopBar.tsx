import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useProfileStore } from "../stores/profileStore";
import { useFolderStore } from "../stores/folderStore";
import { usePlayHistoryStore } from "../stores/playHistoryStore";
import { useProfileLikesStore } from "../stores/profileLikesStore";
import { usePlaylistStore } from "../stores/playlistStore";
import { useTelemetryStore } from "../stores/telemetryStore";
import { getTelemetryEnabled } from "../utils/preferences";
import { CreateProfileModal } from "./CreateProfileModal";
import { DeleteProfileModal } from "./DeleteProfileModal";
import { SearchOverlay } from "./SearchOverlay";

type TopBarProps = {
  isSettingsOpen: boolean;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
};

export const TopBar = ({ isSettingsOpen, onOpenSettings, onCloseSettings }: TopBarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCreateProfileOpen, setIsCreateProfileOpen] = useState(false);
  const [deleteProfileTarget, setDeleteProfileTarget] = useState<{ id: string; name: string } | null>(null);
  const profiles = useProfileStore((state) => state.profiles);
  const currentProfileId = useProfileStore((state) => state.currentProfileId);
  const setCurrentProfile = useProfileStore((state) => state.setCurrentProfile);
  const deleteProfile = useProfileStore((state) => state.deleteProfile);
  const hydrateFolders = useFolderStore((state) => state.hydrate);
  const hydratePlayHistory = usePlayHistoryStore((state) => state.hydrate);
  const hydrateProfileLikes = useProfileLikesStore((state) => state.hydrate);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const currentProfile = profiles.find((p) => p.id === currentProfileId);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const recordSearch = useTelemetryStore((s) => s.recordSearch);
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      if (location.pathname === "/search") {
        navigate("/");
      }
      return;
    }
    if (getTelemetryEnabled()) {
      recordSearch(trimmed);
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

  const handleSwitchProfile = (profileId: string) => {
    if (profileId === currentProfileId) {
      setIsProfileMenuOpen(false);
      return;
    }
    setCurrentProfile(profileId);
    void hydrateFolders();
    void hydratePlayHistory();
    void hydrateProfileLikes();
    setIsProfileMenuOpen(false);
  };

  const handleOpenCreateProfile = () => {
    setIsProfileMenuOpen(false);
    setIsCreateProfileOpen(true);
  };

  const handleProfileCreated = (profileId: string) => {
    setCurrentProfile(profileId);
    void hydrateFolders();
    void hydratePlayHistory();
    void hydrateProfileLikes();
  };

  const handleDeleteProfileClick = (e: React.MouseEvent, profileId: string, profileName: string) => {
    e.stopPropagation();
    if (profiles.length <= 1) return;
    setDeleteProfileTarget({ id: profileId, name: profileName });
    setIsProfileMenuOpen(false);
  };

  const handleConfirmDeleteProfile = async () => {
    if (!deleteProfileTarget) return;
    await deleteProfile(deleteProfileTarget.id);
    void hydrateFolders();
    void hydratePlayHistory();
    void hydrateProfileLikes();
    void usePlaylistStore.getState().hydrate();
    setDeleteProfileTarget(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && event.target instanceof Node && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileMenuOpen]);

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
      <div className="topbar-profile-wrap" ref={profileMenuRef}>
        <button
          type="button"
          className="topbar-profile-button"
          onClick={() => setIsProfileMenuOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isProfileMenuOpen}
          title="Switch profile"
          aria-label="Switch profile"
        >
          <span className="topbar-profile-name">{currentProfile?.name ?? "Profile"}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {isProfileMenuOpen && (
          <div className="topbar-profile-menu" role="listbox">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`topbar-profile-option-row${currentProfileId === profile.id ? " topbar-profile-option--active" : ""}`}
              >
                <button
                  type="button"
                  className="topbar-profile-option"
                  onClick={() => handleSwitchProfile(profile.id)}
                  role="option"
                  aria-selected={currentProfileId === profile.id}
                >
                  {profile.name}
                </button>
                {profiles.length > 1 && (
                  <button
                    type="button"
                    className="topbar-profile-delete"
                    onClick={(e) => handleDeleteProfileClick(e, profile.id, profile.name)}
                    title={`Delete ${profile.name}`}
                    aria-label={`Delete profile ${profile.name}`}
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="topbar-profile-option topbar-profile-option--new"
              onClick={handleOpenCreateProfile}
            >
              New profile
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        className="topbar-settings-button"
        onClick={isSettingsOpen ? onCloseSettings : onOpenSettings}
        title="Settings"
        aria-label="Open settings"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <CreateProfileModal
        isOpen={isCreateProfileOpen}
        onClose={() => setIsCreateProfileOpen(false)}
        onCreated={handleProfileCreated}
      />
      <DeleteProfileModal
        isOpen={deleteProfileTarget !== null}
        onClose={() => setDeleteProfileTarget(null)}
        profileName={deleteProfileTarget?.name ?? ""}
        onConfirm={handleConfirmDeleteProfile}
      />
    </div>
  );
};

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
