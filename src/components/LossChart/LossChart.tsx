import { useSimStore } from '../../store/useSimStore';

const W = 220;
const H = 70;

export function LossChart() {
  const { history, currentEpoch } = useSimStore();
  const losses = history.map((s) => s.loss);

  if (losses.length < 2) {
    return (
      <div style={{ width: W, padding: '8px 0' }}>
        <div style={{ fontSize: 11, color: '#606070', marginBottom: 4 }}>Loss</div>
        <div style={{ fontSize: 11, color: '#2a2a3e' }}>Step to start training</div>
      </div>
    );
  }

  const display = losses.slice(-300);
  const min = 0;
  const max = Math.max(...display, 0.01);

  const points = display
    .map((v, i) => {
      const x = (i / (display.length - 1)) * W;
      const y = H - ((v - min) / (max - min)) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const currentLoss = history[currentEpoch - 1]?.loss ?? 0;

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#606070' }}>Loss</span>
        <span style={{ fontSize: 12, color: '#ff8c00', fontFamily: 'monospace' }}>
          {currentLoss.toFixed(5)}
        </span>
      </div>
      <svg width={W} height={H}>
        <polyline
          points={points}
          fill="none"
          stroke="#ff8c00"
          strokeWidth={1.5}
          opacity={0.8}
        />
        {/* Current position dot */}
        {display.length > 0 && (
          <circle
            cx={W}
            cy={H - ((currentLoss - min) / (max - min)) * H}
            r={3}
            fill="#ff8c00"
          />
        )}
      </svg>
    </div>
  );
}
