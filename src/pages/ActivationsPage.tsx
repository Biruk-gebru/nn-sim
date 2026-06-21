import { useState, useRef, useCallback } from 'react';

// ─── Math ────────────────────────────────────────────────────────────────────

const _sig  = (x: number) => 1 / (1 + Math.exp(-x));
const _dsig = (x: number) => { const s = _sig(x); return s * (1 - s); };
const _gelu = (x: number) =>
  0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));
const _dgelu = (x: number) => {
  const k = Math.sqrt(2 / Math.PI);
  const inner = k * (x + 0.044715 * x ** 3);
  const tgh = Math.tanh(inner);
  const sech2 = 1 - tgh ** 2;
  return 0.5 * (1 + tgh) + 0.5 * x * sech2 * k * (1 + 3 * 0.044715 * x ** 2);
};
const _swish  = (x: number) => x * _sig(x);
const _dswish = (x: number) => _sig(x) + x * _dsig(x);

interface FnDef {
  key: string;
  label: string;
  formula: string;
  dFormula: string;
  color: string;
  fn: (x: number) => number;
  dfn: (x: number) => number;
  range: string;
  saturating: boolean;
  smooth: boolean;
  monotone: boolean;
  usedIn: string;
  gradNote: string;
}

const FUNS: FnDef[] = [
  {
    key: 'sigmoid', label: 'Sigmoid',
    formula: 'σ(x) = 1 / (1 + e⁻ˣ)',
    dFormula: "σ'(x) = σ(x)(1 − σ(x))",
    color: '#78d4a8',
    fn: _sig, dfn: _dsig,
    range: '(0, 1)', saturating: true, smooth: true, monotone: true,
    usedIn: 'binary classification, LSTM gates',
    gradNote: 'Max gradient 0.25 at x=0; saturates → near-zero gradient at extremes',
  },
  {
    key: 'tanh', label: 'Tanh',
    formula: 'tanh(x) = (eˣ − e⁻ˣ) / (eˣ + e⁻ˣ)',
    dFormula: "tanh'(x) = 1 − tanh²(x)",
    color: '#d49a3a',
    fn: Math.tanh, dfn: (x) => 1 - Math.tanh(x) ** 2,
    range: '(−1, 1)', saturating: true, smooth: true, monotone: true,
    usedIn: 'RNNs, hidden layers',
    gradNote: 'Max gradient 1.0 at x=0; still saturates but zero-centred helps training',
  },
  {
    key: 'relu', label: 'ReLU',
    formula: 'ReLU(x) = max(0, x)',
    dFormula: "ReLU'(x) = 1 if x > 0, else 0",
    color: '#cbe86b',
    fn: (x) => Math.max(0, x), dfn: (x) => (x > 0 ? 1 : 0),
    range: '[0, ∞)', saturating: false, smooth: false, monotone: true,
    usedIn: 'CNNs, deep networks (most popular)',
    gradNote: 'Constant gradient 1 for x>0; zero for x<0 → dying ReLU problem',
  },
  {
    key: 'gelu', label: 'GELU',
    formula: 'GELU(x) ≈ 0.5x(1 + tanh(√(2/π)(x + 0.044715x³)))',
    dFormula: "GELU'(x) ≈ Φ(x) + xφ(x)",
    color: '#6aace0',
    fn: _gelu, dfn: _dgelu,
    range: '≈ (−0.17, ∞)', saturating: false, smooth: true, monotone: false,
    usedIn: 'GPT, BERT, transformers',
    gradNote: 'Smooth, probabilistic variant of ReLU; avoids dead neurons',
  },
  {
    key: 'leaky_relu', label: 'Leaky ReLU',
    formula: 'LReLU(x) = x if x>0, else 0.01x',
    dFormula: "LReLU'(x) = 1 if x>0, else 0.01",
    color: '#e0623a',
    fn: (x) => x > 0 ? x : 0.01 * x, dfn: (x) => (x > 0 ? 1 : 0.01),
    range: '(−∞, ∞)', saturating: false, smooth: false, monotone: true,
    usedIn: 'GANs, deep networks (ReLU fix)',
    gradNote: 'Small negative slope α=0.01 prevents dying neurons; non-zero everywhere',
  },
  {
    key: 'swish', label: 'Swish',
    formula: 'Swish(x) = x · σ(x)',
    dFormula: "Swish'(x) = σ(x) + x · σ'(x)",
    color: '#a0c84a',
    fn: _swish, dfn: _dswish,
    range: '≈ (−0.28, ∞)', saturating: false, smooth: true, monotone: false,
    usedIn: 'EfficientNet, NLP (Google research)',
    gradNote: 'Non-monotone, self-gated; slightly outperforms GELU in some benchmarks',
  },
];

