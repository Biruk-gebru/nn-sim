import { useCallback } from 'react';
import { useSimStore, DATASETS } from '../store/useSimStore';
import { useAnimation } from './useAnimation';

export function useStepTraining() {
  const { run: runAnim } = useAnimation();

  const stepOnce = useCallback(async () => {
    const state = useSimStore.getState();
    if (state.isConverged) return;
    const samples = DATASETS[state.dataset];
    const snap = state.net.stepEpoch(samples, state.currentEpoch + 1);
    state.commitSnapshot(snap);
    await runAnim();
  }, [runAnim]);

  return { stepOnce };
}
