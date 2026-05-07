import type { NeuronTrace } from '../../engine/types';
import { ACTIVATIONS, ARCHITECTURE } from '../../store/useSimStore';

interface Props {
  x: number;
  y: number;
  layer: number;
  neuron: number;
  trace: NeuronTrace | null;
}

const W = 172;
const PAD = 12;

export function NeuronTooltip({ x, y, layer, neuron, trace }: Props) {
  const isInput = layer === 0;
  const act = isInput ? null : ACTIVATIONS[layer - 1];

  const rows: { label: string; value: string; color: string }[] = [];

  if (trace) {
    if (!isInput) {
      rows.push({ label: 'z  (pre-act)', value: trace.preActivation.toFixed(5), color: '#ff8c00' });
    }
    rows.push({ label: 'a  (output)', value: trace.postActivation.toFixed(5), color: '#00f5ff' });
    if (trace.delta !== 0) {
      rows.push({ label: 'δ  (gradient)', value: trace.delta.toFixed(5), color: '#ff4466' });
    }
    if (!isInput && trace.inputs.length > 0) {
      trace.inputs.forEach((v, i) => {
        rows.push({ label: `w${i}·x${i}`, value: v.toFixed(4), color: v >= 0 ? '#ff8c00' : '#4488ff' });
      });
    }
  } else {
    rows.push({ label: 'no data yet', value: '—', color: '#606070' });
  }

  const rowH = 18;
  const H = PAD * 2 + 22 + rows.length * rowH + (act ? 20 : 0);

  // Flip to left side for right-edge neurons
  const flipLeft = x > 400;
  const tx = flipLeft ? x - W - 36 : x + 36;
  const ty = y - H / 2;

  // Bar for postActivation (0–1 scale)
  const barW = W - PAD * 2;
  const fillW = trace ? Math.max(0, Math.min(1, trace.postActivation)) * barW : 0;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Shadow */}
      <rect x={tx + 2} y={ty + 2} width={W} height={H} rx={8} fill="rgba(0,0,0,0.5)" />
      {/* Card */}
      <rect x={tx} y={ty} width={W} height={H} rx={8} fill="#0e0e18" stroke="#2a2a40" strokeWidth={1} />
      {/* Top accent line */}
      <line x1={tx + 8} y1={ty} x2={tx + W - 8} y2={ty} stroke="#00f5ff" strokeWidth={1.5} opacity={0.6} />

      {/* Header */}
      <text x={tx + PAD} y={ty + PAD + 10} fontSize={9} fill="#606070" letterSpacing={1}>
        {isInput ? 'INPUT' : layer === ARCHITECTURE.length - 1 ? 'OUTPUT' : 'HIDDEN'}
        {' '}L{layer}·N{neuron + 1}
      </text>
      {act && (
        <text x={tx + W - PAD} y={ty + PAD + 10} fontSize={9} fill="#00f5ff" textAnchor="end" opacity={0.8}>
          {act.name}
        </text>
      )}

      {/* Activation bar */}
      <rect x={tx + PAD} y={ty + PAD + 16} width={barW} height={4} rx={2} fill="#1a1a2e" />
      <rect x={tx + PAD} y={ty + PAD + 16} width={fillW} height={4} rx={2} fill="#00f5ff" opacity={0.7} />

      {/* Separator */}
      <line x1={tx + PAD} y1={ty + PAD + 26} x2={tx + W - PAD} y2={ty + PAD + 26} stroke="#1e1e2e" strokeWidth={1} />

      {/* Data rows */}
      {rows.map((row, i) => (
        <g key={i}>
          <text x={tx + PAD} y={ty + PAD + 40 + i * rowH} fontSize={10} fill="#606070">
            {row.label}
          </text>
          <text x={tx + W - PAD} y={ty + PAD + 40 + i * rowH} fontSize={10} fill={row.color} textAnchor="end">
            {row.value}
          </text>
        </g>
      ))}
    </g>
  );
}
