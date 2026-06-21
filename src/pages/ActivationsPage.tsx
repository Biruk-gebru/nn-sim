import { useState, useRef } from 'react';

// ── Activation math ────────────────────────────────────────────
const _sig = (x: number) => 1 / (1 + Math.exp(-x));
const _dsig = (x: number) => { const s = _sig(x); return s * (1 - s); };
const _gelu = (x: number) =>
  0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));
const _dgelu = (x: number) => {
  const cdf = 0.5 * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));
  return cdf + x * (Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI));
};

const FUNS = [
  { key: 'sigmoid',    label: 'sigmoid',    color: '#78d4a8', fn: _sig,                            dfn: _dsig,                                     range: '(0, 1)' },
  { key: 'tanh',       label: 'tanh',       color: '#d49a3a', fn: Math.tanh,                       dfn: (x: number) => 1 - Math.tanh(x) ** 2,     range: '(−1, 1)' },
  { key: 'relu',       label: 'relu',       color: '#cbe86b', fn: (x: number) => Math.max(0, x),  dfn: (x: number) => (x > 0 ? 1 : 0),           range: '[0, ∞)' },
  { key: 'gelu',       label: 'gelu',       color: '#6aace0', fn: _gelu,                           dfn: _dgelu,                                    range: '≈ relu' },
  { key: 'leaky_relu', label: 'leaky relu', color: '#e0623a', fn: (x: number) => x > 0 ? x : 0.01 * x, dfn: (x: number) => (x > 0 ? 1 : 0.01), range: 'α = 0.01' },
  { key: 'swish',      label: 'swish',      color: '#a0c84a', fn: (x: number) => x * _sig(x),     dfn: (x: number) => _sig(x) + x * _dsig(x),    range: '≈ gelu' },
] as const;

// ── SVG coordinate system ──────────────────────────────────────
const SVG_W = 640;
const SVG_H = 370;
const PAD = { top: 16, right: 20, bottom: 36, left: 46 };
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;
const X_MIN = -5, X_MAX = 5, Y_MIN = -2, Y_MAX = 2;
const STEPS = 400;

