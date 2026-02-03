import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStore } from "../stores/themeStore";
import { usePlayHistoryStore } from "../stores/playHistoryStore";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlaylistStore } from "../stores/playlistStore";
import { usePlayerStore } from "../stores/playerStore";
import { trackDb, playlistDb, imageDb, playHistoryDb, themeDb } from "../db/db";
import { Modal } from "./Modal";
import { ColorPicker } from "./ColorPicker";

const OLED_UNLOCK_KEY = "oled-mode-unlocked";
const OLED_UNLOCK_TAPS = 10;
const OLED_HINT_AFTER_TAPS = 3;

function getOledUnlocked(): boolean {
  try {
    return localStorage.getItem(OLED_UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const navigate = useNavigate();
  const mode = useThemeStore((state) => state.mode);
  const accent = useThemeStore((state) => state.accent);
  const setMode = useThemeStore((state) => state.setMode);
  const setAccent = useThemeStore((state) => state.setAccent);
  const resetTheme = useThemeStore((state) => state.resetTheme);
  const clearPlayHistory = usePlayHistoryStore((state) => state.clearPlayHistory);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmDeleteAllData, setConfirmDeleteAllData] = useState(false);
  const [storageUsage, setStorageUsage] = useState<string | null>(null);
  const [dataInfoHover, setDataInfoHover] = useState(false);
  const [oledUnlocked, setOledUnlocked] = useState(false);
  const [darkTapCount, setDarkTapCount] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setConfirmClearHistory(false);
      setConfirmDeleteAllData(false);
      return;
    }
    setOledUnlocked(getOledUnlocked());
    setDarkTapCount(0);
    const getStorageUsage = async () => {
      try {
        if (navigator.storage?.estimate) {
          const { usage } = await navigator.storage.estimate();
          if (usage != null) {
            const mb = usage / (1024 * 1024);
            setStorageUsage(mb >= 1 ? `${mb.toFixed(2)} MB` : `${(usage / 1024).toFixed(2)} KB`);
          } else {
            setStorageUsage("—");
          }
        } else {
          setStorageUsage("—");
        }
      } catch {
        setStorageUsage("—");
      }
    };
    getStorageUsage();
  }, [isOpen]);

  const handleOpenWrapped = () => {
    onClose();
    navigate("/wrapped");
  };

  const handleClearPlayHistory = async () => {
    if (!confirmClearHistory) {
      setConfirmClearHistory(true);
      return;
    }
    await clearPlayHistory();
    setConfirmClearHistory(false);
    onClose();
  };

  const handleDeleteAllWebsiteData = async () => {
    if (!confirmDeleteAllData) {
      setConfirmDeleteAllData(true);
      return;
    }
    await trackDb.clear();
    await playlistDb.clear();
    await imageDb.clear();
    await playHistoryDb.clear();
    await themeDb.clear();
    await useLibraryStore.getState().hydrate();
    await usePlaylistStore.getState().hydrate();
    await usePlayHistoryStore.getState().hydrate();
    useThemeStore.getState().resetTheme();
    usePlayerStore.getState().clearQueue();
    setConfirmDeleteAllData(false);
    onClose();
  };

  return (
    <Modal title="Settings" isOpen={isOpen} onClose={onClose} className="settings-modal">
      <div className="settings-sections">
        <section className="settings-section">
          <h4 className="settings-section-title">Features</h4>
          <div className="settings-row">
            <span className="settings-row-label">Your Wrapped</span>
            <button
              type="button"
              className="secondary-button settings-row-action"
              onClick={handleOpenWrapped}
            >
              Open
            </button>
          </div>
          <p className="settings-description">
            See your listening stats, top tracks and artists by year.
          </p>
        </section>

        <section className="settings-section">
          <h4 className="settings-section-title">Appearance</h4>
          <div className="settings-row">
            <span className="settings-row-label">Theme</span>
            <div className="settings-theme-toggle-wrap">
              <div className="settings-theme-toggle">
                {oledUnlocked && (
                  <button
                    type="button"
                    className={mode === "oled" ? "primary-button" : "secondary-button"}
                    onClick={() => setMode("oled")}
                  >
                    OLED
                  </button>
                )}
                <button
                  type="button"
                  className={mode === "dark" ? "primary-button" : "secondary-button"}
                  onClick={() => {
                    setMode("dark");
                    const next = darkTapCount + 1;
                    setDarkTapCount(next);
                    if (next >= OLED_UNLOCK_TAPS) {
                      try {
                        localStorage.setItem(OLED_UNLOCK_KEY, "1");
                        setOledUnlocked(true);
                      } catch {}
                    }
                  }}
                >
                  Dark
                </button>
                <button
                  type="button"
                  className={mode === "light" ? "primary-button" : "secondary-button"}
                  onClick={() => setMode("light")}
                >
                  Light
                </button>
              </div>
              {!oledUnlocked && darkTapCount >= OLED_HINT_AFTER_TAPS && darkTapCount < OLED_UNLOCK_TAPS && (
                <span className="settings-oled-hint">
                  {OLED_UNLOCK_TAPS - darkTapCount} more to unlock OLED mode
                </span>
              )}
            </div>
          </div>
          <div className="settings-row">
            <span className="settings-row-label">Accent</span>
            <ColorPicker
              value={accent}
              onChange={setAccent}
              ariaLabel="Accent color"
            />
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-title-row">
            <h4 className="settings-section-title">Data</h4>
            <span
              className="settings-info-icon"
              onMouseEnter={() => setDataInfoHover(true)}
              onMouseLeave={() => setDataInfoHover(false)}
              aria-label="Data storage info"
            >
              i
              {dataInfoHover && (
                <span className="settings-info-tooltip" role="tooltip">
                  All data is stored locally in your browser. Nothing is sent to any server.
                  {storageUsage != null && ` Storage used: ${storageUsage}.`}
                </span>
              )}
            </span>
          </div>
          <div className="settings-row">
            <span className="settings-row-label">Play history</span>
            <button
              type="button"
              className={confirmClearHistory ? "danger-button settings-row-action" : "secondary-button settings-row-action"}
              onClick={handleClearPlayHistory}
            >
              {confirmClearHistory ? "Click again to clear" : "Clear history"}
            </button>
          </div>
          <p className="settings-description">
            Clear removes all play history. Wrapped stats will be reset. This cannot be undone.
          </p>
          <div className="settings-row">
            <span className="settings-row-label">Delete all website data</span>
            <button
              type="button"
              className={confirmDeleteAllData ? "danger-button settings-row-action" : "secondary-button settings-row-action"}
              onClick={handleDeleteAllWebsiteData}
            >
              {confirmDeleteAllData ? "Click again to delete all" : "Delete all data"}
            </button>
          </div>
          <p className="settings-description">
            Removes all tracks, playlists, images, play history, and resets theme. The app will be empty. This cannot be undone.
          </p>
        </section>
      </div>
    </Modal>
  );
};
