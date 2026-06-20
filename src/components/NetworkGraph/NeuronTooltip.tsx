import type { NeuronTrace } from '../../engine/types';
import { ACTIVATION_MAP } from '../../engine/activations';
import { useSimStore } from '../../store/useSimStore';

interface Props {
  x: number; y: number;
  layer: number; neuron: number;
  trace: NeuronTrace | null;
}

const W = 172;
const PAD = 12;

export function NeuronTooltip({ x, y, layer, neuron, trace }: Props) {
  const { architecture, activationNames } = useSimStore();
  const isInput = layer === 0;
  const act = isInput ? null : ACTIVATION_MAP[activationNames[layer - 1]];

  const rows: { label: string; value: string; color: string }[] = [];

  if (trace) {
    if (!isInput) {
      rows.push({ label: 'z  (pre-act)', value: trace.preActivation.toFixed(5), color: '#d4943a' });
    }
    rows.push({ label: 'a  (output)', value: trace.postActivation.toFixed(5), color: '#4ecdc4' });
    if (trace.delta !== 0) {
      rows.push({ label: 'δ  (gradient)', value: trace.delta.toFixed(5), color: '#c44d58' });
    }
    if (!isInput && trace.inputs.length > 0) {
      trace.inputs.forEach((v, i) => {
        rows.push({ label: `w${i}·x${i}`, value: v.toFixed(4), color: v >= 0 ? '#d4943a' : '#5b8fa6' });
      });
    }
  } else {
    rows.push({ label: 'no data yet', value: '—', color: '#607060' });
  }

  const rowH = 18;
  const H = PAD * 2 + 22 + rows.length * rowH + (act ? 20 : 0);

  const flipLeft = x > 400;
  const tx = flipLeft ? x - W - 36 : x + 36;
  const ty = y - H / 2;

  const barW = W - PAD * 2;
  const fillW = trace ? Math.max(0, Math.min(1, Math.abs(trace.postActivation))) * barW : 0;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={tx + 2} y={ty + 2} width={W} height={H} rx={8} fill="rgba(2,18,40,0.7)" />
      <rect x={tx} y={ty} width={W} height={H} rx={8} fill="#033649" stroke="#036564" strokeWidth={1} />
      <line x1={tx + 8} y1={ty} x2={tx + W - 8} y2={ty} stroke="#cdb380" strokeWidth={1.5} opacity={0.6} />

      <text x={tx + PAD} y={ty + PAD + 10} fontSize={9} fill="#607060" letterSpacing={1}>
        {isInput ? 'INPUT' : layer === architecture.length - 1 ? 'OUTPUT' : 'HIDDEN'}
        {' '}L{layer}·N{neuron + 1}
      </text>
      {act && (
        <text x={tx + W - PAD} y={ty + PAD + 10} fontSize={9} fill="#cdb380" textAnchor="end" opacity={0.8}>
          {act.name}
        </text>
      )}

      <rect x={tx + PAD} y={ty + PAD + 16} width={barW} height={4} rx={2} fill="#021228" />
      <rect x={tx + PAD} y={ty + PAD + 16} width={fillW} height={4} rx={2} fill="#4ecdc4" opacity={0.7} />

      <line x1={tx + PAD} y1={ty + PAD + 26} x2={tx + W - PAD} y2={ty + PAD + 26} stroke="rgba(3,101,100,0.35)" strokeWidth={1} />

      {rows.map((row, i) => (
        <g key={i}>
          <text x={tx + PAD} y={ty + PAD + 40 + i * rowH} fontSize={10} fill="#607060">{row.label}</text>
          <text x={tx + W - PAD} y={ty + PAD + 40 + i * rowH} fontSize={10} fill={row.color} textAnchor="end">{row.value}</text>
        </g>
      ))}
    </g>
  );
}
