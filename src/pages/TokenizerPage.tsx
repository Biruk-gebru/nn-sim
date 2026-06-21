import { useState, useMemo } from 'react';
import { encode, decode } from 'gpt-tokenizer/esm/encoding/r50k_base';

// ── Presets ────────────────────────────────────────────────────────────────

const EXAMPLES = [
  { label: 'sentence',  text: 'The quick brown fox jumps over the lazy dog.' },
  { label: 'code',      text: 'function add(a, b) {\n  return a + b;\n}' },
  { label: 'mixed',     text: "Don't tokenize me! 2024-01-15 = $42.00 + 3.14..." },
  { label: 'numbers',   text: '1234567890  one two three four five six seven eight nine ten' },
  { label: 'spaces',    text: 'word  vs " word" — leading space changes the token entirely.' },
  { label: 'multilang', text: '🚀 Hello · こんにちは · Привет · مرحبا · 你好' },
  { label: 'rare',      text: 'Supercalifragilisticexpialidocious antidisestablishmentarianism pseudopseudohypoparathyroidism' },
];

// ── Colour palette ─────────────────────────────────────────────────────────

const PALETTE = [
  { bg: 'rgba(203,232,107,0.14)', border: 'rgba(203,232,107,0.4)', text: '#cbe86b' },
  { bg: 'rgba(120,212,168,0.14)', border: 'rgba(120,212,168,0.4)', text: '#78d4a8' },
  { bg: 'rgba(212,154,58,0.14)',  border: 'rgba(212,154,58,0.4)',  text: '#d49a3a' },
  { bg: 'rgba(106,172,224,0.14)', border: 'rgba(106,172,224,0.4)', text: '#6aace0' },
  { bg: 'rgba(224,98,58,0.14)',   border: 'rgba(224,98,58,0.4)',   text: '#e0623a' },
  { bg: 'rgba(160,200,74,0.14)',  border: 'rgba(160,200,74,0.4)',  text: '#a0c84a' },
];

function visible(token: string) {
  return token.replace(/ /g, '·').replace(/\n/g, '↵\n').replace(/\t/g, '⇥');
}

// ── Context sizes ──────────────────────────────────────────────────────────

const CTX_SIZES = [
  { label: '4k',   tokens: 4_096 },
  { label: '8k',   tokens: 8_192 },
  { label: '32k',  tokens: 32_768 },
  { label: '128k', tokens: 128_000 },
];

// ── Word grouping ──────────────────────────────────────────────────────────

interface WordGroup {
  display: string;
  indices: number[];
}

function buildWordGroups(tokens: string[]): WordGroup[] {
  const groups: WordGroup[] = [];
  let cur: WordGroup | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const startsNew = t.startsWith(' ') || t === '\n' || (cur === null);
    if (startsNew && cur) groups.push(cur);
    if (startsNew || cur === null) {
      cur = { display: t, indices: [i] };
    } else {
      cur.display += t;
      cur.indices.push(i);
    }
  }
  if (cur) groups.push(cur);
  return groups;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TokenChips({ tokens, ids, hovered, setHovered }: {
  tokens: string[]; ids: number[];
  hovered: number | null; setHovered: (i: number | null) => void;
}) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '16px 14px', lineHeight: 2.5,
      marginBottom: 4, minHeight: 64,
    }}>
      {tokens.map((token, i) => {
        const c = PALETTE[i % PALETTE.length];
        const isHov = hovered === i;
        return (
          <span
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            title={`#${i}  ·  ID ${ids[i]}`}
            style={{
              display: 'inline-block',
              background: isHov ? c.border : c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 3, padding: '1px 5px', margin: '2px 1px',
              fontFamily: 'var(--font-mono)', fontSize: 13,
              color: isHov ? 'var(--bg)' : c.text,
              whiteSpace: 'pre', cursor: 'default',
              transition: 'background 0.1s, color 0.1s',
              verticalAlign: 'middle',
            }}
          >
            {visible(token)}
          </span>
        );
      })}
    </div>
  );
}

