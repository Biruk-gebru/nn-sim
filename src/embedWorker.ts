import { pipeline, env } from '@huggingface/transformers';

env.localModelPath = '/models/';
env.allowLocalModels = true;
env.allowRemoteModels = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' });
  }
  return embedder;
}

self.addEventListener('message', async (e: MessageEvent) => {
  const { type, text } = e.data;

  if (type === 'load') {
    try {
      await getEmbedder();
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: (err as Error).message });
    }
  } else if (type === 'embed') {
    try {
      const model = await getEmbedder();
      const out = await model(text, { pooling: 'mean', normalize: true });
      self.postMessage({ type: 'result', embedding: Array.from(out.data as Float32Array) });
    } catch (err) {
      self.postMessage({ type: 'error', message: (err as Error).message });
    }
  }
});
