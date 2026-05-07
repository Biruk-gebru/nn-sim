# Neural Network Simulator

An interactive, educational neural network visualizer built for a university CS club demo for high school students. Crack open the black box — watch a neural network learn in real time, inspect every neuron's computation, and follow the gradient flowing backward.

![Architecture: 2 → 3 → 1 | Sigmoid | XOR / AND / OR](https://img.shields.io/badge/architecture-2%20→%203%20→%201-00f5ff?style=flat-square) ![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript) ![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite)

## What it does

- **Animated forward pass** — data pulses along each edge neuron by neuron, carrying the weighted signal value
- **Animated backpropagation** — gradient flows backward in red, each neuron flashing its delta
- **Hover tooltip** — mouse over any neuron to instantly see its pre-activation `z`, output `a`, every weighted input `wᵢ·xᵢ`, and gradient `δ`
- **Neuron inspector** — click any hidden or output neuron to open a side panel with:
  - The activation function, its formula, and a plain-English explanation
  - A visual computation tree showing each weighted input as a signed bar chart, the sum `z`, and the activation output `a`
  - An epoch history sparkline of that neuron's activation over time
- **Live loss chart** — see the loss curve drop as the network learns
- **Dataset switcher** — toggle between XOR, AND, and OR with one click; network resets and retrains
- **Speed control** — slow it down to narrate to an audience or speed it up to reach convergence fast
- **Step mode** — step one epoch at a time to walk through the process manually

## Why no ML library

The neural net is ~150 lines of plain TypeScript. No PyTorch, no TensorFlow.js. Every intermediate value — weighted inputs, pre-activation sums, gradients, deltas — is explicitly captured and passed to the UI. This is the whole point: if a library did the math, we couldn't inspect every number.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React + Vite + TypeScript | Fast HMR, great DevTools |
| Visualization | SVG | Inspectable in browser DevTools, no canvas overhead |
| Animation | Framer Motion | `motion.circle` for traveling pulses, `AnimatePresence` for inspector slide-in |
| State | Zustand | Epoch history per neuron grows large; Zustand handles it cleanly |
| Styling | Tailwind CSS v4 + CSS variables | Dark neon theme with glow via `drop-shadow` |

## Getting started

```bash
git clone https://github.com/Biruk-gebru/nn-sim.git
cd nn-sim
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## How to use it for a demo

1. Open the app on a projector
2. Explain what XOR means using the truth table on the right
3. Hit **Step** once — point at the cyan pulses traveling forward and the values on each edge
4. Hit **Step** again — point at the red gradient arrows flowing backward
5. Switch to **Play** at slow speed — let the audience watch the loss chart fall and neuron colors shift
6. Click a hidden neuron — walk through the computation tree in the inspector
7. Hover over neurons to show the raw numbers updating in real time
8. Switch dataset to AND or OR to show how the same network learns different patterns

## Project structure

```
src/
  engine/
    nn.ts           # NeuralNet class — forward + backward, fully instrumented
    activations.ts  # sigmoid / relu / tanh with formulas and explanations
    datasets.ts     # XOR, AND, OR training data
    types.ts        # NeuronTrace, EdgeTrace, EpochSnapshot
  store/
    useSimStore.ts  # Zustand store — all simulation + UI state
  hooks/
    useAnimation.ts # Async wave sequencer for forward/backward animation
    usePlayLoop.ts  # Continuous training loop driven by isPlaying
    useTraining.ts  # Single-step training
  components/
    NetworkGraph/   # SVG root, NeuronNode, EdgeLink, DataPulse, GradientArrow, NeuronTooltip
    Inspector/      # Slide-in panel, NeuronDetail, ComputationTree, ValueSparkline
    Controls/       # Step/Play/Reset, speed slider, dataset switcher
    LossChart/      # SVG loss polyline
```

## License

MIT
