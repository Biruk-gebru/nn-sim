import { useEffect } from 'react';
import { useSimStore } from '../store/useSimStore';
import { useStepTraining } from './useTraining';

export function useKeyboard() {
  const { stepOnce } = useStepTraining();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      const state = useSimStore.getState();
      const busy = state.animPhase === 'forward' || state.animPhase === 'backward';

      if (e.code === 'Space') {
        e.preventDefault();
        if (busy && !state.isPlaying) return;
        state.setIsPlaying(!state.isPlaying);
      }
      if (e.code === 'KeyR') {
        state.reset();
      }
      if (e.code === 'ArrowRight' && !state.isPlaying && !busy) {
        stepOnce();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [stepOnce]);
}
