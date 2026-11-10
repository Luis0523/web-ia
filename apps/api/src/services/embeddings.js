import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/http.js';

const localEmbed = (text) => {
  const vector = new Array(env.embeddingDim).fill(0);
  const tokens = String(text || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  for (const token of tokens) {
    const hash = crypto.createHash('sha256').update(token).digest();
    vector[hash.readUInt32BE(0) % env.embeddingDim] += 1;
    vector[hash.readUInt32BE(4) % env.embeddingDim] += 0.5;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
};

const openaiEmbed = async (texts) => {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: env.embeddingModel, input: texts }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new AppError(502, 'EMBEDDING_ERROR', `OpenAI respondio ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  return [...data.data]
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
};

export const embed = async (texts) => {
  const list = Array.isArray(texts) ? texts : [texts];
  if (env.openaiApiKey && !env.mockAi) return openaiEmbed(list);
  return list.map(localEmbed);
};

export const embedOne = async (text) => {
  const [vector] = await embed([text]);
  return vector;
};

export const toVectorLiteral = (vector) => `[${vector.map((value) => Number(value).toFixed(8)).join(',')}]`;
