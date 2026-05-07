import { NetworkGraph } from './components/NetworkGraph/NetworkGraph';
import { Inspector } from './components/Inspector/Inspector';
import { Controls } from './components/Controls/Controls';
import { LossChart } from './components/LossChart/LossChart';
import { useSimStore, DATASETS } from './store/useSimStore';
import { usePlayLoop } from './hooks/usePlayLoop';

export default function App() {
  usePlayLoop();
  const { dataset } = useSimStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid #1e1e2e',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          color: '#00f5ff',
          letterSpacing: 1,
          fontFamily: 'ui-monospace, monospace',
        }}>
          Neural Network Simulator
        </h1>
        <span style={{ fontSize: 12, color: '#606070' }}>
          {dataset} · 2 → 3 → 1 · Sigmoid
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#4488ff' }}>
          Click any hidden or output neuron to inspect it
        </span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Network canvas */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <NetworkGraph />
        </div>

        {/* Right sidebar */}
        <div style={{
          width: 260,
          padding: '20px 16px',
          borderLeft: '1px solid #1e1e2e',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          flexShrink: 0,
        }}>
          <LossChart />
          <TruthTable />
          <Legend />
        </div>

        {/* Inspector slides in from right, absolute */}
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
      <div style={{ fontSize: 11, color: '#606070', marginBottom: 8, letterSpacing: 1 }}>
        {dataset} TRUTH TABLE
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['A', 'B', 'Target'].map((h) => (
              <th key={h} style={{ color: '#606070', fontWeight: 400, textAlign: 'center', padding: '3px 0', borderBottom: '1px solid #1e1e2e' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {samples.map(({ input, target }, i) => (
            <tr key={i}>
              <td style={{ textAlign: 'center', padding: '4px 0', color: '#c0c0d0' }}>{input[0]}</td>
              <td style={{ textAlign: 'center', padding: '4px 0', color: '#c0c0d0' }}>{input[1]}</td>
              <td style={{ textAlign: 'center', padding: '4px 0', color: '#00f5ff' }}>{target[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Legend() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, color: '#606070', letterSpacing: 1 }}>LEGEND</div>
      <LegendRow color="#00f5ff" label="Forward signal" />
      <LegendRow color="#ff4466" label="Gradient (backprop)" />
      <LegendRow color="#4488ff" label="Negative weight" />
      <LegendRow color="#ff8c00" label="Positive weight" />
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <div style={{ width: 20, height: 3, background: color, borderRadius: 2 }} />
      <span style={{ color: '#9090a0' }}>{label}</span>
    </div>
  );
}
