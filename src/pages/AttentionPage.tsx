import { useState, useMemo } from 'react';

const PRESETS = [
  'the cat sat on the mat',
  'she loves learning machine learning',
  'the quick brown fox jumps over',
  'neural networks learn from data',
];

const E_DIM = 8;
const H_DIM = 4;

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0x100000000; };
}

const dot = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const matVec = (M: number[][], v: number[]) => M.map(row => dot(row, v));

function softmax(v: number[]) {
  const m = Math.max(...v);
  const e = v.map(x => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / s);
}

function randVec(rng: () => number, dim: number): number[] {
  return Array.from({ length: dim }, () => rng() * 2 - 1);
}

function randMat(rng: () => number, rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => randVec(rng, cols));
}

const ALL_WORDS = Array.from(new Set(PRESETS.flatMap(s => s.split(' '))));

const rng = makeRng(42);
const WORD_EMBED: Record<string, number[]> = {};
for (const w of ALL_WORDS) WORD_EMBED[w] = randVec(rng, E_DIM);
const W_Q = randMat(rng, H_DIM, E_DIM);
const W_K = randMat(rng, H_DIM, E_DIM);

function computeAttention(tokens: string[]): number[][] {
  const Q = tokens.map(t => matVec(W_Q, WORD_EMBED[t] ?? WORD_EMBED['the']));
  const K = tokens.map(t => matVec(W_K, WORD_EMBED[t] ?? WORD_EMBED['the']));
  const scale = Math.sqrt(H_DIM);
  return Q.map(q => softmax(K.map(k => dot(q, k) / scale)));
}

