import type { AnimPhase } from '../../store/useSimStore';

function weightToColor(w: number): string {
  const clamped = Math.max(-2, Math.min(2, w));
  const t = (clamped + 2) / 4; // 0 = blue (#5b8fa6), 1 = orange (#d4943a)
  const r = Math.round(91  + t * (212 - 91));
  const g = Math.round(143 + t * (148 - 143));
  const b = Math.round(166 + t * (58  - 166));
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
  const color = isActive ? '#4ecdc4' : weightToColor(weight);

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