// ─── Chart geometry ──────────────────────────────────────────────────────────

const X_MIN = -5, X_MAX = 5, Y_MIN = -2.2, Y_MAX = 2.2;
const STEPS = 400;

function makeGeom(w: number, h: number, pad: { t: number; r: number; b: number; l: number }) {
  const pw = w - pad.l - pad.r;
  const ph = h - pad.t - pad.b;
  const sx = (x: number) => pad.l + ((x - X_MIN) / (X_MAX - X_MIN)) * pw;
  const sy = (y: number) => pad.t + (1 - (Math.max(Y_MIN, Math.min(Y_MAX, y)) - Y_MIN) / (Y_MAX - Y_MIN)) * ph;
  const dataX = (px: number) => X_MIN + ((px - pad.l) / pw) * (X_MAX - X_MIN);
  return { pw, ph, sx, sy, dataX };
}

function makePts(fn: (x: number) => number, sx: (x: number) => number, sy: (y: number) => number): string {
  const pts: string[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const x = X_MIN + (i / STEPS) * (X_MAX - X_MIN);
    const y = fn(x);
    if (!isFinite(y)) continue;
    pts.push(`${sx(x).toFixed(1)},${sy(y).toFixed(1)}`);
  }
  return pts.join(' ');
}

// ─── Reusable Chart ──────────────────────────────────────────────────────────

interface ChartProps {
  fns: FnDef[];
  w: number;
  h: number;
  pad?: { t: number; r: number; b: number; l: number };
  showDeriv: boolean;
  showSatZones: boolean;
  cursorX: number | null;
  onMouseMove?: (x: number | null) => void;
  compact?: boolean;
}

