import { useState, useMemo, useRef, useCallback } from 'react';
import { ANCHOR_EMBEDDINGS } from '../engine/anchorEmbeddings';

// ── Category config ────────────────────────────────────────────
const CATEGORIES = [
  { key: 'animal',  label: 'animal',  color: '#d49a3a' },
  { key: 'food',    label: 'food',    color: '#cbe86b' },
  { key: 'tech',    label: 'tech',    color: '#6aace0' },
  { key: 'emotion', label: 'emotion', color: '#e0623a' },
  { key: 'nature',  label: 'nature',  color: '#78d4a8' },
  { key: 'people',  label: 'people',  color: '#a0c84a' },
] as const;

type CatKey = typeof CATEGORIES[number]['key'];
const CAT_COLOR = Object.fromEntries(CATEGORIES.map(c => [c.key, c.color])) as Record<CatKey, string>;

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

// ── Math helpers ───────────────────────────────────────────────
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// Project embedding to 2D using softmax-weighted position of nearest anchors
function projectTo2D(emb: number[]): [number, number] {
  const sims = WORDS.map(w => ({
    x: w.x, y: w.y,
    s: cosine(emb, ANCHOR_EMBEDDINGS[w.word] ?? []),
  }));
  const T = 12;
  const weights = sims.map(s => Math.exp(s.s * T));
  const sum = weights.reduce((a, b) => a + b, 0);
  const x = sims.reduce((acc, s, i) => acc + weights[i] * s.x, 0) / sum;
  const y = sims.reduce((acc, s, i) => acc + weights[i] * s.y, 0) / sum;
  return [x, y];
}

// ── SVG layout ─────────────────────────────────────────────────
const SVG_W = 600, SVG_H = 420, PAD = 38;
const PW = SVG_W - PAD * 2, PH = SVG_H - PAD * 2;
const toSx = (x: number) => PAD + ((x + 1) / 2) * PW;
const toSy = (y: number) => PAD + ((1 - y) / 2) * PH;

// ── User result type ───────────────────────────────────────────
interface UserResult {
  word: string;
  embedding: number[];
  pos: [number, number];
  nearest: { word: string; sim: number; cat: CatKey; color: string }[];
}

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

