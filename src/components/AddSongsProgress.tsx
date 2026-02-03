import { useEffect, useState } from "react";
import { useLibraryStore } from "../stores/libraryStore";

function formatEta(ms: number): string {
  if (ms < 1000) return "less than a second";
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `About ${sec}s left`;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  if (s === 0) return `About ${min}m left`;
  return `About ${min}m ${s}s left`;
}

export const AddSongsProgress = () => {
  const addProgress = useLibraryStore((state) => state.addProgress);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!addProgress) return;
    const interval = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(interval);
  }, [addProgress]);

  if (!addProgress) return null;

  const { total, loaded, startedAt } = addProgress;
  const elapsed = Date.now() - startedAt;
  const rate = loaded > 0 ? loaded / elapsed : 0;
  const etaMs = rate > 0 && loaded < total ? (total - loaded) / rate : 0;
  const percent = total > 0 ? Math.min(100, (loaded / total) * 100) : 0;

  return (
    <div className="add-songs-progress-backdrop" role="status" aria-live="polite">
      <div className="add-songs-progress-card">
        <div className="add-songs-progress-title">Adding songs…</div>
        <div className="add-songs-progress-stats">
          <span>
            {loaded} of {total} loaded
          </span>
          {loaded < total && rate > 0 && (
            <span className="add-songs-progress-eta">
              {formatEta(etaMs)}
            </span>
          )}
        </div>
        <div className="add-songs-progress-bar-wrap">
          <div
            className="add-songs-progress-bar-fill"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