function Chart({ fns, w, h, pad, showDeriv, showSatZones, cursorX, onMouseMove, compact }: ChartProps) {
  const p = pad ?? { t: 14, r: 16, b: 32, l: 42 };
  const { pw, ph, sx, sy, dataX } = makeGeom(w, h, p);
  const svgRef = useRef<SVGSVGElement>(null);

  const gx = compact ? [-4, -2, 0, 2, 4] : [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const gy = compact ? [-1.5, 0, 1.5] : [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
  const axisLabelX = compact ? [-4, 0, 4] : [-4, -2, 0, 2, 4];
  const axisLabelY = compact ? [-1, 0, 1] : [-2, -1, 0, 1, 2];

  const handleMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!onMouseMove || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    const dx = dataX(px);
    onMouseMove(dx >= X_MIN && dx <= X_MAX ? dx : null);
  }, [onMouseMove, dataX, w]);

  const csx = cursorX !== null ? sx(cursorX) : null;
  const labelAnchor = cursorX !== null && cursorX > 1.5 ? 'end' : 'start';
  const labelOffX = cursorX !== null && cursorX > 1.5 ? -6 : 6;

  // Saturation zone: where |f'(x)| < 0.1 for all active fns combined
  // Just shade where any fn saturates
  const satZones: Array<[number, number]> = [];
  if (showSatZones) {
    const threshold = 0.12;
    let inZone = false, zoneStart = X_MIN;
    for (let i = 0; i <= STEPS; i++) {
      const x = X_MIN + (i / STEPS) * (X_MAX - X_MIN);
      const maxGrad = Math.max(...fns.map(f => Math.abs(f.dfn(x))));
      if (maxGrad < threshold && !inZone) { inZone = true; zoneStart = x; }
      if ((maxGrad >= threshold || i === STEPS) && inZone) { satZones.push([zoneStart, x]); inZone = false; }
    }
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', display: 'block', cursor: onMouseMove ? 'crosshair' : 'default' }}
      onMouseMove={handleMove}
      onMouseLeave={() => onMouseMove?.(null)}
    >
      <defs>
        <clipPath id={`clip-${w}`}>
          <rect x={p.l} y={p.t} width={pw} height={ph} />
        </clipPath>
      </defs>

      {/* Grid */}
      {gx.map(x => (
        <line key={`gx${x}`} x1={sx(x)} y1={p.t} x2={sx(x)} y2={h - p.b}
          stroke={x === 0 ? 'var(--border-mid)' : 'var(--border)'}
          strokeWidth={x === 0 ? 1 : 0.5} />
      ))}
      {gy.map(y => (
        <line key={`gy${y}`} x1={p.l} y1={sy(y)} x2={w - p.r} y2={sy(y)}
          stroke={y === 0 ? 'var(--border-mid)' : 'var(--border)'}
          strokeWidth={y === 0 ? 1 : 0.5} />
      ))}

      {/* Saturation zones */}
      <g clipPath={`url(#clip-${w})`}>
        {satZones.map(([x1, x2], i) => (
          <rect key={i} x={sx(x1)} y={p.t} width={sx(x2) - sx(x1)} height={ph}
            fill="rgba(224,98,58,0.08)" />
        ))}

        {/* Curves */}
        {fns.map(f => {
          const pts = makePts(f.fn, sx, sy);
          const dpts = makePts(f.dfn, sx, sy);
          return (
            <g key={f.key}>
              <polyline points={pts} fill="none" stroke={f.color} strokeWidth={compact ? 1.5 : 2} strokeLinejoin="round" />
              {showDeriv && (
                <polyline points={dpts} fill="none" stroke={f.color}
                  strokeWidth={compact ? 1 : 1.5} strokeDasharray="5 3" opacity={0.6} />
              )}
            </g>
          );
        })}

        {/* Cursor line + dots */}
        {csx !== null && cursorX !== null && (
          <>
            <line x1={csx} y1={p.t} x2={csx} y2={h - p.b}
              stroke="var(--border-strong)" strokeWidth={1} />
            {!compact && (
              <text x={csx + labelOffX} y={p.t + 12} textAnchor={labelAnchor}
                fontSize={9} fill="var(--text-dim)" fontFamily="var(--font-mono)">
                x={cursorX.toFixed(2)}
              </text>
            )}
            {fns.map(f => {
              const y = f.fn(cursorX);
              if (!isFinite(y) || y < Y_MIN || y > Y_MAX) return null;
              return <circle key={f.key} cx={csx} cy={sy(y)} r={compact ? 3 : 4}
                fill={f.color} stroke="var(--surface)" strokeWidth={1.5} />;
            })}
            {showDeriv && fns.map(f => {
              const y = f.dfn(cursorX);
              if (!isFinite(y) || y < Y_MIN || y > Y_MAX) return null;
              return <circle key={`d${f.key}`} cx={csx} cy={sy(y)} r={compact ? 2.5 : 3}
                fill="var(--surface)" stroke={f.color} strokeWidth={1.5} opacity={0.8} />;
            })}
          </>
        )}
      </g>

      {/* Axis labels */}
      {axisLabelX.map(x => (
        <text key={`xl${x}`} x={sx(x)} y={h - p.b + 16} textAnchor="middle"
          fontSize={compact ? 9 : 10} fill="var(--text-faint)" fontFamily="var(--font-mono)">{x}</text>
      ))}
      {axisLabelY.map(y => (
        <text key={`yl${y}`} x={p.l - 6} y={sy(y) + 3.5} textAnchor="end"
          fontSize={compact ? 9 : 10} fill="var(--text-faint)" fontFamily="var(--font-mono)">{y}</text>
      ))}

      {/* Border */}
      <rect x={p.l} y={p.t} width={pw} height={ph}
        fill="none" stroke="var(--border-mid)" strokeWidth={0.8} />

      {/* Legend inside compact charts */}
      {compact && showDeriv && (
        <g>
          <line x1={w - p.r - 50} y1={p.t + 8} x2={w - p.r - 36} y2={p.t + 8}
            stroke="var(--text-faint)" strokeWidth={1.5} />
          <text x={w - p.r - 32} y={p.t + 12} fontSize={8} fill="var(--text-faint)" fontFamily="var(--font-mono)">f</text>
          <line x1={w - p.r - 50} y1={p.t + 20} x2={w - p.r - 36} y2={p.t + 20}
            stroke="var(--text-faint)" strokeWidth={1.5} strokeDasharray="4 2" />
          <text x={w - p.r - 32} y={p.t + 24} fontSize={8} fill="var(--text-faint)" fontFamily="var(--font-mono)">f′</text>
        </g>
      )}
    </svg>
  );
}

