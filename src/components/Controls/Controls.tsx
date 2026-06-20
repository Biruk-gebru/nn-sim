import { useState } from 'react';
import { useSimStore, type DatasetName } from '../../store/useSimStore';
import { useStepTraining } from '../../hooks/useTraining';
import { ArchitectureBuilder } from '../ArchitectureBuilder/ArchitectureBuilder';

const DATASETS: DatasetName[] = ['XOR', 'AND', 'OR', 'NAND', 'XNOR'];

export function Controls() {
  const {
    isPlaying, speedMultiplier, currentEpoch, animPhase,
    dataset, lr, convergenceThreshold, isConverged,
    setIsPlaying, setSpeedMultiplier, setDataset, setLr,
    setConvergenceThreshold, reset,
  } = useSimStore();
  const { stepOnce } = useStepTraining();
  const [showArch, setShowArch] = useState(false);

  const busy = animPhase === 'forward' || animPhase === 'backward';

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {showArch && <ArchitectureBuilder />}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 20px',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap',
        rowGap: 8,
      }}>
        {/* Dataset switcher */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', borderRadius: 7, padding: 2, border: '1px solid var(--border)' }}>
          {DATASETS.map((d) => (
            <button
              key={d}
              onClick={() => { setDataset(d); setShowArch(false); }}
              style={{
                background: dataset === d ? 'var(--surface-alt)' : 'transparent',
                border: `1px solid ${dataset === d ? 'var(--border-mid)' : 'transparent'}`,
                borderRadius: 5,
                color: dataset === d ? 'var(--accent)' : 'var(--text-dim)',
                padding: '3px 9px',
                fontSize: 11,
                cursor: 'pointer',
                fontFamily: 'ui-monospace, monospace',
                letterSpacing: 0.5,
                transition: 'all 0.15s',
                boxShadow: dataset === d ? '0 0 8px rgba(205,179,128,0.15)' : 'none',
              }}
            >
              {d}
            </button>
          ))}
        </div>

        <Btn label="ARCH" onClick={() => setShowArch((v) => !v)} color={showArch ? 'var(--accent)' : 'var(--text-dim)'} active={showArch} />

        <div style={{ width: 1, height: 20, background: 'var(--border-mid)', opacity: 0.35 }} />

        <Btn label="Step →" onClick={stepOnce} disabled={isPlaying || busy || isConverged} color="var(--blue)" />
        <Btn label={isPlaying ? 'Pause' : 'Play'} onClick={() => setIsPlaying(!isPlaying)} disabled={(busy && !isPlaying) || isConverged} color="var(--teal)" />
        <Btn label="Reset" onClick={reset} color="var(--red)" />

        <div style={{ width: 1, height: 20, background: 'var(--border-mid)', opacity: 0.35 }} />

        <SliderRow label="Speed" min={0.25} max={4} step={0.25} value={speedMultiplier}
          display={`${speedMultiplier}×`} color="var(--teal)" onChange={setSpeedMultiplier} />

        <SliderRow label="LR" min={0.001} max={1} step={0.001} value={lr}
          display={lr < 0.01 ? lr.toFixed(3) : lr.toFixed(2)} color="var(--accent)" onChange={setLr} />

        <SliderRow label="Conv" min={0.0001} max={0.1} step={0.0001} value={convergenceThreshold}
          display={convergenceThreshold < 0.01 ? convergenceThreshold.toFixed(4) : convergenceThreshold.toFixed(3)}
          color="var(--orange)" onChange={setConvergenceThreshold} />

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {isConverged && (
            <span style={{
              fontSize: 10, color: 'var(--green)',
              background: 'var(--green-dim)',
              border: '1px solid var(--green)',
              borderRadius: 4, padding: '2px 8px', letterSpacing: 0.5,
            }}>
              CONVERGED
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Epoch <span style={{ color: 'var(--accent)', fontFamily: 'ui-monospace, monospace' }}>{currentEpoch}</span>
          </span>
        </div>
      </div>

      <div style={{ padding: '2px 20px 4px', background: 'var(--surface)', fontSize: 10, color: 'var(--text-faint)', borderTop: '1px solid var(--border)' }}>
        Space: play/pause · →: step · R: reset
      </div>
    </div>
  );
}

function SliderRow({ label, min, max, step, value, display, color, onChange }: {
  label: string; min: number; max: number; step: number;
  value: number; display: string; color: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', minWidth: 28 }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: 78, accentColor: color }}
      />
      <span style={{ fontSize: 11, color: 'var(--text-mid)', width: 36, fontFamily: 'ui-monospace, monospace' }}>
        {display}
      </span>
    </div>
  );
}

function Btn({ label, onClick, disabled, color, active }: {
  label: string; onClick: () => void; disabled?: boolean; color: string; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: active ? 'var(--accent-dim)' : 'transparent',
        border: `1px solid ${disabled ? 'var(--text-faint)' : color}`,
        borderRadius: 6,
        color: disabled ? 'var(--text-faint)' : color,
        padding: '4px 11px',
        fontSize: 11,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
        letterSpacing: 0.5,
        fontFamily: 'ui-monospace, monospace',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}
