import type { AnimPhase } from '../../store/useSimStore';

// 0 → sky blue (#6aace0), 1 → warm amber (#d49a3a)
function weightToColor(w: number): string {
  const clamped = Math.max(-2, Math.min(2, w));
  const t = (clamped + 2) / 4;
  const r = Math.round(106 + t * (212 - 106));
  const g = Math.round(172 + t * (154 - 172));
  const b = Math.round(224 + t * (58  - 224));
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
  const color = isActive ? '#78d4a8' : weightToColor(weight);

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
