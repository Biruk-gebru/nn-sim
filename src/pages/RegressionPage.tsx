import { useState, useRef, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────
interface Point { id: number; x: number; y: number; }

let _nextId = 9;

const DEFAULT_POINTS: Point[] = [
  { id: 1, x: 1.1, y: 1.6 }, { id: 2, x: 2.3, y: 2.9 },
  { id: 3, x: 3.4, y: 3.1 }, { id: 4, x: 4.2, y: 4.8 },
  { id: 5, x: 5.6, y: 5.3 }, { id: 6, x: 6.8, y: 6.7 },
  { id: 7, x: 8.1, y: 7.9 }, { id: 8, x: 9.0, y: 8.4 },
];

// ── Gradient descent ───────────────────────────────────────────
function gradStep(pts: Point[], m: number, b: number, lr: number) {
  if (pts.length < 2) return { m, b, loss: 0 };
  const n = pts.length;
  let dm = 0, db = 0, mse = 0;
  for (const p of pts) {
    const e = m * p.x + b - p.y;
    dm += e * p.x;
    db += e;
    mse += e * e;
  }
  return { m: m - lr * (2 / n) * dm, b: b - lr * (2 / n) * db, loss: mse / n };
}

// ── SVG layout ─────────────────────────────────────────────────
const SW = 600, SH = 380;
const PAD = { top: 16, right: 20, bottom: 36, left: 44 };
const PW = SW - PAD.left - PAD.right;
const PH = SH - PAD.top - PAD.bottom;
const XMN = 0, XMX = 10, YMN = 0, YMX = 10;

const sX = (x: number) => PAD.left + ((x - XMN) / (XMX - XMN)) * PW;
const sY = (y: number) => PAD.top + (1 - (y - YMN) / (YMX - YMN)) * PH;
const dX = (px: number) => XMN + ((px - PAD.left) / PW) * (XMX - XMN);
const dY = (py: number) => YMX - ((py - PAD.top) / PH) * (YMX - YMN);

function toData(el: SVGSVGElement, cx: number, cy: number) {
  const r = el.getBoundingClientRect();
  const px = ((cx - r.left) / r.width) * SW;
  const py = ((cy - r.top) / r.height) * SH;
  return {
    x: Math.max(XMN + 0.1, Math.min(XMX - 0.1, dX(px))),
    y: Math.max(YMN + 0.1, Math.min(YMX - 0.1, dY(py))),
  };
}

const LR_OPTS = [0.001, 0.01, 0.05, 0.1] as const;
const STEPS_PER_TICK = 5;
const SPARK_W = 100, SPARK_H = 28;

// ── Page ───────────────────────────────────────────────────────
export function RegressionPage() {
  const [points, setPoints] = useState<Point[]>(DEFAULT_POINTS);
  const [m, setM] = useState(0);
  const [b, setB] = useState(5);
  const [loss, setLoss] = useState(() => {
    const res = gradStep(DEFAULT_POINTS, 0, 5, 0);
    return res.loss;
  });
  const [epoch, setEpoch] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lr, setLr] = useState<typeof LR_OPTS[number]>(0.01);
  const [showResiduals, setShowResiduals] = useState(true);
  const [lossHist, setLossHist] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for animation loop (avoid stale closures)
  const svgRef = useRef<SVGSVGElement>(null);
  const mRef = useRef(0);
  const bRef = useRef(5);
  const ptsRef = useRef(DEFAULT_POINTS);
  const lrRef = useRef<number>(0.01);
  const epochRef = useRef(0);
  const dragId = useRef<number | null>(null);

  useEffect(() => { lrRef.current = lr; }, [lr]);
  useEffect(() => { ptsRef.current = points; }, [points]);

  // Recompute loss when paused and points change
  useEffect(() => {
    if (!isPlaying) {
      const { loss: l } = gradStep(points, mRef.current, bRef.current, 0);
      setLoss(l);
    }
  }, [points, isPlaying]);

  // Play/pause loop
  const tick = useCallback(() => {
    let cm = mRef.current, cb = bRef.current, cl = 0;
    for (let i = 0; i < STEPS_PER_TICK; i++) {
      const r = gradStep(ptsRef.current, cm, cb, lrRef.current);
      cm = r.m; cb = r.b; cl = r.loss;
    }
    mRef.current = cm;
    bRef.current = cb;
    epochRef.current += STEPS_PER_TICK;
    setM(cm);
    setB(cb);
    setLoss(cl);
    setEpoch(epochRef.current);
    setLossHist(h => { const n = [...h, cl]; return n.length > 120 ? n.slice(-120) : n; });
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(tick, 33);
    return () => clearInterval(id);
  }, [isPlaying, tick]);

  function resetModel() {
    mRef.current = 0; bRef.current = 5; epochRef.current = 0;
    setM(0); setB(5); setEpoch(0); setLossHist([]);
    const { loss: l } = gradStep(ptsRef.current, 0, 5, 0);
    setLoss(l);
  }

  function stepOnce() {
    const r = gradStep(ptsRef.current, mRef.current, bRef.current, lrRef.current);
    mRef.current = r.m; bRef.current = r.b;
    epochRef.current += 1;
    setM(r.m); setB(r.b); setLoss(r.loss); setEpoch(epochRef.current);
    setLossHist(h => { const n = [...h, r.loss]; return n.length > 120 ? n.slice(-120) : n; });
  }

  // ── Pointer handlers ─────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const t = e.target as SVGElement;
    const pid = t.getAttribute('data-pid');
    if (pid) {
      dragId.current = Number(pid);
      setIsDragging(true);
      return;
    }
    // Click on background → add point
    if (t.tagName === 'rect' || t.tagName === 'svg') {
      const { x, y } = toData(svgRef.current, e.clientX, e.clientY);
      const np: Point = { id: _nextId++, x, y };
      const next = [...ptsRef.current, np];
      ptsRef.current = next;
      setPoints(next);
    }
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (dragId.current === null || !svgRef.current) return;
    const { x, y } = toData(svgRef.current, e.clientX, e.clientY);
    const id = dragId.current;
    setPoints(prev => {
      const next = prev.map(p => p.id === id ? { ...p, x, y } : p);
      ptsRef.current = next;
      return next;
    });
  }

  function onMouseUp() {
    if (dragId.current !== null) {
      dragId.current = null;
      setIsDragging(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────
  const lossColor = loss < 0.08 ? 'var(--green)' : loss > 3 ? 'var(--red)' : undefined;

  // Loss sparkline
  let sparkPts = '';
  if (lossHist.length > 1) {
    const maxL = Math.max(...lossHist);
    sparkPts = lossHist
      .map((l, i) =>
        `${(i / (lossHist.length - 1)) * SPARK_W},${SPARK_H - (l / (maxL || 1)) * SPARK_H}`)
      .join(' ');
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 32px 80px' }}>

        {/* Header */}
        <h1 style={{
          margin: '0 0 10px',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(26px, 4vw, 38px)',
          fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5,
        }}>
          Linear Regression
        </h1>
        <p style={{
          margin: '0 0 28px', fontSize: 15,
          color: 'var(--text-mid)', lineHeight: 1.7, maxWidth: 520,
        }}>
          Gradient descent finds y&nbsp;=&nbsp;mx&nbsp;+&nbsp;b by minimizing mean squared error.
          Click to add points, drag to move them.
        </p>

        {/* Chart */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, overflow: 'hidden', marginBottom: 16,
        }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SW} ${SH}`}
            style={{ width: '100%', display: 'block', cursor: isDragging ? 'grabbing' : 'crosshair' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <defs>
              <clipPath id="reg-clip">
                <rect x={PAD.left} y={PAD.top} width={PW} height={PH} />
              </clipPath>
            </defs>

            {/* Grid */}
            {[1,2,3,4,5,6,7,8,9].map(v => (
              <g key={v}>
                <line x1={sX(v)} y1={PAD.top} x2={sX(v)} y2={SH - PAD.bottom}
                  stroke="var(--border)" strokeWidth={0.5} />
                <line x1={PAD.left} y1={sY(v)} x2={SW - PAD.right} y2={sY(v)}
                  stroke="var(--border)" strokeWidth={0.5} />
              </g>
            ))}

            {/* Axis labels */}
            {[0,2,4,6,8,10].map(v => (
              <g key={v}>
                <text x={sX(v)} y={SH - PAD.bottom + 18}
                  textAnchor="middle" fontSize={10}
                  fill="var(--text-faint)" fontFamily="var(--font-mono)">{v}</text>
                <text x={PAD.left - 7} y={sY(v) + 4}
                  textAnchor="end" fontSize={10}
                  fill="var(--text-faint)" fontFamily="var(--font-mono)">{v}</text>
              </g>
            ))}

            <g clipPath="url(#reg-clip)">
              {/* Residuals */}
              {showResiduals && points.map(p => (
                <line key={p.id}
                  x1={sX(p.x)} y1={sY(p.y)}
                  x2={sX(p.x)} y2={sY(m * p.x + b)}
                  stroke="var(--red)" strokeWidth={1.2} opacity={0.45}
                />
              ))}

              {/* Regression line */}
              <line
                x1={sX(XMN)} y1={sY(m * XMN + b)}
                x2={sX(XMX)} y2={sY(m * XMX + b)}
                stroke="var(--teal)" strokeWidth={2}
              />

              {/* Points */}
              {points.map(p => (
                <circle
                  key={p.id}
                  cx={sX(p.x)} cy={sY(p.y)}
                  r={6.5}
                  fill="var(--accent)" fillOpacity={0.88}
                  stroke="var(--bg)" strokeWidth={1.5}
                  data-pid={p.id}
                  style={{ cursor: 'grab' }}
                />
              ))}
            </g>

            {/* Border */}
            <rect x={PAD.left} y={PAD.top} width={PW} height={PH}
              fill="none" stroke="var(--border-mid)" strokeWidth={1} />

            {/* Loss sparkline inset */}
            {lossHist.length > 1 && (
              <g transform={`translate(${SW - PAD.right - SPARK_W - 6},${PAD.top + 6})`}>
                <rect x={0} y={0} width={SPARK_W} height={SPARK_H}
                  fill="var(--deep)" fillOpacity={0.85} rx={3} />
                <polyline points={sparkPts} fill="none"
                  stroke="var(--orange)" strokeWidth={1.2} />
                <text x={4} y={SPARK_H - 4} fontSize={8}
                  fill="var(--text-faint)" fontFamily="var(--font-mono)">loss</text>
              </g>
            )}
          </svg>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 28, marginBottom: 18, flexWrap: 'wrap' }}>
          <Stat label="epoch"      value={epoch.toLocaleString()} />
          <Stat label="loss (MSE)" value={loss.toFixed(4)} color={lossColor} />
          <Stat label="slope m"    value={m >= 0 ? `+${m.toFixed(3)}` : m.toFixed(3)} />
          <Stat label="intercept b" value={b >= 0 ? `+${b.toFixed(3)}` : b.toFixed(3)} />
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn onClick={stepOnce} disabled={isPlaying}>step</Btn>

          <Btn
            onClick={() => setIsPlaying(p => !p)}
            active={isPlaying}
          >
            {isPlaying ? 'pause' : 'play'}
          </Btn>

          <Btn onClick={() => { setIsPlaying(false); resetModel(); setPoints(DEFAULT_POINTS); ptsRef.current = DEFAULT_POINTS; }}>
            reset
          </Btn>

          <div style={{ width: 1, height: 20, background: 'var(--border-mid)', margin: '0 6px' }} />

          <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>lr</span>
          {LR_OPTS.map(l => (
            <button
              key={l}
              onClick={() => setLr(l)}
              style={{
                background: lr === l ? 'var(--accent-dim)' : 'transparent',
                border: 'none', borderRadius: 4,
                color: lr === l ? 'var(--accent)' : 'var(--text-dim)',
                fontSize: 12, cursor: 'pointer', padding: '3px 8px',
                fontFamily: 'var(--font-mono)',
                transition: 'color 0.15s, background 0.15s',
              }}
            >
              {l}
            </button>
          ))}

          <div style={{ width: 1, height: 20, background: 'var(--border-mid)', margin: '0 6px' }} />

          <button
            onClick={() => setShowResiduals(r => !r)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: showResiduals ? 1 : 0.3,
              transition: 'opacity 0.15s',
            }}
          >
            <span style={{
              width: 18, height: 2,
              background: 'var(--red)', display: 'inline-block', borderRadius: 1,
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              residuals
            </span>
          </button>
        </div>

        <div style={{ marginTop: 56, paddingTop: 40, borderTop: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 20px', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>how it works</p>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Linear regression finds the line y = mx + b that best fits a set of data points. "Best fit" means minimising mean squared error — the average of the squared vertical distances from each point to the line (the red residual lines above). Squaring the errors makes them always positive and penalises large errors more than small ones, producing a unique differentiable loss surface.
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Gradient descent is the optimiser. At each step it computes the direction in which loss increases fastest (the gradient), then moves the parameters a small step in the opposite direction. The step size is the learning rate. Too small and convergence is painfully slow. Too large and the parameters overshoot the minimum, oscillating or diverging — try lr = 0.1 and watch this happen.
          </p>
          <p style={{ margin: '0 0 32px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Linear regression has a closed-form solution (the normal equation), but gradient descent generalises to arbitrarily complex models — which is why it became the universal training algorithm in deep learning. Drag a point far from the cluster and watch the line chase it: you're watching gradient descent adapt to a distributional shift in real time.
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>learn more</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="https://www.coursera.org/specializations/machine-learning-introduction" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Andrew Ng: Machine Learning Specialization (Coursera)</a>
            <a href="https://distill.pub/2017/momentum/" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Why Momentum Really Works — distill.pub</a>
            <a href="https://arxiv.org/abs/1802.01528" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ The Matrix Calculus You Need for Deep Learning (arxiv)</a>
            <a href="https://www.khanacademy.org/math/statistics-probability/describing-relationships-quantitative-data" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Khan Academy: Linear regression foundations</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600,
        color: color ?? 'var(--text)', transition: 'color 0.3s',
      }}>
        {value}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
    </div>
  );
}

function Btn({
  onClick, children, disabled = false, active = false,
}: {
  onClick: () => void; children: React.ReactNode;
  disabled?: boolean; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="ctrl-btn"
      style={{
        background: active ? 'var(--accent-dim)' : 'var(--surface)',
        border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border-mid)'),
        borderRadius: 6,
        color: disabled ? 'var(--text-faint)' : active ? 'var(--accent)' : 'var(--text-mid)',
        fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '6px 14px',
        fontFamily: 'var(--font-mono)',
        fontWeight: active ? 600 : 400,
        transition: 'color 0.15s, background 0.15s, border-color 0.15s',
      }}
    >
      {children}
    </button>
  );
}
