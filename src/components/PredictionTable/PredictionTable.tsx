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
        fontSize: 11,
        color: '#606070',
        marginBottom: 8,
        letterSpacing: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>PREDICTIONS</span>
        {allCorrect && (
          <span style={{ color: '#00ff88', fontSize: 10 }}>ALL ✓</span>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['A', 'B', 'Target', 'Pred', ''].map((h) => (
              <th key={h} style={{
                color: '#606070',
                fontWeight: 400,
                textAlign: 'center',
                padding: '3px 0',
                borderBottom: '1px solid #1e1e2e',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {predictions.map(({ input, target, pred, correct }, i) => (
            <tr key={i}>
              <td style={{ textAlign: 'center', padding: '4px 0', color: '#c0c0d0' }}>{input[0]}</td>
              <td style={{ textAlign: 'center', padding: '4px 0', color: '#c0c0d0' }}>{input[1]}</td>
              <td style={{ textAlign: 'center', padding: '4px 0', color: '#00f5ff' }}>{target}</td>
              <td style={{
                textAlign: 'center',
                padding: '4px 0',
                color: correct ? '#00ff88' : '#ff4466',
                fontFamily: 'ui-monospace, monospace',
              }}>
                {pred.toFixed(2)}
              </td>
              <td style={{
                textAlign: 'center',
                padding: '4px 0',
                color: correct ? '#00ff88' : '#ff4466',
                fontSize: 11,
              }}>
                {correct ? '✓' : '✗'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
