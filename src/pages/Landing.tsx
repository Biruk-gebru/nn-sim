import { Link } from '@tanstack/react-router';

interface Module {
  path: string;
  label: string;
  tagline: string;
  status: 'live' | 'soon';
  icon: React.ReactNode;
}

const MODULES: Module[] = [
  {
    path: '/nn',
    label: 'Neural Network',
    tagline: 'Watch forward pass and backpropagation animate layer by layer in real time.',
    status: 'live',
    icon: <NNIcon />,
  },
  {
    path: '/tokenizer',
    label: 'Tokenizer',
    tagline: 'See how raw text is broken into tokens before it ever reaches a model.',
    status: 'live',
    icon: <TokenIcon />,
  },
  {
    path: '/embeddings',
    label: 'Embeddings',
    tagline: 'Words mapped to vectors. Explore similarity and distance in 2D space.',
    status: 'live',
    icon: <EmbedIcon />,
  },
  {
    path: '/regression',
    label: 'Linear Regression',
    tagline: 'Drag data points and watch gradient descent fit a line in real time.',
    status: 'live',
    icon: <RegressionIcon />,
  },
  {
    path: '/activations',
    label: 'Activations',
    tagline: 'Compare sigmoid, ReLU, tanh, and GELU interactively on a single canvas.',
    status: 'live',
    icon: <ActIcon />,
  },
  {
    path: '/attention',
    label: 'Attention',
    tagline: 'Query, key, and value: see which tokens attend to which and why.',
    status: 'live',
    icon: <AttentionIcon />,
  },
];

