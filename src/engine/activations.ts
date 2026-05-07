export interface ActivationFn {
  name: string;
  fn: (x: number) => number;
  derivative: (x: number) => number;
  formulaHtml: string;
  explanation: string;
}

export const linear: ActivationFn = {
  name: 'Linear',
  fn: (x) => x,
  derivative: () => 1,
  formulaHtml: 'f(x) = x',
  explanation: 'Passes the value through unchanged. Used for input neurons.',
};

export const sigmoid: ActivationFn = {
  name: 'Sigmoid',
  fn: (x) => 1 / (1 + Math.exp(-x)),
  derivative: (x) => {
    const s = 1 / (1 + Math.exp(-x));
    return s * (1 - s);
  },
  formulaHtml: 'f(x) = 1 / (1 + e<sup>−x</sup>)',
  explanation:
    'Squishes any number into a range between 0 and 1 — perfect for probabilities. The neuron "fires" more strongly as the input grows.',
};

export const relu: ActivationFn = {
  name: 'ReLU',
  fn: (x) => Math.max(0, x),
  derivative: (x) => (x > 0 ? 1 : 0),
  formulaHtml: 'f(x) = max(0, x)',
  explanation:
    'Passes positive values through, blocks negatives. Simple and fast — used in most modern neural networks.',
};

export const tanh: ActivationFn = {
  name: 'Tanh',
  fn: (x) => Math.tanh(x),
  derivative: (x) => 1 - Math.tanh(x) ** 2,
  formulaHtml: 'f(x) = tanh(x)',
  explanation:
    'Like sigmoid but ranges from −1 to 1. Negative inputs produce negative outputs, which helps the network express more nuanced patterns.',
};
