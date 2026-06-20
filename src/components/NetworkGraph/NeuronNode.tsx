import { motion } from 'framer-motion';
import { useSimStore } from '../../store/useSimStore';
import type { AnimPhase } from '../../store/useSimStore';
import type { NeuronPos } from './NetworkGraph';

// 0 → surface-alt (#2e2418), 1 → warm mint (#78d4a8)
function activationToColor(a: number | null): string {
  if (a === null) return '#2e2418';
  const t = Math.max(0, Math.min(1, a));
  const r = Math.round(46  + t * (120 - 46));
  const g = Math.round(36  + t * (212 - 36));
  const b = Math.round(24  + t * (168 - 24));
  return `rgb(${r},${g},${b})`;
}

interface Props {
  pos: NeuronPos;
  radius: number;
  postActivation: number | null;
  delta: number | null;
  animPhase: AnimPhase;
  animWaveIdx: number;
  onHover: (layer: number, neuron: number) => void;
  onHoverEnd: () => void;
}

export function NeuronNode({ pos, radius, postActivation, delta, animPhase, animWaveIdx, onHover, onHoverEnd }: Props) {
  const { selectedNeuron, setSelectedNeuron, architecture } = useSimStore();
  const isSelected = selectedNeuron?.layer === pos.layer && selectedNeuron?.neuron === pos.neuron;
  const isInput = pos.layer === 0;
  const isFlashing = animWaveIdx === pos.layer - 1;

  const fill = activationToColor(postActivation);
  // glow: warm mint (high) or sky blue (low)
  const glowColor = postActivation !== null && postActivation > 0.5 ? '#78d4a8' : '#6aace0';
  const glowStrength = postActivation !== null ? Math.round(postActivation * 14) : 2;

  const handleClick = () => {
    if (isInput) return;
    if (isSelected) setSelectedNeuron(null);
    else setSelectedNeuron({ layer: pos.layer, neuron: pos.neuron });
  };

  const labelText =
    animPhase === 'backward' && delta !== null
      ? delta.toFixed(3)
      : postActivation !== null
      ? postActivation.toFixed(3)
      : '';

  // dark brown on bright mint fill, warm cream on dark fill
  const textColor = postActivation !== null && postActivation > 0.6 ? '#1c140d' : '#b8a882';

  return (
    <g
      onClick={handleClick}
      onMouseEnter={() => onHover(pos.layer, pos.neuron)}
      onMouseLeave={onHoverEnd}
      style={{ cursor: isInput ? 'crosshair' : 'pointer' }}
    >
      {isSelected && (
        <circle cx={pos.x} cy={pos.y} r={radius + 6} fill="none" stroke="#cbe86b" strokeWidth={2} opacity={0.6} />
      )}
      <circle cx={pos.x} cy={pos.y} r={radius + 10} fill="transparent" />

      <motion.circle
        cx={pos.x}
        cy={pos.y}
        r={radius}
        fill={fill}
        stroke={isSelected ? '#cbe86b' : 'rgba(242,233,225,0.18)'}
        strokeWidth={isSelected ? 2 : 1}
        style={{ filter: `drop-shadow(0 0 ${glowStrength}px ${glowColor})`, transition: 'fill 0.4s' }}
        animate={isFlashing ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      />

      {pos.neuron === 0 && (
        <text x={pos.x} y={pos.y - radius - 10} textAnchor="middle" fontSize={11} fill="var(--text-dim)">
          {pos.layer === 0 ? 'Input' : pos.layer === architecture.length - 1 ? 'Output' : 'Hidden'}
        </text>
      )}

      <text
        x={pos.x}
        y={pos.y + 4}
        textAnchor="middle"
        fontSize={10}
        fill={textColor}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {labelText}
      </text>
    </g>
  );
}