export function Landing() {
  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      background: 'var(--bg)',
    }}>
      {/* Hero */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Background network illustration */}
        <HeroBg />
        {/* Fade the illustration into the background on the left */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, #1c140d 32%, rgba(28,20,13,0.55) 58%, rgba(28,20,13,0) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        <div style={{ padding: '88px 56px 72px', maxWidth: 1200, position: 'relative', zIndex: 2 }}>
          <h1 style={{
            margin: '0 0 20px',
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 5vw, 60px)',
            fontWeight: 800,
            color: 'var(--text)',
            lineHeight: 1.1,
            letterSpacing: -1,
            maxWidth: 620,
          }}>
            Learn ML by<br />
            <span style={{ color: 'var(--accent)' }}>watching it work.</span>
          </h1>

          <p style={{
            margin: '0 0 32px',
            fontSize: 17,
            color: 'var(--text-mid)',
            lineHeight: 1.75,
            maxWidth: 460,
            fontWeight: 400,
          }}>
            Each module is a live, interactive demo. Adjust parameters and see
            what actually happens. No slides, no passive reading.
          </p>

          <div style={{ display: 'flex', gap: 28, alignItems: 'center', marginBottom: 32 }}>
            {[
              { n: '6', label: 'modules' },
              { n: '100%', label: 'in-browser' },
              { n: '0', label: 'sign-ups' },
            ].map(({ n, label }) => (
              <div key={label}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--text)', display: 'block', lineHeight: 1 }}>{n}</span>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginTop: 3 }}>{label}</span>
              </div>
            ))}
          </div>

          <div>
            <Link to="/nn" style={{
              display: 'inline-block',
              padding: '9px 22px',
              background: 'var(--accent)',
              color: '#1c140d',
              borderRadius: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}>
              Get started
            </Link>
            <p style={{
              margin: '10px 0 0',
              fontSize: 12,
              color: 'var(--text-faint)',
              fontFamily: 'var(--font-mono)',
              maxWidth: 380,
              lineHeight: 1.6,
            }}>
              The neural network is the best starting point, covering the core concepts every other module builds on.
            </p>
          </div>
        </div>
      </div>

      {/* Module grid */}
      <div style={{ padding: '48px 56px 80px' }}>
        <p style={{
          margin: '0 0 24px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-faint)',
        }}>
          pick a module
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
          maxWidth: 1100,
        }}>
          {MODULES.map((mod, i) => (
            <ModuleCard key={mod.path} mod={mod} featured={i === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ mod, featured }: { mod: Module; featured?: boolean }) {
  const live = mod.status === 'live';

  const inner = (
    <div
      className={live ? 'module-card' : undefined}
      style={{
        background: 'var(--surface)',
        borderRadius: 14,
        overflow: 'hidden',
        cursor: live ? 'pointer' : 'default',
        opacity: live ? 1 : 0.5,
        border: featured ? '1px solid var(--border-mid)' : '1px solid var(--border)',
      }}
    >
      {/* Icon strip */}
      <div style={{
        height: 90,
        background: featured ? 'rgba(203, 232, 107, 0.03)' : 'var(--surface-alt)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: featured ? '1px solid var(--border-mid)' : '1px solid var(--border)',
      }}>
        {mod.icon}
      </div>

      {/* Content */}
      <div style={{ padding: '18px 20px 20px' }}>
        {featured && (
          <p style={{ margin: '0 0 6px', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--accent)' }}>
            start here
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--text)',
            lineHeight: 1.2,
          }}>
            {mod.label}
          </span>
          {!live && (
            <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-faint)' }}>
              soon
            </span>
          )}
        </div>
        <p style={{
          margin: 0,
          fontSize: 13,
          color: 'var(--text-mid)',
          lineHeight: 1.65,
        }}>
          {mod.tagline}
        </p>
      </div>
    </div>
  );

  return live
    ? <Link to={mod.path} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
    : inner;
}

/* ── Hero background ──────────────────────────────────────── */

function HeroBg() {
  const layers = [3, 5, 7, 7, 5, 3];
  const BW = 560, BH = 380;

  type N = { x: number; y: number; l: number; n: number };
  const nodes: N[] = [];
  layers.forEach((count, l) => {
    const x = (l / (layers.length - 1)) * BW;
    for (let n = 0; n < count; n++) {
      nodes.push({ x, y: ((n + 1) / (count + 1)) * BH, l, n });
    }
  });

  const edges: { x1: number; y1: number; x2: number; y2: number; k: string }[] = [];
  nodes.forEach(to => {
    if (to.l === 0) return;
    nodes.filter(f => f.l === to.l - 1).forEach(from => {
      edges.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, k: `${from.l}-${from.n}-${to.l}-${to.n}` });
    });
  });

  return (
    <svg
      viewBox={`0 0 ${BW} ${BH}`}
      preserveAspectRatio="xMaxYMid meet"
      style={{
        position: 'absolute',
        right: 0, top: '50%',
        transform: 'translateY(-50%)',
        width: '58%', height: '150%',
        opacity: 0.13,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {edges.map(e => (
        <line key={e.k} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke="var(--text)" strokeWidth={0.55} />
      ))}
      {nodes.map(p => (
        <circle key={`${p.l}-${p.n}`} cx={p.x} cy={p.y} r={3.5}
          fill="var(--text)" />
      ))}
    </svg>
  );
}

/* ── Decorative icons ─────────────────────────────────────── */

function NNIcon() {
  const nodes: [number, number][] = [[22,15],[22,30],[22,45],[64,20],[64,40],[106,30]];
  const edges: [[number,number],[number,number]][] = [
    [[22,15],[64,20]],[[22,15],[64,40]],
    [[22,30],[64,20]],[[22,30],[64,40]],
    [[22,45],[64,20]],[[22,45],[64,40]],
    [[64,20],[106,30]],[[64,40],[106,30]],
  ];
  return (
    <svg width="128" height="60" viewBox="0 0 128 60" fill="none">
      {edges.map(([a,b],i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--border-strong)" strokeWidth={1} opacity={0.38} />
      ))}
      {nodes.map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={7} fill="var(--surface)" stroke="var(--border-strong)" strokeWidth={1.5} />
      ))}
      <circle cx={64} cy={20} r={7} fill="var(--accent-dim)" stroke="var(--accent)" strokeWidth={1.5} />
      <circle cx={106} cy={30} r={7} fill="var(--teal-dim)" stroke="var(--teal)" strokeWidth={1.5} />
    </svg>
  );
}