// ── Page ───────────────────────────────────────────────────────
export function EmbeddingsPage() {
  const [hidden, setHidden] = useState<Set<CatKey>>(new Set());
  const [active, setActive] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  // Real-time embedding state
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [modelError, setModelError] = useState('');
  const [inputWord, setInputWord] = useState('');
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<UserResult | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const embedderRef = useRef<any>(null);

  const loadModel = useCallback(async () => {
    if (embedderRef.current || modelStatus === 'loading') return;
    setModelStatus('loading');
    try {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.localModelPath = '/models/';
      env.allowRemoteModels = false;
      embedderRef.current = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' });
      setModelStatus('ready');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[embeddings] model load failed:', e);
      setModelError(msg);
      setModelStatus('error');
    }
  }, [modelStatus]);

  async function embedWord(raw: string) {
    const word = raw.trim();
    if (!word || !embedderRef.current) return;
    setComputing(true);
    try {
      const out = await embedderRef.current(word, { pooling: 'mean', normalize: true });
      const emb = Array.from(out.data as Float32Array);
      const sims = WORDS.map(w => ({
        word: w.word, sim: cosine(emb, ANCHOR_EMBEDDINGS[w.word] ?? []),
        cat: w.cat, color: CAT_COLOR[w.cat],
      })).sort((a, b) => b.sim - a.sim);
      setResult({ word, embedding: emb, pos: projectTo2D(emb), nearest: sims.slice(0, 6) });
    } finally {
      setComputing(false);
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') embedWord(inputWord);
  }

  // Scatter hover/click
  const activeWord = active ? WORDS.find(w => w.word === active) : null;
  const nearestWords = useMemo(() => {
    if (!activeWord) return [];
    return WORDS
      .filter(w => w.word !== activeWord.word)
      .map(w => ({ ...w, d: dist(activeWord.x, activeWord.y, w.x, w.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 5);
  }, [activeWord]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 32px 80px' }}>

        <h1 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>
          Embeddings
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.7, maxWidth: 540 }}>
          Words mapped to vectors in high-dimensional space — similar words cluster together.
          Hover any word to see its neighbours, or embed your own word below.
        </p>

        {/* Scatter */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', display: 'block' }}>
            {/* Axis lines */}
            <line x1={toSx(0)} y1={PAD} x2={toSx(0)} y2={SVG_H - PAD} stroke="var(--border-mid)" strokeWidth={0.5} />
            <line x1={PAD} y1={toSy(0)} x2={SVG_W - PAD} y2={toSy(0)} stroke="var(--border-mid)" strokeWidth={0.5} />

            {/* Neighbour lines for hovered anchor word */}
            {activeWord && nearestWords.map(n => (
              <line key={n.word}
                x1={toSx(activeWord.x)} y1={toSy(activeWord.y)}
                x2={toSx(n.x)} y2={toSy(n.y)}
                stroke="var(--border-strong)" strokeWidth={1} opacity={0.6}
              />
            ))}

            {/* Lines from result word to its nearest anchors */}
            {result && result.nearest.slice(0, 3).map(n => {
              const aw = WORDS.find(w => w.word === n.word);
              if (!aw) return null;
              return (
                <line key={n.word}
                  x1={toSx(result.pos[0])} y1={toSy(result.pos[1])}
                  x2={toSx(aw.x)} y2={toSy(aw.y)}
                  stroke="var(--accent)" strokeWidth={1} opacity={0.35}
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Anchor words */}
            {WORDS.map(w => {
              const isHidden = hidden.has(w.cat);
              const isActive = active === w.word;
              const isNeighbour = nearestWords.some(n => n.word === w.word);
              const color = CAT_COLOR[w.cat];
              const opacity = isHidden ? 0.08 : (active && !isActive && !isNeighbour) ? 0.2 : 1;
              return (
                <g key={w.word}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => { if (!locked) setActive(w.word); }}
                  onMouseLeave={() => { if (!locked) setActive(null); }}
                  onClick={() => {
                    if (locked && active === w.word) { setLocked(false); setActive(null); }
                    else { setActive(w.word); setLocked(true); }
                  }}
                >
                  <circle cx={toSx(w.x)} cy={toSy(w.y)} r={isActive ? 7 : 5}
                    fill={color} fillOpacity={opacity * 0.85}
                    stroke={isActive ? 'var(--text)' : color}
                    strokeWidth={isActive ? 1.5 : 0.5}
                    style={{ transition: 'r 0.15s, opacity 0.15s' }}
                  />
                  <text
                    x={toSx(w.x) + (w.x > 0.3 ? 10 : w.x < -0.3 ? -10 : 0)}
                    y={toSy(w.y) + (w.y < -0.5 ? -8 : 5)}
                    textAnchor={w.x > 0.3 ? 'start' : w.x < -0.3 ? 'end' : 'middle'}
                    fontSize={10} fill={color} fillOpacity={opacity}
                    fontFamily="var(--font-mono)"
                  >
                    {w.word}
                  </text>
                </g>
              );
            })}

            {/* User result dot */}
            {result && (
              <g>
                <circle cx={toSx(result.pos[0])} cy={toSy(result.pos[1])} r={9}
                  fill="var(--accent)" opacity={0.2}
                />
                <circle cx={toSx(result.pos[0])} cy={toSy(result.pos[1])} r={6}
                  fill="var(--accent)" stroke="var(--bg)" strokeWidth={1.5}
                />
                <text
                  x={toSx(result.pos[0])} y={toSy(result.pos[1]) - 12}
                  textAnchor="middle" fontSize={11}
                  fill="var(--accent)" fontFamily="var(--font-mono)" fontWeight={700}
                >
                  {result.word}
                </text>
              </g>
            )}

            <rect x={PAD} y={PAD} width={PW} height={PH} fill="none" stroke="var(--border-mid)" strokeWidth={1} />
          </svg>
        </div>

        {/* Category toggles */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setHidden(h => { const n = new Set(h); n.has(c.key) ? n.delete(c.key) : n.add(c.key); return n; })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6, opacity: hidden.has(c.key) ? 0.25 : 1, transition: 'opacity 0.15s' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
              <span style={{ fontSize: 13, color: 'var(--text-mid)', fontFamily: 'var(--font-mono)' }}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* ── Live embedding section ─────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 20px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
            embed a word in real time
          </p>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={inputWord}
              onChange={e => setInputWord(e.target.value)}
              onKeyDown={onInputKeyDown}
              onFocus={() => { if (modelStatus === 'idle') loadModel(); }}
              placeholder="type any word or phrase…"
              style={{
                flex: '1 1 220px', background: 'var(--surface-alt)', border: '1px solid var(--border-mid)',
                borderRadius: 6, padding: '8px 12px', color: 'var(--text)', fontFamily: 'var(--font-body)',
                fontSize: 14, outline: 'none', transition: 'border-color 0.15s', minWidth: 0,
              }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; }}
            />
            <button
              onClick={() => { if (modelStatus === 'idle') { loadModel(); } else { embedWord(inputWord); } }}
              disabled={computing || modelStatus === 'loading'}
              className="ctrl-btn"
              style={{
                background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 6,
                color: (computing || modelStatus === 'loading') ? 'var(--text-faint)' : 'var(--accent)',
                fontSize: 13, fontFamily: 'var(--font-mono)', cursor: (computing || modelStatus === 'loading') ? 'not-allowed' : 'pointer',
                padding: '8px 16px', transition: 'color 0.15s, background 0.15s',
                flexShrink: 0,
              }}
            >
              {modelStatus === 'idle' ? 'load model' : modelStatus === 'loading' ? 'loading…' : computing ? 'computing…' : 'embed →'}
            </button>
          </div>

          {/* Status / progress */}
          {modelStatus === 'loading' && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              loading all-MiniLM-L6-v2 (~22 MB) — runs entirely in your browser via WebAssembly
            </p>
          )}
          {modelStatus === 'error' && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
              failed to load model — {modelError || 'check the browser console for details'}
            </p>
          )}
          {modelStatus === 'ready' && !result && !computing && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
              model ready — type any word and press enter
            </p>
          )}
        </div>

        {/* Result panel */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Embedding bar chart */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                "{result.word}" — {result.embedding.length}-dim embedding vector
              </p>
              <EmbeddingBars values={result.embedding} />
              <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                each bar = one dimension · lime = positive · red = negative
              </p>
            </div>

            {/* Nearest neighbours */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', flex: 1 }}>nearest anchors by cosine similarity</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>similarity</span>
              </div>
              {result.nearest.map(n => (
                <div key={n.word} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 16px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-mid)', flex: 1 }}>{n.word}</span>
                  <div style={{ width: 100, height: 4, background: 'var(--surface-alt)', borderRadius: 2 }}>
                    <div style={{ width: `${Math.max(0, n.sim) * 100}%`, height: '100%', background: n.color, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', minWidth: 42, textAlign: 'right' }}>
                    {n.sim.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Anchor hover panel */}
        {active && !result && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' }}>
            <p style={{ margin: '0 0 12px', fontSize: 15, color: CAT_COLOR[activeWord!.cat], fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              {active}
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontWeight: 400 }}>
                {activeWord!.cat}
              </span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {nearestWords.map(n => (
                <div key={n.word} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLOR[n.cat], flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-mid)', flex: 1 }}>{n.word}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>{n.d.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {!active && !result && (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, fontFamily: 'var(--font-body)', margin: 0 }}>
            hover a word to explore its neighbours
          </p>
        )}

        <div style={{ marginTop: 56, paddingTop: 40, borderTop: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 20px', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>how it works</p>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            An embedding maps a discrete object — a word, a token, a user ID — to a point in continuous vector space. The key insight from Word2Vec (2013) is that if you train a model to predict context words, semantically similar words end up near each other as an emergent consequence of the training objective, without being told what "similar" means.
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            This geometry supports vector arithmetic. The canonical example: vec("king") − vec("man") + vec("woman") ≈ vec("queen"). The difference vector encodes the concept of gender. Similar arithmetic works for verb tenses, comparative adjectives, and country–capital pairs.
          </p>
          <p style={{ margin: '0 0 32px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            The live embedding above uses <strong style={{ color: 'var(--text)' }}>all-MiniLM-L6-v2</strong>, a 22 MB transformer that runs entirely in your browser via WebAssembly. It produces a 384-dimensional vector — each of the 384 bars above represents one dimension. The word's position on the scatter is determined by cosine similarity to the 30 pre-placed anchor words.
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>learn more</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="https://arxiv.org/abs/1301.3781" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Word2Vec paper — Mikolov et al., 2013 (arxiv)</a>
            <a href="https://jalammar.github.io/illustrated-word2vec/" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ The Illustrated Word2Vec — Jay Alammar</a>
            <a href="https://projector.tensorflow.org/" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Embedding Projector — interactive 3D exploration (TensorFlow)</a>
            <a href="https://nlp.stanford.edu/projects/glove/" target="_blank" rel="noopener noreferrer" className="theory-link" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ GloVe: Global Vectors for Word Representation (Stanford NLP)</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Embedding bar chart ────────────────────────────────────────
function EmbeddingBars({ values }: { values: number[] }) {
  const max = Math.max(...values.map(Math.abs));
  const BAR_W = 1.5, GAP = 0.5, H = 48;
  const total = values.length;
  const svgW = total * (BAR_W + GAP);
  return (
    <svg viewBox={`0 0 ${svgW} ${H}`} style={{ width: '100%', display: 'block', height: 48 }}>
      {values.map((v, i) => {
        const h = (Math.abs(v) / (max || 1)) * (H / 2 - 2);
        const isPos = v >= 0;
        const x = i * (BAR_W + GAP);
        const y = isPos ? H / 2 - h : H / 2;
        return (
          <rect key={i} x={x} y={y} width={BAR_W} height={Math.max(0.5, h)}
            fill={isPos ? '#cbe86b' : '#e0623a'}
            opacity={0.7}
          />
        );
      })}
      <line x1={0} y1={H / 2} x2={svgW} y2={H / 2} stroke="var(--border-mid)" strokeWidth={0.5} />
    </svg>
  );
}
