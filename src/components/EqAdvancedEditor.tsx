import type { EqBand } from "../stores/audioSettingsStore";

type EqAdvancedEditorProps = {
  bands: EqBand[];
  onChangeBands: (next: EqBand[]) => void;
  onResetToPreset: () => void;
};

export const EqAdvancedEditor = ({ bands, onChangeBands, onResetToPreset }: EqAdvancedEditorProps) => {
  const handleGainChange = (index: number, gain: number) => {
    const next = bands.map((band, i) => (i === index ? { ...band, gain } : band));
    onChangeBands(next);
  };

  const handleQChange = (index: number, q: number) => {
    const next = bands.map((band, i) => (i === index ? { ...band, q } : band));
    onChangeBands(next);
  };

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
      <p className="settings-description">
        Fine-tune each band per device. Changes apply on top of the selected preset.
      </p>
      <div className="settings-eq-advanced-grid">
        {bands.map((band, index) => (
          <div key={band.frequency} className="settings-eq-band">
            <div className="settings-eq-band-header">
              <span className="settings-eq-band-frequency">{band.frequency.toFixed(0)} Hz</span>
            </div>
            <label className="settings-eq-band-control">
              <span className="settings-eq-band-label">Gain</span>
              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={band.gain}
                onChange={(event) => handleGainChange(index, Number(event.target.value))}
                aria-label={`Gain for ${band.frequency.toFixed(0)} Hz`}
              />
              <span className="settings-eq-band-value">
                {band.gain > 0 ? `+${band.gain.toFixed(1)} dB` : `${band.gain.toFixed(1)} dB`}
              </span>
            </label>
            <label className="settings-eq-band-control">
              <span className="settings-eq-band-label">Q</span>
              <input
                type="range"
                min={0.3}
                max={4}
                step={0.1}
                value={band.q}
                onChange={(event) => handleQChange(index, Number(event.target.value))}
                aria-label={`Q for ${band.frequency.toFixed(0)} Hz`}
              />
              <span className="settings-eq-band-value">{band.q.toFixed(1)}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

