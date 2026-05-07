import type { ActivationFn } from './activations';
import { linear } from './activations';
import type { EdgeTrace, EpochSnapshot, NeuronTrace } from './types';

function rand() {
  return (Math.random() - 0.5) * 2;
}

export class NeuralNet {
  weights: number[][][];
  biases: number[][];
  activations: ActivationFn[];
  lr: number;

  constructor(architecture: number[], activations: ActivationFn[], lr = 0.1) {
    this.lr = lr;
    this.activations = [linear, ...activations];
    this.weights = [];
    this.biases = [];

    for (let l = 1; l < architecture.length; l++) {
      const rows = architecture[l];
      const cols = architecture[l - 1];
      this.weights.push(
        Array.from({ length: rows }, () => Array.from({ length: cols }, rand))
      );
      this.biases.push(Array.from({ length: rows }, rand));
    }
  }

  private forward(input: number[]): { neurons: NeuronTrace[][]; edges: EdgeTrace[] } {
    const neurons: NeuronTrace[][] = [];
    const edges: EdgeTrace[] = [];

    neurons.push(
      input.map((val, i) => ({
        layerIdx: 0,
        neuronIdx: i,
        inputs: [],
        preActivation: val,
        postActivation: val,
        gradient: 0,
        delta: 0,
      }))
    );

    for (let l = 0; l < this.weights.length; l++) {
      const prevLayer = neurons[l];
      const layerNeurons: NeuronTrace[] = [];

      for (let j = 0; j < this.weights[l].length; j++) {
        const weightedInputs = this.weights[l][j].map((w, k) => w * prevLayer[k].postActivation);
        const z = weightedInputs.reduce((a, b) => a + b, 0) + this.biases[l][j];
        const a = this.activations[l + 1].fn(z);

        layerNeurons.push({
          layerIdx: l + 1,
          neuronIdx: j,
          inputs: weightedInputs,
          preActivation: z,
          postActivation: a,
          gradient: 0,
          delta: 0,
        });

        for (let k = 0; k < prevLayer.length; k++) {
          edges.push({
            fromLayer: l,
            fromNeuron: k,
            toLayer: l + 1,
            toNeuron: j,
            weight: this.weights[l][j][k],
            deltaWeight: 0,
            signal: this.weights[l][j][k] * prevLayer[k].postActivation,
          });
        }
      }

      neurons.push(layerNeurons);
    }

    return { neurons, edges };
  }

  private backward(neurons: NeuronTrace[][], target: number[]): void {
    const lastL = neurons.length - 1;

    for (let j = 0; j < neurons[lastL].length; j++) {
      const n = neurons[lastL][j];
      n.gradient = n.postActivation - target[j];
      n.delta = n.gradient * this.activations[lastL].derivative(n.preActivation);
    }

    for (let l = lastL - 1; l >= 1; l--) {
      for (let i = 0; i < neurons[l].length; i++) {
        let grad = 0;
        for (let j = 0; j < neurons[l + 1].length; j++) {
          grad += this.weights[l][j][i] * neurons[l + 1][j].delta;
        }
        neurons[l][i].gradient = grad;
        neurons[l][i].delta = grad * this.activations[l].derivative(neurons[l][i].preActivation);
      }
    }
  }

  stepEpoch(samples: { input: number[]; target: number[] }[], epochIdx: number): EpochSnapshot {
    const weightGrads: number[][][] = this.weights.map((layer) =>
      layer.map((row) => row.map(() => 0))
    );
    const biasGrads: number[][] = this.biases.map((layer) => layer.map(() => 0));

    let totalLoss = 0;
    let lastNeurons: NeuronTrace[][] = [];
    let lastEdges: EdgeTrace[] = [];

    for (let si = 0; si < samples.length; si++) {
      const { input, target } = samples[si];
      const { neurons, edges } = this.forward(input);
      this.backward(neurons, target);

      const lastL = neurons.length - 1;
      for (let j = 0; j < neurons[lastL].length; j++) {
        const err = neurons[lastL][j].postActivation - target[j];
        totalLoss += 0.5 * err * err;
      }

      for (let l = 0; l < this.weights.length; l++) {
        for (let j = 0; j < this.weights[l].length; j++) {
          biasGrads[l][j] += neurons[l + 1][j].delta;
          for (let k = 0; k < this.weights[l][j].length; k++) {
            weightGrads[l][j][k] += neurons[l + 1][j].delta * neurons[l][k].postActivation;
          }
        }
      }

      if (si === samples.length - 1) {
        lastNeurons = neurons;
        lastEdges = edges;
      }
    }

    const n = samples.length;
    for (let l = 0; l < this.weights.length; l++) {
      for (let j = 0; j < this.weights[l].length; j++) {
        this.biases[l][j] -= this.lr * (biasGrads[l][j] / n);
        for (let k = 0; k < this.weights[l][j].length; k++) {
          this.weights[l][j][k] -= this.lr * (weightGrads[l][j][k] / n);
        }
      }
    }

    // Reflect updated weights in the snapshot edges
    for (const edge of lastEdges) {
      edge.weight = this.weights[edge.toLayer - 1][edge.toNeuron][edge.fromNeuron];
    }

    return {
      epoch: epochIdx,
      loss: totalLoss / n,
      neurons: lastNeurons,
      edges: lastEdges,
    };
  }
}
