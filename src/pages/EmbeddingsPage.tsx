import { useState, useMemo } from 'react';

const CATEGORIES = [
  { key: 'animal',  label: 'animal',  color: '#d49a3a' },
  { key: 'food',    label: 'food',    color: '#cbe86b' },
  { key: 'tech',    label: 'tech',    color: '#6aace0' },
  { key: 'emotion', label: 'emotion', color: '#e0623a' },
  { key: 'nature',  label: 'nature',  color: '#78d4a8' },
  { key: 'people',  label: 'people',  color: '#a0c84a' },
] as const;

type CatKey = typeof CATEGORIES[number]['key'];

const WORDS: { word: string; cat: CatKey; x: number; y: number }[] = [
  { word: 'dog',      cat: 'animal',  x:  0.62, y:  0.82 },
  { word: 'cat',      cat: 'animal',  x:  0.78, y:  0.72 },
  { word: 'bird',     cat: 'animal',  x:  0.88, y:  0.60 },
  { word: 'fish',     cat: 'animal',  x:  0.70, y:  0.58 },
  { word: 'lion',     cat: 'animal',  x:  0.84, y:  0.84 },

  { word: 'pizza',    cat: 'food',    x:  0.72, y: -0.62 },
  { word: 'sushi',    cat: 'food',    x:  0.85, y: -0.80 },
  { word: 'bread',    cat: 'food',    x:  0.60, y: -0.82 },
  { word: 'apple',    cat: 'food',    x:  0.56, y: -0.50 },
  { word: 'coffee',   cat: 'food',    x:  0.80, y: -0.48 },

  { word: 'model',    cat: 'tech',    x: -0.74, y:  0.80 },
  { word: 'neural',   cat: 'tech',    x: -0.88, y:  0.62 },
  { word: 'data',     cat: 'tech',    x: -0.58, y:  0.70 },
  { word: 'train',    cat: 'tech',    x: -0.64, y:  0.50 },
  { word: 'code',     cat: 'tech',    x: -0.82, y:  0.46 },

  { word: 'happy',    cat: 'emotion', x: -0.62, y: -0.52 },
  { word: 'sad',      cat: 'emotion', x: -0.80, y: -0.64 },
  { word: 'love',     cat: 'emotion', x: -0.52, y: -0.76 },
  { word: 'fear',     cat: 'emotion', x: -0.84, y: -0.82 },
  { word: 'joy',      cat: 'emotion', x: -0.68, y: -0.84 },

  { word: 'ocean',    cat: 'nature',  x:  0.30, y:  0.50 },
  { word: 'mountain', cat: 'nature',  x:  0.12, y:  0.42 },
  { word: 'forest',   cat: 'nature',  x:  0.24, y:  0.20 },
  { word: 'desert',   cat: 'nature',  x:  0.34, y:  0.28 },
  { word: 'river',    cat: 'nature',  x:  0.16, y:  0.16 },

  { word: 'king',     cat: 'people',  x: -0.12, y:  0.22 },
  { word: 'queen',    cat: 'people',  x:  0.10, y:  0.18 },
  { word: 'man',      cat: 'people',  x: -0.18, y: -0.06 },
  { word: 'woman',    cat: 'people',  x:  0.16, y: -0.08 },
  { word: 'child',    cat: 'people',  x:  0.02, y:  0.06 },
];

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function catColor(key: CatKey) {
  return CATEGORIES.find(c => c.key === key)!.color;
}

const W = 600;
const H = 420;
const PAD = 36;

function toSvgX(x: number) { return PAD + ((x + 1) / 2) * (W - 2 * PAD); }
function toSvgY(y: number) { return PAD + ((1 - y) / 2) * (H - 2 * PAD); }

const AXIS_VALS = [-0.5, 0, 0.5];

