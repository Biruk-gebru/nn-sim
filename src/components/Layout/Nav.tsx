import { Link, useRouterState } from '@tanstack/react-router';

const MODULES = [
  { path: '/nn', label: 'Neural Network' },
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
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 1.5,
          transition: 'color 0.15s',
        }}
      >
        ML PLAYGROUND
      </Link>

      <div style={{ width: 1, height: 20, background: 'var(--border-mid)', opacity: 0.4 }} />

      <div style={{ display: 'flex', gap: 4 }}>
        {MODULES.map(({ path, label }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              style={{
                color: active ? 'var(--accent)' : 'var(--text-dim)',
                textDecoration: 'none',
                fontSize: 12,
                padding: '4px 12px',
                borderRadius: 5,
                background: active ? 'var(--accent-dim)' : 'transparent',
                border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
                transition: 'all 0.15s',
                letterSpacing: 0.5,
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-faint)', letterSpacing: 1 }}>
        INTERACTIVE ML DEMOS
      </div>
    </nav>
  );
}