function ContextBar({ count }: { count: number }) {
  const [ctxIdx, setCtxIdx] = useState(3); // default 128k
  const ctx = CTX_SIZES[ctxIdx];
  const pct = Math.min(count / ctx.tokens, 1);
  const pctDisplay = count === 0 ? '0%' : pct < 0.001 ? '<0.1%' : `${(pct * 100).toFixed(1)}%`;
  const barColor = pct > 0.9 ? 'var(--red)' : pct > 0.6 ? 'var(--orange)' : 'var(--accent)';

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '12px 16px', marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
        context window
      </span>
      <div style={{ flex: 1, minWidth: 120, height: 6, background: 'var(--deep)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.2s, background 0.2s' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: barColor, whiteSpace: 'nowrap' }}>
        {count.toLocaleString()} / {ctx.tokens.toLocaleString()} ({pctDisplay})
      </span>
      <div style={{ display: 'flex', gap: 2 }}>
        {CTX_SIZES.map((s, i) => (
          <button key={s.label} onClick={() => setCtxIdx(i)} style={{
            background: i === ctxIdx ? 'var(--accent-dim)' : 'transparent',
            border: 'none', borderRadius: 4, padding: '2px 7px',
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: i === ctxIdx ? 'var(--accent)' : 'var(--text-faint)',
            cursor: 'pointer', transition: 'color 0.15s, background 0.15s',
          }}>{s.label}</button>
        ))}
      </div>
    </div>
  );
}

type TabKey = 'list' | 'words' | 'bytes';

