import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { embed, embedOne, toVectorLiteral } from './embeddings.js';
import { AppError, estimateTokens } from '../utils/http.js';

export const chunkText = (text, maxLen = 700, overlap = 100) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + maxLen, clean.length);
    if (end < clean.length) {
      const cut = clean.lastIndexOf('. ', end);
      if (cut > start + maxLen * 0.4) end = cut + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
};

const STOPWORDS = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'u', 'que', 'en',
  'para', 'por', 'con', 'sin', 'del', 'al', 'es', 'son', 'sea', 'cual', 'cuales', 'como',
  'cuanto', 'cuanta', 'cuantos', 'cuantas', 'hay', 'mejor', 'me', 'mi', 'tu', 'se', 'su',
  'sus', 'lo', 'le', 'les', 'a', 'ante', 'bajo', 'cabe', 'contra', 'desde', 'durante',
  'entre', 'hacia', 'hasta', 'mediante', 'sobre', 'tras', 'mas', 'pero', 'si', 'no', 'ya',
  'muy', 'tambien', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel',
  'aquella', 'quiero', 'necesito', 'puedo', 'puedes', 'tengo', 'tiene', 'ser', 'estar',
]);

const tokenize = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 2 && !STOPWORDS.has(token)) || [];

// Recuperacion lexica BM25 usada cuando no hay proveedor de embeddings (modo local/demo).
// Mantiene el sistema funcional sin OPENAI_API_KEY y es mas preciso que un embedding hash.
const lexicalRetrieve = async (question, topK, minScore) => {
  const { rows } = await query(
    `SELECT c.id, c.content, c.chunk_index, d.id AS document_id, d.title, d.source, d.category
       FROM rag_chunks c
       JOIN rag_documents d ON d.id = c.document_id
      WHERE d.active = TRUE
      LIMIT 2000`,
  );

  const terms = [...new Set(tokenize(question))];
  if (rows.length === 0 || terms.length === 0) return [];

  const docs = rows.map((row) => ({ ...row, tokens: tokenize(row.content) }));
  const total = docs.length;
  const avgLength = docs.reduce((sum, doc) => sum + doc.tokens.length, 0) / total || 1;
  const df = new Map(terms.map((term) => [term, docs.filter((doc) => doc.tokens.includes(term)).length]));

  const k1 = 1.5;
  const b = 0.75;

  const scored = docs
    .map((doc) => {
      const tf = new Map();
      for (const token of doc.tokens) tf.set(token, (tf.get(token) || 0) + 1);

      let rawScore = 0;
      for (const term of terms) {
        const frequency = tf.get(term);
        if (!frequency) continue;
        const idf = Math.log(1 + (total - df.get(term) + 0.5) / (df.get(term) + 0.5));
        rawScore +=
          idf *
          ((frequency * (k1 + 1)) /
            (frequency + k1 * (1 - b + (b * doc.tokens.length) / avgLength)));
      }
      return { doc, rawScore };
    })
    .filter((item) => item.rawScore > 0);

  if (scored.length === 0) return [];

  const max = Math.max(...scored.map((item) => item.rawScore));
  return scored
    .map(({ doc, rawScore }) => ({
      id: doc.id,
      content: doc.content,
      chunk_index: doc.chunk_index,
      document_id: doc.document_id,
      title: doc.title,
      source: doc.source,
      category: doc.category,
      score: rawScore / max,
    }))
    .sort((a, b2) => b2.score - a.score)
    .filter((row) => row.score >= minScore)
    .slice(0, topK);
};

const vectorRetrieve = async (question, topK, minScore) => {
  const vector = await embedOne(question);
  const literal = toVectorLiteral(vector);

  const { rows } = await query(
    `SELECT c.id, c.content, c.chunk_index, d.id AS document_id, d.title, d.source, d.category,
            1 - (c.embedding <=> $1::vector) AS score
       FROM rag_chunks c
       JOIN rag_documents d ON d.id = c.document_id
      WHERE d.active = TRUE AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> $1::vector
      LIMIT $2`,
    [literal, topK],
  );

  return rows
    .map((row) => ({ ...row, score: Number(row.score) }))
    .filter((row) => row.score >= minScore);
};

let embeddingsUnavailable = false;

export const retrieve = async (question, options = {}) => {
  const topK = options.topK ?? env.ragTopK;
  const minScore = options.minScore ?? env.ragMinScore;
  const localMode = env.mockAi || !env.openaiApiKey || embeddingsUnavailable;

  if (localMode) return lexicalRetrieve(question, topK, minScore);

  try {
    return await vectorRetrieve(question, topK, minScore);
  } catch (error) {
    embeddingsUnavailable = true;
    console.warn(`Embeddings no disponibles (${error.message}). Se usa recuperacion lexica BM25.`);
    return lexicalRetrieve(question, topK, minScore);
  }
};

export const indexDocument = async (documentId) => {
  const { rows } = await query(
    'SELECT id, title, content FROM rag_documents WHERE id = $1',
    [documentId],
  );
  const document = rows[0];
  if (!document) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento no encontrado');

  const chunks = chunkText(document.content);
  const vectors = await embed(chunks);

  await query('DELETE FROM rag_chunks WHERE document_id = $1', [documentId]);

  for (let index = 0; index < chunks.length; index += 1) {
    await query(
      `INSERT INTO rag_chunks (document_id, chunk_index, content, tokens, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)`,
      [
        documentId,
        index,
        chunks[index],
        estimateTokens(chunks[index]),
        toVectorLiteral(vectors[index]),
      ],
    );
  }

  return { documentId, title: document.title, chunks: chunks.length };
};

export const indexAllDocuments = async () => {
  const { rows } = await query('SELECT id, title FROM rag_documents ORDER BY id');
  const results = [];
  for (const document of rows) {
    results.push(await indexDocument(document.id));
  }
  return results;
};

export const buildContext = (chunks) =>
  chunks
    .map((chunk, index) => `[${index + 1}] ${chunk.title} (${chunk.source}): ${chunk.content}`)
    .join('\n\n');
