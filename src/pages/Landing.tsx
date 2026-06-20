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
    tagline: 'Watch forward pass and backpropagation animate layer by layer.',
    status: 'live',
    icon: <NNIcon />,
  },
  {
    path: '/tokenizer',
    label: 'Tokenizer',
    tagline: 'See how raw text is split into tokens before entering a model.',
    status: 'soon',
    icon: <TokenIcon />,
  },
  {
    path: '/embeddings',
    label: 'Embeddings',
    tagline: 'Words as vectors — explore similarity in a 2D projection.',
    status: 'soon',
    icon: <EmbedIcon />,
  },
  {
    path: '/regression',
    label: 'Linear Regression',
    tagline: 'Gradient descent fitting a line to data points in real time.',
    status: 'soon',
    icon: <RegressionIcon />,
  },
  {
    path: '/activations',
    label: 'Activations',
    tagline: 'Compare sigmoid, ReLU, tanh, and GELU side by side interactively.',
    status: 'soon',
    icon: <ActIcon />,
  },
  {
    path: '/attention',
    label: 'Attention',
    tagline: 'Query, key, and value — see which tokens attend to which.',
    status: 'soon',
    icon: <AttentionIcon />,
  },
];

export function Landing() {
  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '64px 48px',
      background: 'var(--bg)',
    }}>
      {/* Hero */}
      <div style={{ maxWidth: 640, marginBottom: 64 }}>
        <div style={{ fontSize: 11, color: 'var(--border-strong)', letterSpacing: 3, marginBottom: 16 }}>
          INTERACTIVE MACHINE LEARNING
        </div>
        <h1 style={{
          margin: '0 0 20px',
          fontSize: 42,
          fontWeight: 700,
          color: 'var(--text)',
          lineHeight: 1.15,
          letterSpacing: -0.5,
        }}>
          Learn ML by<br />
          <span style={{ color: 'var(--accent)' }}>watching it work.</span>
        </h1>
        <p style={{
          margin: 0,
          fontSize: 16,
          color: 'var(--text-mid)',
          lineHeight: 1.7,
          fontFamily: 'system-ui, sans-serif',
        }}>
          Each module is a live, interactive demo. No slides. No passive reading.
          Adjust the parameters and see what happens.
        </p>
      </div>

      {/* Module grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 20,
        maxWidth: 1100,
      }}>
        {MODULES.map((mod) => (
          <ModuleCard key={mod.path} mod={mod} />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({ mod }: { mod: Module }) {
  const live = mod.status === 'live';

  const card = (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${live ? 'var(--border-mid)' : 'var(--border)'}`,
      borderRadius: 12,
      padding: 24,
      cursor: live ? 'pointer' : 'default',
      transition: 'border-color 0.2s, transform 0.15s',
      opacity: live ? 1 : 0.55,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}
    onMouseEnter={(e) => {
      if (!live) return;
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = live ? 'var(--border-mid)' : 'var(--border)';
      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
    }}
    >
      {/* Icon area */}
      <div style={{
        width: '100%',
        height: 80,
        background: 'var(--surface-alt)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {mod.icon}
      </div>

      {/* Content */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: 0.3 }}>
            {mod.label}
          </span>
          <span style={{
            fontSize: 9,
            letterSpacing: 1,
            padding: '2px 8px',
            borderRadius: 10,
            background: live ? 'var(--green-dim)' : 'var(--accent-dim)',
            color: live ? 'var(--green)' : 'var(--text-dim)',
            border: `1px solid ${live ? 'var(--green)' : 'var(--border-mid)'}`,
          }}>
            {live ? 'LIVE' : 'SOON'}
          </span>
        </div>
        <p style={{
          margin: 0,
          fontSize: 13,
          color: 'var(--text-mid)',
          lineHeight: 1.6,
          fontFamily: 'system-ui, sans-serif',
        }}>
          {mod.tagline}
        </p>
      </div>
    </div>
  );

  return live ? <Link to={mod.path} style={{ textDecoration: 'none' }}>{card}</Link> : card;
}

/* ── Decorative SVG icons ─────────────────────────────────── */

