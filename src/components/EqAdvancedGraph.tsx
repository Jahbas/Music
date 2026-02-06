import { useEffect, useRef, useState } from "react";
import type { EqBand } from "../stores/audioSettingsStore";

type EqAdvancedGraphProps = {
  bands: EqBand[];
  onChangeBands: (next: EqBand[]) => void;
  onResetToPreset: () => void;
};

const MIN_GAIN = -12;
const MAX_GAIN = 12;
const GRAPH_WIDTH = 960;
const GRAPH_HEIGHT = 220;
const PADDING_LEFT = 32;
const PADDING_RIGHT = 32;
const PADDING_TOP = 18;
const PADDING_BOTTOM = 28;

export const EqAdvancedGraph = ({ bands, onChangeBands, onResetToPreset }: EqAdvancedGraphProps) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const sortedBands = [...bands].sort((a, b) => a.frequency - b.frequency);

  const minFreq = sortedBands[0]?.frequency ?? 60;
  const maxFreq = sortedBands[sortedBands.length - 1]?.frequency ?? 10000;

  const gainToY = (gain: number) => {
    const clamped = Math.min(MAX_GAIN, Math.max(MIN_GAIN, gain));
    const range = MAX_GAIN - MIN_GAIN;
    const normalized = (MAX_GAIN - clamped) / range;
    const innerHeight = GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    return PADDING_TOP + normalized * innerHeight;
  };

  const yToGain = (y: number) => {
    const innerHeight = GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const clampedY = Math.min(PADDING_TOP + innerHeight, Math.max(PADDING_TOP, y));
    const normalized = (clampedY - PADDING_TOP) / innerHeight;
    const gain = MAX_GAIN - normalized * (MAX_GAIN - MIN_GAIN);
    const rounded = Math.round(gain * 10) / 10;
    return Math.min(MAX_GAIN, Math.max(MIN_GAIN, rounded));
  };

  const indexToX = (index: number, count: number) => {
    const innerWidth = GRAPH_WIDTH - PADDING_LEFT - PADDING_RIGHT;
    if (count <= 1) {
      return PADDING_LEFT + innerWidth / 2;
    }
    const t = index / (count - 1);
    return PADDING_LEFT + t * innerWidth;
  };

  const handlePointerDown = (event: React.MouseEvent<SVGCircleElement>, index: number) => {
    event.preventDefault();
    setDragIndex(index);
  };

  useEffect(() => {
    if (dragIndex == null) {
      return;
    }

    const handleMove = (event: MouseEvent) => {
      if (dragIndex == null) return;
      if (!svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const y = event.clientY - rect.top;
      const nextGain = yToGain(y);

      const bandId = sortedBands[dragIndex]?.frequency;
      if (bandId == null) return;

      const next = bands.map((band) =>
        band.frequency === bandId ? { ...band, gain: nextGain } : band
      );
      onChangeBands(next);
    };

    const handleUp = () => {
      setDragIndex(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [bands, dragIndex, onChangeBands, sortedBands]);

  const points = sortedBands.map((band, index) => ({
    x: indexToX(index, sortedBands.length),
    y: gainToY(band.gain),
    band,
  }));

  const pathD =
    points.length > 0
      ? points
          .map((point, index) =>
            index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
          )
          .join(" ")
      : "";

  const areaPathD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${gainToY(MIN_GAIN)} L ${
          points[0].x
        } ${gainToY(MIN_GAIN)} Z`
      : "";

  return (
    <div className="settings-eq-advanced">
      <div className="settings-row settings-row--between">
        <span className="settings-row-label">Advanced EQ</span>
        <button
          type="button"
          className="secondary-button settings-row-action"
          onClick={onResetToPreset}
        >
          Reset to preset
        </button>
      </div>
      <p className="settings-description">Drag the points on the curve to shape your sound.</p>
      <svg
        ref={svgRef}
        width="100%"
        height={GRAPH_HEIGHT}
        viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Advanced equalizer graph"
        className="settings-eq-graph"
      >
        <defs>
          <linearGradient id="eq-advanced-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent, currentColor)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--color-accent, currentColor)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <line
          x1={PADDING_LEFT}
          y1={gainToY(0)}
          x2={GRAPH_WIDTH - PADDING_RIGHT}
          y2={gainToY(0)}
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth={1}
        />
        <line
          x1={PADDING_LEFT}
          y1={gainToY(MAX_GAIN)}
          x2={GRAPH_WIDTH - PADDING_RIGHT}
          y2={gainToY(MAX_GAIN)}
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <line
          x1={PADDING_LEFT}
          y1={gainToY(MIN_GAIN)}
          x2={GRAPH_WIDTH - PADDING_RIGHT}
          y2={gainToY(MIN_GAIN)}
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {sortedBands.map((band, index) => {
          const x = indexToX(index, sortedBands.length);
          return (
            <line
              key={`grid-${band.frequency}`}
              x1={x}
              y1={PADDING_TOP}
              x2={x}
              y2={GRAPH_HEIGHT - PADDING_BOTTOM}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth={1}
              strokeDasharray="3 5"
            />
          );
        })}

        {areaPathD && (
          <path d={areaPathD} fill="url(#eq-advanced-fill)" stroke="none" />
        )}

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--color-accent, currentColor)"
            strokeWidth={2}
            strokeOpacity="0.95"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((point, index) => (
          <g key={point.band.frequency}>
            <circle
              cx={point.x}
              cy={point.y}
              r={5}
              fill="var(--color-accent, currentColor)"
              fillOpacity={dragIndex === index ? 1 : 0.95}
              stroke="rgba(0,0,0,0.7)"
              strokeWidth={0.75}
              onMouseDown={(event) => handlePointerDown(event, index)}
            />
          </g>
        ))}

        {sortedBands.map((band, index) => {
          const x = indexToX(index, sortedBands.length);
          return (
            <text
              key={`label-${band.frequency}`}
              x={x}
              y={GRAPH_HEIGHT - 6}
              fontSize="9"
              textAnchor="middle"
              fill="#ffffff"
            >
              {band.frequency >= 1000
                ? band.frequency === 1000
                  ? "1k"
                  : `${Math.round(band.frequency / 1000)}k`
                : `${Math.round(band.frequency)}`}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

