import { useState, useMemo } from 'react';
import { encode, decode } from 'gpt-tokenizer';

const EXAMPLES = [
  { label: 'sentence', text: 'The quick brown fox jumps over the lazy dog.' },
  { label: 'code', text: 'function add(a, b) {\n  return a + b;\n}' },
  { label: 'mixed', text: "Don't tokenize me! 2024-01-15 = $42.00 + 3.14..." },
  { label: 'emoji', text: '🚀 Hello world! こんにちは Привет' },
];

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

export function TokenizerPage() {
  const [text, setText] = useState(EXAMPLES[0].text);
  const [hovered, setHovered] = useState<number | null>(null);

  const { ids, tokens } = useMemo(() => {
    if (!text) return { ids: [] as number[], tokens: [] as string[] };
    const ids = encode(text);
    const tokens = ids.map((id) => decode([id]));
    return { ids, tokens };
  }, [text]);

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const uniqueCount = new Set(ids).size;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 32px 80px' }}>

        {/* Header */}
        <h1 style={{
          margin: '0 0 10px',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(26px, 4vw, 38px)',
          fontWeight: 800,
          color: 'var(--text)',
          letterSpacing: -0.5,
        }}>
          Tokenizer
        </h1>
        <p style={{
          margin: '0 0 32px',
          fontSize: 15,
          color: 'var(--text-mid)',
          lineHeight: 1.7,
          maxWidth: 520,
        }}>
          Before text reaches a model it's split into tokens — the atomic units a model reads and predicts.
          Each colored block below is one token.
        </p>

        {/* Input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste any text…"
          rows={4}
          style={{
            width: '100%',
            background: 'var(--surface)',
            border: '1px solid var(--border-mid)',
            borderRadius: 8,
            padding: '14px 16px',
            color: 'var(--text)',
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            lineHeight: 1.65,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-mid)'; }}
        />

        {/* Examples */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 28, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-faint)', alignSelf: 'center' }}>try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => setText(ex.text)}
              style={{
                background: text === ex.text ? 'var(--accent-dim)' : 'transparent',
                border: 'none',
                color: text === ex.text ? 'var(--accent)' : 'var(--text-dim)',
                fontSize: 12,
                cursor: 'pointer',
                padding: '3px 10px',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                transition: 'color 0.15s, background 0.15s',
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {ids.length > 0 && (
          <div style={{ display: 'flex', gap: 28, marginBottom: 20, flexWrap: 'wrap' }}>
            <Stat value={ids.length} label="tokens" color="var(--accent)" />
            <Stat value={charCount} label="chars" />
            <Stat value={wordCount} label="words" />
            <Stat value={(charCount / ids.length).toFixed(2)} label="chars / token" />
            <Stat value={uniqueCount} label="unique tokens" />
          </div>
        )}

        {/* Token chips */}
        {ids.length > 0 && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '16px 14px',
            lineHeight: 2.4,
            marginBottom: 20,
            minHeight: 60,
          }}>
            {tokens.map((token, i) => {
              const c = PALETTE[i % PALETTE.length];
              const isHov = hovered === i;
              return (
                <span
                  key={i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: 'inline-block',
                    background: isHov ? c.border : c.bg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 3,
                    padding: '1px 5px',
                    margin: '2px 1px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: isHov ? 'var(--bg)' : c.text,
                    whiteSpace: 'pre',
                    cursor: 'default',
                    transition: 'background 0.1s, color 0.1s',
                    verticalAlign: 'middle',
                  }}
                  title={`token ${i}  ·  ID ${ids[i]}`}
                >
                  {visible(token)}
                </span>
              );
            })}
          </div>
        )}

        {/* Token table */}
        {ids.length > 0 && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '44px 90px 1fr',
              padding: '8px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              {['#', 'token id', 'text'].map((h) => (
                <span key={h} style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{h}</span>
              ))}
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {tokens.map((token, i) => {
                const c = PALETTE[i % PALETTE.length];
                const isHov = hovered === i;
                return (
                  <div
                    key={i}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '44px 90px 1fr',
                      padding: '5px 16px',
                      borderBottom: '1px solid var(--border)',
                      alignItems: 'center',
                      background: isHov ? 'var(--surface-alt)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>{i}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{ids[i]}</span>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: c.text, whiteSpace: 'pre' }}>
                      {visible(token)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!text && (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, marginTop: 12 }}>
            Start typing above to see tokens.
          </p>
        )}
      </div>
    </div>
  );
}

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
