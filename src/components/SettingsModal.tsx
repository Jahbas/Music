import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useThemeStore } from "../stores/themeStore";
import { usePlayHistoryStore } from "../stores/playHistoryStore";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlaylistStore } from "../stores/playlistStore";
import { useProfileStore } from "../stores/profileStore";
import { useFolderStore } from "../stores/folderStore";
import { useProfileLikesStore } from "../stores/profileLikesStore";
import { usePlayerStore } from "../stores/playerStore";
import { useAudioSettingsStore } from "../stores/audioSettingsStore";
import type { EqPresetId } from "../stores/audioSettingsStore";
import { EqAdvancedGraph } from "./EqAdvancedGraph";
import { exportSettingsToJson, importSettingsFromJson } from "../utils/settingsBackup";
import { trackDb, playlistDb, imageDb, playHistoryDb, themeDb, folderDb, profileDb, profileLikesDb } from "../db/db";
import {
  getExpandPlaylistsOnFolderPlay,
  setExpandPlaylistsOnFolderPlay,
  getAutoPlayOnLoad,
  setAutoPlayOnLoad,
  getTelemetryEnabled,
  setTelemetryEnabled,
} from "../utils/preferences";
import { ColorPicker } from "./ColorPicker";

const OLED_UNLOCK_KEY = "oled-mode-unlocked";
const OLED_UNLOCK_TAPS = 10;
const OLED_HINT_AFTER_TAPS = 3;
const GITHUB_REPO_URL = "https://github.com/Jahbas/Music";

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
  type SettingsTabId = "general" | "appearance" | "profiles" | "audio" | "player" | "data" | "support";

  const SETTINGS_TABS: { id: SettingsTabId; label: string }[] = [
    { id: "general", label: "General" },
    { id: "appearance", label: "Appearance" },
    { id: "profiles", label: "Profiles" },
    { id: "audio", label: "Audio" },
    { id: "player", label: "Player" },
    { id: "data", label: "Data & privacy" },
    { id: "support", label: "Support" },
  ];

  const navigate = useNavigate();
  const mode = useThemeStore((state) => state.mode);
  const accent = useThemeStore((state) => state.accent);
  const density = useThemeStore((state) => state.density);
  const motion = useThemeStore((state) => state.motion);
  const profiles = useThemeStore((state) => state.profiles);
  const setMode = useThemeStore((state) => state.setMode);
  const setAccent = useThemeStore((state) => state.setAccent);
  const setDensity = useThemeStore((state) => state.setDensity);
  const setMotion = useThemeStore((state) => state.setMotion);
  const saveThemeProfile = useThemeStore((state) => state.saveProfile);
  const applyThemeProfile = useThemeStore((state) => state.applyProfile);
  const deleteThemeProfile = useThemeStore((state) => state.deleteProfile);
  const clearPlayHistory = usePlayHistoryStore((state) => state.clearPlayHistory);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmDeleteAllData, setConfirmDeleteAllData] = useState(false);
  const [storageUsage, setStorageUsage] = useState<string | null>(null);
  const [dataInfoHover, setDataInfoHover] = useState(false);
  const [oledUnlocked, setOledUnlocked] = useState(false);
  const [darkTapCount, setDarkTapCount] = useState(0);
  const [expandPlaylistsOnFolderPlay, setExpandPlaylistsOnFolderPlayState] = useState(true);
  const [autoPlayOnLoad, setAutoPlayOnLoadState] = useState(true);
  const [telemetryEnabled, setTelemetryEnabledState] = useState(false);
  const [isImportingSettings, setIsImportingSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");
  const [isEqPresetOpen, setIsEqPresetOpen] = useState(false);
  const [showAdvancedEq, setShowAdvancedEq] = useState(false);
  const eqPresetDropdownRef = useRef<HTMLDivElement | null>(null);

  const EQ_PRESETS: { id: EqPresetId; label: string }[] = [
    { id: "flat", label: "Flat" },
    { id: "bassBoost", label: "Bass boost" },
    { id: "trebleBoost", label: "Treble boost" },
    { id: "vocal", label: "Vocal" },
    { id: "loudness", label: "Loudness" },
  ];

  const crossfadeEnabled = useAudioSettingsStore((s) => s.crossfadeEnabled);
  const crossfadeMs = useAudioSettingsStore((s) => s.crossfadeMs);
  const gaplessEnabled = useAudioSettingsStore((s) => s.gaplessEnabled);
  const eqEnabled = useAudioSettingsStore((s) => s.eqEnabled);
  const eqPresetId = useAudioSettingsStore((s) => s.eqPresetId);
  const eqBands = useAudioSettingsStore((s) => s.eqBands);
  const setCrossfadeEnabled = useAudioSettingsStore((s) => s.setCrossfadeEnabled);
  const setCrossfadeMs = useAudioSettingsStore((s) => s.setCrossfadeMs);
  const setGaplessEnabled = useAudioSettingsStore((s) => s.setGaplessEnabled);
  const setEqEnabled = useAudioSettingsStore((s) => s.setEqEnabled);
  const setEqPresetId = useAudioSettingsStore((s) => s.setEqPresetId);
  const setEqBands = useAudioSettingsStore((s) => s.setEqBands);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const setShuffle = usePlayerStore((s) => s.setShuffle);
  const setRepeat = usePlayerStore((s) => s.setRepeat);

  useEffect(() => {
    if (!isOpen) {
      setConfirmClearHistory(false);
      setConfirmDeleteAllData(false);
      return;
    }
    setActiveTab("general");
    setOledUnlocked(getOledUnlocked());
    setDarkTapCount(0);
    setExpandPlaylistsOnFolderPlayState(getExpandPlaylistsOnFolderPlay());
    setAutoPlayOnLoadState(getAutoPlayOnLoad());
    setTelemetryEnabledState(getTelemetryEnabled());
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
    void getStorageUsage();
  }, [isOpen]);

  useEffect(() => {
    if (!isEqPresetOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (eqPresetDropdownRef.current && !eqPresetDropdownRef.current.contains(event.target as Node)) {
        setIsEqPresetOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEqPresetOpen]);

  const handleOpenWrapped = () => {
    onClose();
    navigate("/wrapped");
  };

  const handleOpenTelemetry = () => {
    onClose();
    navigate("/telemetry");
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
    await profileDb.clear();
    await folderDb.clear();
    await imageDb.clear();
    await playHistoryDb.clear();
    await profileLikesDb.clear();
    await themeDb.clear();
    await useLibraryStore.getState().hydrate();
    await usePlaylistStore.getState().hydrate();
    await useProfileStore.getState().hydrate();
    await useFolderStore.getState().hydrate();
    await usePlayHistoryStore.getState().hydrate();
    await useProfileLikesStore.getState().hydrate();
    useThemeStore.getState().resetTheme();
    usePlayerStore.getState().clearQueue();
    setConfirmDeleteAllData(false);
    onClose();
  };

  const [confirmDeleteUnusedTracks, setConfirmDeleteUnusedTracks] = useState(false);
  const [lastUnusedDeleteCount, setLastUnusedDeleteCount] = useState<number | null>(null);
  const [isSavingThemeProfile, setIsSavingThemeProfile] = useState(false);
  const [newThemeProfileName, setNewThemeProfileName] = useState("");

  const handleDeleteUnusedTracks = async () => {
    const libraryState = useLibraryStore.getState();
    const playlistState = usePlaylistStore.getState();
    const playerState = usePlayerStore.getState();

    const allTracks = libraryState.tracks;
    const playlists = playlistState.playlists;

    const usedTrackIds = new Set<string>();
    for (const playlist of playlists) {
      for (const id of playlist.trackIds) {
        usedTrackIds.add(id);
      }
    }
    for (const id of playerState.queue) {
      usedTrackIds.add(id);
    }
    if (playerState.currentTrackId) {
      usedTrackIds.add(playerState.currentTrackId);
    }

    const unusedTrackIds = allTracks
      .map((t) => t.id)
      .filter((id) => !usedTrackIds.has(id));

    if (!confirmDeleteUnusedTracks) {
      setLastUnusedDeleteCount(unusedTrackIds.length);
      setConfirmDeleteUnusedTracks(true);
      return;
    }

    for (const id of unusedTrackIds) {
      // removeTrack updates both IndexedDB and in-memory library state
      // and will no-op if the track was already removed.
      // eslint-disable-next-line no-await-in-loop
      await libraryState.removeTrack(id);
    }

    setConfirmDeleteUnusedTracks(false);
    setLastUnusedDeleteCount(null);
    await libraryState.hydrate();
  };

  const handleOpenGitHubStar = () => {
    try {
      window.open(GITHUB_REPO_URL, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = GITHUB_REPO_URL;
    }
  };

  if (!isOpen) {
    return null;
  }

  const renderGeneralTab = () => (
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
        <p className="settings-description">See your yearly listening stats.</p>
        <div className="settings-row">
          <span className="settings-row-label">Session & usage telemetry</span>
          <button
            type="button"
            className={`${telemetryEnabled ? "primary-button" : "secondary-button"} settings-row-action`}
            onClick={() => {
              const next = !telemetryEnabled;
              setTelemetryEnabled(next);
              setTelemetryEnabledState(next);
            }}
            aria-pressed={telemetryEnabled}
          >
            {telemetryEnabled ? "On" : "Off"}
          </button>
        </div>
        <p className="settings-description">
          Records visits, listening time, pages, searches, and player actions. Data stays in your browser.
        </p>
        <div className="settings-row">
          <span className="settings-row-label">Telemetry details</span>
          <button
            type="button"
            className="secondary-button settings-row-action"
            onClick={handleOpenTelemetry}
          >
            Open
          </button>
        </div>
        <p className="settings-description">Inspect local-only usage analytics and export telemetry as JSON.</p>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Folders</h4>
        <div className="settings-row">
          <span className="settings-row-label">Expand all playlists when playing folder</span>
          <button
            type="button"
            className={`${expandPlaylistsOnFolderPlay ? "primary-button" : "secondary-button"} settings-row-action`}
            onClick={() => {
              const next = !expandPlaylistsOnFolderPlay;
              setExpandPlaylistsOnFolderPlayState(next);
              setExpandPlaylistsOnFolderPlay(next);
            }}
            aria-pressed={expandPlaylistsOnFolderPlay}
          >
            {expandPlaylistsOnFolderPlay ? "On" : "Off"}
          </button>
        </div>
        <p className="settings-description">
          When on, Play on a folder expands every playlist inside it.
        </p>
      </section>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="settings-sections">
      <section className="settings-section">
        <h4 className="settings-section-title">Theme</h4>
        <div className="settings-row">
          <span className="settings-row-label">Mode</span>
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
                    } catch {
                      // ignore
                    }
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
        <h4 className="settings-section-title">Layout</h4>
        <div className="settings-row">
          <span className="settings-row-label">Density</span>
          <div className="settings-theme-toggle">
            <button
              type="button"
              className={density === "cozy" ? "primary-button" : "secondary-button"}
              onClick={() => setDensity("cozy")}
            >
              Cozy
            </button>
            <button
              type="button"
              className={density === "compact" ? "primary-button" : "secondary-button"}
              onClick={() => setDensity("compact")}
            >
              Compact
            </button>
          </div>
        </div>
        <p className="settings-description">
          Compact mode tightens paddings and row heights so you can see more tracks at once.
        </p>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Motion</h4>
        <div className="settings-row">
          <span className="settings-row-label">Reduce motion</span>
          <button
            type="button"
            className={`${motion === "reduced" ? "primary-button" : "secondary-button"} settings-row-action`}
            onClick={() => setMotion(motion === "reduced" ? "normal" : "reduced")}
            aria-pressed={motion === "reduced"}
          >
            {motion === "reduced" ? "On" : "Off"}
          </button>
        </div>
        <p className="settings-description">
          When on, most animations and transitions are minimized.
        </p>
      </section>
    </div>
  );

  const renderProfilesTab = () => (
    <div className="settings-sections">
      <section className="settings-section">
        <h4 className="settings-section-title">Profiles</h4>
        <p className="settings-description">
          Profiles capture theme, audio, player, and behavior settings so you can switch between setups quickly.
        </p>
        <div className="settings-row">
          <span className="settings-row-label">Save current as profile</span>
          <button
            type="button"
            className="secondary-button settings-row-action"
            onClick={() => {
              setNewThemeProfileName("");
              setIsSavingThemeProfile(true);
            }}
          >
            Save
          </button>
        </div>
        {isSavingThemeProfile && (
          <div
            className="settings-section"
            role="dialog"
            aria-modal="true"
            aria-label="Save profile"
          >
            <div className="form">
              <label>
                Name
                <input
                  type="text"
                  value={newThemeProfileName}
                  onChange={(event) => setNewThemeProfileName(event.target.value)}
                  autoFocus
                />
              </label>
              <div className="form-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    const trimmed = newThemeProfileName.trim();
                    if (!trimmed) {
                      return;
                    }
                    saveThemeProfile(trimmed);
                    setIsSavingThemeProfile(false);
                    setNewThemeProfileName("");
                  }}
                >
                  Save profile
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setIsSavingThemeProfile(false);
                    setNewThemeProfileName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {profiles.length > 0 && (
        <section className="settings-section">
          <h4 className="settings-section-title">Saved profiles</h4>
          <p className="settings-description">
            Apply a profile to switch theme, audio, player, and behavior settings in one step.
          </p>
          <div className="settings-theme-profiles-list">
            {profiles.map((profile) => (
              <div key={(profile as any).name ?? profile.mode} className="settings-row">
                <span className="settings-row-label">
                  {(profile as any).name ?? "Profile"}
                </span>
                <div className="settings-theme-toggle">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => applyThemeProfile((profile as any).name ?? "")}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => deleteThemeProfile((profile as any).name ?? "")}
                    aria-label={`Delete profile ${(profile as any).name ?? ""}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const renderAudioTab = () => (
    <div className="settings-sections">
      <section className="settings-section">
        <h4 className="settings-section-title">Playback</h4>
        <div className="settings-row">
          <span className="settings-row-label">
            Crossfade
            <span
              className="settings-experimental-icon"
              title="Experimental feature. If something sounds wrong or stops working, please report it on GitHub."
              aria-label="Crossfade is experimental. Please report issues on GitHub."
            >
              !
            </span>
          </span>
          <button
            type="button"
            className={crossfadeEnabled ? "primary-button" : "secondary-button"}
            onClick={() => setCrossfadeEnabled(!crossfadeEnabled)}
            aria-pressed={crossfadeEnabled}
          >
            {crossfadeEnabled ? "On" : "Off"}
          </button>
        </div>
        <p className="settings-description">
          Smoothly overlap the end of one track with the start of the next.
        </p>
        <p className="settings-description">
          Crossfade is experimental. If something sounds wrong or stops working, feedback is very welcome on GitHub.
        </p>
        <div className="settings-row settings-row-slider">
          <span className="settings-row-label">Crossfade length</span>
          <div className="settings-slider-wrap" style={{ ["--settings-crossfade-fill" as string]: `${(crossfadeMs / 12000) * 100}%` }}>
            <input
              className="settings-slider-input"
              type="range"
              min={0}
              max={12000}
              step={500}
              value={crossfadeMs}
              onChange={(event) => setCrossfadeMs(Number(event.target.value))}
              aria-label="Crossfade duration in milliseconds"
            />
            <span className="settings-slider-value">
              {crossfadeMs === 0 ? "Off" : `${(crossfadeMs / 1000).toFixed(1)} s`}
            </span>
          </div>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Gapless playback</span>
          <button
            type="button"
            className={gaplessEnabled ? "primary-button" : "secondary-button"}
            onClick={() => setGaplessEnabled(!gaplessEnabled)}
            aria-pressed={gaplessEnabled}
          >
            {gaplessEnabled ? "On" : "Off"}
          </button>
        </div>
        <p className="settings-description">
          Best-effort to minimize gaps between tracks. Exact behavior may vary by file and browser.
        </p>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Equalizer</h4>
        <div className="settings-row">
          <span className="settings-row-label">EQ</span>
          <button
            type="button"
            className={`${eqEnabled ? "primary-button" : "secondary-button"} settings-row-action`}
            onClick={() => setEqEnabled(!eqEnabled)}
            aria-pressed={eqEnabled}
          >
            {eqEnabled ? "On" : "Off"}
          </button>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">Preset</span>
          <div className="settings-select-wrap">
            <div className="form-select" ref={eqPresetDropdownRef}>
              <button
                type="button"
                className="form-select-trigger"
                onClick={() => setIsEqPresetOpen((previous) => !previous)}
                aria-haspopup="listbox"
                aria-expanded={isEqPresetOpen}
                aria-label="Equalizer preset"
              >
                <span className="form-select-value">
                  {EQ_PRESETS.find((preset) => preset.id === eqPresetId)?.label ?? "Flat"}
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
              {isEqPresetOpen && (
                <div className="form-select-menu" role="listbox">
                  {EQ_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`form-select-option ${
                        preset.id === eqPresetId ? "form-select-option--selected" : ""
                      }`}
                      onClick={() => {
                        setEqPresetId(preset.id);
                        setIsEqPresetOpen(false);
                      }}
                      role="option"
                      aria-selected={preset.id === eqPresetId}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="settings-description">
          Presets are applied per device and work best with the crossfade audio engine.
        </p>
        <div className="settings-row">
          <span className="settings-row-label">Advanced controls</span>
          <button
            type="button"
            className={`${showAdvancedEq ? "primary-button" : "secondary-button"} settings-row-action`}
            onClick={() => setShowAdvancedEq(!showAdvancedEq)}
            aria-pressed={showAdvancedEq}
          >
            {showAdvancedEq ? "Hide" : "Show"}
          </button>
        </div>
        {showAdvancedEq && (
          <EqAdvancedGraph
            bands={eqBands}
            onChangeBands={setEqBands}
            onResetToPreset={() => {
              setEqPresetId(eqPresetId);
            }}
          />
        )}
      </section>
    </div>
  );

  const renderDataTab = () => (
    <div className="settings-sections">
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
          </span>
        </div>
        {dataInfoHover && (
          <div
            className="settings-info-panel settings-info-panel--data"
            role="tooltip"
            onMouseEnter={() => setDataInfoHover(true)}
            onMouseLeave={() => setDataInfoHover(false)}
          >
            <p className="settings-info-title">How your data is stored</p>
            <p className="settings-info-body">
              All of your tracks, playlists, profiles, folders, images, play history, and settings are stored locally in
              this browser. Nothing is sent to any server or cloud.
            </p>
            {storageUsage != null && (
              <p className="settings-info-meta">
                <span className="settings-info-meta-label">Current storage used:</span> {storageUsage}
              </p>
            )}
            <p className="settings-info-footnote">
              Clearing history or deleting website data only affects this browser profile on this device.
            </p>
          </div>
        )}
        <p className="settings-description">
          Manage history and storage for this browser.
        </p>
        <div className="settings-row">
          <span className="settings-row-label">Export settings</span>
          <button
            type="button"
            className="secondary-button settings-row-action"
            onClick={() => {
              const json = exportSettingsToJson();
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "music-settings.json";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
          >
            Download JSON
          </button>
        </div>
        <p className="settings-description">
          Saves theme, audio settings, player preferences, and library structure (folders and playlists) to a JSON file.
        </p>
        <div className="settings-row">
          <span className="settings-row-label">Import settings</span>
          <button
            type="button"
            className="secondary-button settings-row-action"
            disabled={isImportingSettings}
            onClick={() => {
              setIsImportingSettings(true);
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          >
            Choose file
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
              setIsImportingSettings(false);
              return;
            }
            try {
              const text = await file.text();
              await importSettingsFromJson(text);
            } catch {
              // ignore invalid files
            } finally {
              setIsImportingSettings(false);
              event.target.value = "";
            }
          }}
        />
        <p className="settings-description">
          Imports settings from a JSON file created by Music on this device. Tracks and audio files are not included.
        </p>
        <div className="modal-danger-zone">
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
            Removes all play history and resets Wrapped. This cannot be undone.
          </p>
          <div className="settings-row">
            <span className="settings-row-label">Delete unused tracks</span>
            <button
              type="button"
              className={confirmDeleteUnusedTracks ? "danger-button settings-row-action" : "secondary-button settings-row-action"}
              onClick={handleDeleteUnusedTracks}
            >
              {confirmDeleteUnusedTracks
                ? lastUnusedDeleteCount != null && lastUnusedDeleteCount > 0
                  ? `Click again to delete ${lastUnusedDeleteCount} track${lastUnusedDeleteCount === 1 ? "" : "s"}`
                  : "Click again to delete"
                : "Delete unused tracks"}
            </button>
          </div>
          <p className="settings-description">
            Removes tracks that are not in any playlist and not in the current queue. This cannot be undone.
          </p>
          <div className="settings-row">
            <span className="settings-row-label">Delete all website data</span>
            <button
              type="button"
              className={confirmDeleteAllData ? "danger-button settings-row-action" : "secondary-button settings-row-action"}
              onClick={handleDeleteAllWebsiteData}
            >
              {confirmDeleteAllData ? "Click again to delete" : "Delete everything"}
            </button>
          </div>
          <p className="settings-description">
            Removes tracks, playlists, profiles, folders, images, play history, and resets theme. The app will be empty.
          </p>
        </div>
      </section>
    </div>
  );

  const renderSupportTab = () => (
    <div className="settings-sections">
      <section className="settings-section">
        <h4 className="settings-section-title">Support</h4>
        <div className="settings-row">
          <span className="settings-row-label">Star on GitHub</span>
          <button
            type="button"
            className="secondary-button settings-row-action support-rainbow-button"
            onClick={handleOpenGitHubStar}
            title={GITHUB_REPO_URL}
            aria-label="Open GitHub to star the project"
          >
            Open
          </button>
        </div>
        <p className="settings-description">
          If you like Music, starring it helps other people find it.
        </p>
      </section>
    </div>
  );

  const renderPlayerTab = () => (
    <div className="settings-sections">
      <section className="settings-section">
        <h4 className="settings-section-title">Playback behavior</h4>
        <div className="settings-row">
          <span className="settings-row-label">Default shuffle</span>
          <button
            type="button"
            className={`${shuffle ? "primary-button" : "secondary-button"} settings-row-action`}
            onClick={() => setShuffle(!shuffle)}
            aria-pressed={shuffle}
          >
            {shuffle ? "On" : "Off"}
          </button>
        </div>
        <p className="settings-description">
          Controls whether new queues start in shuffle mode by default.
        </p>
        <div className="settings-row">
          <span className="settings-row-label">Default repeat mode</span>
          <div className="settings-theme-toggle">
            <button
              type="button"
              className={repeat === "off" ? "primary-button" : "secondary-button"}
              onClick={() => setRepeat("off")}
            >
              Off
            </button>
            <button
              type="button"
              className={repeat === "queue" ? "primary-button" : "secondary-button"}
              onClick={() => setRepeat("queue")}
            >
              Queue
            </button>
            <button
              type="button"
              className={repeat === "track" ? "primary-button" : "secondary-button"}
              onClick={() => setRepeat("track")}
            >
              Track
            </button>
          </div>
        </div>
        <p className="settings-description">
          New listening sessions use this repeat mode unless you change it in the player.
        </p>
        <div className="settings-row">
          <span className="settings-row-label">Resume playback on app load</span>
          <button
            type="button"
            className={`${autoPlayOnLoad ? "primary-button" : "secondary-button"} settings-row-action`}
            onClick={() => {
              const next = !autoPlayOnLoad;
              setAutoPlayOnLoadState(next);
              setAutoPlayOnLoad(next);
            }}
            aria-pressed={autoPlayOnLoad}
          >
            {autoPlayOnLoad ? "On" : "Off"}
          </button>
        </div>
        <p className="settings-description">
          When on, the last track and position resume automatically when you open Music.
        </p>
      </section>
    </div>
  );

  let content: JSX.Element;
  if (activeTab === "general") {
    content = renderGeneralTab();
  } else if (activeTab === "appearance") {
    content = renderAppearanceTab();
  } else if (activeTab === "profiles") {
    content = renderProfilesTab();
  } else if (activeTab === "audio") {
    content = renderAudioTab();
  } else if (activeTab === "player") {
    content = renderPlayerTab();
  } else if (activeTab === "data") {
    content = renderDataTab();
  } else {
    content = renderSupportTab();
  }

  return (
    <div className="settings-fullscreen-backdrop" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="settings-fullscreen">
        <header className="settings-fullscreen-header">
          <div>
            <h2 className="settings-fullscreen-title">Settings</h2>
            <p className="settings-fullscreen-subtitle">
              Tune how Music looks, sounds, and stores data.
            </p>
          </div>
          <button
            type="button"
            className="ghost-button settings-fullscreen-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </header>
        <div className="settings-fullscreen-body">
          <nav className="settings-tabs" aria-label="Settings sections">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`settings-tab${activeTab === tab.id ? " settings-tab--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <main className="settings-content">
            {content}
          </main>
        </div>
      </div>
    </div>
  );
};
