import { useThemeStore } from "../stores/themeStore";
import { useThemeIconUrl, type ThemeIconType } from "../hooks/useThemeIconUrl";

export const ThemeSwitcher = () => {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const isDarkOrOled = mode === "dark" || mode === "oled";
  const iconType: ThemeIconType = isDarkOrOled ? "moon" : "sun";
  const iconUrl = useThemeIconUrl(iconType);

  const toggle = () => setMode(mode === "light" ? "dark" : "light");

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      title={isDarkOrOled ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDarkOrOled ? "Switch to light mode" : "Switch to dark mode"}
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" width={20} height={20} className="theme-toggle-icon" />
      ) : (
        <span className="theme-toggle-placeholder" />
      )}
    </button>
  );
};
