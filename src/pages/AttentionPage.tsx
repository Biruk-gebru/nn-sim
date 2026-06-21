import { useState, useMemo, useCallback } from 'react';

// ─── math ───────────────────────────────────────────────────────────────────

const E_DIM = 8;
const H_DIM = 4;
const SCALE = Math.sqrt(H_DIM);

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0x100000000; };
}

const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
const matVec = (M: number[][], v: number[]) => M.map(row => dot(row, v));

function softmax(v: number[]) {
  const m = Math.max(...v);
  const e = v.map(x => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / s);
}

function randVec(rng: () => number, d: number) {
  return Array.from({ length: d }, () => rng() * 2 - 1);
}
function randMat(rng: () => number, r: number, c: number) {
  return Array.from({ length: r }, () => randVec(rng, c));
}

function wordHash(w: string): number {
  return (w.split('').reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 5381)) >>> 0;
}
function getWordEmbed(w: string): number[] {
  return randVec(makeRng(wordHash(w) ^ 0xcafe1234), E_DIM);
}

const rng0 = makeRng(42);
const W_Q = randMat(rng0, H_DIM, E_DIM);
const W_K = randMat(rng0, H_DIM, E_DIM);
const W_V = randMat(rng0, H_DIM, E_DIM);

interface TokData { token: string; emb: number[]; q: number[]; k: number[]; v: number[] }

function buildTokenData(tokens: string[]): TokData[] {
  return tokens.map(token => {
    const emb = getWordEmbed(token);
    return { token, emb, q: matVec(W_Q, emb), k: matVec(W_K, emb), v: matVec(W_V, emb) };
  });
}

function computeAttnMatrix(data: TokData[]): number[][] {
  return data.map(({ q }) => softmax(data.map(({ k }) => dot(q, k) / SCALE)));
}

function weightedSumV(data: TokData[], weights: number[]): number[] {
  const out = new Array(H_DIM).fill(0);
  data.forEach(({ v }, j) => v.forEach((val, d) => { out[d] += weights[j] * val; }));
  return out;
}

// ─── presets ────────────────────────────────────────────────────────────────

const PRESETS = [
  'the cat sat on the mat',
  'she loves learning machine learning',
  'the quick brown fox jumps',
  'neural networks learn from data',
];

// ─── stage config ────────────────────────────────────────────────────────────

const STAGES = [
  { id: 0, label: 'Embed',    formula: 'xᵢ ∈ ℝᵈ',              hint: 'Each token is mapped to a vector' },
  { id: 1, label: 'Project',  formula: 'Q=WᵩxᵢK=Wₖxᵢ V=Wᵥxᵢ',  hint: 'Three learned linear projections' },
  { id: 2, label: 'Scores',   formula: 'sᵢⱼ = Qᵢ·Kⱼ / √dₖ',    hint: 'Dot product of query with all keys' },
  { id: 3, label: 'Softmax',  formula: 'αᵢⱼ = softmax(sᵢ:)',    hint: 'Normalize raw scores to sum to 1' },
  { id: 4, label: 'Output',   formula: 'zᵢ = Σⱼ αᵢⱼ Vⱼ',        hint: 'Weighted blend of value vectors' },
] as const;

// ─── VecBar ─────────────────────────────────────────────────────────────────

