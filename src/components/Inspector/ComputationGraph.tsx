import type { NeuronTrace } from '../../engine/types';
import type { ActivationFn } from '../../engine/activations';

interface Props {
  trace: NeuronTrace;
  act: ActivationFn;
  isBackward: boolean;
}

// ── Layout constants ─────────────────────────────────────────
const GRAPH_W = 272;
const NODE_W = 48;
const NODE_H = 20;
const NODE_R = 4;
const OP_R = 13;

const Y_INPUT  = 14;
const Y_WEIGHT = 56;
const Y_MULT   = 100;
const Y_SUM    = 146;
const Y_ACT    = 190;
const Y_OUT    = 228;

// ── Helpers ──────────────────────────────────────────────────
function fmt(v: number) {
  return (v >= 0 ? '+' : '') + v.toFixed(3);
}

function valColor(v: number, dim = false): string {
  if (dim) return 'var(--text-faint)';
  return v >= 0 ? 'var(--teal)' : 'var(--red)';
}

// ── Sub-components ───────────────────────────────────────────
function ValBox({ cx, cy, label, value, color, dim }: {
  cx: number; cy: number; label: string; value: number | null; color?: string; dim?: boolean;
}) {
  const c = color ?? (value !== null ? valColor(value, dim) : 'var(--text-faint)');
  return (
    <g>
      <rect x={cx - NODE_W / 2} y={cy} width={NODE_W} height={NODE_H}
        rx={NODE_R} fill="var(--deep)" stroke={c} strokeWidth={0.75} strokeOpacity={dim ? 0.3 : 0.7} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={8}
        fill="var(--text-faint)" fontFamily="var(--font-mono)">{label}</text>
      {value !== null && (
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize={9}
          fill={c} fontFamily="var(--font-mono)">{fmt(value)}</text>
      )}
    </g>
  );
}

function OpCircle({ cx, cy, symbol, color }: { cx: number; cy: number; symbol: string; color: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={OP_R} fill="var(--deep)" stroke={color} strokeWidth={1} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fill={color}>{symbol}</text>
    </g>
  );
}

function Line({ x1, y1, x2, y2, color, dashed }: {
  x1: number; y1: number; x2: number; y2: number; color: string; dashed?: boolean;
}) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color} strokeWidth={0.8} opacity={0.55}
      strokeDasharray={dashed ? '3 2' : undefined} />
  );
}

