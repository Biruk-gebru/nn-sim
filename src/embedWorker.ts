const steps: string[] = [];
const step = (s: string) => { steps.push(s); self.postMessage({ type: 'debug', step: s }); };

step('worker-started');

// Clear any stale cached HTML responses from before model files existed in public/
if (typeof caches !== 'undefined') {
  caches.delete('transformers-cache').catch(() => {});
}

let mod: { pipeline: Function; env: Record<string, unknown> } | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;

async function getEmbedder() {
  if (!mod) {
    step('importing-transformers');
    mod = await import('@huggingface/transformers') as any;
    step('transformers-imported');

    mod!.env.localModelPath = '/models/';
    mod!.env.allowLocalModels = true;
    mod!.env.allowRemoteModels = false;
    // Don't use the browser's Cache API for model files — stale HTML responses
    // from 404s can get stuck there and cause JSON.parse errors.
    (mod!.env as any).useBrowserCache = false;

    // Build a blob URL for the ORT WASM factory so ORT can import() it safely.
    // Vite dev server blocks import() on files in public/, but import(blobURL) works fine.
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const wasmFile = isSafari
      ? '/ort-wasm-simd-threaded.wasm'
      : '/ort-wasm-simd-threaded.asyncify.wasm';
    const mjsFile = isSafari
      ? '/ort-wasm-simd-threaded.mjs'
      : '/ort-wasm-simd-threaded.asyncify.mjs';

    step(`fetching-wasm-factory:${mjsFile}`);
    const mjsText = await fetch(mjsFile).then(r => r.text());
    const mjsBlob = new Blob([mjsText], { type: 'text/javascript' });
    const mjsBlobURL = URL.createObjectURL(mjsBlob);
    step('wasm-factory-blob-ready');

    // useWasmCache must stay true so ensureWasmLoaded() runs and uses our blob URL.
    // With wasmPaths.mjs already a blob URL, isBlobURL() skips re-fetching it.
    (mod!.env as any).backends.onnx.wasm.wasmPaths = {
      wasm: wasmFile,
      mjs: mjsBlobURL,
    };
    step('env-configured');
  }
  if (!embedder) {
    step('creating-pipeline');
    embedder = await mod!.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' });
    step('pipeline-ready');
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
      self.postMessage({ type: 'error', message: (err as Error).message + ' | steps: ' + steps.join(' → ') });
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
