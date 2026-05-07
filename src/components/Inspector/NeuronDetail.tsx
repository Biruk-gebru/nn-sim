import { useSimStore, ACTIVATIONS, ARCHITECTURE } from '../../store/useSimStore';
import { ValueSparkline } from './ValueSparkline';
import { ComputationTree } from './ComputationTree';

export function NeuronDetail() {
  const { selectedNeuron, history, currentEpoch } = useSimStore();
  if (!selectedNeuron) return null;

  const { layer, neuron } = selectedNeuron;
  const snap = history[currentEpoch - 1];
  const trace = snap?.neurons[layer]?.[neuron];
  const act = ACTIVATIONS[layer - 1];
  const isOutput = layer === ARCHITECTURE.length - 1;
  const activationHistory = history.map((s) => s.neurons[layer]?.[neuron]?.postActivation ?? 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{
          background: '#00f5ff22',
          border: '1px solid #00f5ff44',
          borderRadius: 6,
          padding: '3px 10px',
          fontSize: 12,
          color: '#00f5ff',
          letterSpacing: 0.5,
        }}>
          {act?.name ?? 'Linear'}
        </div>
        <span style={{ fontSize: 12, color: '#606070' }}>
          {isOutput ? 'Output' : 'Hidden'} L{layer}·N{neuron + 1}
        </span>
      </div>

      {/* Plain-English explanation */}
      <div style={{ fontSize: 13, color: '#9090a0', lineHeight: 1.65 }}>
        {act?.explanation ?? ''}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #1e1e2e' }} />

      {/* Computation tree */}
      {trace && act ? (
        <ComputationTree trace={trace} act={act} />
      ) : (
        <div style={{ fontSize: 12, color: '#606070' }}>
          Step the network to see computation details.
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid #1e1e2e' }} />

      {/* Sparkline */}
      <div>
        <div style={{ fontSize: 10, color: '#606070', marginBottom: 8, letterSpacing: 1 }}>
          OUTPUT ACTIVATION · EPOCH HISTORY
        </div>
        <ValueSparkline values={activationHistory} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: '#2a2a3e' }}>epoch 1</span>
          <span style={{ fontSize: 10, color: '#2a2a3e' }}>{activationHistory.length}</span>
        </div>
      </div>
    </div>
  );
}
