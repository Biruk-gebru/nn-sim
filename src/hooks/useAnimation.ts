import { useCallback, useRef } from 'react';
import { useSimStore } from '../store/useSimStore';

const BASE_PULSE_MS = 700;
const BASE_FLASH_MS = 300;
const BASE_WEIGHT_MS = 400;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useAnimation() {
  const cancelRef = useRef(false);

  const run = useCallback(async () => {
    cancelRef.current = false;
    const speed = () => useSimStore.getState().speedMultiplier;

    // Forward pass: wave 0 = layer 0→1, wave 1 = layer 1→2
    useSimStore.getState().setAnimPhase('forward');
    for (let wave = 0; wave < 2; wave++) {
      if (cancelRef.current) return;
      useSimStore.getState().setAnimWaveIdx(wave);
      await delay(BASE_PULSE_MS / speed());
      if (cancelRef.current) return;
      await delay(BASE_FLASH_MS / speed());
    }

    await delay(200 / speed());

    // Backward pass: wave 1 (layer 1→2) then wave 0 (layer 0→1) — reversed
    useSimStore.getState().setAnimPhase('backward');
    for (let wave = 1; wave >= 0; wave--) {
      if (cancelRef.current) return;
      useSimStore.getState().setAnimWaveIdx(wave);
      await delay(BASE_PULSE_MS / speed());
      if (cancelRef.current) return;
      await delay(BASE_FLASH_MS / speed());
    }

    await delay(BASE_WEIGHT_MS / speed());
    useSimStore.getState().setAnimPhase('done');
    await delay(100);
    useSimStore.getState().setAnimPhase('idle');
    useSimStore.getState().setAnimWaveIdx(-1);
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    useSimStore.getState().setAnimPhase('idle');
    useSimStore.getState().setAnimWaveIdx(-1);
  }, []);

  return { run, cancel };
}
