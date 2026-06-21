import { pipeline } from '@xenova/transformers';

const WORDS = [
  'dog','cat','bird','fish','lion',
  'pizza','sushi','bread','apple','coffee',
  'model','neural','data','train','code',
  'happy','sad','love','fear','joy',
  'ocean','mountain','forest','desert','river',
  'king','queen','man','woman','child',
];

console.log('Loading model...');
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
console.log('Model loaded. Computing embeddings...');

const result = {};
for (const word of WORDS) {
  const out = await embedder(word, { pooling: 'mean', normalize: true });
  result[word] = Array.from(out.data).map(v => Math.round(v * 10000) / 10000);
  process.stdout.write('.');
}
console.log('\nDone.');
console.log(JSON.stringify(result, null, 0));
