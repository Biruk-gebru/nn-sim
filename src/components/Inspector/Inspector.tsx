import { AnimatePresence, motion } from 'framer-motion';
import { useSimStore } from '../../store/useSimStore';
import { NeuronDetail } from './NeuronDetail';

export function Inspector() {
  const { selectedNeuron, setSelectedNeuron } = useSimStore();

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
            top: 0,
            right: 0,
            width: 300,
            height: '100%',
            background: 'var(--surface-alt)',
            borderLeft: '1px solid var(--border-mid)',
            padding: 20,
            overflowY: 'auto',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Neuron Inspector
            </span>
            <button
              onClick={() => setSelectedNeuron(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <NeuronDetail />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
