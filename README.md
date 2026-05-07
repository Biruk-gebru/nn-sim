# Neural Network Simulator

An interactive, browser-based neural network visualizer that makes the internals of a neural network tangible. Watch forward propagation and backpropagation animate in real time, inspect every neuron's computation, and follow the gradient as it flows backward through the network.

![Architecture: 2 → 3 → 1 | Sigmoid | XOR / AND / OR](https://img.shields.io/badge/architecture-2%20→%203%20→%201-00f5ff?style=flat-square) ![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript) ![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite)

## Features

- **Animated forward pass** — data pulses along each edge carrying the weighted signal value
- **Animated backpropagation** — gradient flows backward in red, each neuron flashing its delta
- **Hover tooltip** — hover over any neuron to see its pre-activation `z`, output `a`, weighted inputs `wᵢ·xᵢ`, and gradient `δ`
- **Neuron inspector** — click any hidden or output neuron to open a detail panel with:
  - Activation function name, formula, and plain-English explanation
  - Visual computation tree: signed bar chart for each weighted input, sum `z`, and activation output `a`
  - Epoch history sparkline of that neuron's activation over time
- **Live loss chart** — loss curve updates as the network trains
- **Dataset switcher** — toggle between XOR, AND, and OR; network resets and retrains on the new dataset
- **Speed control** — adjust animation speed from slow narration pace to fast convergence
- **Step mode** — advance one epoch at a time

## Why no ML library

The neural net is ~150 lines of plain TypeScript with no external dependencies. Every intermediate value — weighted inputs, pre-activation sums, gradients, deltas — is explicitly captured and surfaced to the UI. Using a library would abstract away exactly the values this tool is designed to show.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React + Vite + TypeScript | Fast HMR, great DevTools |
| Visualization | SVG | Inspectable in browser DevTools, no canvas overhead |
| Animation | Framer Motion | `motion.circle` for traveling pulses, `AnimatePresence` for panel transitions |
| State | Zustand | Epoch history per neuron grows large; Zustand handles it cleanly |
| Styling | Tailwind CSS v4 + CSS variables | Dark neon theme with glow via `drop-shadow` |

## Getting started

```bash
git clone https://github.com/Biruk-gebru/nn-sim.git
cd nn-sim
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Project structure

```
src/
  engine/
    nn.ts           # NeuralNet class — forward + backward, fully instrumented
    activations.ts  # sigmoid / relu / tanh with formulas and explanations
    datasets.ts     # XOR, AND, OR training data
    types.ts        # NeuronTrace, EdgeTrace, EpochSnapshot
  store/
    useSimStore.ts  # Zustand store — all simulation and UI state
  hooks/
    useAnimation.ts # Async wave sequencer for forward/backward animation
    usePlayLoop.ts  # Continuous training loop
    useTraining.ts  # Single-step training
  components/
    NetworkGraph/   # SVG root, NeuronNode, EdgeLink, DataPulse, GradientArrow, NeuronTooltip
    Inspector/      # Slide-in panel, NeuronDetail, ComputationTree, ValueSparkline
    Controls/       # Step/Play/Reset, speed slider, dataset switcher
    LossChart/      # SVG loss polyline
```

## License

MIT