// ── Main component ───────────────────────────────────────────
export function ComputationGraph({ trace, act, isBackward }: Props) {
  const N = trace.rawInputs.length;
  if (N === 0) return null;

  // Column x-positions for each input pair
  const maxCols = N + 1; // N input cols + 1 bias col
  const colW = Math.min(64, Math.max(42, (GRAPH_W - 16) / maxCols));
  const colX = (i: number) => 8 + colW * i + colW / 2;

  // Center x for z / σ / output nodes
  const midX = (colX(0) + colX(N - 1)) / 2;
  const biasX = colX(N);

  const GRAPH_H = Y_OUT + NODE_H + 16;

  const fwd = 'var(--teal)';
  const bwd = 'var(--red)';
  const wColor = 'var(--orange)';
  const bColor = 'var(--blue)';

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
      <svg
        width={Math.max(GRAPH_W, maxCols * colW + 16)}
        height={GRAPH_H}
        style={{ display: 'block', fontFamily: 'var(--font-mono)' }}
      >
        {/* Section labels */}
        <text x={2} y={Y_INPUT - 2} fontSize={7} fill="var(--text-faint)" letterSpacing={0.5}>INPUTS</text>
        <text x={2} y={Y_WEIGHT - 2} fontSize={7} fill="var(--text-faint)" letterSpacing={0.5}>WEIGHTS</text>
        <text x={2} y={Y_MULT - 2} fontSize={7} fill="var(--text-faint)" letterSpacing={0.5}>PRODUCTS</text>

        {/* ── Per-input column ── */}
        {trace.rawInputs.map(({ x, w }, i) => {
          const cx = colX(i);
          const product = x * w;

          // Backward gradients for this input
          const dw = trace.delta * x;    // ∂L/∂wᵢ
          const dx = trace.delta * w;    // ∂L/∂xᵢ passed upstream

          return (
            <g key={i}>
              {/* Input activation node */}
              <ValBox cx={cx} cy={Y_INPUT}
                label={`x${i}`}
                value={isBackward ? dx : x}
                color={isBackward ? bwd : fwd}
              />

              {/* Vertical line input → weight */}
              <Line x1={cx} y1={Y_INPUT + NODE_H} x2={cx} y2={Y_WEIGHT}
                color={isBackward ? bwd : fwd} dashed={isBackward} />

              {/* Weight node */}
              <ValBox cx={cx} cy={Y_WEIGHT}
                label={`w${i}`}
                value={isBackward ? dw : w}
                color={isBackward ? bwd : wColor}
              />

              {/* Vertical line weight → product op */}
              <Line x1={cx} y1={Y_WEIGHT + NODE_H} x2={cx} y2={Y_MULT - OP_R}
                color={isBackward ? bwd : wColor} dashed={isBackward} />

              {/* × operation node */}
              <OpCircle cx={cx} cy={Y_MULT} symbol="×"
                color={isBackward ? bwd : 'var(--text-mid)'} />

              {/* Label below × */}
              {!isBackward && (
                <text x={cx} y={Y_MULT + OP_R + 11} textAnchor="middle"
                  fontSize={8} fill="var(--text-faint)" fontFamily="var(--font-mono)">
                  {fmt(product)}
                </text>
              )}

              {/* Line from × to Σ */}
              <Line
                x1={cx} y1={Y_MULT + OP_R}
                x2={midX} y2={Y_SUM - OP_R}
                color={isBackward ? bwd : 'var(--text-dim)'}
                dashed={isBackward}
              />
            </g>
          );
        })}

        {/* ── Bias column ── */}
        <ValBox cx={biasX} cy={Y_WEIGHT}
          label="bias"
          value={isBackward ? trace.delta : trace.bias}
          color={isBackward ? bwd : bColor}
        />
        <Line x1={biasX} y1={Y_WEIGHT + NODE_H} x2={midX} y2={Y_SUM - OP_R}
          color={isBackward ? bwd : bColor} dashed={isBackward} />

        {/* ── Σ (z) node ── */}
        <text x={2} y={Y_SUM - OP_R - 2} fontSize={7} fill="var(--text-faint)" letterSpacing={0.5}>
          {isBackward ? 'GRADS' : 'PRE-ACT'}
        </text>
        <OpCircle cx={midX} cy={Y_SUM} symbol="Σ"
          color={isBackward ? bwd : 'var(--text-mid)'} />
        {!isBackward && (
          <text x={midX + OP_R + 4} y={Y_SUM + 4} fontSize={8}
            fill="var(--text-dim)" fontFamily="var(--font-mono)">
            z={fmt(trace.preActivation)}
          </text>
        )}
        <Line x1={midX} y1={Y_SUM + OP_R} x2={midX} y2={Y_ACT - OP_R}
          color={isBackward ? bwd : 'var(--text-dim)'} />

        {/* ── Activation node ── */}
        <text x={2} y={Y_ACT - OP_R - 2} fontSize={7} fill="var(--text-faint)" letterSpacing={0.5}>
          {isBackward ? 'δ·σ′(z)' : act.name.toUpperCase()}
        </text>
        <OpCircle cx={midX} cy={Y_ACT} symbol="σ"
          color={isBackward ? bwd : 'var(--accent)'} />
        {isBackward && (
          <text x={midX + OP_R + 4} y={Y_ACT + 4} fontSize={8}
            fill={bwd} fontFamily="var(--font-mono)">
            δ={fmt(trace.delta)}
          </text>
        )}
        <Line x1={midX} y1={Y_ACT + OP_R} x2={midX} y2={Y_OUT}
          color={isBackward ? bwd : 'var(--accent)'} />

        {/* ── Output node ── */}
        <text x={2} y={Y_OUT - 2} fontSize={7} fill="var(--text-faint)" letterSpacing={0.5}>OUTPUT</text>
        <ValBox cx={midX} cy={Y_OUT}
          label="a"
          value={trace.postActivation}
          color={isBackward ? bwd : 'var(--accent)'}
        />
      </svg>
    </div>
  );
}
