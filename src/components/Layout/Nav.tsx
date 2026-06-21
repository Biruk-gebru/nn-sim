import { Link, useRouterState } from '@tanstack/react-router';

const MODULES = [
  { path: '/nn', label: 'Neural Network' },
  { path: '/tokenizer', label: 'Tokenizer' },
  { path: '/activations', label: 'Activations' },
];

export function Nav() {
  const { location } = useRouterState();
  const isHome = location.pathname === '/';

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      padding: '0 24px',
      height: 48,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
      zIndex: 100,
    }}>
      <Link
        to="/"
        style={{
          color: isHome ? 'var(--accent)' : 'var(--text-mid)',
          textDecoration: 'none',
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 1.5,
          transition: 'color 0.15s',
        }}
      >
        ML PLAYGROUND
      </Link>

      <div style={{ width: 1, height: 20, background: 'var(--border-mid)', opacity: 0.4 }} />

      <div style={{ display: 'flex', gap: 8 }}>
        {MODULES.map(({ path, label }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className="nav-link"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-dim)',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)' }}>
        interactive ml demos
      </div>
    </nav>
  );
}
