import type { NeuronTrace } from '../../engine/types';
import type { ActivationFn } from '../../engine/activations';

interface Props { trace: NeuronTrace; act: ActivationFn; }

const BAR_MAX_W = 180;

function signedBar(value: number, maxAbs: number) {
  const pct = maxAbs > 0 ? Math.abs(value) / maxAbs : 0;
  const w = Math.max(2, pct * BAR_MAX_W);
  const color = value >= 0 ? 'var(--orange)' : 'var(--blue)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: BAR_MAX_W, background: 'var(--deep)', borderRadius: 2, height: 6, flexShrink: 0 }}>
        <div style={{ width: w, height: 6, background: color, borderRadius: 2, opacity: 0.85 }} />
      </div>
      <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: 11, minWidth: 60 }}>
        {value >= 0 ? '+' : ''}{value.toFixed(4)}
      </span>
    </div>
  );
}

function FormulaText({ html }: { html: string }) {
  const parts = html.split(/(<sup>[^<]*<\/sup>)/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^<sup>(.*)<\/sup>$/);
        return match ? <sup key={i}>{match[1]}</sup> : <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function ComputationTree({ trace, act }: Props) {
  const maxAbs = Math.max(...trace.inputs.map(Math.abs), 0.001);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1, marginBottom: 10 }}>
        COMPUTATION BREAKDOWN
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {trace.inputs.map((val, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>
              w<sub>{i}</sub> · x<sub>{i}</sub>
            </div>
            {signedBar(val, maxAbs)}
          </div>
        ))}
      </div>

      <div style={{ margin: '12px 0 8px', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>z = Σ(w·x) + bias</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--orange)',
            background: 'var(--orange-dim)',
            border: '1px solid rgba(212,148,58,0.3)',
            borderRadius: 4,
            padding: '2px 8px',
          }}>
            {trace.preActivation >= 0 ? '+' : ''}{trace.preActivation.toFixed(5)}
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--teal-dim)',
        border: '1px solid rgba(78,205,196,0.25)',
        borderRadius: 6,
        padding: '8px 12px',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>{act.name}(z)</div>
          <div style={{ fontSize: 11, color: 'var(--text-mid)', fontFamily: 'serif' }}>
            <FormulaText html={act.formulaHtml} />
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>→</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--teal)', fontWeight: 600 }}>
          {trace.postActivation.toFixed(5)}
        </div>
      </div>

      {trace.delta !== 0 && (
        <div style={{
          marginTop: 8,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--red-dim)',
          border: '1px solid rgba(196,77,88,0.25)',
          borderRadius: 6,
          padding: '6px 12px',
        }}>
          <span style={{ fontSize: 10, color: 'var(--red)' }}>δ gradient</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)' }}>
            {trace.delta >= 0 ? '+' : ''}{trace.delta.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
}