function VecBar({ vals, label, dimPrefix = 'd', accent }: {
  vals: number[];
  label?: string;
  dimPrefix?: string;
  accent?: boolean;
}) {
  const mx = Math.max(...vals.map(Math.abs), 0.01);
  return (
    <div>
      {label && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: accent ? 'var(--accent)' : 'var(--text-dim)',
          marginBottom: 5,
          fontWeight: accent ? 600 : 400,
        }}>{label}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {vals.map((v, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', textAlign: 'right' }}>
              {dimPrefix}{i}
            </span>
            <div style={{ flex: 1, height: 10, background: 'var(--deep)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${(Math.abs(v) / mx) * 100}%`,
                height: '100%',
                background: v >= 0 ? 'var(--accent)' : 'var(--red)',
                opacity: 0.8,
              }} />
            </div>
            <span style={{ width: 38, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', textAlign: 'right' }}>
              {v.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── EmbedFingerprint ────────────────────────────────────────────────────────

function EmbedFingerprint({ vals, size = 32 }: { vals: number[]; size?: number }) {
  const mx = Math.max(...vals.map(Math.abs), 0.01);
  const barW = size / vals.length;
  return (
    <svg width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
      {vals.map((v, i) => {
        const h = Math.max(2, (Math.abs(v) / mx) * (size * 0.9));
        return (
          <rect
            key={i}
            x={i * barW + 0.5}
            y={size - h}
            width={barW - 1}
            height={h}
            fill={v >= 0 ? 'var(--accent)' : 'var(--red)'}
            opacity={0.75}
          />
        );
      })}
    </svg>
  );
}

// ─── Stage 0: Embed ──────────────────────────────────────────────────────────

function EmbedStage({ data, selected, onSelect }: {
  data: TokData[];
  selected: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.7 }}>
        Before any computation, each token is converted to a fixed-length vector of {E_DIM} numbers — its
        embedding. Click any token to inspect its values.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
        {data.map(({ token, emb }, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: '10px 10px 8px',
              background: selected === i ? 'var(--accent-dim)' : 'var(--surface-alt)',
              border: `1px solid ${selected === i ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <EmbedFingerprint vals={emb} size={40} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: selected === i ? 'var(--accent)' : 'var(--text-mid)',
            }}>{token}</span>
          </button>
        ))}
      </div>
      {data[selected] && (
        <div style={{
          background: 'var(--surface-alt)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '16px 20px',
        }}>
          <VecBar vals={data[selected].emb} label={`embedding for "${data[selected].token}"`} accent />
        </div>
      )}
    </div>
  );
}

// ─── Stage 1: Project ────────────────────────────────────────────────────────

function ProjectStage({ data, selected }: { data: TokData[]; selected: number }) {
  const d = data[selected];
  if (!d) return null;

  const cols: Array<{ label: string; vals: number[]; color: string; desc: string }> = [
    { label: 'Query  Q', vals: d.q, color: 'var(--teal)',   desc: 'What am I looking for?' },
    { label: 'Key    K', vals: d.k, color: 'var(--orange)', desc: 'What do I have to offer?' },
    { label: 'Value  V', vals: d.v, color: 'var(--accent)', desc: 'What will I contribute?' },
  ];

  return (
    <div>
      <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.7 }}>
        The embedding for <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{d.token}</span> is
        projected three times with learned weight matrices, producing Q, K, V vectors of dimension {H_DIM}.
      </p>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
        W<sub>Q</sub>, W<sub>K</sub>, W<sub>V</sub> ∈ ℝ<sup>{H_DIM}×{E_DIM}</sup>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {cols.map(({ label, vals, color, desc }) => (
          <div key={label} style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '14px 14px 12px',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color, marginBottom: 2, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12, fontStyle: 'italic' }}>{desc}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {vals.map((v, i) => {
                const mx = Math.max(...vals.map(Math.abs), 0.01);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 14, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)' }}>h{i}</span>
                    <div style={{ flex: 1, height: 9, background: 'var(--deep)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${(Math.abs(v) / mx) * 100}%`, height: '100%', background: v >= 0 ? color : 'var(--red)', opacity: 0.8 }} />
                    </div>
                    <span style={{ width: 36, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', textAlign: 'right' }}>{v.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stage 2: Scores ─────────────────────────────────────────────────────────

function ScoresStage({ data, selected }: { data: TokData[]; selected: number }) {
  const d = data[selected];
  if (!d) return null;

  const rawScores = data.map(({ k }) => dot(d.q, k));
  const scaledScores = rawScores.map(s => s / SCALE);
  const maxAbs = Math.max(...scaledScores.map(Math.abs), 0.01);

  return (
    <div>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.7 }}>
        The Query vector of <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{d.token}</span> is
        dot-producted with every Key, then divided by √{H_DIM} = {SCALE.toFixed(2)} to keep gradients stable.
        Higher score = stronger attention candidate.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map(({ token }, j) => {
          const raw = rawScores[j];
          const scaled = scaledScores[j];
          const barPct = (Math.abs(scaled) / maxAbs) * 100;
          return (
            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 80,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: j === selected ? 'var(--accent)' : 'var(--text-mid)',
                textAlign: 'right',
                flexShrink: 0,
              }}>{token}</span>
              <div style={{ flex: 1, height: 18, background: 'var(--deep)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${barPct}%`,
                  height: '100%',
                  background: scaled >= 0 ? 'var(--teal)' : 'var(--red)',
                  opacity: 0.75,
                  transition: 'width 0.3s',
                }} />
              </div>
              <span style={{ width: 48, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', textAlign: 'right' }}>
                {scaled.toFixed(3)}
              </span>
              <span style={{ width: 56, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', textAlign: 'right' }}>
                raw {raw.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--deep)', borderRadius: 6, fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
        Q·K without scaling can have variance ∝ dₖ, saturating softmax → near-zero gradients.
        Dividing by √dₖ = {SCALE.toFixed(2)} corrects this.
      </div>
    </div>
  );
}

// ─── Stage 3: Softmax ────────────────────────────────────────────────────────

function SoftmaxStage({ data, selected }: { data: TokData[]; selected: number }) {
  const d = data[selected];
  if (!d) return null;

  const rawScores = data.map(({ k }) => dot(d.q, k) / SCALE);
  const weights = softmax(rawScores);

  return (
    <div>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.7 }}>
        Softmax turns the raw scores into a probability distribution — all weights are positive and sum to 1.
        The token with the highest score gets the most attention weight.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>scaled scores (logits)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.map(({ token }, j) => {
              const v = rawScores[j];
              const mx = Math.max(...rawScores.map(Math.abs), 0.01);
              return (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 72, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token}</span>
                  <div style={{ flex: 1, height: 12, background: 'var(--deep)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${(Math.abs(v) / mx) * 100}%`, height: '100%', background: v >= 0 ? 'var(--teal)' : 'var(--red)', opacity: 0.7 }} />
                  </div>
                  <span style={{ width: 42, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textAlign: 'right' }}>{v.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', marginBottom: 12 }}>attention weights (after softmax)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.map(({ token }, j) => {
              const w = weights[j];
              return (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 72, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token}</span>
                  <div style={{ flex: 1, height: 12, background: 'var(--deep)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${w * 100}%`, height: '100%', background: 'var(--accent)', opacity: 0.75 }} />
                  </div>
                  <span style={{ width: 42, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textAlign: 'right' }}>{w.toFixed(3)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>
            Σ = {weights.reduce((a, b) => a + b, 0).toFixed(3)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stage 4: Output ─────────────────────────────────────────────────────────

function OutputStage({ data, attnRow }: { data: TokData[]; attnRow: number[] }) {
  const output = weightedSumV(data, attnRow);
  const topIdx = [...attnRow.map((w, i) => ({ w, i }))].sort((a, b) => b.w - a.w);

  return (
    <div>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.7 }}>
        The output is a weighted sum of all Value vectors, blended by the attention weights.
        Tokens with higher attention contribute more to the final representation.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'start', marginBottom: 20 }}>
        <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>αᵢⱼ × Vⱼ contribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topIdx.map(({ i, w }) => {
              const scaled = data[i].v.map(v => v * w);
              const mx = Math.max(...data[i].v.map(Math.abs), 0.01);
              return (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                      {w.toFixed(3)} ×
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-mid)' }}>
                      V<sub>{data[i].token}</sub>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {scaled.map((v, d) => (
                      <div key={d} style={{
                        flex: 1,
                        height: Math.max(4, Math.abs(v) / mx * 24),
                        background: v >= 0 ? 'var(--accent)' : 'var(--red)',
                        opacity: 0.5 + w * 0.5,
                        borderRadius: 2,
                        alignSelf: 'flex-end',
                      }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', paddingTop: 40 }}>
          <span style={{ fontSize: 20, color: 'var(--text-dim)' }}>→</span>
        </div>

        <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--accent)', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', marginBottom: 12 }}>output vector z ∈ ℝ{H_DIM}</div>
          <VecBar vals={output} dimPrefix="h" accent />
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            This context-enriched vector now carries information from across the sequence, weighted by relevance.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ArcViz ──────────────────────────────────────────────────────────────────

function ArcViz({ tokens, attn, selected, onSelect }: {
  tokens: string[]; attn: number[][]; selected: number | null; onSelect: (i: number) => void;
}) {
  const W = 680, H = 130, topY = 22, tokY = 96, n = tokens.length;
  const sp = W / (n + 1);
  const xPos = tokens.map((_, i) => sp * (i + 1));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      {selected !== null && attn[selected].map((weight, j) => {
        if (j === selected) return null;
        const x1 = xPos[selected], x2 = xPos[j], mx = (x1 + x2) / 2;
        return (
          <path
            key={j}
            d={`M ${x1},${tokY} Q ${mx},${topY} ${x2},${tokY}`}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={Math.max(0.5, weight * 5)}
            opacity={Math.max(0.08, weight)}
          />
        );
      })}
      {tokens.map((t, i) => {
        const x = xPos[i];
        const sel = selected === i;
        const cw = t.length * 7.5 + 20;
        return (
          <g key={i} onClick={() => onSelect(i)} style={{ cursor: 'pointer' }}>
            <rect x={x - cw / 2} y={tokY - 12} width={cw} height={24} rx={5}
              fill="var(--surface-alt)"
              stroke={sel ? 'var(--accent)' : 'var(--border-mid)'}
              strokeWidth={sel ? 1.5 : 0.8}
            />
            <text x={x} y={tokY + 4.5} textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize={12}
              fill={sel ? 'var(--accent)' : 'var(--text)'}
            >{t}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

function Heatmap({ tokens, attn, selected, onSelect }: {
  tokens: string[]; attn: number[][]; selected: number | null; onSelect: (i: number) => void;
}) {
  const [hov, setHov] = useState<[number, number] | null>(null);
  const n = tokens.length;
  const cs = Math.min(52, Math.floor(480 / n));
  const lw = 68, lh = 26;
  const svgW = lw + n * cs + 12, svgH = lh + n * cs + 12;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: svgW, display: 'block' }}>
      {tokens.map((t, j) => (
        <text key={j} x={lw + j * cs + cs / 2} y={lh - 6} textAnchor="middle"
          fontFamily="var(--font-mono)" fontSize={10} fill="var(--text-dim)">{t}</text>
      ))}
      {tokens.map((t, i) => (
        <text key={i} x={lw - 5} y={lh + i * cs + cs / 2 + 4} textAnchor="end"
          fontFamily="var(--font-mono)" fontSize={10}
          fill={selected === i ? 'var(--accent)' : 'var(--text-dim)'}>{t}</text>
      ))}
      {attn.map((row, i) => row.map((val, j) => {
        const isH = hov?.[0] === i && hov?.[1] === j;
        return (
          <g key={`${i}-${j}`}>
            <rect
              x={lw + j * cs} y={lh + i * cs} width={cs} height={cs}
              fill={`rgba(203,232,107,${val * 0.9})`}
              stroke={selected === i ? 'var(--accent)' : isH ? 'var(--border-strong)' : 'var(--border)'}
              strokeWidth={selected === i ? 0.8 : 0.4}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHov([i, j])}
              onMouseLeave={() => setHov(null)}
              onClick={() => onSelect(i)}
            />
            {isH && (
              <text x={lw + j * cs + cs / 2} y={lh + i * cs + cs / 2 + 4} textAnchor="middle"
                fontFamily="var(--font-mono)" fontSize={10}
                fill={val > 0.5 ? 'var(--deep)' : 'var(--text)'}
                style={{ pointerEvents: 'none' }}>{val.toFixed(2)}</text>
            )}
          </g>
        );
      }))}
    </svg>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function AttentionPage() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [customText, setCustomText] = useState('');
  const [stage, setStage] = useState(0);
  const [queryTok, setQueryTok] = useState(0);
  const [arcSelected, setArcSelected] = useState<number | null>(null);

  const sentence = customText.trim() || PRESETS[presetIdx];
  const tokens = useMemo(() => sentence.split(/\s+/).filter(Boolean).slice(0, 8), [sentence]);
  const data = useMemo(() => buildTokenData(tokens), [tokens]);
  const attnMatrix = useMemo(() => computeAttnMatrix(data), [data]);

  const safeQuery = Math.min(queryTok, tokens.length - 1);

  const handlePreset = useCallback((i: number) => {
    setPresetIdx(i);
    setCustomText('');
    setQueryTok(0);
    setArcSelected(null);
  }, []);

  const handleArcSelect = useCallback((i: number) => {
    setArcSelected(prev => prev === i ? null : i);
  }, []);

  const topAttendees = arcSelected !== null
    ? attnMatrix[arcSelected].map((w, j) => ({ token: tokens[j], w })).sort((a, b) => b.w - a.w)
    : [];

  const card: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '20px',
    marginBottom: 16,
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 28px 80px' }}>

        {/* Header */}
        <h1 style={{
          margin: '0 0 10px',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(26px, 4vw, 38px)',
          fontWeight: 800,
          color: 'var(--text)',
          letterSpacing: -0.5,
        }}>Attention</h1>
        <p style={{ margin: '0 0 36px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.7, maxWidth: 580 }}>
          Self-attention lets each token look at all others to build context.
          Walk through the five computational steps below, then explore the full attention pattern.
        </p>

        {/* Sentence selector */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => handlePreset(i)}
                style={{
                  background: presetIdx === i && !customText ? 'var(--accent-dim)' : 'transparent',
                  border: 'none',
                  color: presetIdx === i && !customText ? 'var(--accent)' : 'var(--text-dim)',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontFamily: 'var(--font-mono)',
                  transition: 'color 0.15s, background 0.15s',
                }}
              >{p}</button>
            ))}
          </div>
          <input
            value={customText}
            onChange={e => { setCustomText(e.target.value); setQueryTok(0); setArcSelected(null); }}
            placeholder="or type your own sentence…"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--surface)',
              border: '1px solid var(--border-mid)',
              borderRadius: 6,
              padding: '9px 14px',
              fontSize: 14,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text)',
              outline: 'none',
            }}
          />
        </div>

        {/* ── Pipeline Simulator ── */}
        <div style={{ ...card, padding: '24px 24px 20px' }}>
          {/* Step bar */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {STAGES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStage(i)}
                style={{
                  flex: 1,
                  padding: '9px 4px 8px',
                  background: stage === i ? 'var(--accent-dim)' : 'transparent',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: stage === i ? 'var(--accent)' : 'var(--text-faint)' }}>0{i + 1}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: stage === i ? 'var(--accent)' : 'var(--text-mid)', fontWeight: stage === i ? 600 : 400 }}>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Formula + hint */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              background: 'var(--deep)',
              borderRadius: 6,
              padding: '6px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--accent)',
              whiteSpace: 'nowrap',
            }}>{STAGES[stage].formula}</div>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{STAGES[stage].hint}</span>
          </div>

          {/* Query token selector (stages 1–4) */}
          {stage > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', alignSelf: 'center' }}>query →</span>
              {tokens.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setQueryTok(i)}
                  style={{
                    background: safeQuery === i ? 'var(--accent-dim)' : 'transparent',
                    border: `1px solid ${safeQuery === i ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 4,
                    padding: '3px 9px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: safeQuery === i ? 'var(--accent)' : 'var(--text-dim)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                >{t}</button>
              ))}
            </div>
          )}

          {/* Stage content */}
          {stage === 0 && <EmbedStage data={data} selected={safeQuery} onSelect={setQueryTok} />}
          {stage === 1 && <ProjectStage data={data} selected={safeQuery} />}
          {stage === 2 && <ScoresStage data={data} selected={safeQuery} />}
          {stage === 3 && <SoftmaxStage data={data} selected={safeQuery} />}
          {stage === 4 && <OutputStage data={data} attnRow={attnMatrix[safeQuery]} />}

          {/* Prev / Next */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => setStage(s => Math.max(0, s - 1))}
              disabled={stage === 0}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 5,
                padding: '6px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: stage === 0 ? 'var(--text-faint)' : 'var(--text-mid)',
                cursor: stage === 0 ? 'default' : 'pointer',
              }}
            >← prev</button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)', alignSelf: 'center' }}>
              step {stage + 1} / {STAGES.length}
            </span>
            <button
              onClick={() => setStage(s => Math.min(STAGES.length - 1, s + 1))}
              disabled={stage === STAGES.length - 1}
              style={{
                background: stage === STAGES.length - 1 ? 'transparent' : 'var(--accent-dim)',
                border: `1px solid ${stage === STAGES.length - 1 ? 'var(--border)' : 'var(--accent)'}`,
                borderRadius: 5,
                padding: '6px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: stage === STAGES.length - 1 ? 'var(--text-faint)' : 'var(--accent)',
                cursor: stage === STAGES.length - 1 ? 'default' : 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >next →</button>
          </div>
        </div>

        {/* ── Full attention pattern ── */}
        <div style={{ marginTop: 24 }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-dim)' }}>
            Full attention pattern — click a token to see which others it attends to
          </p>

          <div style={{ ...card, padding: '16px 14px 12px' }}>
            <ArcViz tokens={tokens} attn={attnMatrix} selected={arcSelected} onSelect={handleArcSelect} />
          </div>

          <div style={{ ...card, padding: '16px 14px 12px', overflowX: 'auto' }}>
            <Heatmap tokens={tokens} attn={attnMatrix} selected={arcSelected} onSelect={handleArcSelect} />
          </div>

          {arcSelected !== null && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-mid)',
            }}>
              <span style={{ color: 'var(--accent)' }}>"{tokens[arcSelected]}"</span>
              {' '}attends most to:{' '}
              {topAttendees.map(({ token, w }) => (
                <span key={token + w} style={{ marginRight: 10 }}>
                  {token} <span style={{ color: 'var(--text-faint)' }}>({w.toFixed(2)})</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Theory ── */}
        <div style={{ marginTop: 56, paddingTop: 40, borderTop: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Self-attention was introduced in "Attention Is All You Need" (Vaswani et al., 2017) and became
            the Transformer — the architecture behind GPT, BERT, and nearly every large language model today.
            The mechanism computes three vectors per token (Query, Key, Value), scores all pairs via scaled
            dot products, normalises with softmax, and outputs a weighted sum of Values.
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Dividing by √d<sub>k</sub> keeps the dot products from growing large with dimension, which would
            push softmax into near-zero gradient regions. Multi-head attention runs this process in parallel
            with different weight matrices, letting each head specialise in a different relationship type —
            syntactic heads, coreference, subject–verb agreement, etc.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
            <a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Attention Is All You Need — Vaswani et al., 2017</a>
            <a href="https://jalammar.github.io/illustrated-transformer/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ The Illustrated Transformer — Jay Alammar</a>
            <a href="https://www.youtube.com/watch?v=kCc8FmEb1nY" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Andrej Karpathy: Let's build GPT from scratch</a>
            <a href="https://transformer-circuits.pub/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Transformer Circuits — Anthropic research</a>
          </div>
        </div>

      </div>
    </div>
  );
}
