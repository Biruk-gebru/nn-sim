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
        padding: '10px 20px',
        background: '#0e0e18',
        borderTop: '1px solid #1e1e2e',
        flexWrap: 'wrap',
        rowGap: 8,
      }}>
        {/* Dataset switcher */}
        <div style={{ display: 'flex', gap: 2, background: '#12121a', borderRadius: 7, padding: 2 }}>
          {DATASETS.map((d) => (
            <button
              key={d}
              onClick={() => { setDataset(d); setShowArch(false); }}
              style={{
                background: dataset === d ? '#1e1e2e' : 'transparent',
                border: dataset === d ? '1px solid #2a2a40' : '1px solid transparent',
                borderRadius: 5,
                color: dataset === d ? '#00f5ff' : '#606070',
                padding: '4px 10px',
                fontSize: 11,
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

        {/* Arch builder toggle */}
        <Btn
          label="ARCH"
          onClick={() => setShowArch((v) => !v)}
          color={showArch ? '#00f5ff' : '#606070'}
          active={showArch}
        />

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: '#1e1e2e' }} />

        {/* Step */}
        <Btn label="Step →" onClick={stepOnce} disabled={isPlaying || busy || isConverged} color="#4488ff" />

        {/* Play / Pause */}
        <Btn
          label={isPlaying ? 'Pause' : 'Play'}
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={(busy && !isPlaying) || isConverged}
          color="#00f5ff"
        />

        {/* Reset */}
        <Btn label="Reset" onClick={reset} color="#ff4466" />

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: '#1e1e2e' }} />

        {/* Speed */}
        <SliderRow
          label="Speed"
          min={0.25} max={4} step={0.25}
          value={speedMultiplier}
          display={`${speedMultiplier}×`}
          color="#00f5ff"
          onChange={setSpeedMultiplier}
        />

        {/* Learning rate */}
        <SliderRow
          label="LR"
          min={0.001} max={1} step={0.001}
          value={lr}
          display={lr < 0.01 ? lr.toFixed(3) : lr.toFixed(2)}
          color="#ff8c00"
          onChange={setLr}
        />

        {/* Convergence threshold */}
        <SliderRow
          label="Conv"
          min={0.0001} max={0.1} step={0.0001}
          value={convergenceThreshold}
          display={convergenceThreshold < 0.01 ? convergenceThreshold.toFixed(4) : convergenceThreshold.toFixed(3)}
          color="#4488ff"
          onChange={setConvergenceThreshold}
        />

        {/* Epoch + convergence badge */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {isConverged && (
            <span style={{
              fontSize: 10,
              color: '#00ff88',
              background: '#00ff8815',
              border: '1px solid #00ff8840',
              borderRadius: 4,
              padding: '2px 8px',
              letterSpacing: 0.5,
            }}>
              CONVERGED
            </span>
          )}
          <span style={{ fontSize: 12, color: '#606070' }}>
            Epoch <span style={{ color: '#00f5ff', fontFamily: 'ui-monospace, monospace' }}>{currentEpoch}</span>
          </span>
        </div>
      </div>

      {/* Keyboard hint */}
      <div style={{ padding: '2px 20px 4px', background: '#0e0e18', fontSize: 10, color: '#2a2a40' }}>
        Space: play/pause · →: step · R: reset
      </div>
    </div>
  );
}

function SliderRow({
  label, min, max, step, value, display, color, onChange,
}: {
  label: string; min: number; max: number; step: number;
  value: number; display: string; color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 10, color: '#606070', minWidth: 28 }}>{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: 80, accentColor: color }}
      />
      <span style={{ fontSize: 11, color: '#c0c0d0', width: 36, fontFamily: 'ui-monospace, monospace' }}>
        {display}
      </span>
    </div>
  );
}

function Btn({
  label, onClick, disabled, color, active,
}: {
  label: string; onClick: () => void; disabled?: boolean; color: string; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: active ? color + '22' : 'transparent',
        border: `1px solid ${disabled ? '#2a2a3e' : color}`,
        borderRadius: 6,
        color: disabled ? '#2a2a3e' : color,
        padding: '5px 12px',
        fontSize: 11,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
        letterSpacing: 0.5,
        fontFamily: 'ui-monospace, monospace',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = color + '22'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}
