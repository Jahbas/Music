import { useState, useRef, useEffect } from "react";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  return {
    r: parseInt(m[1], 16) / 255,
    g: parseInt(m[2], 16) / 255,
    b: parseInt(m[3], 16) / 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (x: number) => {
    const n = Math.round(Math.max(0, Math.min(1, x)) * 255);
    return n.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r, g, b };
}

function parseHex(input: string): string | null {
  const cleaned = input.replace(/^#/, "").trim();
  if (/^[a-fA-F0-9]{6}$/.test(cleaned)) return `#${cleaned}`;
  if (/^[a-fA-F0-9]{3}$/.test(cleaned)) {
    const r = cleaned[0] + cleaned[0];
    const g = cleaned[1] + cleaned[1];
    const b = cleaned[2] + cleaned[2];
    return `#${r}${g}${b}`;
  }
  return null;
}

const DEFAULT_HEX = "#1db954";

type ColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  ariaLabel?: string;
};

export const ColorPicker = ({
  value,
  onChange,
  ariaLabel = "Color",
}: ColorPickerProps) => {
  const hex = value && /^#[a-fA-F0-9]{6}$/.test(value) ? value : DEFAULT_HEX;
  const rgb = hexToRgb(hex) ?? hexToRgb(DEFAULT_HEX)!;
  const [h, s, l] = (() => {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return [hsl.h, hsl.s, hsl.l];
  })();

  const [open, setOpen] = useState(false);
  const [localH, setLocalH] = useState(h);
  const [localS, setLocalS] = useState(s);
  const [localL, setLocalL] = useState(l);
  const [hexInput, setHexInput] = useState(hex);
  const popoverRef = useRef<HTMLDivElement>(null);
  const swatchRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setLocalH(h);
    setLocalS(s);
    setLocalL(l);
    setHexInput(hex);
  }, [open, h, s, l, hex]);

  const syncFromHsl = (nh: number, ns: number, nl: number) => {
    setLocalH(nh);
    setLocalS(ns);
    setLocalL(nl);
    const { r, g, b } = hslToRgb(nh, ns, nl);
    const newHex = rgbToHex(r, g, b);
    setHexInput(newHex);
    onChange(newHex);
  };

  const handleHexBlur = () => {
    const parsed = parseHex(hexInput);
    if (parsed) {
      onChange(parsed);
      const r = hexToRgb(parsed)!;
      const hsl = rgbToHsl(r.r, r.g, r.b);
      setLocalH(hsl.h);
      setLocalS(hsl.s);
      setLocalL(hsl.l);
      setHexInput(parsed);
    } else {
      setHexInput(hex);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        swatchRef.current &&
        !swatchRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="color-picker">
      <div className="color-picker-row">
        <button
          ref={swatchRef}
          type="button"
          className="color-picker-swatch"
          style={{ backgroundColor: hex }}
          onClick={() => setOpen((o) => !o)}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="dialog"
        />
        <input
          type="text"
          className="color-picker-hex"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value)}
          onBlur={handleHexBlur}
          placeholder="#1db954"
          aria-label={`${ariaLabel} hex value`}
        />
      </div>
      {open && (
        <div ref={popoverRef} className="color-picker-popover" role="dialog" aria-label="Color picker">
          <div className="color-picker-preview" style={{ backgroundColor: hex }} />
          <div className="color-picker-sliders">
            <label className="color-picker-slider-label">
              <span>Hue</span>
              <input
                type="range"
                min={0}
                max={360}
                value={Math.round(localH)}
                onChange={(e) => syncFromHsl(Number(e.target.value), localS, localL)}
              />
            </label>
            <label className="color-picker-slider-label">
              <span>Saturation</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(localS)}
                onChange={(e) => syncFromHsl(localH, Number(e.target.value), localL)}
              />
            </label>
            <label className="color-picker-slider-label">
              <span>Lightness</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(localL)}
                onChange={(e) => syncFromHsl(localH, localS, Number(e.target.value))}
              />
            </label>
          </div>
          <div className="color-picker-popover-hex">
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={handleHexBlur}
              placeholder="#1db954"
              className="color-picker-hex-inline"
            />
          </div>
        </div>
      )}
    </div>
  );
};
