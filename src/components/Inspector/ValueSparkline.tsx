interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function ValueSparkline({ values, width = 220, height = 50, color = '#4ecdc4' }: Props) {
  if (values.length < 2) {
    return <div style={{ width, height, opacity: 0.3, fontSize: 11, color: 'var(--text-dim)' }}>Not enough data yet</div>;
  }

  const display = values.slice(-200);
  const min = Math.min(...display);
  const max = Math.max(...display);
  const range = max - min || 1;

  const points = display
    .map((v, i) => {
      const x = (i / (display.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const last = display[display.length - 1];
  const lastY = height - ((last - min) / range) * height;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7} />
      <circle cx={width} cy={lastY} r={3} fill={color} />
    </svg>
  );
}
