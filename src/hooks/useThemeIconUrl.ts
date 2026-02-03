import { useEffect, useState } from "react";
import { imageDb } from "../db/db";

const ICONIFY_BASE = "https://api.iconify.design";
const THEME_ICON_IDS = { sun: "theme-icon-sun", moon: "theme-icon-moon" } as const;
const THEME_ICON_API = {
  sun: `${ICONIFY_BASE}/mdi/weather-sunny.svg`,
  moon: `${ICONIFY_BASE}/mdi/weather-night.svg`,
} as const;

export type ThemeIconType = "sun" | "moon";

async function fetchAndCacheIcon(icon: ThemeIconType): Promise<Blob> {
  const id = THEME_ICON_IDS[icon];
  const cached = await imageDb.get(id);
  if (cached) return cached.blob;
  const res = await fetch(THEME_ICON_API[icon]);
  if (!res.ok) throw new Error(`Failed to fetch theme icon: ${res.status}`);
  const blob = await res.blob();
  await imageDb.put(id, blob);
  return blob;
}

export function useThemeIconUrl(icon: ThemeIconType): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    const load = async () => {
      try {
        const blob = await fetchAndCacheIcon(icon);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (active) setUrl(null);
      }
    };
    void load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [icon]);

  return url;
}
