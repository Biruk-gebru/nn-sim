import { create } from 'zustand';
import type { EpochSnapshot } from '../engine/types';
import { NeuralNet } from '../engine/nn';
import { ACTIVATION_MAP, type ActivationName } from '../engine/activations';
import { DATASETS, type DatasetName } from '../engine/datasets';

export const DEFAULT_ARCHITECTURE = [2, 3, 1];
export const DEFAULT_ACTIVATION_NAMES: ActivationName[] = ['sigmoid', 'sigmoid'];
const DEFAULT_LR = 0.1;
const DEFAULT_SPEED = 1.0;
const DEFAULT_THRESHOLD = 0.01;
const HISTORY_CAP = 500;
const CONFIG_KEY = 'nn-sim-config';
const CONFIG_VERSION = 2; // bump to clear any stale persisted architecture

interface PersistedConfig {
  architecture: number[];
  activationNames: ActivationName[];
  lr: number;
  dataset: DatasetName;
  speedMultiplier: number;
  convergenceThreshold: number;
}

function loadConfig(): Partial<PersistedConfig> {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed._v !== CONFIG_VERSION) return {}; // stale config — reset to defaults
    return parsed;
  } catch {
    return {};
  }
}

function saveConfig(c: PersistedConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...c, _v: CONFIG_VERSION }));
  } catch { /* ignore write failures */ }
}

function makeNet(arch: number[], actNames: ActivationName[], lr: number): NeuralNet {
  return new NeuralNet(arch, actNames.map((n) => ACTIVATION_MAP[n]), lr);
}

const saved = loadConfig();

const initialArch = saved.architecture ?? DEFAULT_ARCHITECTURE;
const rawActNames = saved.activationNames ?? DEFAULT_ACTIVATION_NAMES;
// ensure length matches arch (guard against stale config)
const initialActNames = Array.from(
  { length: initialArch.length - 1 },
  (_, i) => rawActNames[i] ?? 'sigmoid'
) as ActivationName[];
const initialLr = saved.lr ?? DEFAULT_LR;
const initialDataset: DatasetName = saved.dataset ?? 'XOR';
const initialSpeed = saved.speedMultiplier ?? DEFAULT_SPEED;
const initialThreshold = saved.convergenceThreshold ?? DEFAULT_THRESHOLD;

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
  isConverged: boolean;
  speedMultiplier: number;
  dataset: DatasetName;
  architecture: number[];
  activationNames: ActivationName[];
  lr: number;
  convergenceThreshold: number;

  commitSnapshot: (snap: EpochSnapshot) => void;
  setSelectedNeuron: (n: SelectedNeuron | null) => void;
  setAnimPhase: (p: AnimPhase) => void;
  setAnimWaveIdx: (i: number) => void;
  setIsPlaying: (v: boolean) => void;
  setSpeedMultiplier: (v: number) => void;
  setDataset: (d: DatasetName) => void;
  setArchitecture: (arch: number[]) => void;
  setLayerActivation: (layerIdx: number, name: ActivationName) => void;
  setLr: (lr: number) => void;
  setConvergenceThreshold: (t: number) => void;
  reset: () => void;
}

function simReset(s: SimState) {
  return {
    net: makeNet(s.architecture, s.activationNames, s.lr),
    history: [] as EpochSnapshot[],
    currentEpoch: 0,
    selectedNeuron: null as SelectedNeuron | null,
    animPhase: 'idle' as AnimPhase,
    animWaveIdx: -1,
    isPlaying: false,
    isConverged: false,
  };
}

export const useSimStore = create<SimState>((set) => ({
  net: makeNet(initialArch, initialActNames, initialLr),
  history: [],
  currentEpoch: 0,
  selectedNeuron: null,
  animPhase: 'idle',
  animWaveIdx: -1,
  isPlaying: false,
  isConverged: false,
  speedMultiplier: initialSpeed,
  dataset: initialDataset,
  architecture: initialArch,
  activationNames: initialActNames,
  lr: initialLr,
  convergenceThreshold: initialThreshold,

  commitSnapshot: (snap) =>
    set((s) => {
      const history = [...s.history, snap].slice(-HISTORY_CAP);
      const converged = snap.loss <= s.convergenceThreshold;
      return {
        history,
        currentEpoch: snap.epoch,
        isConverged: s.isConverged || converged,
        isPlaying: converged ? false : s.isPlaying,
      };
    }),

  setSelectedNeuron: (n) => set({ selectedNeuron: n }),
  setAnimPhase: (p) => set({ animPhase: p }),
  setAnimWaveIdx: (i) => set({ animWaveIdx: i }),
  setIsPlaying: (v) =>
    set((s) => ({ isPlaying: s.isConverged ? false : v })),

  setSpeedMultiplier: (v) =>
    set((s) => {
      const speedMultiplier = Math.max(0.25, Math.min(4, v));
      saveConfig({ architecture: s.architecture, activationNames: s.activationNames, lr: s.lr, dataset: s.dataset, speedMultiplier, convergenceThreshold: s.convergenceThreshold });
      return { speedMultiplier };
    }),

  setDataset: (d) =>
    set((s) => {
      saveConfig({ architecture: s.architecture, activationNames: s.activationNames, lr: s.lr, dataset: d, speedMultiplier: s.speedMultiplier, convergenceThreshold: s.convergenceThreshold });
      return { ...simReset(s), dataset: d };
    }),

  setArchitecture: (arch) =>
    set((s) => {
      const actNames = Array.from(
        { length: arch.length - 1 },
        (_, i) => s.activationNames[i] ?? 'sigmoid'
      ) as ActivationName[];
      saveConfig({ architecture: arch, activationNames: actNames, lr: s.lr, dataset: s.dataset, speedMultiplier: s.speedMultiplier, convergenceThreshold: s.convergenceThreshold });
      return {
        ...simReset({ ...s, architecture: arch, activationNames: actNames }),
        architecture: arch,
        activationNames: actNames,
      };
    }),

  setLayerActivation: (layerIdx, name) =>
    set((s) => {
      const actNames = s.activationNames.map((a, i) => (i === layerIdx ? name : a)) as ActivationName[];
      saveConfig({ architecture: s.architecture, activationNames: actNames, lr: s.lr, dataset: s.dataset, speedMultiplier: s.speedMultiplier, convergenceThreshold: s.convergenceThreshold });
      return {
        ...simReset({ ...s, activationNames: actNames }),
        activationNames: actNames,
      };
    }),

  setLr: (lr) =>
    set((s) => {
      // update net in-place so training progress is preserved
      s.net.lr = lr;
      saveConfig({ architecture: s.architecture, activationNames: s.activationNames, lr, dataset: s.dataset, speedMultiplier: s.speedMultiplier, convergenceThreshold: s.convergenceThreshold });
      return { lr };
    }),

  setConvergenceThreshold: (t) =>
    set((s) => {
      saveConfig({ architecture: s.architecture, activationNames: s.activationNames, lr: s.lr, dataset: s.dataset, speedMultiplier: s.speedMultiplier, convergenceThreshold: t });
      return { convergenceThreshold: t };
    }),

  reset: () => set((s) => simReset(s)),
}));

// keep DATASETS re-export so existing import paths still work
export { DATASETS };
export type { DatasetName };
export type { ActivationName };
