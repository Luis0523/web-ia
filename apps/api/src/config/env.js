import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const dirname = path.dirname(fileURLToPath(import.meta.url));
// Carga el .env de la raiz del monorepo y, si existe, el local de la API.
dotenv.config({ path: path.resolve(dirname, '../../../../.env') });
dotenv.config();

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 3000),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/webia',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  groqFastModel: process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  embeddingDim: num(process.env.EMBEDDING_DIM, 1536),
  biApiKey: process.env.BI_API_KEY || 'demo-bi-key-123',
  ragMinScore: num(process.env.RAG_MIN_SCORE, 0.68),
  ragTopK: num(process.env.RAG_TOP_K, 5),
  mockAi: process.env.MOCK_AI === 'true',
};

export const isProd = env.nodeEnv === 'production';