const sx = (x: number) => PAD.left + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_W;
const sy = (y: number) => PAD.top + (1 - (Math.max(Y_MIN, Math.min(Y_MAX, y)) - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H;
const dataX = (px: number) => X_MIN + ((px - PAD.left) / PLOT_W) * (X_MAX - X_MIN);

function makePts(fn: (x: number) => number): string {
  const pts: string[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const x = X_MIN + (i / STEPS) * (X_MAX - X_MIN);
    const y = fn(x);
    if (!isFinite(y)) continue;
    pts.push(`${sx(x).toFixed(1)},${sy(y).toFixed(1)}`);
  }
  return pts.join(' ');
}

// Precompute at module load — static data
const fnPts  = Object.fromEntries(FUNS.map(f => [f.key, makePts(f.fn)]));
const dfnPts = Object.fromEntries(FUNS.map(f => [f.key, makePts(f.dfn)]));

const GRID_X = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const GRID_Y = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];

// ── Page ───────────────────────────────────────────────────────
export function ActivationsPage() {
  const [enabled, setEnabled] = useState<Set<string>>(
    new Set(['sigmoid', 'tanh', 'relu', 'gelu'])
  );
  const [showDeriv, setShowDeriv] = useState(false);
  const [cursorX, setCursorX] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function toggle(key: string) {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const dx = dataX(px);
    if (dx >= X_MIN && dx <= X_MAX) setCursorX(dx);
  }

  const activeFuns = FUNS.filter(f => enabled.has(f.key));
  const cursorSvgX = cursorX !== null ? sx(cursorX) : null;
  const labelAnchor = cursorX !== null && cursorX > 2 ? 'end' : 'start';
  const labelOffX = cursorX !== null && cursorX > 2 ? -7 : 7;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 32px 80px' }}>

        {/* Header */}
        <h1 style={{
          margin: '0 0 10px',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(26px, 4vw, 38px)',
          fontWeight: 800,
          color: 'var(--text)',
          letterSpacing: -0.5,
        }}>
          Activations
        </h1>
        <p style={{
          margin: '0 0 28px',
          fontSize: 15,
          color: 'var(--text-mid)',
          lineHeight: 1.7,
          maxWidth: 540,
        }}>
          Activation functions decide what a neuron outputs. Hover the chart to compare values —
          then show derivatives to see why some functions cause gradients to vanish.
        </p>

        {/* Chart */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ width: '100%', display: 'block', cursor: 'crosshair' }}
            onMouseMove={onMouseMove}
            onMouseLeave={() => setCursorX(null)}
          >
            <defs>
              <clipPath id="act-clip">
                <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} />
              </clipPath>
            </defs>

            {/* Grid */}
            {GRID_X.map(x => (
              <line key={`gx${x}`}
                x1={sx(x)} y1={PAD.top} x2={sx(x)} y2={SVG_H - PAD.bottom}
                stroke={x === 0 ? 'var(--border-mid)' : 'var(--border)'}
                strokeWidth={x === 0 ? 1 : 0.5}
              />
            ))}
            {GRID_Y.map(y => (
              <line key={`gy${y}`}
                x1={PAD.left} y1={sy(y)} x2={SVG_W - PAD.right} y2={sy(y)}
                stroke={y === 0 ? 'var(--border-mid)' : 'var(--border)'}
                strokeWidth={y === 0 ? 1 : 0.5}
              />
            ))}

            {/* Axis labels */}
            {[-4, -2, 0, 2, 4].map(x => (
              <text key={`xl${x}`}
                x={sx(x)} y={SVG_H - PAD.bottom + 18}
                textAnchor="middle" fontSize={10}
                fill="var(--text-faint)" fontFamily="var(--font-mono)"
              >{x}</text>
            ))}
            {[-1, 0, 1].map(y => (
              <text key={`yl${y}`}
                x={PAD.left - 8} y={sy(y) + 4}
                textAnchor="end" fontSize={10}
                fill="var(--text-faint)" fontFamily="var(--font-mono)"
              >{y}</text>
            ))}

            {/* Curves */}
            <g clipPath="url(#act-clip)">
              {activeFuns.map(f => (
                <g key={f.key}>
                  <polyline
                    points={fnPts[f.key]}
                    fill="none" stroke={f.color} strokeWidth={2} strokeLinejoin="round"
                  />
                  {showDeriv && (
                    <polyline
                      points={dfnPts[f.key]}
                      fill="none" stroke={f.color} strokeWidth={1.5}
                      strokeDasharray="5 3" opacity={0.65}
                    />
                  )}
                </g>
              ))}

              {/* Cursor */}
              {cursorX !== null && cursorSvgX !== null && (
                <>
                  <line
                    x1={cursorSvgX} y1={PAD.top}
                    x2={cursorSvgX} y2={SVG_H - PAD.bottom}
                    stroke="var(--border-strong)" strokeWidth={1}
                  />
                  <text
                    x={cursorSvgX + labelOffX} y={PAD.top + 14}
                    textAnchor={labelAnchor} fontSize={10}
                    fill="var(--text-dim)" fontFamily="var(--font-mono)"
                  >
                    x = {cursorX.toFixed(2)}
                  </text>
                  {activeFuns.map(f => {
                    const yVal = f.fn(cursorX);
                    if (!isFinite(yVal) || yVal < Y_MIN || yVal > Y_MAX) return null;
                    return (
                      <circle
                        key={f.key}
                        cx={cursorSvgX} cy={sy(yVal)}
                        r={4} fill={f.color}
                        stroke="var(--surface)" strokeWidth={1.5}
                      />
                    );
                  })}
                  {showDeriv && activeFuns.map(f => {
                    const yVal = f.dfn(cursorX);
                    if (!isFinite(yVal) || yVal < Y_MIN || yVal > Y_MAX) return null;
                    return (
                      <circle
                        key={`d${f.key}`}
                        cx={cursorSvgX} cy={sy(yVal)}
                        r={3} fill="var(--surface)"
                        stroke={f.color} strokeWidth={1.5} opacity={0.75}
                      />
                    );
                  })}
                </>
              )}
            </g>

            {/* Plot border */}
            <rect
              x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H}
              fill="none" stroke="var(--border-mid)" strokeWidth={1}
            />

            {/* Derivative legend hint */}
            {showDeriv && (
              <g>
                <line x1={SVG_W - PAD.right - 90} y1={PAD.top + 10}
                  x2={SVG_W - PAD.right - 72} y2={PAD.top + 10}
                  stroke="var(--text-faint)" strokeWidth={1.5} />
                <text x={SVG_W - PAD.right - 68} y={PAD.top + 14}
                  fontSize={9} fill="var(--text-faint)" fontFamily="var(--font-mono)">f(x)</text>
                <line x1={SVG_W - PAD.right - 90} y1={PAD.top + 24}
                  x2={SVG_W - PAD.right - 72} y2={PAD.top + 24}
                  stroke="var(--text-faint)" strokeWidth={1.5} strokeDasharray="4 2" />
                <text x={SVG_W - PAD.right - 68} y={PAD.top + 28}
                  fontSize={9} fill="var(--text-faint)" fontFamily="var(--font-mono)">f′(x)</text>
              </g>
            )}
          </svg>
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
          {FUNS.map(f => (
            <button
              key={f.key}
              onClick={() => toggle(f.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 7,
                opacity: enabled.has(f.key) ? 1 : 0.28,
                transition: 'opacity 0.15s',
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: f.color, flexShrink: 0, display: 'inline-block',
              }} />
              <span style={{ fontSize: 13, color: 'var(--text-mid)', fontFamily: 'var(--font-mono)' }}>
                {f.label}
              </span>
            </button>
          ))}

          <button
            onClick={() => setShowDeriv(d => !d)}
            className="ctrl-btn"
            style={{
              marginLeft: 'auto',
              background: showDeriv ? 'var(--accent-dim)' : 'transparent',
              border: '1px solid ' + (showDeriv ? 'var(--accent)' : 'var(--border-mid)'),
              borderRadius: 5,
              color: showDeriv ? 'var(--accent)' : 'var(--text-dim)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              padding: '4px 12px',
              transition: 'color 0.15s, background 0.15s, border-color 0.15s',
            }}
          >
            {showDeriv ? 'hide' : 'show'} f′(x)
          </button>
        </div>

        {/* Values table */}
        {cursorX !== null ? (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: showDeriv ? '1fr 130px 130px' : '1fr 130px',
              padding: '7px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>function</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                f({cursorX.toFixed(2)})
              </span>
              {showDeriv && (
                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  f′({cursorX.toFixed(2)})
                </span>
              )}
            </div>
            {activeFuns.map(f => {
              const fv = f.fn(cursorX);
              const dv = f.dfn(cursorX);
              return (
                <div
                  key={f.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: showDeriv ? '1fr 130px 130px' : '1fr 130px',
                    padding: '6px 16px',
                    borderBottom: '1px solid var(--border)',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: f.color, flexShrink: 0, display: 'inline-block',
                    }} />
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-mid)' }}>
                      {f.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                      {f.range}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: f.color }}>
                    {isFinite(fv) ? fv.toFixed(5) : '—'}
                  </span>
                  {showDeriv && (
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: f.color, opacity: 0.72 }}>
                      {isFinite(dv) ? dv.toFixed(5) : '—'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: 0 }}>
            Hover the chart to compare values at a point.
          </p>
        )}

        <div style={{ marginTop: 56, paddingTop: 40, borderTop: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 20px', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>how it works</p>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Without activation functions, any number of stacked linear layers collapses to a single linear transformation — depth adds no expressive power. Non-linearity is what makes deep networks capable of approximating arbitrary functions. The activation function is the neuron's decision about what signal to pass forward.
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Sigmoid and tanh were standard for decades but suffer from the vanishing gradient problem: at large positive or negative inputs their derivatives approach zero, so gradients shrink to near-nothing as they propagate backward through many layers. Toggle the derivative view and drag the cursor to the far left or right — the f′(x) curves for sigmoid and tanh flatten toward zero, while ReLU stays constant at 1.
          </p>
          <p style={{ margin: '0 0 32px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            ReLU (2011) solved this: its derivative is 1 for all positive inputs. Its downside is "dying ReLU" — neurons stuck at negative inputs receive zero gradient and switch off permanently. Leaky ReLU and GELU address this with non-zero slopes for negative values. GELU, used in GPT and BERT, is a smooth probabilistic variant that tends to outperform ReLU in transformer architectures.
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>learn more</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="https://cs231n.github.io/neural-networks-1/#actfun" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ CS231n: Activation Functions</a>
            <a href="https://arxiv.org/abs/1606.08415" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ GELU paper — Hendrycks & Gimpel, 2016 (arxiv)</a>
            <a href="https://www.deeplearningbook.org/contents/mlp.html" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Deep Learning textbook, Chapter 6 — Goodfellow et al.</a>
            <a href="https://arxiv.org/abs/1811.03378" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Activation functions survey (arxiv)</a>
          </div>
        </div>
      </div>
    </div>
  );
}
