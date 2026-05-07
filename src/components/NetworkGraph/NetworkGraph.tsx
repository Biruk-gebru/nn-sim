import { useState } from 'react';
import { ARCHITECTURE } from '../../store/useSimStore';
import { useSimStore } from '../../store/useSimStore';
import { NeuronNode } from './NeuronNode';
import { EdgeLink } from './EdgeLink';
import { DataPulse } from './DataPulse';
import { GradientArrow } from './GradientArrow';
import { NeuronTooltip } from './NeuronTooltip';

const W = 700;
const H = 500;
const LAYER_PADDING_X = 120;
const NEURON_RADIUS = 28;

export interface NeuronPos {
  x: number;
  y: number;
  layer: number;
  neuron: number;
}

function computePositions(arch: number[]): NeuronPos[] {
  const positions: NeuronPos[] = [];
  const layerCount = arch.length;
  const xStep = (W - LAYER_PADDING_X * 2) / (layerCount - 1);

  for (let l = 0; l < layerCount; l++) {
    const count = arch[l];
    const x = LAYER_PADDING_X + l * xStep;
    for (let n = 0; n < count; n++) {
      const yStep = H / (count + 1);
      const y = yStep * (n + 1);
      positions.push({ x, y, layer: l, neuron: n });
    }
  }
  return positions;
}

export const positions = computePositions(ARCHITECTURE);

export function getPos(layer: number, neuron: number): NeuronPos {
  return positions.find((p) => p.layer === layer && p.neuron === neuron)!;
}

export function NetworkGraph() {
  const { history, currentEpoch, animPhase, animWaveIdx } = useSimStore();
  const snap = history[currentEpoch - 1] ?? null;

  const [hoveredNeuron, setHoveredNeuron] = useState<{ layer: number; neuron: number } | null>(null);

  const hoveredPos = hoveredNeuron ? getPos(hoveredNeuron.layer, hoveredNeuron.neuron) : null;
  const hoveredTrace = hoveredNeuron
    ? snap?.neurons[hoveredNeuron.layer]?.[hoveredNeuron.neuron] ?? null
    : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ overflow: 'visible' }}>
      {/* Edges */}
      {positions
        .filter((p) => p.layer > 0)
        .map((toPos) => {
          const fromLayer = toPos.layer - 1;
          const fromCount = ARCHITECTURE[fromLayer];
          return Array.from({ length: fromCount }, (_, fi) => {
            const fromPos = getPos(fromLayer, fi);
            const edge = snap?.edges.find(
              (e) =>
                e.fromLayer === fromLayer &&
                e.fromNeuron === fi &&
                e.toLayer === toPos.layer &&
                e.toNeuron === toPos.neuron
            );
            const wave = toPos.layer - 1;
            return (
              <EdgeLink
                key={`e-${fromLayer}-${fi}-${toPos.layer}-${toPos.neuron}`}
                x1={fromPos.x} y1={fromPos.y}
                x2={toPos.x} y2={toPos.y}
                weight={edge?.weight ?? 0}
                wave={wave}
                animPhase={animPhase}
                animWaveIdx={animWaveIdx}
              />
            );
          });
        })}

      {/* Forward pulses */}
      {animPhase === 'forward' && animWaveIdx >= 0 &&
        positions.filter((p) => p.layer === animWaveIdx + 1).map((toPos) => {
          const fromLayer = toPos.layer - 1;
          return Array.from({ length: ARCHITECTURE[fromLayer] }, (_, fi) => {
            const fromPos = getPos(fromLayer, fi);
            const edge = snap?.edges.find(
              (e) => e.fromLayer === fromLayer && e.fromNeuron === fi && e.toLayer === toPos.layer && e.toNeuron === toPos.neuron
            );
            return (
              <DataPulse
                key={`dp-${fromLayer}-${fi}-${toPos.layer}-${toPos.neuron}-${currentEpoch}-${animWaveIdx}`}
                x1={fromPos.x} y1={fromPos.y}
                x2={toPos.x} y2={toPos.y}
                signal={edge?.signal ?? 0}
              />
            );
          });
        })}

      {/* Backward gradient arrows */}
      {animPhase === 'backward' && animWaveIdx >= 0 &&
        positions.filter((p) => p.layer === animWaveIdx + 1).map((toPos) => {
          const fromLayer = toPos.layer - 1;
          return Array.from({ length: ARCHITECTURE[fromLayer] }, (_, fi) => {
            const fromPos = getPos(fromLayer, fi);
            const neuron = snap?.neurons[toPos.layer]?.[toPos.neuron];
            return (
              <GradientArrow
                key={`ga-${fromLayer}-${fi}-${toPos.layer}-${toPos.neuron}-${currentEpoch}-${animWaveIdx}`}
                x1={toPos.x} y1={toPos.y}
                x2={fromPos.x} y2={fromPos.y}
                delta={neuron?.delta ?? 0}
              />
            );
          });
        })}

      {/* Neurons */}
      {positions.map((pos) => {
        const neuron = snap?.neurons[pos.layer]?.[pos.neuron];
        return (
          <NeuronNode
            key={`n-${pos.layer}-${pos.neuron}`}
            pos={pos}
            radius={NEURON_RADIUS}
            postActivation={neuron?.postActivation ?? null}
            delta={neuron?.delta ?? null}
            animPhase={animPhase}
            animWaveIdx={animWaveIdx}
            onHover={(l, n) => setHoveredNeuron({ layer: l, neuron: n })}
            onHoverEnd={() => setHoveredNeuron(null)}
          />
        );
      })}

      {/* Hover tooltip — rendered last so it's on top */}
      {hoveredNeuron && hoveredPos && (
        <NeuronTooltip
          x={hoveredPos.x}
          y={hoveredPos.y}
          layer={hoveredNeuron.layer}
          neuron={hoveredNeuron.neuron}
          trace={hoveredTrace}
        />
      )}
    </svg>
  );
}