function NNIcon() {
  const nodes = [[20,15],[20,30],[20,45],[60,20],[60,40],[100,30]];
  const edges = [
    [[20,15],[60,20]],[[20,15],[60,40]],
    [[20,30],[60,20]],[[20,30],[60,40]],
    [[20,45],[60,20]],[[20,45],[60,40]],
    [[60,20],[100,30]],[[60,40],[100,30]],
  ];
  return (
    <svg width="120" height="60" viewBox="0 0 120 60">
      {edges.map(([a,b],i) => (
        <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--border-mid)" strokeWidth={1} opacity={0.6} />
      ))}
      {nodes.map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={6} fill="none" stroke="var(--border-strong)" strokeWidth={1.5} />
      ))}
      <circle cx={60} cy={20} r={6} fill="var(--accent-dim)" stroke="var(--accent)" strokeWidth={1.5} />
    </svg>
  );
}

function TokenIcon() {
  const tokens = ['The', ' quick', ' brown', ' fox'];
  const colors = ['var(--teal)', 'var(--accent)', 'var(--blue)', 'var(--orange)'];
  return (
    <svg width="160" height="40" viewBox="0 0 160 40">
      {tokens.map((t, i) => (
        <g key={i}>
          <rect x={4 + i * 38} y={10} width={34} height={20} rx={4} fill={colors[i]} opacity={0.15} stroke={colors[i]} strokeWidth={1} />
          <text x={21 + i * 38} y={24} textAnchor="middle" fontSize={9} fill={colors[i]}>{t}</text>
        </g>
      ))}
    </svg>
  );
}

function EmbedIcon() {
  const pts = [[30,40],[50,20],[70,35],[90,15],[110,45],[40,50],[80,25]];
  return (
    <svg width="140" height="60" viewBox="0 0 140 60">
      {pts.map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill="var(--accent)" opacity={0.5 + i * 0.07} />
      ))}
      <line x1={30} y1={40} x2={50} y2={20} stroke="var(--accent)" strokeWidth={1} opacity={0.3} />
      <line x1={50} y1={20} x2={70} y2={35} stroke="var(--accent)" strokeWidth={1} opacity={0.3} />
    </svg>
  );
}

function RegressionIcon() {
  const pts = [[20,48],[35,38],[50,32],[65,25],[80,18],[95,12]];
  return (
    <svg width="120" height="60" viewBox="0 0 120 60">
      <line x1={15} y1={52} x2={105} y2={10} stroke="var(--teal)" strokeWidth={1.5} opacity={0.5} />
      {pts.map(([x,y],i) => (
        <circle key={i} cx={x + (i%2)*6-3} cy={y + (i%3)*5-3} r={3} fill="var(--accent)" opacity={0.8} />
      ))}
    </svg>
  );
}

function ActIcon() {
  return (
    <svg width="120" height="60" viewBox="0 0 120 60" fill="none">
      {/* sigmoid-ish */}
      <path d="M10 50 Q30 50 40 35 Q50 20 70 18" stroke="var(--teal)" strokeWidth={1.5} opacity={0.8} />
      {/* relu-ish */}
      <path d="M10 50 L50 50 L90 10" stroke="var(--accent)" strokeWidth={1.5} opacity={0.8} />
    </svg>
  );
}

function AttentionIcon() {
  const tokens = [20, 50, 80, 110];
  return (
    <svg width="130" height="60" viewBox="0 0 130 60">
      {tokens.map((x, i) => (
        <rect key={i} x={x-12} y={38} width={24} height={16} rx={3}
          fill={i === 1 ? 'var(--accent-dim)' : 'var(--surface-alt)'}
          stroke={i === 1 ? 'var(--accent)' : 'var(--border-mid)'}
          strokeWidth={1}
        />
      ))}
      {/* attention lines from token 1 */}
      {tokens.map((x, i) => i !== 1 && (
        <line key={i} x1={50} y1={38} x2={x} y2={38}
          stroke="var(--accent)" strokeWidth={1}
          opacity={i === 0 ? 0.7 : i === 2 ? 0.4 : 0.2}
          strokeDasharray="3 2"
        />
      ))}
      <circle cx={50} cy={20} r={8} fill="var(--accent-dim)" stroke="var(--accent)" strokeWidth={1} />
      <text x={50} y={24} textAnchor="middle" fontSize={9} fill="var(--accent)">Q</text>
    </svg>
  );
}
