import { useState, useRef, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
interface Point { id: number; x: number; y: number; }

// ── Math ───────────────────────────────────────────────────────────────────

function computeMSE(m: number, b: number, pts: Point[]): number {
  if (!pts.length) return 0;
  return pts.reduce((s, p) => s + (m * p.x + b - p.y) ** 2, 0) / pts.length;
}

function gdStep(m: number, b: number, pts: Point[], lr: number): [number, number] {
  if (pts.length < 2) return [m, b];
  const n = pts.length;
  let dm = 0, db = 0;
  for (const p of pts) {
    const e = m * p.x + b - p.y;
    dm += e * p.x;
    db += e;
  }
  return [m - lr * (2 / n) * dm, b - lr * (2 / n) * db];
}

function normalEq(pts: Point[]): [number, number] {
  if (pts.length < 2) return [0, 0];
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p.x, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
  const sx2 = pts.reduce((s, p) => s + p.x ** 2, 0);
  const denom = n * sx2 - sx ** 2;
  if (Math.abs(denom) < 1e-10) return [0, sy / n];
  const m = (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  return [isFinite(m) ? m : 0, isFinite(b) ? b : 0];
}

function rSquared(m: number, b: number, pts: Point[]): number {
  if (pts.length < 2) return 0;
  const meanY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const ssTot = pts.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = pts.reduce((s, p) => s + (p.y - (m * p.x + b)) ** 2, 0);
  return ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
}

// ── Presets ────────────────────────────────────────────────────────────────

let _id = 50;
function pid() { return _id++; }

function toPoints(raw: { x: number; y: number }[]): Point[] {
  return raw.map(p => ({ id: pid(), ...p }));
}

const PRESETS: Record<string, { x: number; y: number }[]> = {
  linear: [
    { x: 1.1, y: 1.9 }, { x: 2.3, y: 2.8 }, { x: 3.4, y: 3.5 },
    { x: 4.2, y: 4.6 }, { x: 5.6, y: 5.2 }, { x: 6.8, y: 6.8 },
    { x: 7.4, y: 7.1 }, { x: 8.1, y: 8.2 }, { x: 9.0, y: 8.7 },
  ],
  noisy: [
    { x: 0.8, y: 3.5 }, { x: 2.0, y: 0.8 }, { x: 3.1, y: 4.2 },
    { x: 4.0, y: 2.1 }, { x: 5.2, y: 5.8 }, { x: 6.1, y: 3.9 },
    { x: 7.3, y: 7.1 }, { x: 8.5, y: 5.4 }, { x: 9.1, y: 8.8 },
  ],
  outlier: [
    { x: 1.0, y: 1.2 }, { x: 2.2, y: 2.4 }, { x: 3.5, y: 3.3 },
    { x: 4.8, y: 4.7 }, { x: 5.5, y: 5.2 }, { x: 6.9, y: 6.5 },
    { x: 8.0, y: 1.8 }, // outlier — watch it pull the line
    { x: 9.2, y: 8.9 },
  ],
  cluster: [
    { x: 1.5, y: 1.4 }, { x: 1.8, y: 2.1 }, { x: 2.1, y: 1.7 }, { x: 2.3, y: 2.5 },
    { x: 7.5, y: 7.2 }, { x: 7.8, y: 8.1 }, { x: 8.0, y: 7.5 }, { x: 8.3, y: 8.8 },
  ],
};

const INIT_PTS = toPoints(PRESETS.linear);

// ── Scatter plot geometry ──────────────────────────────────────────────────

const SW = 540, SH = 340;
const SPAD = { t: 16, r: 14, b: 36, l: 46 };
const SPW = SW - SPAD.l - SPAD.r;
const SPH = SH - SPAD.t - SPAD.b;
const XR: [number, number] = [0, 10];
const YR: [number, number] = [0, 10];

function px(x: number) { return SPAD.l + ((x - XR[0]) / (XR[1] - XR[0])) * SPW; }
function py(y: number) { return SPAD.t + (1 - (y - YR[0]) / (YR[1] - YR[0])) * SPH; }
function dx(spx: number) { return XR[0] + ((spx - SPAD.l) / SPW) * (XR[1] - XR[0]); }
function dy(spy: number) { return YR[1] - ((spy - SPAD.t) / SPH) * (YR[1] - YR[0]); }

function toData(el: SVGSVGElement, cx: number, cy: number): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  const spx = ((cx - r.left) / r.width) * SW;
  const spy = ((cy - r.top) / r.height) * SH;
  return {
    x: Math.max(XR[0] + 0.05, Math.min(XR[1] - 0.05, dx(spx))),
    y: Math.max(YR[0] + 0.05, Math.min(YR[1] - 0.05, dy(spy))),
  };
}

// ── Loss contour canvas ────────────────────────────────────────────────────

const CC = 180; // canvas resolution (displayed larger via CSS)

function getContourRange(pts: Point[]): { mMin: number; mMax: number; bMin: number; bMax: number } {
  if (pts.length < 2) return { mMin: -0.5, mMax: 2.5, bMin: -0.5, bMax: 5 };
  const [mOpt, bOpt] = normalEq(pts);
  const mRadius = Math.max(Math.abs(mOpt) * 0.6 + 0.8, 1.2);
  const bRadius = Math.max(Math.abs(bOpt) * 0.6 + 0.8, 1.5);
  const mCenter = mOpt / 2;
  const bCenter = bOpt / 2;
  return {
    mMin: mCenter - mRadius,
    mMax: mCenter + mRadius,
    bMin: bCenter - bRadius,
    bMax: bCenter + bRadius,
  };
}

function lossColor(norm: number): [number, number, number] {
  const stops: Array<[number, [number, number, number]]> = [
    [0,    [28, 20, 13]],
    [0.15, [60, 38, 18]],
    [0.35, [110, 60, 22]],
    [0.55, [175, 105, 30]],
    [0.75, [212, 154, 58]],
    [1.0,  [242, 220, 180]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
    if (norm <= t1) {
      const t = (norm - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
    }
  }
  return stops[stops.length - 1][1];
}

function drawContour(
  canvas: HTMLCanvasElement,
  pts: Point[],
  mbHist: [number, number][],
  curM: number,
  curB: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, CC, CC);

  if (pts.length < 2) {
    ctx.fillStyle = '#1c140d';
    ctx.fillRect(0, 0, CC, CC);
    return;
  }

  const { mMin, mMax, bMin, bMax } = getContourRange(pts);
  const [mOpt, bOpt] = normalEq(pts);

  // Build MSE grid
  const grid = new Float32Array(CC * CC);
  let maxMse = 0;
  for (let iy = 0; iy < CC; iy++) {
    for (let ix = 0; ix < CC; ix++) {
      const m = mMin + (ix / CC) * (mMax - mMin);
      const b = bMin + (1 - iy / CC) * (bMax - bMin);
      const l = computeMSE(m, b, pts);
      grid[iy * CC + ix] = l;
      if (l > maxMse) maxMse = l;
    }
  }

  // Draw heatmap
  const imgData = ctx.createImageData(CC, CC);
  const logMax = Math.log(1 + maxMse);
  for (let i = 0; i < CC * CC; i++) {
    const norm = logMax > 0 ? Math.log(1 + grid[i]) / logMax : 0;
    const [r, g, b] = lossColor(Math.min(1, norm));
    const idx = i * 4;
    imgData.data[idx] = r; imgData.data[idx + 1] = g;
    imgData.data[idx + 2] = b; imgData.data[idx + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // Coord helpers
  function cmx(m: number) { return ((m - mMin) / (mMax - mMin)) * CC; }
  function cmy(b: number) { return (1 - (b - bMin) / (bMax - bMin)) * CC; }

  // GD path
  if (mbHist.length > 1) {
    ctx.beginPath();
    ctx.moveTo(cmx(mbHist[0][0]), cmy(mbHist[0][1]));
    for (let i = 1; i < mbHist.length; i++) {
      ctx.lineTo(cmx(mbHist[i][0]), cmy(mbHist[i][1]));
    }
    ctx.strokeStyle = 'rgba(120, 212, 168, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Optimal (hollow white circle)
  const ox = cmx(mOpt), oy = cmy(bOpt);
  ctx.beginPath();
  ctx.arc(ox, oy, 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(28, 20, 13, 0.5)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(242, 233, 225, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Current (filled teal)
  const cx2 = cmx(curM), cy2 = cmy(curB);
  ctx.beginPath();
  ctx.arc(cx2, cy2, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#78d4a8';
  ctx.fill();
  ctx.strokeStyle = '#1c140d';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ── Loss history chart ─────────────────────────────────────────────────────

const LH_W = 860, LH_H = 120;
const LH_P = { t: 8, r: 16, b: 28, l: 54 };
const LH_PW = LH_W - LH_P.l - LH_P.r;
const LH_PH = LH_H - LH_P.t - LH_P.b;

function LossChart({ history }: { history: number[] }) {
  if (history.length < 2) {
    return (
      <div style={{ height: LH_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
          step or play to see loss curve
        </span>
      </div>
    );
  }

  const maxL = Math.max(...history);
  const minL = Math.min(...history);
  const range = maxL - minL || 1;
  const n = history.length;

  const pts = history.map((l, i) =>
    `${LH_P.l + (i / (n - 1)) * LH_PW},${LH_P.t + (1 - (l - minL) / range) * LH_PH}`
  ).join(' ');

  const yTicks = [maxL, (maxL + minL) / 2, minL];
  const xLabels = [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <svg viewBox={`0 0 ${LH_W} ${LH_H}`} style={{ width: '100%', display: 'block' }}>
      {yTicks.map((v, i) => {
        const y = LH_P.t + (1 - (v - minL) / range) * LH_PH;
        return (
          <g key={i}>
            <line x1={LH_P.l} y1={y} x2={LH_W - LH_P.r} y2={y} stroke="var(--border)" strokeWidth={0.5} />
            <text x={LH_P.l - 6} y={y + 4} textAnchor="end" fontSize={9} fill="var(--text-faint)" fontFamily="var(--font-mono)">
              {v.toFixed(2)}
            </text>
          </g>
        );
      })}
      {xLabels.map((i) => (
        <text key={i} x={LH_P.l + (i / (n - 1)) * LH_PW} y={LH_H - LH_P.b + 14}
          textAnchor="middle" fontSize={9} fill="var(--text-faint)" fontFamily="var(--font-mono)">
          {i}
        </text>
      ))}
      <text x={LH_P.l + LH_PW / 2} y={LH_H - 2} textAnchor="middle"
        fontSize={8} fill="var(--text-faint)" fontFamily="var(--font-mono)">epoch</text>
      <polyline points={pts} fill="none" stroke="var(--orange)" strokeWidth={1.5} strokeLinejoin="round" />
      <rect x={LH_P.l} y={LH_P.t} width={LH_PW} height={LH_PH}
        fill="none" stroke="var(--border-mid)" strokeWidth={0.8} />
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

const LR_OPTS = [0.001, 0.01, 0.05, 0.1] as const;
const STEPS_PER_TICK = 3;
const MAX_HIST = 250;

export function RegressionPage() {
  const [points, setPoints] = useState<Point[]>(INIT_PTS);
  const [m, setM] = useState(0);
  const [b, setB] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [lossHist, setLossHist] = useState<number[]>([]);
  const [mbHist, setMbHist] = useState<[number, number][]>([[0, 0]]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lr, setLr] = useState<typeof LR_OPTS[number]>(0.01);
  const [showResiduals, setShowResiduals] = useState(true);
  const [activePreset, setActivePreset] = useState('linear');
  const [isDragging, setIsDragging] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mRef = useRef(0);
  const bRef = useRef(0);
  const ptsRef = useRef<Point[]>(INIT_PTS);
  const lrRef = useRef<number>(0.01);
  const epochRef = useRef(0);
  const mbHistRef = useRef<[number, number][]>([[0, 0]]);
  const dragId = useRef<number | null>(null);

  useEffect(() => { lrRef.current = lr; }, [lr]);
  useEffect(() => { ptsRef.current = points; }, [points]);

  // Redraw contour when state changes
  useEffect(() => {
    if (canvasRef.current) drawContour(canvasRef.current, points, mbHist, m, b);
  }, [points, mbHist, m, b]);

  const doStep = useCallback((times = 1) => {
    let cm = mRef.current, cb = bRef.current;
    for (let i = 0; i < times; i++) {
      [cm, cb] = gdStep(cm, cb, ptsRef.current, lrRef.current);
    }
    mRef.current = cm; bRef.current = cb;
    epochRef.current += times;
    const loss = computeMSE(cm, cb, ptsRef.current);
    const newMbHist = [...mbHistRef.current, [cm, cb] as [number, number]].slice(-MAX_HIST);
    mbHistRef.current = newMbHist;
    setM(cm); setB(cb);
    setEpoch(epochRef.current);
    setLossHist(h => { const n = [...h, loss]; return n.length > MAX_HIST ? n.slice(-MAX_HIST) : n; });
    setMbHist([...newMbHist]);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => doStep(STEPS_PER_TICK), 30);
    return () => clearInterval(id);
  }, [isPlaying, doStep]);

  function reset() {
    mRef.current = 0; bRef.current = 0; epochRef.current = 0;
    mbHistRef.current = [[0, 0]];
    setM(0); setB(0); setEpoch(0); setLossHist([]); setMbHist([[0, 0]]);
  }

  function solve() {
    const [nm, nb] = normalEq(ptsRef.current);
    mRef.current = nm; bRef.current = nb;
    const loss = computeMSE(nm, nb, ptsRef.current);
    const newMbHist = [...mbHistRef.current, [nm, nb] as [number, number]];
    mbHistRef.current = newMbHist;
    setM(nm); setB(nb);
    setLossHist(h => [...h, loss]);
    setMbHist([...newMbHist]);
  }

  function loadPreset(name: string) {
    const pts = toPoints(PRESETS[name]);
    ptsRef.current = pts;
    setPoints(pts);
    setActivePreset(name);
    // Reset after updating ref so reset() uses fresh pts
    mRef.current = 0; bRef.current = 0; epochRef.current = 0;
    mbHistRef.current = [[0, 0]];
    setM(0); setB(0); setEpoch(0); setLossHist([]); setMbHist([[0, 0]]);
    setIsPlaying(false);
  }

  // ── Pointer handlers ──────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const t = e.target as SVGElement;
    const pidAttr = t.getAttribute('data-pid');
    if (pidAttr) {
      dragId.current = Number(pidAttr);
      setIsDragging(true);
      return;
    }
    if (t.tagName === 'svg' || t.tagName === 'rect' || t.tagName === 'line' || t.tagName === 'polyline') {
      const { x, y } = toData(svgRef.current, e.clientX, e.clientY);
      const np: Point = { id: pid(), x, y };
      const next = [...ptsRef.current, np];
      ptsRef.current = next;
      setPoints(next);
    }
  }

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (dragId.current === null || !svgRef.current) return;
    const { x, y } = toData(svgRef.current, e.clientX, e.clientY);
    const id = dragId.current;
    const next = ptsRef.current.map(p => p.id === id ? { ...p, x, y } : p);
    ptsRef.current = next;
    setPoints([...next]);
  }

  function onMouseUp() {
    if (dragId.current !== null) { dragId.current = null; setIsDragging(false); }
  }

  function onDblClick(e: React.MouseEvent<SVGSVGElement>) {
    const t = e.target as SVGElement;
    const pidAttr = t.getAttribute('data-pid');
    if (!pidAttr) return;
    const id = Number(pidAttr);
    const next = ptsRef.current.filter(p => p.id !== id);
    ptsRef.current = next;
    setPoints(next);
  }

  // ── Derived ───────────────────────────────────────────────────────────
  const curLoss = computeMSE(m, b, points);
  const r2 = rSquared(m, b, points);
  const [mOpt] = normalEq(points);
  const optLoss = computeMSE(mOpt, normalEq(points)[1], points);
  const lossOk = points.length >= 2 && curLoss < optLoss * 1.05;

  const card: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div className="page-outer" style={{ maxWidth: 960, margin: '0 auto', padding: '48px 28px 80px' }}>

        {/* Header */}
        <h1 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>
          Linear Regression
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.7, maxWidth: 560 }}>
          Gradient descent finds ŷ&nbsp;=&nbsp;mx&nbsp;+&nbsp;b by minimising mean squared error.
          The contour shows the loss landscape — watch the teal path converge to the minimum.
        </p>

        {/* Preset + hint row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {Object.keys(PRESETS).map(name => (
            <button key={name} onClick={() => loadPreset(name)} style={{
              background: activePreset === name ? 'var(--accent-dim)' : 'transparent',
              border: `1px solid ${activePreset === name ? 'var(--accent)' : 'var(--border-mid)'}`,
              borderRadius: 5, padding: '4px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: activePreset === name ? 'var(--accent)' : 'var(--text-dim)',
              cursor: 'pointer', transition: 'color 0.15s, background 0.15s, border-color 0.15s',
            }}>{name}</button>
          ))}
          <button onClick={() => { setIsPlaying(false); ptsRef.current = []; setPoints([]); setActivePreset(''); reset(); }} style={{
            background: 'transparent', border: '1px solid var(--border-mid)', borderRadius: 5,
            padding: '4px 12px', fontFamily: 'var(--font-mono)', fontSize: 12,
            color: 'var(--text-faint)', cursor: 'pointer',
          }}>clear</button>
          <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
            click to add · drag to move · dbl-click to remove
          </span>
        </div>

        {/* Main grid: scatter + contour */}
        <div className="reg-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 12, marginBottom: 14 }}>

          {/* Scatter plot */}
          <div style={{ ...card, overflow: 'hidden' }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SW} ${SH}`}
              style={{ width: '100%', display: 'block', cursor: isDragging ? 'grabbing' : 'crosshair' }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove}
              onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
              onDoubleClick={onDblClick}
            >
              <defs>
                <clipPath id="reg-clip"><rect x={SPAD.l} y={SPAD.t} width={SPW} height={SPH} /></clipPath>
              </defs>

              {/* Grid */}
              {[1,2,3,4,5,6,7,8,9].map(v => (
                <g key={v}>
                  <line x1={px(v)} y1={SPAD.t} x2={px(v)} y2={SH - SPAD.b} stroke="var(--border)" strokeWidth={0.5} />
                  <line x1={SPAD.l} y1={py(v)} x2={SW - SPAD.r} y2={py(v)} stroke="var(--border)" strokeWidth={0.5} />
                </g>
              ))}
              <line x1={SPAD.l} y1={py(0)} x2={SW - SPAD.r} y2={py(0)} stroke="var(--border-mid)" strokeWidth={1} />
              <line x1={px(0)} y1={SPAD.t} x2={px(0)} y2={SH - SPAD.b} stroke="var(--border-mid)" strokeWidth={1} />

              {/* Axis labels */}
              {[0,2,4,6,8,10].map(v => (
                <g key={v}>
                  <text x={px(v)} y={SH - SPAD.b + 18} textAnchor="middle" fontSize={10} fill="var(--text-faint)" fontFamily="var(--font-mono)">{v}</text>
                  <text x={SPAD.l - 7} y={py(v) + 4} textAnchor="end" fontSize={10} fill="var(--text-faint)" fontFamily="var(--font-mono)">{v}</text>
                </g>
              ))}

              <g clipPath="url(#reg-clip)">
                {/* Residuals */}
                {showResiduals && points.map(p => (
                  <line key={p.id}
                    x1={px(p.x)} y1={py(p.y)}
                    x2={px(p.x)} y2={py(m * p.x + b)}
                    stroke="var(--red)" strokeWidth={1.2} opacity={0.4}
                  />
                ))}

                {/* Regression line */}
                {points.length >= 2 && (
                  <line
                    x1={px(XR[0])} y1={py(m * XR[0] + b)}
                    x2={px(XR[1])} y2={py(m * XR[1] + b)}
                    stroke="var(--teal)" strokeWidth={2}
                  />
                )}

                {/* Points */}
                {points.map(p => (
                  <circle key={p.id}
                    cx={px(p.x)} cy={py(p.y)}
                    r={6} fill="var(--accent)" fillOpacity={0.9}
                    stroke="var(--bg)" strokeWidth={1.5}
                    data-pid={p.id}
                    style={{ cursor: 'grab' }}
                  />
                ))}
              </g>

              <rect x={SPAD.l} y={SPAD.t} width={SPW} height={SPH} fill="none" stroke="var(--border-mid)" strokeWidth={0.8} />

              {/* Inline formula */}
              {points.length >= 2 && (
                <text x={SPAD.l + 10} y={SPAD.t + 16} fontSize={11} fill="var(--teal)" fontFamily="var(--font-mono)" opacity={0.9}>
                  {'ŷ = '}{m < 0 ? '−' : ''}{Math.abs(m).toFixed(3)}{'x '}{b < 0 ? '− ' : '+ '}{Math.abs(b).toFixed(3)}
                </text>
              )}
            </svg>
          </div>

          {/* Loss contour */}
          <div style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>loss surface</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', display: 'block', marginTop: 2 }}>
                x = slope m  ·  y = intercept b
              </span>
            </div>
            <div style={{ position: 'relative', flex: 1 }}>
              <canvas
                ref={canvasRef}
                width={CC} height={CC}
                style={{ width: '100%', aspectRatio: '1', display: 'block', imageRendering: 'pixelated' }}
              />
              <div style={{
                position: 'absolute', bottom: 4, left: 0, right: 0,
                textAlign: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(242,233,225,0.35)',
                pointerEvents: 'none',
              }}>
                slope m →
              </div>
              <div style={{
                position: 'absolute', top: 4, bottom: 20, right: 4,
                display: 'flex', alignItems: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(242,233,225,0.35)',
                writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                pointerEvents: 'none',
              }}>
                intercept b ↑
              </div>
            </div>
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 14, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>
              <span><span style={{ color: '#78d4a8' }}>●</span> current</span>
              <span><span style={{ color: 'rgba(242,233,225,0.9)' }}>○</span> optimal</span>
              <span><span style={{ color: 'rgba(120,212,168,0.65)' }}>—</span> GD path</span>
            </div>
            <div style={{ padding: '10px 14px 12px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.6 }}>
              Every point in this grid is a candidate line (m,&nbsp;b). Its brightness is the MSE that line would produce on your data — dark is a good fit, bright is bad. GD starts at (0,&nbsp;0) and rolls downhill through this bowl, step by step, until it reaches the dark minimum.
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <Btn onClick={() => doStep(1)} disabled={isPlaying || points.length < 2}>step</Btn>
          <Btn onClick={() => setIsPlaying(p => !p)} active={isPlaying} disabled={points.length < 2}>
            {isPlaying ? 'pause' : 'play'}
          </Btn>
          <Btn onClick={() => { setIsPlaying(false); reset(); }}>reset</Btn>
          <Btn onClick={() => { setIsPlaying(false); solve(); }} disabled={points.length < 2}>solve</Btn>

          <div style={{ width: 1, height: 20, background: 'var(--border-mid)', margin: '0 4px' }} />

          <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>η</span>
          {LR_OPTS.map(l => (
            <button key={l} onClick={() => setLr(l)} style={{
              background: lr === l ? 'var(--accent-dim)' : 'transparent',
              border: 'none', borderRadius: 4,
              color: lr === l ? 'var(--accent)' : 'var(--text-dim)',
              fontSize: 12, cursor: 'pointer', padding: '3px 8px',
              fontFamily: 'var(--font-mono)',
              transition: 'color 0.15s, background 0.15s',
            }}>{l}</button>
          ))}

          <div style={{ width: 1, height: 20, background: 'var(--border-mid)', margin: '0 4px' }} />

          <button onClick={() => setShowResiduals(r => !r)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: showResiduals ? 1 : 0.3, transition: 'opacity 0.15s',
          }}>
            <span style={{ width: 18, height: 2, background: 'var(--red)', display: 'inline-block', borderRadius: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>residuals</span>
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
          <Stat label="epoch" value={epoch.toLocaleString()} />
          <Stat label="MSE" value={curLoss.toFixed(4)} color={lossOk ? 'var(--green)' : curLoss > 5 ? 'var(--red)' : undefined} />
          <Stat label="R²" value={points.length >= 2 ? r2.toFixed(4) : '—'} color={r2 > 0.95 ? 'var(--green)' : undefined} />
          <Stat label="slope m" value={(m >= 0 ? '+' : '') + m.toFixed(4)} />
          <Stat label="intercept b" value={(b >= 0 ? '+' : '') + b.toFixed(4)} />
        </div>

        {/* Loss history chart */}
        <div style={{ ...card, overflow: 'hidden', marginBottom: 48 }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>loss over epochs</span>
          </div>
          <LossChart history={lossHist} />
        </div>

        {/* Theory */}
        <div style={{ paddingTop: 40, borderTop: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Linear regression finds ŷ&nbsp;=&nbsp;mx&nbsp;+&nbsp;b that minimises mean squared error — the average of squared vertical distances from each point to the line (the red residuals above).
            Squaring makes errors always positive and penalises large deviations heavily, producing a convex loss surface with a unique global minimum.
            The loss contour above shows that bowl: bright regions are high MSE, dark is low. The teal dot marks where the parameters are now; the white circle marks the analytical optimum.
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            The <strong style={{ color: 'var(--text)' }}>normal equation</strong> θ&nbsp;=&nbsp;(XᵀX)⁻¹Xᵀy solves regression in one step — click "solve" to jump straight to the minimum.
            <strong style={{ color: 'var(--text)' }}> Gradient descent</strong> takes hundreds of steps but generalises to models where no closed form exists — every deep network trains this way.
          </p>
          <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Try η&nbsp;=&nbsp;0.1 and watch the GD path overshoot the minimum, oscillating in the contour. Try η&nbsp;=&nbsp;0.001 and watch it crawl. Load the "outlier" preset and see how one distant point inflates MSE and shifts the whole line — R² drops sharply.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="https://www.coursera.org/specializations/machine-learning-introduction" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Andrew Ng: Machine Learning Specialization</a>
            <a href="https://distill.pub/2017/momentum/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Why Momentum Really Works — distill.pub</a>
            <a href="https://arxiv.org/abs/1802.01528" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ The Matrix Calculus You Need for Deep Learning</a>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: color ?? 'var(--text)', transition: 'color 0.3s' }}>
        {value}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
    </div>
  );
}

function Btn({ onClick, children, disabled = false, active = false }: {
  onClick: () => void; children: React.ReactNode; disabled?: boolean; active?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className="ctrl-btn" style={{
      background: active ? 'var(--accent-dim)' : 'var(--surface)',
      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border-mid)'),
      borderRadius: 6,
      color: disabled ? 'var(--text-faint)' : active ? 'var(--accent)' : 'var(--text-mid)',
      fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
      padding: '6px 14px', fontFamily: 'var(--font-mono)',
      fontWeight: active ? 600 : 400,
      transition: 'color 0.15s, background 0.15s, border-color 0.15s',
    }}>
      {children}
    </button>
  );
}
