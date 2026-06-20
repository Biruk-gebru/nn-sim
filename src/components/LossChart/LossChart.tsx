import { useSimStore } from '../../store/useSimStore';

const W = 220;
const H = 70;

export function LossChart() {
  const { history, currentEpoch } = useSimStore();
  const losses = history.map((s) => s.loss);

  if (losses.length < 2) {
    return (
      <div style={{ padding: '6px 0' }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4, letterSpacing: 1 }}>LOSS</div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Step to start training</div>
      </div>
    );
  }

  const display = losses.slice(-300);
  const max = Math.max(...display, 0.01);

  const points = display
    .map((v, i) => {
      const x = (i / (display.length - 1)) * W;
      const y = H - (v / max) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const currentLoss = history[currentEpoch - 1]?.loss ?? 0;
  const lastY = H - (currentLoss / max) * H;

  return (
    <div style={{ padding: '6px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1 }}>LOSS</span>
        <span style={{ fontSize: 12, color: 'var(--orange)', fontFamily: 'monospace' }}>
          {currentLoss.toFixed(5)}
        </span>
      </div>
      <svg width={W} height={H} style={{ display: 'block' }}>
        <polyline points={points} fill="none" stroke="var(--orange)" strokeWidth={1.5} opacity={0.8} />
        {display.length > 0 && (
          <circle cx={W} cy={lastY} r={3} fill="var(--orange)" />
        )}
      </svg>
    </div>
  );
}
