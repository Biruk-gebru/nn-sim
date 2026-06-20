import { useMemo, useState, useRef, useEffect } from 'react';
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
const MIN_SCALE = 0.25;
const MAX_SCALE = 5;

export interface NeuronPos {
  x: number; y: number; layer: number; neuron: number;
}

function computePositions(arch: number[]): NeuronPos[] {
  const positions: NeuronPos[] = [];
  const layerCount = arch.length;
  const xStep = (W - LAYER_PADDING_X * 2) / Math.max(layerCount - 1, 1);
  for (let l = 0; l < layerCount; l++) {
    const count = arch[l];
    const x = LAYER_PADDING_X + l * xStep;
    for (let n = 0; n < count; n++) {
      const yStep = H / (count + 1);
      positions.push({ x, y: yStep * (n + 1), layer: l, neuron: n });
    }
  }
  return positions;
}

interface XForm { x: number; y: number; scale: number; }
const RESET_XFORM: XForm = { x: 0, y: 0, scale: 1 };

export function NetworkGraph() {
  const { history, currentEpoch, animPhase, animWaveIdx, architecture } = useSimStore();
  const snap = history[currentEpoch - 1] ?? null;
  const positions = useMemo(() => computePositions(architecture), [architecture]);
  const getPos = (layer: number, neuron: number) =>
    positions.find((p) => p.layer === layer && p.neuron === neuron)!;

  const [hoveredNeuron, setHoveredNeuron] = useState<{ layer: number; neuron: number } | null>(null);
  const hoveredPos = hoveredNeuron ? getPos(hoveredNeuron.layer, hoveredNeuron.neuron) : null;
  const hoveredTrace = hoveredNeuron
    ? snap?.neurons[hoveredNeuron.layer]?.[hoveredNeuron.neuron] ?? null
    : null;

  // ── Zoom / pan ────────────────────────────────────────────
  const [xform, setXform] = useState<XForm>(RESET_XFORM);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Non-passive wheel listener so we can preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      // Convert client coords → SVG viewBox coords
      const rect = svg.getBoundingClientRect();
      const vx = ((e.clientX - rect.left) / rect.width) * W;
      const vy = ((e.clientY - rect.top) / rect.height) * H;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setXform((prev) => {
        const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
        const r = s / prev.scale;
        return { x: vx - (vx - prev.x) * r, y: vy - (vy - prev.y) * r, scale: s };
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current || !svgRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (!hasDragged.current && Math.sqrt(dx * dx + dy * dy) > 4) hasDragged.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    const rect = svgRef.current.getBoundingClientRect();
    const base = rect.width / W;
    setXform((prev) => ({ ...prev, x: prev.x + e.movementX / base, y: prev.y + e.movementY / base }));
  }

  function onMouseUp() {
    isDragging.current = false;
    setDragging(false);
  }

  function zoomAround(factor: number) {
    setXform((prev) => {
      const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
      const r = s / prev.scale;
      const cx = W / 2, cy = H / 2;
      return { x: cx - (cx - prev.x) * r, y: cy - (cy - prev.y) * r, scale: s };
    });
  }

  const tStr = `translate(${xform.x.toFixed(2)},${xform.y.toFixed(2)}) scale(${xform.scale.toFixed(4)})`;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Overlay controls */}
      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', gap: 3, zIndex: 10 }}>
        <CanvasBtn onClick={() => zoomAround(1.25)}>+</CanvasBtn>
        <CanvasBtn onClick={() => zoomAround(1 / 1.25)}>−</CanvasBtn>
        <CanvasBtn onClick={() => setXform(RESET_XFORM)} title="Snap to center">⊙</CanvasBtn>
      </div>

      {/* Scale indicator */}
      {xform.scale !== 1 && (
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '2px 7px', zIndex: 10, pointerEvents: 'none',
        }}>
          {Math.round(xform.scale * 100)}%
        </div>
      )}

      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClickCapture={(e) => {
          if (hasDragged.current) { e.stopPropagation(); hasDragged.current = false; }
        }}
        style={{ width: '100%', height: '100%', overflow: 'hidden', cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <g transform={tStr}>
            {/* Edges */}
            {positions
              .filter((p) => p.layer > 0)
              .map((toPos) => {
                const fromLayer = toPos.layer - 1;
                return Array.from({ length: architecture[fromLayer] }, (_, fi) => {
                  const fromPos = getPos(fromLayer, fi);
                  const edge = snap?.edges.find(
                    (e) => e.fromLayer === fromLayer && e.fromNeuron === fi &&
                           e.toLayer === toPos.layer && e.toNeuron === toPos.neuron
                  );
                  return (
                    <EdgeLink
                      key={`e-${fromLayer}-${fi}-${toPos.layer}-${toPos.neuron}`}
                      x1={fromPos.x} y1={fromPos.y}
                      x2={toPos.x} y2={toPos.y}
                      weight={edge?.weight ?? 0}
                      wave={toPos.layer - 1}
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
                return Array.from({ length: architecture[fromLayer] }, (_, fi) => {
                  const fromPos = getPos(fromLayer, fi);
                  const edge = snap?.edges.find(
                    (e) => e.fromLayer === fromLayer && e.fromNeuron === fi &&
                           e.toLayer === toPos.layer && e.toNeuron === toPos.neuron
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
                return Array.from({ length: architecture[fromLayer] }, (_, fi) => {
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

            {/* Tooltip — rendered last, on top */}
            {hoveredNeuron && hoveredPos && (
              <NeuronTooltip
                x={hoveredPos.x} y={hoveredPos.y}
                layer={hoveredNeuron.layer} neuron={hoveredNeuron.neuron}
                trace={hoveredTrace}
              />
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}

function CanvasBtn({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="canvas-btn"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-mid)',
        borderRadius: 5,
        color: 'var(--text-dim)',
        width: 26, height: 26,
        fontSize: 15, lineHeight: '24px', textAlign: 'center',
        cursor: 'pointer', padding: 0,
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {children}
    </button>
  );
}
