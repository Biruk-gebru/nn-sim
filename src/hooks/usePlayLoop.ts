import { useEffect } from 'react';
import { useSimStore, DATASETS } from '../store/useSimStore';
import { useAnimation } from './useAnimation';

export function usePlayLoop() {
  const isPlaying = useSimStore((s) => s.isPlaying);
  const { run: runAnim } = useAnimation();

  useEffect(() => {
    if (!isPlaying) return;
    let alive = true;

    const loop = async () => {
      while (alive && useSimStore.getState().isPlaying) {
        const state = useSimStore.getState();
        const samples = DATASETS[state.dataset];
        const snap = state.net.stepEpoch(samples, state.currentEpoch + 1);
        state.commitSnapshot(snap);
        await runAnim();
        await new Promise<void>((r) =>
          setTimeout(r, Math.max(10, 50 / useSimStore.getState().speedMultiplier))
        );
      }
    };

    loop();
    return () => { alive = false; };
  }, [isPlaying, runAnim]);
}
