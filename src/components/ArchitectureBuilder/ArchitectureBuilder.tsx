import { useSimStore } from '../../store/useSimStore';
import type { ActivationName } from '../../store/useSimStore';

const MAX_HIDDEN = 4;
const MIN_NEURONS = 1;
const MAX_NEURONS = 10;
const ACT_OPTIONS: ActivationName[] = ['sigmoid', 'relu', 'tanh'];

const s = {
  panel: {
    position: 'absolute' as const,
    bottom: '100%',
    left: 0,
    right: 0,
    background: '#0e0e18',
    borderTop: '1px solid #1e1e2e',
    padding: '14px 20px',
    zIndex: 20,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '5px 0',
    borderBottom: '1px solid #12121a',
    fontSize: 12,
  },
  label: { color: '#606070', width: 72, flexShrink: 0 as const },
  badge: {
    background: '#1e1e2e',
    border: '1px solid #2a2a40',
    borderRadius: 4,
    padding: '2px 10px',
    color: '#c0c0d0',
    fontFamily: 'ui-monospace, monospace',
    minWidth: 28,
    textAlign: 'center' as const,
  },
  iconBtn: (color = '#606070') => ({
    background: 'transparent',
    border: `1px solid ${color}`,
    borderRadius: 4,
    color,
    width: 22,
    height: 22,
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: '20px',
    textAlign: 'center' as const,
    flexShrink: 0 as const,
  }),
  select: {
    background: '#12121a',
    border: '1px solid #2a2a40',
    borderRadius: 4,
    color: '#c0c0d0',
    padding: '2px 6px',
    fontSize: 11,
    cursor: 'pointer',
  },
};

export function ArchitectureBuilder() {
  const { architecture, activationNames, setArchitecture, setLayerActivation } = useSimStore();

  // architecture = [2, ...hidden, 1]
  // activationNames = per non-input layer, length = architecture.length - 1
  const hiddenLayers = architecture.slice(1, -1);
  const hiddenActNames = activationNames.slice(0, hiddenLayers.length);
  const outputActName = activationNames[activationNames.length - 1] ?? 'sigmoid';

  function setHiddenNeurons(hiddenIdx: number, delta: number) {
    const newArch = [...architecture];
    const archIdx = hiddenIdx + 1; // offset by input layer
    newArch[archIdx] = Math.max(MIN_NEURONS, Math.min(MAX_NEURONS, newArch[archIdx] + delta));
    setArchitecture(newArch);
  }

  function addHiddenLayer() {
    if (hiddenLayers.length >= MAX_HIDDEN) return;
    // insert before output layer
    const newArch = [...architecture.slice(0, -1), 3, architecture[architecture.length - 1]];
    setArchitecture(newArch);
  }

  function removeHiddenLayer(hiddenIdx: number) {
    if (hiddenLayers.length <= 1) return;
    const newArch = architecture.filter((_, i) => i !== hiddenIdx + 1);
    setArchitecture(newArch);
  }

  return (
    <div style={s.panel}>
      <div style={{ fontSize: 10, color: '#606070', letterSpacing: 1, marginBottom: 10 }}>
        NETWORK ARCHITECTURE
      </div>

      {/* Input layer — fixed */}
      <div style={s.row}>
        <span style={s.label}>Input</span>
        <span style={s.badge}>2</span>
        <span style={{ color: '#2a2a40', fontSize: 11 }}>fixed (A, B)</span>
      </div>

      {/* Hidden layers */}
      {hiddenLayers.map((count, hi) => (
        <div key={hi} style={s.row}>
          <span style={s.label}>Hidden {hi + 1}</span>
          <button style={s.iconBtn('#4488ff')} onClick={() => setHiddenNeurons(hi, -1)} disabled={count <= MIN_NEURONS}>−</button>
          <span style={s.badge}>{count}</span>
          <button style={s.iconBtn('#4488ff')} onClick={() => setHiddenNeurons(hi, 1)} disabled={count >= MAX_NEURONS}>+</button>
          <select
            style={s.select}
            value={hiddenActNames[hi] ?? 'sigmoid'}
            onChange={(e) => setLayerActivation(hi, e.target.value as ActivationName)}
          >
            {ACT_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          {hiddenLayers.length > 1 && (
            <button
              style={{ ...s.iconBtn('#ff4466'), marginLeft: 'auto' }}
              onClick={() => removeHiddenLayer(hi)}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* Output layer */}
      <div style={s.row}>
        <span style={s.label}>Output</span>
        <span style={s.badge}>1</span>
        <span style={{ color: '#2a2a40', fontSize: 11, marginRight: 8 }}>fixed</span>
        <select
          style={s.select}
          value={outputActName}
          onChange={(e) => setLayerActivation(activationNames.length - 1, e.target.value as ActivationName)}
        >
          {ACT_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Add hidden layer */}
      {hiddenLayers.length < MAX_HIDDEN && (
        <button
          onClick={addHiddenLayer}
          style={{
            marginTop: 10,
            background: 'transparent',
            border: '1px dashed #2a2a40',
            borderRadius: 5,
            color: '#4488ff',
            padding: '4px 14px',
            fontSize: 11,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          + Add hidden layer
        </button>
      )}
    </div>
  );
}
