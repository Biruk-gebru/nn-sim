import { useSimStore, type DatasetName } from '../../store/useSimStore';
import { useStepTraining } from '../../hooks/useTraining';

const DATASETS: DatasetName[] = ['XOR', 'AND', 'OR'];

export function Controls() {
  const {
    isPlaying, speedMultiplier, currentEpoch, animPhase,
    dataset, setIsPlaying, setSpeedMultiplier, setDataset, reset,
  } = useSimStore();
  const { stepOnce } = useStepTraining();

  const busy = animPhase === 'forward' || animPhase === 'backward';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 20px',
      background: '#0e0e18',
      borderTop: '1px solid #1e1e2e',
      flexShrink: 0,
      flexWrap: 'wrap',
    }}>
      {/* Dataset switcher */}
      <div style={{ display: 'flex', gap: 2, background: '#12121a', borderRadius: 7, padding: 2 }}>
        {DATASETS.map((d) => (
          <button
            key={d}
            onClick={() => setDataset(d)}
            style={{
              background: dataset === d ? '#1e1e2e' : 'transparent',
              border: dataset === d ? '1px solid #2a2a40' : '1px solid transparent',
              borderRadius: 5,
              color: dataset === d ? '#00f5ff' : '#606070',
              padding: '4px 12px',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'ui-monospace, monospace',
              letterSpacing: 0.5,
              transition: 'all 0.15s',
              boxShadow: dataset === d ? '0 0 8px #00f5ff22' : 'none',
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: '#1e1e2e' }} />

      {/* Step */}
      <Btn label="Step" onClick={stepOnce} disabled={isPlaying || busy} color="#4488ff" />

      {/* Play / Pause */}
      <Btn label={isPlaying ? 'Pause' : 'Play'} onClick={() => setIsPlaying(!isPlaying)} disabled={busy && !isPlaying} color="#00f5ff" />

      {/* Reset */}
      <Btn label="Reset" onClick={reset} color="#ff4466" />

      {/* Speed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
        <span style={{ fontSize: 11, color: '#606070' }}>Speed</span>
        <input
          type="range"
          min={0.25} max={4} step={0.25}
          value={speedMultiplier}
          onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
          style={{ width: 90, accentColor: '#00f5ff' }}
        />
        <span style={{ fontSize: 11, color: '#c0c0d0', width: 32 }}>{speedMultiplier}×</span>
      </div>

      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#606070' }}>
        Epoch <span style={{ color: '#00f5ff', fontFamily: 'ui-monospace, monospace' }}>{currentEpoch}</span>
      </div>
    </div>
  );
}

function Btn({ label, onClick, disabled, color }: { label: string; onClick: () => void; disabled?: boolean; color: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: `1px solid ${disabled ? '#2a2a3e' : color}`,
        borderRadius: 6,
        color: disabled ? '#2a2a3e' : color,
        padding: '5px 14px',
        fontSize: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
        letterSpacing: 0.5,
        fontFamily: 'ui-monospace, monospace',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.target as HTMLElement).style.background = color + '22'; }}
      onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}
