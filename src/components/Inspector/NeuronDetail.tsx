import { useSimStore } from '../../store/useSimStore';
import { ACTIVATION_MAP } from '../../engine/activations';
import { ValueSparkline } from './ValueSparkline';
import { ComputationTree } from './ComputationTree';

export function NeuronDetail() {
  const { selectedNeuron, history, currentEpoch, architecture, activationNames } = useSimStore();
  if (!selectedNeuron) return null;

  const { layer, neuron } = selectedNeuron;
  const snap = history[currentEpoch - 1];
  const trace = snap?.neurons[layer]?.[neuron];
  const act = ACTIVATION_MAP[activationNames[layer - 1]];
  const isOutput = layer === architecture.length - 1;
  const activationHistory = history.map((s) => s.neurons[layer]?.[neuron]?.postActivation ?? 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{
          background: 'var(--accent-dim)',
          border: '1px solid var(--accent)',
          borderRadius: 5,
          padding: '3px 10px',
          fontSize: 11,
          color: 'var(--accent)',
          letterSpacing: 0.5,
        }}>
          {act?.name ?? 'Linear'}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {isOutput ? 'Output' : 'Hidden'} L{layer}·N{neuron + 1}
        </span>
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.65, fontFamily: 'system-ui, sans-serif' }}>
        {act?.explanation ?? ''}
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {trace && act ? (
        <ComputationTree trace={trace} act={act} />
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Step the network to see computation details.
        </div>
      )}

      <div style={{ height: 1, background: 'var(--border)' }} />

      <div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 8, letterSpacing: 1 }}>
          OUTPUT ACTIVATION · EPOCH HISTORY
        </div>
        <ValueSparkline values={activationHistory} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>epoch 1</span>
          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{activationHistory.length}</span>
        </div>
      </div>
    </div>
  );
}
