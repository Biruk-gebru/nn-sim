import { useSimStore, DATASETS } from '../../store/useSimStore';

export function PredictionTable() {
  const { net, dataset, currentEpoch } = useSimStore();
  const samples = DATASETS[dataset];

  if (currentEpoch === 0) return null;

  const predictions = samples.map(({ input, target }) => {
    const pred = net.predict(input)[0];
    const correct = Math.round(pred) === target[0];
    return { input, target: target[0], pred, correct };
  });

  const allCorrect = predictions.every((p) => p.correct);

  return (
    <div>
      <div style={{
        fontSize: 11, color: 'var(--text-dim)', marginBottom: 8,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11 }}>predictions</span>
        {allCorrect && <span style={{ color: 'var(--green)' }}>ALL ✓</span>}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['A', 'B', 'Tgt', 'Pred', ''].map((h) => (
              <th key={h} style={{
                color: 'var(--text-dim)', fontWeight: 400, textAlign: 'center',
                padding: '3px 0', borderBottom: '1px solid var(--border)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {predictions.map(({ input, target, pred, correct }, i) => (
            <tr key={i}>
              <td style={{ textAlign: 'center', padding: '4px 0', color: 'var(--text-mid)' }}>{input[0]}</td>
              <td style={{ textAlign: 'center', padding: '4px 0', color: 'var(--text-mid)' }}>{input[1]}</td>
              <td style={{ textAlign: 'center', padding: '4px 0', color: 'var(--accent)' }}>{target}</td>
              <td style={{
                textAlign: 'center', padding: '4px 0',
                color: correct ? 'var(--green)' : 'var(--red)',
                fontFamily: 'var(--font-mono)',
              }}>
                {pred.toFixed(2)}
              </td>
              <td style={{ textAlign: 'center', padding: '4px 0', color: correct ? 'var(--green)' : 'var(--red)', fontSize: 11 }}>
                {correct ? '✓' : '✗'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