function TokenTable({ tokens, ids, hovered, setHovered, tab }: {
  tokens: string[]; ids: number[];
  hovered: number | null; setHovered: (i: number | null) => void;
  tab: TabKey;
}) {
  if (tab === 'list') {
    return (
      <>
        <div style={{
          display: 'grid', gridTemplateColumns: '44px 90px 1fr',
          padding: '7px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface-alt)',
        }}>
          {['#', 'id', 'text'].map(h => (
            <span key={h} style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{h}</span>
          ))}
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {tokens.map((token, i) => {
            const c = PALETTE[i % PALETTE.length];
            const isHov = hovered === i;
            return (
              <div key={i}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'grid', gridTemplateColumns: '44px 90px 1fr',
                  padding: '5px 16px', borderBottom: '1px solid var(--border)',
                  alignItems: 'center',
                  background: isHov ? 'var(--surface-alt)' : 'transparent',
                  transition: 'background 0.1s',
                }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>{i}</span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{ids[i]}</span>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: c.text, whiteSpace: 'pre' }}>{visible(token)}</span>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  if (tab === 'words') {
    const groups = buildWordGroups(tokens);
    return (
      <>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 48px 1fr',
          padding: '7px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface-alt)',
        }}>
          {['text', 'tokens', 'ids'].map(h => (
            <span key={h} style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{h}</span>
          ))}
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {groups.map((g, gi) => {
            const n = g.indices.length;
            const costColor = n >= 4 ? 'var(--red)' : n === 3 ? 'var(--orange)' : n === 2 ? 'var(--accent)' : 'var(--green)';
            const isHov = g.indices.some(i => hovered === i);
            return (
              <div key={gi}
                onMouseEnter={() => setHovered(g.indices[0])} onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 48px 1fr',
                  padding: '6px 16px', borderBottom: '1px solid var(--border)',
                  alignItems: 'center',
                  background: isHov ? 'var(--surface-alt)' : 'transparent',
                  transition: 'background 0.1s',
                }}>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-mid)', whiteSpace: 'pre' }}>
                  {visible(g.display)}
                </span>
                <span style={{
                  fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: costColor,
                  background: costColor + '22', borderRadius: 4, padding: '1px 6px',
                  textAlign: 'center', justifySelf: 'start',
                }}>
                  {n}
                </span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.indices.map(i => ids[i]).join(', ')}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '7px 16px', background: 'var(--surface-alt)', borderTop: '1px solid var(--border)', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)', display: 'flex', gap: 16 }}>
          <span style={{ color: 'var(--green)' }}>■</span> 1 token
          <span style={{ color: 'var(--accent)' }}>■</span> 2 tokens
          <span style={{ color: 'var(--orange)' }}>■</span> 3 tokens
          <span style={{ color: 'var(--red)' }}>■</span> 4+ tokens
        </div>
      </>
    );
  }

  // bytes tab
  return (
    <>
      <div style={{
        display: 'grid', gridTemplateColumns: '44px 1fr 1fr',
        padding: '7px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface-alt)',
      }}>
        {['#', 'text', 'utf-8 bytes'].map(h => (
          <span key={h} style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{h}</span>
        ))}
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {tokens.map((token, i) => {
          const c = PALETTE[i % PALETTE.length];
          const isHov = hovered === i;
          const bytes = Array.from(new TextEncoder().encode(token));
          const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
          return (
            <div key={i}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              style={{
                display: 'grid', gridTemplateColumns: '44px 1fr 1fr',
                padding: '5px 16px', borderBottom: '1px solid var(--border)',
                alignItems: 'center',
                background: isHov ? 'var(--surface-alt)' : 'transparent',
                transition: 'background 0.1s',
              }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>{i}</span>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: c.text, whiteSpace: 'pre' }}>{visible(token)}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>{hex}</span>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-alt)', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>
        BPE operates on raw UTF-8 bytes before merging. Each emoji or non-ASCII character expands to 2–4 bytes, each becoming an initial byte-token before merges collapse them.
      </div>
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export function TokenizerPage() {
  const [text, setText] = useState(EXAMPLES[0].text);
  const [hovered, setHovered] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>('list');
  const [copied, setCopied] = useState(false);

  const { ids, tokens } = useMemo(() => {
    if (!text) return { ids: [] as number[], tokens: [] as string[] };
    const ids = encode(text);
    const tokens = ids.map(id => decode([id]));
    return { ids, tokens };
  }, [text]);

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const uniqueCount = new Set(ids).size;
  const longestToken = tokens.reduce((best, t) => t.length > best.length ? t : best, '');

  function copyIds() {
    navigator.clipboard.writeText(JSON.stringify(ids)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'list',  label: 'token list' },
    { key: 'words', label: 'by word' },
    { key: 'bytes', label: 'byte view' },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div className="page-outer" style={{ maxWidth: 860, margin: '0 auto', padding: '48px 32px 80px' }}>

        {/* Header */}
        <h1 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>
          Tokenizer
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.7, maxWidth: 520 }}>
          Before text reaches a model it's split into tokens, the atomic units a model reads and predicts.
          Each coloured block is one token. GPT-2 vocabulary: 50,257 tokens.
        </p>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type or paste any text…"
          rows={4}
          style={{
            width: '100%', background: 'var(--surface)', border: '1px solid var(--border-mid)',
            borderRadius: 8, padding: '14px 16px', color: 'var(--text)',
            fontSize: 15, lineHeight: 1.65, resize: 'vertical', outline: 'none',
            boxSizing: 'border-box', transition: 'border-color 0.15s',
            fontFamily: 'inherit',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; }}
        />

        {/* Presets */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>try:</span>
          {EXAMPLES.map(ex => (
            <button key={ex.label} onClick={() => setText(ex.text)} style={{
              background: text === ex.text ? 'var(--accent-dim)' : 'transparent',
              border: 'none', color: text === ex.text ? 'var(--accent)' : 'var(--text-dim)',
              fontSize: 12, cursor: 'pointer', padding: '3px 10px', borderRadius: 4,
              fontFamily: 'var(--font-mono)', transition: 'color 0.15s, background 0.15s',
            }}>{ex.label}</button>
          ))}
        </div>

        {ids.length > 0 && (
          <>
            {/* Stats */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <Stat value={ids.length} label="tokens" color="var(--accent)" />
              <Stat value={charCount} label="chars" />
              <Stat value={wordCount} label="words" />
              <Stat value={(charCount / ids.length).toFixed(2)} label="chars/token" />
              <Stat value={uniqueCount} label="unique" />
              <div style={{ marginLeft: 'auto' }}>
                <button onClick={copyIds} style={{
                  background: 'var(--surface)', border: '1px solid var(--border-mid)',
                  borderRadius: 5, padding: '5px 12px', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: copied ? 'var(--accent)' : 'var(--text-dim)',
                  transition: 'color 0.15s, border-color 0.15s',
                }}>
                  {copied ? 'copied' : 'copy IDs'}
                </button>
              </div>
            </div>

            {/* Context cost bar */}
            <ContextBar count={ids.length} />

            {/* Token chips */}
            <TokenChips tokens={tokens} ids={ids} hovered={hovered} setHovered={setHovered} />

            {/* Hint about longest token */}
            {longestToken.length > 4 && (
              <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginBottom: 14, textAlign: 'right' }}>
                longest token: <span style={{ color: 'var(--text-dim)' }}>"{visible(longestToken)}"</span> ({longestToken.length} chars)
              </div>
            )}

            {/* Tabbed table */}
            <div className="scroll-x" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface-alt)' }}>
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)} style={{
                    background: 'transparent', border: 'none',
                    borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                    color: tab === t.key ? 'var(--accent)' : 'var(--text-faint)',
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    padding: '8px 16px', cursor: 'pointer',
                    transition: 'color 0.15s',
                    marginBottom: -1,
                  }}>{t.label}</button>
                ))}
              </div>
              <TokenTable tokens={tokens} ids={ids} hovered={hovered} setHovered={setHovered} tab={tab} />
            </div>
          </>
        )}

        {!text && (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, marginTop: 12 }}>Start typing above to see tokens.</p>
        )}

        {/* Theory */}
        <div style={{ marginTop: 56, paddingTop: 40, borderTop: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Language models don't read characters or words — they read tokens. Byte Pair Encoding (BPE) builds a tokenizer by starting with individual bytes, then iteratively merging the most frequent adjacent pair in a large corpus. This repeats until the vocabulary reaches its target size (GPT-2: 50,257; GPT-4: 100,256). Common English words like "the" end up as a single token; rare or foreign words fragment into subword pieces.
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            Try the <strong style={{ color: 'var(--text)' }}>numbers</strong> preset: each digit is its own token, which is why LLMs are notoriously poor at arithmetic — "12 + 7" is four separate tokens with no inherent numeric meaning. Try <strong style={{ color: 'var(--text)' }}>spaces</strong>: a leading space makes "·word" a different token than "word", so the model can distinguish a word in the middle of a sentence from one at the start. Try <strong style={{ color: 'var(--text)' }}>multilang</strong>: the same idea in Arabic or Japanese expands to many more tokens, because training data was mostly English.
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.78 }}>
            The <strong style={{ color: 'var(--text)' }}>byte view</strong> tab shows the raw UTF-8 encoding under each token. BPE starts from these bytes — every multi-byte emoji is 4 bytes before any merges happen. The <strong style={{ color: 'var(--text)' }}>by word</strong> tab shows which words in your text are "expensive" (3+ tokens, shown in orange/red) vs "cheap" (1 token, green). Context window costs are per token, so word choice and language both affect how far your budget stretches.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
            <a href="https://platform.openai.com/tokenizer" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ OpenAI Tokenizer playground</a>
            <a href="https://www.youtube.com/watch?v=zduSFxRajkE" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Andrej Karpathy: Let's build the GPT Tokenizer (YouTube)</a>
            <a href="https://huggingface.co/docs/tokenizers/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Hugging Face Tokenizers docs</a>
            <a href="https://arxiv.org/abs/1508.07909" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>→ Neural Machine Translation of Rare Words with Subword Units, Sennrich et al. 2016</a>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function Stat({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: color ?? 'var(--text)' }}>
        {value}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
    </div>
  );
}