function ArcViz({ tokens, attn, selected, onSelect }: {
  tokens: string[];
  attn: number[][];
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  const SVG_W = 680;
  const SVG_H = 130;
  const arcTopY = 22;
  const tokenY = 95;
  const n = tokens.length;
  const spacing = SVG_W / (n + 1);
  const xPos = tokens.map((_, i) => spacing * (i + 1));

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: '100%', display: 'block', overflow: 'visible' }}
    >
      {selected !== null && attn[selected].map((weight, j) => {
        if (j === selected) return null;
        const x1 = xPos[selected];
        const x2 = xPos[j];
        const midX = (x1 + x2) / 2;
        const sw = Math.max(0.5, weight * 4);
        const op = Math.max(0.1, weight);
        return (
          <path
            key={j}
            d={`M ${x1},${tokenY} Q ${midX},${arcTopY} ${x2},${tokenY}`}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={sw}
            opacity={op}
          />
        );
      })}
      {tokens.map((t, i) => {
        const x = xPos[i];
        const isSelected = selected === i;
        const charW = t.length * 7.5 + 20;
        const boxH = 24;
        return (
          <g key={i} onClick={() => onSelect(i)} style={{ cursor: 'pointer' }}>
            <rect
              x={x - charW / 2}
              y={tokenY - boxH / 2}
              width={charW}
              height={boxH}
              rx={6}
              fill="var(--surface-alt)"
              stroke={isSelected ? 'var(--accent)' : 'var(--border-mid)'}
              strokeWidth={isSelected ? 1.5 : 1}
            />
            <text
              x={x}
              y={tokenY + 4.5}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize={13}
              fill={isSelected ? 'var(--accent)' : 'var(--text)'}
            >
              {t}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Heatmap({ tokens, attn, selected, onSelect }: {
  tokens: string[];
  attn: number[][];
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  const [hovered, setHovered] = useState<[number, number] | null>(null);
  const n = tokens.length;
  const cellSize = Math.min(56, Math.floor(520 / n));
  const labelW = 72;
  const labelH = 28;
  const svgW = labelW + n * cellSize + 16;
  const svgH = labelH + n * cellSize + 16;

  return (
    <div>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ width: '100%', maxWidth: svgW, display: 'block' }}
      >
        {tokens.map((t, j) => (
          <text
            key={j}
            x={labelW + j * cellSize + cellSize / 2}
            y={labelH - 6}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize={11}
            fill="var(--text-dim)"
          >
            {t}
          </text>
        ))}
        {tokens.map((t, i) => (
          <text
            key={i}
            x={labelW - 6}
            y={labelH + i * cellSize + cellSize / 2 + 4}
            textAnchor="end"
            fontFamily="var(--font-mono)"
            fontSize={11}
            fill={selected === i ? 'var(--accent)' : 'var(--text-dim)'}
          >
            {t}
          </text>
        ))}
        {attn.map((row, i) =>
          row.map((val, j) => {
            const isHov = hovered?.[0] === i && hovered?.[1] === j;
            const isSelRow = selected === i;
            return (
              <g key={`${i}-${j}`}>
                <rect
                  x={labelW + j * cellSize}
                  y={labelH + i * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={`rgba(203,232,107,${val})`}
                  stroke={isSelRow ? 'var(--accent)' : isHov ? 'var(--border-strong)' : 'var(--border)'}
                  strokeWidth={isSelRow && j === 0 ? 0 : 0.5}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered([i, j])}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelect(i)}
                />
                {isSelRow && j === 0 && (
                  <rect
                    x={labelW}
                    y={labelH + i * cellSize}
                    width={2}
                    height={cellSize}
                    fill="var(--accent)"
                  />
                )}
                {isHov && (
                  <text
                    x={labelW + j * cellSize + cellSize / 2}
                    y={labelH + i * cellSize + cellSize / 2 + 4}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    fontSize={10}
                    fill={val > 0.5 ? 'var(--deep)' : 'var(--text)'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {val.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })
        )}
      </svg>
      {hovered && (
        <p style={{
          margin: '6px 0 0',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--text-mid)',
        }}>
          {tokens[hovered[0]]} → {tokens[hovered[1]]}: {attn[hovered[0]][hovered[1]].toFixed(2)}
        </p>
      )}
    </div>
  );
}

export function AttentionPage() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const tokens = useMemo(() => PRESETS[presetIdx].split(' '), [presetIdx]);
  const attn = useMemo(() => computeAttention(tokens), [tokens]);

  function handlePreset(i: number) {
    setPresetIdx(i);
    setSelected(null);
  }

  function handleSelect(i: number) {
    setSelected(prev => prev === i ? null : i);
  }

  const topAttendees = selected !== null
    ? attn[selected]
        .map((w, j) => ({ token: tokens[j], w }))
        .sort((a, b) => b.w - a.w)
    : [];

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 32px 80px' }}>
        <h1 style={{
          margin: '0 0 10px',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(26px, 4vw, 38px)',
          fontWeight: 800,
          color: 'var(--text)',
          letterSpacing: -0.5,
        }}>
          Attention
        </h1>
        <p style={{
          margin: '0 0 28px',
          fontSize: 15,
          color: 'var(--text-mid)',
          lineHeight: 1.7,
          maxWidth: 560,
        }}>
          Self-attention lets each token look at all others to build context. Click a token below to see which others it attends to.
        </p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 32, flexWrap: 'wrap' }}>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => handlePreset(i)}
              style={{
                background: presetIdx === i ? 'var(--accent-dim)' : 'transparent',
                border: 'none',
                color: presetIdx === i ? 'var(--accent)' : 'var(--text-dim)',
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 12px',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                transition: 'color 0.15s, background 0.15s',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '20px 16px 16px',
          marginBottom: 24,
        }}>
          <ArcViz tokens={tokens} attn={attn} selected={selected} onSelect={handleSelect} />
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '20px 16px 12px',
          marginBottom: 16,
          overflowX: 'auto',
        }}>
          <Heatmap tokens={tokens} attn={attn} selected={selected} onSelect={handleSelect} />
        </div>

        {selected !== null && (
          <div style={{
            padding: '14px 16px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-mid)' }}>
              <span style={{ color: 'var(--accent)' }}>&ldquo;{tokens[selected]}&rdquo;</span>
              {' '}attends most to:{' '}
            </span>
            {topAttendees.map(({ token, w }) => (
              <span
                key={token + w}
                style={{
                  display: 'inline-block',
                  marginRight: 8,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--text)',
                }}
              >
                {token}{' '}
                <span style={{ color: 'var(--text-faint)' }}>({w.toFixed(2)})</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
