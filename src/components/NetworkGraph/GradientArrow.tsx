import { motion } from 'framer-motion';
import { useSimStore } from '../../store/useSimStore';

interface Props {
  x1: number; y1: number; x2: number; y2: number;
  delta: number;
}

export function GradientArrow({ x1, y1, x2, y2, delta }: Props) {
  const speed = useSimStore((s) => s.speedMultiplier);
  const duration = 0.65 / speed;

  return (
    <motion.g
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration, times: [0, 0.8, 1] }}
    >
      <motion.circle
        r={7}
        fill="#e0623a"
        style={{ filter: 'drop-shadow(0 0 6px #e0623a)' }}
        initial={{ cx: x1, cy: y1 }}
        animate={{ cx: x2, cy: y2 }}
        transition={{ duration, ease: 'easeInOut' }}
      />
      <motion.text
        textAnchor="middle"
        fontSize={9}
        fill="#f2e9e1"
        fontWeight="bold"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        initial={{ x: x1, y: y1 + 3 }}
        animate={{ x: x2, y: y2 + 3 }}
        transition={{ duration, ease: 'easeInOut' }}
      >
        {delta.toFixed(3)}
      </motion.text>
    </motion.g>
  );
}
