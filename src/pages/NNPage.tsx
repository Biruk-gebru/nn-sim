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
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div className="nn-view" style={{ height: 'clamp(600px, 94vh, 1080px)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
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
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {dataset} · {archStr} · {actStr}
        </span>
        {isConverged && (
          <span style={{
            fontSize: 10, color: 'var(--green)',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
          }}>
            converged
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)' }}>
          Click a neuron to inspect
        </span>
      </div>

      {/* Main content */}
      <div className="nn-main" style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', flexWrap: 'wrap' }}>
        {/* Network canvas */}
        <div className="nn-graph" style={{
          flex: '1 1 400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          minWidth: 0,
          minHeight: 260,
          overflow: 'auto',
        }}>
          <NetworkGraph />
        </div>

        {/* Right sidebar */}
        <div className="nn-sidebar" style={{
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

      <div className="page-outer" style={{ maxWidth: 880, margin: '0 auto', padding: '40px 32px 80px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ paddingTop: 40, borderTop: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 20px', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>how it works</p>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            A neural network is a chain of mathematical transformations stacked in layers. Each neuron computes a weighted sum of its inputs, adds a bias, then passes the result through a non-linear activation function. Stacking many layers allows the network to compose simple transformations into ones that can separate complex patterns — the XOR problem here is the canonical example that single-layer perceptrons famously cannot solve.
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Training runs in two directions. The forward pass computes a prediction for each input; the loss function measures how wrong it is. Backpropagation then applies the chain rule of calculus to trace how much each weight contributed to the error. Gradient descent adjusts every weight a small step opposite to its gradient, nudging the network toward lower loss.
          </p>
          <p style={{ margin: '0 0 32px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            The animation shows the full cycle: each step is one epoch — all four XOR samples forward, loss computed, gradients flowing backward, weights updated. Edge colour reflects the current weight; neuron brightness reflects its activation. Click any neuron to open the inspector and see the exact arithmetic for that node.
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>learn more</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="https://www.3blue1brown.com/topics/neural-networks" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ 3Blue1Brown: Neural Networks series</a>
            <a href="http://neuralnetworksanddeeplearning.com/" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Neural Networks and Deep Learning by Michael Nielsen (free book)</a>
            <a href="https://cs231n.github.io/neural-networks-1/" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ CS231n Lecture Notes: Neural Networks</a>
            <a href="https://www.3blue1brown.com/lessons/backpropagation-calculus" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Backpropagation calculus — 3Blue1Brown</a>
          </div>
        </div>
      </div>
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