// ─── Gradient health bar ─────────────────────────────────────────────────────

function GradHealth({ dfn, x }: { dfn: (x: number) => number; x: number }) {
  const g = Math.abs(dfn(x));
  const clamped = Math.min(g, 1);
  const color = g < 0.1 ? 'var(--red)' : g < 0.3 ? 'var(--orange)' : 'var(--accent)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--deep)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${clamped * 100}%`, height: '100%', background: color, transition: 'width 0.15s' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color, width: 36, textAlign: 'right' }}>
        {g.toFixed(3)}
      </span>
    </div>
  );
}

// ─── Individual function card ─────────────────────────────────────────────────

function FnCard({ f, showDeriv, showSatZones, cursorX, onFocus }: {
  f: FnDef; showDeriv: boolean; showSatZones: boolean;
  cursorX: number | null; onFocus: () => void;
}) {
  const [hov, setHov] = useState(false);
  const fv = cursorX !== null ? f.fn(cursorX) : null;
  const dv = cursorX !== null ? f.dfn(cursorX) : null;

  return (
    <div
      onClick={onFocus}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hov ? f.color + '66' : 'var(--border)'}`,
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 0' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{f.label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginLeft: 'auto' }}>click to expand</span>
      </div>

      {/* Mini chart */}
      <div style={{ padding: '6px 0 0' }}>
        <Chart fns={[f]} w={280} h={160}
          pad={{ t: 10, r: 12, b: 24, l: 34 }}
          showDeriv={showDeriv} showSatZones={showSatZones}
          cursorX={cursorX} compact />
      </div>

      {/* Properties */}
      <div style={{ padding: '8px 14px 12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginBottom: 6 }}>
          {f.formula}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 10px', marginBottom: 8 }}>
          {[
            ['range', f.range],
            ['saturating', f.saturating ? 'yes' : 'no'],
            ['smooth', f.smooth ? 'C∞' : 'piecewise'],
            ['monotone', f.monotone ? 'yes' : 'no'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)' }}>{k}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: f.saturating && k === 'saturating' ? 'var(--orange)' : 'var(--text-dim)' }}>{v}</span>
            </div>
          ))}
        </div>

        {cursorX !== null && fv !== null && dv !== null && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>f({cursorX.toFixed(2)})</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: f.color }}>{fv.toFixed(4)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>f′({cursorX.toFixed(2)})</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: f.color, opacity: 0.75 }}>{dv.toFixed(4)}</span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-faint)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>gradient flow</div>
            <GradHealth dfn={f.dfn} x={cursorX} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Focused single function view ────────────────────────────────────────────

function FnFocus({ f, showDeriv, showSatZones, cursorX, onClose }: {
  f: FnDef; showDeriv: boolean; showSatZones: boolean;
  cursorX: number | null; onClose: () => void;
}) {
  const fv = cursorX !== null ? f.fn(cursorX) : null;
  const dv = cursorX !== null ? f.dfn(cursorX) : null;

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${f.color}44`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
    }}>
      {/* Focus header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: f.color, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{f.label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginLeft: 4 }}>{f.formula}</span>
        <button onClick={onClose} style={{
          marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)',
          borderRadius: 4, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 11,
          cursor: 'pointer', padding: '3px 10px',
        }}>✕ close</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 0 }}>
        {/* Chart */}
        <div style={{ padding: '0' }}>
          <Chart fns={[f]} w={580} h={320}
            pad={{ t: 16, r: 16, b: 36, l: 46 }}
            showDeriv={showDeriv} showSatZones={showSatZones}
            cursorX={cursorX} />
        </div>

        {/* Detail panel */}
        <div style={{ borderLeft: '1px solid var(--border)', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Formulas */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginBottom: 6 }}>formulas</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-mid)', lineHeight: 1.7 }}>f(x) = {f.formula.split('=')[1]?.trim()}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: f.color, opacity: 0.75, lineHeight: 1.7, marginTop: 2 }}>f′(x) = {f.dFormula.split('=')[1]?.trim()}</div>
          </div>

          {/* Properties */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginBottom: 8 }}>properties</div>
            {[
              ['output range', f.range],
              ['saturating', f.saturating ? 'yes' : 'no'],
              ['differentiable', f.smooth ? 'everywhere' : 'piecewise'],
              ['monotone', f.monotone ? 'yes' : 'no'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}>{k}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: f.saturating && k === 'saturating' ? 'var(--orange)' : 'var(--text-dim)' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Used in */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>used in</div>
            <div style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6 }}>{f.usedIn}</div>
          </div>

          {/* Gradient note */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>gradient behavior</div>
            <div style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6 }}>{f.gradNote}</div>
          </div>

          {/* Live values */}
          {cursorX !== null && fv !== null && dv !== null && (
            <div style={{ background: 'var(--deep)', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginBottom: 8 }}>at x = {cursorX.toFixed(3)}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>f(x)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: f.color }}>{fv.toFixed(6)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>f′(x)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: f.color, opacity: 0.75 }}>{dv.toFixed(6)}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>gradient flow</div>
              <GradHealth dfn={f.dfn} x={cursorX} />
              {Math.abs(dv) < 0.1 && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                  near-zero gradient, vanishing
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Values table ─────────────────────────────────────────────────────────────

function ValuesTable({ fns, cursorX, showDeriv }: {
  fns: FnDef[]; cursorX: number; showDeriv: boolean;
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: showDeriv ? '1fr 120px 120px 100px' : '1fr 120px 100px',
        padding: '6px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-alt)',
      }}>
        {['function', `f(${cursorX.toFixed(2)})`, ...(showDeriv ? [`f′(${cursorX.toFixed(2)})`] : []), 'grad flow'].map((h, i) => (
          <span key={i} style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{h}</span>
        ))}
      </div>
      {fns.map(f => {
        const fv = f.fn(cursorX);
        const dv = f.dfn(cursorX);
        const g = Math.abs(dv);
        const gColor = g < 0.1 ? 'var(--red)' : g < 0.3 ? 'var(--orange)' : 'var(--accent)';
        return (
          <div key={f.key} style={{
            display: 'grid',
            gridTemplateColumns: showDeriv ? '1fr 120px 120px 100px' : '1fr 120px 100px',
            padding: '6px 16px',
            borderBottom: '1px solid var(--border)',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.color, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-mid)' }}>{f.label}</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>{f.range}</span>
            </div>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: f.color }}>
              {isFinite(fv) ? fv.toFixed(5) : '—'}
            </span>
            {showDeriv && (
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: f.color, opacity: 0.7 }}>
                {isFinite(dv) ? dv.toFixed(5) : '—'}
              </span>
            )}
            <div style={{ width: 80 }}>
              <div style={{ height: 5, background: 'var(--deep)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(g, 1) * 100}%`, height: '100%', background: gColor }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Properties comparison table ─────────────────────────────────────────────

function PropsTable({ fns }: { fns: FnDef[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        <thead>
          <tr>
            {['', 'range', 'saturating', 'differentiable', 'monotone', 'used in'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '6px 12px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)', fontWeight: 400 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fns.map(f => (
            <tr key={f.key}>
              <td style={{ padding: '7px 12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-mid)', fontWeight: 600 }}>{f.label}</span>
                </div>
              </td>
              <td style={{ padding: '7px 12px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>{f.range}</td>
              <td style={{ padding: '7px 12px', borderBottom: '1px solid var(--border)', color: f.saturating ? 'var(--orange)' : 'var(--text-dim)' }}>
                {f.saturating ? 'yes' : 'no'}
              </td>
              <td style={{ padding: '7px 12px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>{f.smooth ? 'C∞ everywhere' : 'piecewise'}</td>
              <td style={{ padding: '7px 12px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>{f.monotone ? 'yes' : 'no'}</td>
              <td style={{ padding: '7px 12px', color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>{f.usedIn}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ActivationsPage() {
  const [view, setView] = useState<'combined' | 'individual'>('combined');
  const [enabled, setEnabled] = useState<Set<string>>(new Set(['sigmoid', 'tanh', 'relu', 'gelu']));
  const [showDeriv, setShowDeriv] = useState(false);
  const [showSatZones, setShowSatZones] = useState(false);
  const [showProps, setShowProps] = useState(false);
  const [cursorX, setCursorX] = useState<number | null>(null);
  const [probeX, setProbeX] = useState(0);
  const [focused, setFocused] = useState<string | null>(null);

  const activeFns = FUNS.filter(f => enabled.has(f.key));
  const displayX = cursorX ?? probeX;

  const toggle = (key: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const focusedFn = FUNS.find(f => f.key === focused);

  const card: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '48px 28px 80px' }}>

        {/* Header */}
        <h1 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>
          Activations
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.7, maxWidth: 560 }}>
          Activation functions decide what a neuron outputs and how gradients flow backward.
          Compare all six side-by-side or inspect each one with its derivative.
        </p>

        {/* View toggle + controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          {(['combined', 'individual'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? 'var(--accent-dim)' : 'transparent',
              border: `1px solid ${view === v ? 'var(--accent)' : 'var(--border-mid)'}`,
              borderRadius: 5, padding: '5px 14px',
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: view === v ? 'var(--accent)' : 'var(--text-dim)',
              cursor: 'pointer', transition: 'color 0.15s, background 0.15s, border-color 0.15s',
            }}>{v}</button>
          ))}

          <div style={{ width: 1, height: 20, background: 'var(--border-mid)', margin: '0 4px' }} />

          <button onClick={() => setShowDeriv(d => !d)} style={{
            background: showDeriv ? 'var(--accent-dim)' : 'transparent',
            border: `1px solid ${showDeriv ? 'var(--accent)' : 'var(--border-mid)'}`,
            borderRadius: 5, padding: '5px 14px',
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: showDeriv ? 'var(--accent)' : 'var(--text-dim)',
            cursor: 'pointer', transition: 'color 0.15s, background 0.15s, border-color 0.15s',
          }}>show f′(x)</button>

          <button onClick={() => setShowSatZones(s => !s)} style={{
            background: showSatZones ? 'rgba(224,98,58,0.15)' : 'transparent',
            border: `1px solid ${showSatZones ? 'var(--red)' : 'var(--border-mid)'}`,
            borderRadius: 5, padding: '5px 14px',
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: showSatZones ? 'var(--red)' : 'var(--text-dim)',
            cursor: 'pointer', transition: 'color 0.15s, background 0.15s, border-color 0.15s',
          }}>sat. zones</button>
        </div>

        {/* Function toggles (combined view) */}
        {view === 'combined' && (
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 14 }}>
            {FUNS.map(f => (
              <button key={f.key} onClick={() => toggle(f.key)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: enabled.has(f.key) ? 1 : 0.28,
                transition: 'opacity 0.15s',
              }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: f.color, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 13, color: 'var(--text-mid)', fontFamily: 'var(--font-mono)' }}>{f.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Combined view ── */}
        {view === 'combined' && (
          <>
            <div style={{ ...card, overflow: 'hidden', marginBottom: 12 }}>
              <Chart fns={activeFns} w={860} h={380}
                pad={{ t: 16, r: 20, b: 36, l: 46 }}
                showDeriv={showDeriv} showSatZones={showSatZones}
                cursorX={cursorX} onMouseMove={setCursorX} />
            </div>

            {/* Legend overlay for deriv */}
            {showDeriv && (
              <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke="var(--text-faint)" strokeWidth={1.5} /></svg>
                  f(x)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke="var(--text-faint)" strokeWidth={1.5} strokeDasharray="4 2" /></svg>
                  f′(x)
                </div>
                {showSatZones && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ display: 'inline-block', width: 14, height: 10, background: 'rgba(224,98,58,0.2)', borderRadius: 2 }} />
                    near-zero gradient
                  </div>
                )}
              </div>
            )}

            {cursorX !== null
              ? <ValuesTable fns={activeFns} cursorX={cursorX} showDeriv={showDeriv} />
              : <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: 0 }}>Hover the chart to compare values at a point.</p>
            }
          </>
        )}

        {/* ── Individual view ── */}
        {view === 'individual' && (
          <>
            {focusedFn && (
              <FnFocus
                f={focusedFn} showDeriv={showDeriv} showSatZones={showSatZones}
                cursorX={displayX} onClose={() => setFocused(null)} />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14, marginBottom: 24 }}>
              {FUNS.map(f => (
                <FnCard
                  key={f.key} f={f}
                  showDeriv={showDeriv} showSatZones={showSatZones}
                  cursorX={displayX}
                  onFocus={() => setFocused(prev => prev === f.key ? null : f.key)}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Shared x probe ── */}
        <div style={{ ...card, padding: '14px 18px', marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>probe x</span>
          <input type="range" min={-5} max={5} step={0.01} value={probeX}
            onChange={e => { setProbeX(parseFloat(e.target.value)); setCursorX(null); }}
            style={{ flex: 1, accentColor: 'var(--accent)' }} />
          <input type="number" min={-5} max={5} step={0.1} value={probeX.toFixed(2)}
            onChange={e => { const v = parseFloat(e.target.value); if (isFinite(v)) { setProbeX(Math.max(-5, Math.min(5, v))); setCursorX(null); } }}
            style={{
              width: 64, background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: 4,
              padding: '4px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)', textAlign: 'right',
            }} />
          {view === 'individual' && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
              {cursorX !== null ? '← from hover' : '← from slider'}
            </span>
          )}
        </div>

        {/* ── Properties table toggle ── */}
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setShowProps(p => !p)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', padding: 0,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 10 }}>{showProps ? '▾' : '▸'}</span> properties comparison
          </button>
          {showProps && (
            <div style={{ ...card, marginTop: 10, overflow: 'hidden' }}>
              <PropsTable fns={FUNS} />
            </div>
          )}
        </div>

        {/* ── Theory ── */}
        <div style={{ marginTop: 56, paddingTop: 40, borderTop: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Without activation functions, any stack of linear layers collapses to a single linear transformation —
            depth adds no expressive power. Non-linearity is what makes deep networks capable of approximating
            arbitrary functions (universal approximation theorem).
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Sigmoid and tanh dominated for decades but suffer from vanishing gradients: at large positive or
            negative inputs, their derivatives approach zero. Gradients shrink to near-nothing as they propagate
            backward. Toggle "sat. zones" to highlight these regions in red. ReLU solved this with a constant
            gradient of 1 for all positive inputs — but introduces dying neurons for x&lt;0.
          </p>
          <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            GELU and Swish are smooth approximations of ReLU that avoid hard zeros. GELU weights inputs by
            their probability under a standard Gaussian — small negative values are suppressed rather than zeroed.
            Both are used in modern transformers (GPT, BERT, EfficientNet).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="https://cs231n.github.io/neural-networks-1/#actfun" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ CS231n: Activation Functions</a>
            <a href="https://arxiv.org/abs/1606.08415" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ GELU — Hendrycks & Gimpel, 2016</a>
            <a href="https://arxiv.org/abs/1710.05941" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Swish: A self-gated activation — Ramachandran et al., 2017</a>
            <a href="https://www.deeplearningbook.org/contents/mlp.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Deep Learning textbook, Chapter 6 — Goodfellow et al.</a>
          </div>
        </div>
      </div>
    </div>
  );
}
