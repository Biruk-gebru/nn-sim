import { motion } from 'framer-motion';
import { useSimStore, ARCHITECTURE } from '../../store/useSimStore';
import type { AnimPhase } from '../../store/useSimStore';
import type { NeuronPos } from './NetworkGraph';

function activationToColor(a: number | null): string {
  if (a === null) return '#1e1e2e';
  const t = Math.max(0, Math.min(1, a));
  const r = Math.round(10 + t * 0);
  const g = Math.round(20 + t * 225);
  const b = Math.round(30 + t * 225);
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
  const { selectedNeuron, setSelectedNeuron } = useSimStore();
  const isSelected = selectedNeuron?.layer === pos.layer && selectedNeuron?.neuron === pos.neuron;
  const isInput = pos.layer === 0;

  const isFlashing =
    (animPhase === 'forward' && animWaveIdx === pos.layer - 1) ||
    (animPhase === 'backward' && animWaveIdx === pos.layer - 1);

  const fill = activationToColor(postActivation);
  const glowColor = postActivation !== null && postActivation > 0.5 ? '#00f5ff' : '#4488ff';
  const glowStrength = postActivation !== null ? Math.round(postActivation * 16) : 2;

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

  return (
    <g
      onClick={handleClick}
      onMouseEnter={() => onHover(pos.layer, pos.neuron)}
      onMouseLeave={onHoverEnd}
      style={{ cursor: isInput ? 'crosshair' : 'pointer' }}
    >
      {isSelected && (
        <circle cx={pos.x} cy={pos.y} r={radius + 6} fill="none" stroke="#00f5ff" strokeWidth={2} opacity={0.6} />
      )}

      {/* Hover ring */}
      <circle cx={pos.x} cy={pos.y} r={radius + 10} fill="transparent" />

      <motion.circle
        cx={pos.x}
        cy={pos.y}
        r={radius}
        fill={fill}
        stroke={isSelected ? '#00f5ff' : '#2a2a3e'}
        strokeWidth={isSelected ? 2 : 1}
        style={{ filter: `drop-shadow(0 0 ${glowStrength}px ${glowColor})`, transition: 'fill 0.4s' }}
        animate={isFlashing ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      />

      {pos.neuron === 0 && (
        <text x={pos.x} y={pos.y - radius - 10} textAnchor="middle" fontSize={11} fill="#606070">
          {pos.layer === 0 ? 'Input' : pos.layer === ARCHITECTURE.length - 1 ? 'Output' : 'Hidden'}
        </text>
      )}

      <text
        x={pos.x}
        y={pos.y + 4}
        textAnchor="middle"
        fontSize={10}
        fill={postActivation !== null && postActivation > 0.5 ? '#000' : '#aaa'}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {labelText}
      </text>
    </g>
  );
}
