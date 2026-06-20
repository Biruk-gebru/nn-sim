import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSimStore } from '../../store/useSimStore';
import { NeuronDetail } from './NeuronDetail';
import { ComputationGraph } from './ComputationGraph';
import { ACTIVATION_MAP } from '../../engine/activations';

type Tab = 'values' | 'graph';

export function Inspector() {
  const { selectedNeuron, setSelectedNeuron, history, currentEpoch, activationNames, animPhase } = useSimStore();
  const [tab, setTab] = useState<Tab>('values');

  const snap = history[currentEpoch - 1] ?? null;
  const trace = selectedNeuron
    ? snap?.neurons[selectedNeuron.layer]?.[selectedNeuron.neuron] ?? null
    : null;
  const act = selectedNeuron
    ? ACTIVATION_MAP[activationNames[selectedNeuron.layer - 1]]
    : null;

  const hasData = trace !== null && trace.rawInputs.length > 0;
  const isBackward = animPhase === 'backward';

  return (
    <AnimatePresence>
      {selectedNeuron && (
        <motion.div
          key="inspector"
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'absolute',
            top: 0, right: 0,
            width: 308,
            height: '100%',
            background: 'var(--surface-alt)',
            borderLeft: '1px solid var(--border-mid)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px 0',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: 13,
              color: 'var(--accent)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
            }}>
              Inspector
            </span>
            <button
              onClick={() => setSelectedNeuron(null)}
              className="inspector-close"
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-dim)', cursor: 'pointer',
                fontSize: 18, lineHeight: 1, padding: 0,
                transition: 'color 0.15s',
              }}
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: 16,
            padding: '10px 16px 0',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            {(['values', 'graph'] as Tab[]).map((t) => {
              const active = tab === t;
              const disabled = t === 'graph' && !hasData;
              return (
                <button
                  key={t}
                  onClick={() => !disabled && setTab(t)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                    color: disabled ? 'var(--text-faint)' : active ? 'var(--accent)' : 'var(--text-dim)',
                    fontSize: 11,
                    fontWeight: active ? 600 : 400,
                    letterSpacing: 0.8,
                    padding: '0 0 8px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase',
                    transition: 'color 0.15s',
                  }}
                >
                  {t === 'graph' ? 'Comp. Graph' : 'Values'}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px' }}>
            {tab === 'values' && <NeuronDetail />}
            {tab === 'graph' && hasData && trace && act && (
              <ComputationGraph trace={trace} act={act} isBackward={isBackward} />
            )}
            {tab === 'graph' && !hasData && (
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 24 }}>
                Step the network at least once to see the computation graph.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
