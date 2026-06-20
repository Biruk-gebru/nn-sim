import { useSimStore } from '../../store/useSimStore';
import type { ActivationName } from '../../store/useSimStore';

const MAX_HIDDEN = 4;
const MIN_NEURONS = 1;
const MAX_NEURONS = 10;
const ACT_OPTIONS: ActivationName[] = ['sigmoid', 'relu', 'tanh'];

export function ArchitectureBuilder() {
  const { architecture, activationNames, setArchitecture, setLayerActivation } = useSimStore();

  const hiddenLayers = architecture.slice(1, -1);
  const hiddenActNames = activationNames.slice(0, hiddenLayers.length);
  const outputActName = activationNames[activationNames.length - 1] ?? 'sigmoid';

  function setHiddenNeurons(hiddenIdx: number, delta: number) {
    const newArch = [...architecture];
    const archIdx = hiddenIdx + 1;
    newArch[archIdx] = Math.max(MIN_NEURONS, Math.min(MAX_NEURONS, newArch[archIdx] + delta));
    setArchitecture(newArch);
  }

  function addHiddenLayer() {
    if (hiddenLayers.length >= MAX_HIDDEN) return;
    setArchitecture([...architecture.slice(0, -1), 3, architecture[architecture.length - 1]]);
  }

  function removeHiddenLayer(hiddenIdx: number) {
    if (hiddenLayers.length <= 1) return;
    setArchitecture(architecture.filter((_, i) => i !== hiddenIdx + 1));
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      background: 'var(--surface-alt)',
      borderTop: '1px solid var(--border-mid)',
      padding: '14px 20px',
      zIndex: 20,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 10 }}>
        NETWORK ARCHITECTURE
      </div>

      <Row label="Input">
        <Badge>2</Badge>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>fixed (A, B)</span>
      </Row>

      {hiddenLayers.map((count, hi) => (
        <Row key={hi} label={`Hidden ${hi + 1}`}>
          <IconBtn color="var(--blue)" onClick={() => setHiddenNeurons(hi, -1)} disabled={count <= MIN_NEURONS}>−</IconBtn>
          <Badge>{count}</Badge>
          <IconBtn color="var(--blue)" onClick={() => setHiddenNeurons(hi, 1)} disabled={count >= MAX_NEURONS}>+</IconBtn>
          <ActSelect value={hiddenActNames[hi] ?? 'sigmoid'} onChange={(v) => setLayerActivation(hi, v)} />
          {hiddenLayers.length > 1 && (
            <IconBtn color="var(--red)" onClick={() => removeHiddenLayer(hi)} style={{ marginLeft: 'auto' }}>×</IconBtn>
          )}
        </Row>
      ))}

      <Row label="Output">
        <Badge>1</Badge>
        <ActSelect value={outputActName} onChange={(v) => setLayerActivation(activationNames.length - 1, v)} />
      </Row>

      {hiddenLayers.length < MAX_HIDDEN && (
        <button onClick={addHiddenLayer} style={{
          marginTop: 10,
          background: 'transparent',
          border: '1px dashed var(--border-mid)',
          borderRadius: 5,
          color: 'var(--blue)',
          padding: '4px 14px',
          fontSize: 11,
          cursor: 'pointer',
          width: '100%',
          letterSpacing: 0.3,
        }}>
          + Add hidden layer
        </button>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
      <span style={{ color: 'var(--text-dim)', width: 72, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: 'var(--surface)', border: '1px solid var(--border-mid)',
      borderRadius: 4, padding: '2px 10px', color: 'var(--text)', minWidth: 28, textAlign: 'center',
      fontFamily: 'var(--font-mono)',
    }}>
      {children}
    </span>
  );
}

function IconBtn({ color, onClick, disabled, children, style }: {
  color: string; onClick: () => void; disabled?: boolean;
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: 'transparent', border: `1px solid ${disabled ? 'var(--text-faint)' : color}`,
      borderRadius: 4, color: disabled ? 'var(--text-faint)' : color,
      width: 22, height: 22, cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 14, lineHeight: '20px', textAlign: 'center', flexShrink: 0,
      ...style,
    }}>
      {children}
    </button>
  );
}

function ActSelect({ value, onChange }: { value: ActivationName; onChange: (v: ActivationName) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as ActivationName)} style={{
      background: 'var(--surface)', border: '1px solid var(--border-mid)',
      borderRadius: 4, color: 'var(--text)', padding: '2px 6px', fontSize: 11, cursor: 'pointer',
    }}>
      {ACT_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
    </select>
  );
}