function TokenIcon() {
  const tokens = ['The', 'quick', 'brown', 'fox'];
  const colors = ['var(--teal)', 'var(--accent)', 'var(--blue)', 'var(--orange)'];
  return (
    <svg width="180" height="60" viewBox="0 0 180 60" fill="none">
      {tokens.map((t, i) => (
        <g key={i}>
          <rect x={6 + i * 43} y={20} width={38} height={20} rx={5}
            fill={colors[i]} fillOpacity={0.12} stroke={colors[i]} strokeOpacity={0.5} strokeWidth={1} />
          <text x={25 + i * 43} y={34} textAnchor="middle" fontSize={10}
            fill={colors[i]} fontFamily="var(--font-mono)">{t}</text>
        </g>
      ))}
    </svg>
  );
}

function EmbedIcon() {
  const pts: [number,number][] = [[30,42],[52,22],[74,36],[96,16],[118,46],[44,52],[84,26]];
  return (
    <svg width="150" height="60" viewBox="0 0 150 60" fill="none">
      <line x1={30} y1={42} x2={52} y2={22} stroke="var(--accent)" strokeWidth={1} opacity={0.25} />
      <line x1={52} y1={22} x2={74} y2={36} stroke="var(--accent)" strokeWidth={1} opacity={0.25} />
      <line x1={74} y1={36} x2={96} y2={16} stroke="var(--accent)" strokeWidth={1} opacity={0.25} />
      {pts.map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill="var(--accent)" opacity={0.45 + i * 0.08} />
      ))}
    </svg>
  );
}

function RegressionIcon() {
  const pts: [number,number][] = [[18,50],[32,42],[48,35],[66,27],[84,20],[100,13]];
  return (
    <svg width="126" height="62" viewBox="0 0 126 62" fill="none">
      <line x1={12} y1={56} x2={114} y2={8} stroke="var(--teal)" strokeWidth={1.5} opacity={0.45} />
      {pts.map(([x,y],i) => (
        <circle key={i} cx={x + (i%2)*7-3} cy={y + (i%3)*6-3} r={3.5}
          fill="var(--accent)" opacity={0.8} />
      ))}
    </svg>
  );
}

function ActIcon() {
  return (
    <svg width="130" height="62" viewBox="0 0 130 62" fill="none">
      <path d="M8 52 Q28 52 38 36 Q48 20 68 18 Q88 16 100 16" stroke="var(--teal)" strokeWidth={1.5} opacity={0.8} />
      <path d="M8 52 L48 52 L88 12" stroke="var(--accent)" strokeWidth={1.5} opacity={0.8} />
      <path d="M8 32 Q28 32 38 32 Q58 32 78 14 Q88 8 108 8" stroke="var(--orange)" strokeWidth={1.2} opacity={0.6} strokeDasharray="3 2" />
    </svg>
  );
}

function AttentionIcon() {
  const xs = [18, 54, 90, 126];
  return (
    <svg width="144" height="62" viewBox="0 0 144 62" fill="none">
      {xs.map((x, i) => (
        <rect key={i} x={x-14} y={38} width={28} height={18} rx={4}
          fill={i === 1 ? 'var(--accent-dim)' : 'var(--surface)'}
          stroke={i === 1 ? 'var(--accent)' : 'var(--border-mid)'}
          strokeWidth={1}
        />
      ))}
      {xs.filter((_, i) => i !== 1).map((x, i) => (
        <line key={i} x1={54} y1={38} x2={x} y2={56}
          stroke="var(--accent)" strokeWidth={1}
          opacity={i === 0 ? 0.7 : 0.25} strokeDasharray="3 2" />
      ))}
      <circle cx={54} cy={22} r={10} fill="var(--accent-dim)" stroke="var(--accent)" strokeWidth={1} />
      <text x={54} y={26} textAnchor="middle" fontSize={10}
        fill="var(--accent)" fontFamily="var(--font-display)" fontWeight={700}>Q</text>
    </svg>
  );
}
