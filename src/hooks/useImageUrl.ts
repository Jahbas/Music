import { useEffect, useState } from "react";
import { imageDb } from "../db/db";

export const useImageUrl = (imageId?: string) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    const load = async () => {
      if (!imageId) {
        setUrl(null);
        return;
      }
      const entry = await imageDb.get(imageId);
      if (!entry || !active) {
        return;
      }
      objectUrl = URL.createObjectURL(entry.blob);
      setUrl(objectUrl);
    };
    void load();
    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageId]);

  return url;
};
