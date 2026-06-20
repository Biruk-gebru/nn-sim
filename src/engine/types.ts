export interface RawInput { x: number; w: number; }

export interface NeuronTrace {
  layerIdx: number;
  neuronIdx: number;
  inputs: number[];        // w_i * x_i products (legacy)
  rawInputs: RawInput[];   // individual x_i and w_i
  bias: number;
  preActivation: number;
  postActivation: number;
  gradient: number;
  delta: number;
}

export interface EdgeTrace {
  fromLayer: number;
  fromNeuron: number;
  toLayer: number;
  toNeuron: number;
  weight: number;
  deltaWeight: number;
  signal: number;
}

export interface EpochSnapshot {
  epoch: number;
  loss: number;
  neurons: NeuronTrace[][];
  edges: EdgeTrace[];
}
