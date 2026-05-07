import type { NeuronTrace } from '../../engine/types';
import type { ActivationFn } from '../../engine/activations';

interface Props {
  trace: NeuronTrace;
  act: ActivationFn;
}

const BAR_MAX_W = 180;

function signedBar(value: number, maxAbs: number) {
  const pct = maxAbs > 0 ? Math.abs(value) / maxAbs : 0;
  const w = Math.max(2, pct * BAR_MAX_W);
  const color = value >= 0 ? '#ff8c00' : '#4488ff';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: BAR_MAX_W, background: '#1a1a2e', borderRadius: 2, height: 6, flexShrink: 0 }}>
        <div style={{ width: w, height: 6, background: color, borderRadius: 2, opacity: 0.85 }} />
      </div>
      <span style={{ color, fontFamily: 'ui-monospace, monospace', fontSize: 11, minWidth: 60 }}>
        {value >= 0 ? '+' : ''}{value.toFixed(4)}
      </span>
    </div>
  );
}

export function ComputationTree({ trace, act }: Props) {
  const maxAbs = Math.max(...trace.inputs.map(Math.abs), 0.001);
  const sum = trace.preActivation;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ fontSize: 10, color: '#606070', letterSpacing: 1, marginBottom: 10 }}>
        COMPUTATION BREAKDOWN
      </div>

      {/* Weighted inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {trace.inputs.map((val, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: '#606070', marginBottom: 3 }}>
              w<sub>{i}</sub> · x<sub>{i}</sub>
            </div>
            {signedBar(val, maxAbs)}
          </div>
        ))}
      </div>

      {/* Separator + sum */}
      <div style={{ margin: '12px 0 8px', borderTop: '1px solid #1e1e2e', paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#606070' }}>
            z = Σ(w·x) + bias
          </span>
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
            color: '#ff8c00',
            background: '#ff8c0011',
            border: '1px solid #ff8c0033',
            borderRadius: 4,
            padding: '2px 8px',
          }}>
            {sum >= 0 ? '+' : ''}{sum.toFixed(5)}
          </span>
        </div>
      </div>

      {/* Activation arrow */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#00f5ff08',
        border: '1px solid #00f5ff22',
        borderRadius: 6,
        padding: '8px 12px',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#606070', marginBottom: 2 }}>
            {act.name}(z)
          </div>
          <div
            style={{ fontSize: 11, color: '#9090a0', fontFamily: 'serif' }}
            dangerouslySetInnerHTML={{ __html: act.formulaHtml }}
          />
        </div>
        <div style={{ fontSize: 10, color: '#606070' }}>→</div>
        <div style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 14,
          color: '#00f5ff',
          fontWeight: 600,
        }}>
          {trace.postActivation.toFixed(5)}
        </div>
      </div>

      {/* Gradient row (only if backprop ran) */}
      {trace.delta !== 0 && (
        <div style={{
          marginTop: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ff446608',
          border: '1px solid #ff446622',
          borderRadius: 6,
          padding: '6px 12px',
        }}>
          <span style={{ fontSize: 10, color: '#ff4466' }}>δ gradient</span>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: '#ff4466' }}>
            {trace.delta >= 0 ? '+' : ''}{trace.delta.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
}
