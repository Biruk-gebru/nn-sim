import { create } from 'zustand';
import type { EpochSnapshot } from '../engine/types';
import { sigmoid } from '../engine/activations';
import { NeuralNet } from '../engine/nn';
import { DATASETS, type DatasetName } from '../engine/datasets';

export const ARCHITECTURE = [2, 3, 1];
export const ACTIVATIONS = [sigmoid, sigmoid];

export interface SelectedNeuron {
  layer: number;
  neuron: number;
}

export type AnimPhase = 'idle' | 'forward' | 'backward' | 'done';

interface SimState {
  net: NeuralNet;
  history: EpochSnapshot[];
  currentEpoch: number;
  selectedNeuron: SelectedNeuron | null;
  animPhase: AnimPhase;
  animWaveIdx: number;
  isPlaying: boolean;
  speedMultiplier: number;
  dataset: DatasetName;

  commitSnapshot: (snap: EpochSnapshot) => void;
  setSelectedNeuron: (n: SelectedNeuron | null) => void;
  setAnimPhase: (p: AnimPhase) => void;
  setAnimWaveIdx: (i: number) => void;
  setIsPlaying: (v: boolean) => void;
  setSpeedMultiplier: (v: number) => void;
  setDataset: (d: DatasetName) => void;
  reset: () => void;
}

function makeNet() {
  return new NeuralNet(ARCHITECTURE, ACTIVATIONS, 0.1);
}

export const useSimStore = create<SimState>((set) => ({
  net: makeNet(),
  history: [],
  currentEpoch: 0,
  selectedNeuron: null,
  animPhase: 'idle',
  animWaveIdx: -1,
  isPlaying: false,
  speedMultiplier: 1.0,
  dataset: 'XOR',

  commitSnapshot: (snap) =>
    set((s) => ({ history: [...s.history, snap], currentEpoch: snap.epoch })),

  setSelectedNeuron: (n) => set({ selectedNeuron: n }),
  setAnimPhase: (p) => set({ animPhase: p }),
  setAnimWaveIdx: (i) => set({ animWaveIdx: i }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setSpeedMultiplier: (v) => set({ speedMultiplier: Math.max(0.25, Math.min(4, v)) }),

  setDataset: (d) =>
    set({
      dataset: d,
      net: makeNet(),
      history: [],
      currentEpoch: 0,
      selectedNeuron: null,
      animPhase: 'idle',
      animWaveIdx: -1,
      isPlaying: false,
    }),

  reset: () =>
    set({
      net: makeNet(),
      history: [],
      currentEpoch: 0,
      selectedNeuron: null,
      animPhase: 'idle',
      animWaveIdx: -1,
      isPlaying: false,
    }),
}));

export { DATASETS };
export type { DatasetName };