export function EmbeddingsPage() {
  const [hovered, setHovered]  = useState<string | null>(null);
  const [locked,  setLocked]   = useState<string | null>(null);
  const [hidden,  setHidden]   = useState<Set<CatKey>>(new Set());

  const active = hovered ?? locked;

  const neighbors = useMemo(() => {
    if (!active) return [];
    const src = WORDS.find(w => w.word === active)!;
    return WORDS
      .filter(w => w.word !== active)
      .map(w => ({ ...w, d: dist(src, w) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 5);
  }, [active]);

  function toggleCat(key: CatKey) {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleClick(word: string) {
    setLocked(prev => (prev === word ? null : word));
    setHovered(null);
  }

  const neighborWords = new Set(neighbors.map(n => n.word));
  const activeWord = active ? WORDS.find(w => w.word === active)! : null;

  return (
    <div style={{ padding: '40px 48px 64px', maxWidth: 720, margin: '0 auto', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
        Embeddings
      </h1>
      <p style={{ color: 'var(--text-mid)', fontSize: 14, lineHeight: 1.6, margin: '0 0 28px', maxWidth: 540 }}>
        Words are mapped to points in vector space. Semantically similar words cluster together.
        Hover a word to see its nearest neighbors by Euclidean distance.
      </p>

      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '4px 0 8px', border: '1px solid var(--border)' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
          {AXIS_VALS.map(v => (
            <g key={`ax-${v}`}>
              <line
                x1={toSvgX(v)} y1={PAD} x2={toSvgX(v)} y2={H - PAD}
                stroke="rgba(242,233,225,0.07)" strokeWidth={1}
              />
              <line
                x1={PAD} y1={toSvgY(v)} x2={W - PAD} y2={toSvgY(v)}
                stroke="rgba(242,233,225,0.07)" strokeWidth={1}
              />
            </g>
          ))}

          {active && neighbors.map(nb => {
            const sx = toSvgX(activeWord!.x);
            const sy = toSvgY(activeWord!.y);
            const ex = toSvgX(nb.x);
            const ey = toSvgY(nb.y);
            return (
              <line key={`ln-${nb.word}`}
                x1={sx} y1={sy} x2={ex} y2={ey}
                stroke="rgba(242,233,225,0.22)" strokeWidth={1}
              />
            );
          })}

          {WORDS.map(w => {
            const isHidden   = hidden.has(w.cat);
            const isActive   = w.word === active;
            const isNeighbor = neighborWords.has(w.word);
            const color      = catColor(w.cat);
            const cx         = toSvgX(w.x);
            const cy         = toSvgY(w.y);
            const r          = isActive ? 7 : 5;

            let textAnchor: string;
            let dx: number;
            if (w.x > 0.3)       { textAnchor = 'start'; dx = 10; }
            else if (w.x < -0.3) { textAnchor = 'end';   dx = -10; }
            else                  { textAnchor = 'middle'; dx = 0; }

            const labelDy = w.y > 0.6 ? 18 : -10;

            const dimmed = isHidden || (active != null && !isActive && !isNeighbor);
            const opacity = dimmed ? 0.15 : 1;

            return (
              <g
                key={w.word}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                opacity={opacity}
                onMouseEnter={() => { if (!locked) setHovered(w.word); }}
                onMouseLeave={() => { if (!locked) setHovered(null); }}
                onClick={() => handleClick(w.word)}
              >
                <circle
                  cx={cx} cy={cy} r={r}
                  fill={color}
                  stroke={isActive ? '#fff' : 'none'}
                  strokeWidth={isActive ? 1.5 : 0}
                />
                <text
                  x={cx + dx} y={cy + labelDy}
                  textAnchor={textAnchor}
                  fontSize={10}
                  fill={isActive ? '#fff' : isNeighbor && active ? color : 'var(--text-dim)'}
                  fontFamily="var(--font-mono)"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {w.word}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => {
          const isHidden = hidden.has(c.key);
          return (
            <button
              key={c.key}
              onClick={() => toggleCat(c.key)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: 0,
                opacity: isHidden ? 0.25 : 1,
                transition: 'opacity 0.15s',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--text-mid)',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
              {c.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 24, minHeight: 96 }}>
        {active && activeWord ? (
          <div style={{ background: 'var(--surface-alt)', borderRadius: 8, padding: '16px 20px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: catColor(activeWord.cat) }}>
                {activeWord.word}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                {activeWord.cat}
              </span>
              {locked && (
                <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto', fontFamily: 'var(--font-body)' }}>
                  locked — click to release
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {neighbors.map(nb => (
                <div key={nb.word} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-mid)', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: catColor(nb.cat), flexShrink: 0 }} />
                  <span style={{ color: catColor(nb.cat) }}>{nb.word}</span>
                  <span style={{ color: 'var(--text-faint)' }}>— {nb.d.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, fontFamily: 'var(--font-body)', margin: 0, paddingTop: 8 }}>
            hover a word to explore its neighbors
          </p>
        )}
      </div>
    </div>
  );
}
