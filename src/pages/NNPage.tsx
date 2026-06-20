import { NetworkGraph } from '../components/NetworkGraph/NetworkGraph';
import { Inspector } from '../components/Inspector/Inspector';
import { Controls } from '../components/Controls/Controls';
import { LossChart } from '../components/LossChart/LossChart';
import { PredictionTable } from '../components/PredictionTable/PredictionTable';
import { useSimStore, DATASETS } from '../store/useSimStore';
import { usePlayLoop } from '../hooks/usePlayLoop';
import { useKeyboard } from '../hooks/useKeyboard';

export function NNPage() {
  usePlayLoop();
  useKeyboard();

  const { dataset, architecture, activationNames, isConverged } = useSimStore();
  const archStr = architecture.join(' → ');
  const actStr = [...new Set(activationNames)].join('/');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Module header */}
      <div style={{
        padding: '8px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
        flexWrap: 'wrap',
        rowGap: 4,
        background: 'var(--surface)',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: 0.5 }}>
          {dataset} · {archStr} · {actStr}
        </span>
        {isConverged && (
          <span style={{
            fontSize: 10, color: 'var(--green)',
            fontWeight: 700, letterSpacing: 1,
            fontFamily: 'var(--font-mono)',
          }}>
            ✓ CONVERGED
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)' }}>
          Click a neuron to inspect
        </span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', flexWrap: 'wrap' }}>
        {/* Network canvas */}
        <div style={{
          flex: '1 1 400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          minWidth: 0,
          minHeight: 260,
        }}>
          <NetworkGraph />
        </div>

        {/* Right sidebar */}
        <div style={{
          width: 252,
          minWidth: 220,
          padding: '14px 14px',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          flexShrink: 0,
          overflowY: 'auto',
          background: 'var(--surface)',
        }}>
          <LossChart />
          <TruthTable />
          <PredictionTable />
          <Legend />
        </div>

        <Inspector />
      </div>

      <Controls />
    </div>
  );
}

function TruthTable() {
  const { dataset } = useSimStore();
  const samples = DATASETS[dataset];

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
        {dataset} truth table
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['A', 'B', 'Target'].map((h) => (
              <th key={h} style={{ color: 'var(--text-dim)', fontWeight: 400, textAlign: 'center', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {samples.map(({ input, target }, i) => (
            <tr key={i}>
              <td style={{ textAlign: 'center', padding: '4px 0', color: 'var(--text-mid)' }}>{input[0]}</td>
              <td style={{ textAlign: 'center', padding: '4px 0', color: 'var(--text-mid)' }}>{input[1]}</td>
              <td style={{ textAlign: 'center', padding: '4px 0', color: 'var(--accent)' }}>{target[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>legend</div>
      <LegendRow color="var(--teal)" label="Forward signal" />
      <LegendRow color="var(--red)" label="Gradient (backprop)" />
      <LegendRow color="var(--blue)" label="Negative weight" />
      <LegendRow color="var(--orange)" label="Positive weight" />
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
      <div style={{ width: 18, height: 2.5, background: color, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ color: 'var(--text-mid)' }}>{label}</span>
    </div>
  );
}
