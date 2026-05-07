import type { AnimPhase } from '../../store/useSimStore';

function weightToColor(w: number): string {
  const clamped = Math.max(-2, Math.min(2, w));
  const t = (clamped + 2) / 4; // 0 = blue, 1 = orange
  const r = Math.round(68 + t * (255 - 68));
  const g = Math.round(136 + t * (140 - 136));
  const b = Math.round(255 + t * (0 - 255));
  return `rgb(${r},${g},${b})`;
}

interface Props {
  x1: number; y1: number; x2: number; y2: number;
  weight: number;
  wave: number;
  animPhase: AnimPhase;
  animWaveIdx: number;
}

export function EdgeLink({ x1, y1, x2, y2, weight, wave, animPhase, animWaveIdx }: Props) {
  const isActive =
    (animPhase === 'forward' && animWaveIdx === wave) ||
    (animPhase === 'backward' && animWaveIdx === wave);

  const opacity = 0.2 + Math.min(0.7, Math.abs(weight) * 0.35);
  const strokeWidth = 0.5 + Math.min(2.5, Math.abs(weight) * 0.8);
  const color = isActive ? '#00f5ff' : weightToColor(weight);

  // Cubic bezier for nicer look
  const mx = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;

  return (
    <path
      d={d}
      stroke={color}
      strokeWidth={strokeWidth}
      opacity={opacity}
      fill="none"
      style={{ transition: 'stroke 0.4s, opacity 0.3s' }}
    />
  );
}
