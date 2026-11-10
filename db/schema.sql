-- ============================================================
--  Plataforma de servicios de IA - Turismo
--  PostgreSQL 16 + pgvector + pgcrypto
--  Ejecutar con: psql "$DATABASE_URL" -f db/schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Usuarios y seguridad ----------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(180) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          VARCHAR(10) NOT NULL DEFAULT 'user'
                  CHECK (role IN ('admin', 'user')),
  token_limit   INTEGER NOT NULL DEFAULT 50000 CHECK (token_limit >= 0),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Servicios de IA configurables ----------
CREATE TABLE IF NOT EXISTS services (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key           VARCHAR(60) NOT NULL UNIQUE,
  name          VARCHAR(120) NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  provider      VARCHAR(40) NOT NULL DEFAULT 'groq',
  model         VARCHAR(80) NOT NULL DEFAULT 'llama-3.3-70b-versatile',
  system_prompt TEXT NOT NULL DEFAULT '',
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Límite de tokens por usuario y servicio (opcional; si no existe rige users.token_limit)
CREATE TABLE IF NOT EXISTS user_service_limits (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id  INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  token_limit INTEGER NOT NULL CHECK (token_limit >= 0),
  UNIQUE (user_id, service_id)
);

-- ---------- Datos de negocio (turismo) ----------
CREATE TABLE IF NOT EXISTS destinos (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre           VARCHAR(120) NOT NULL UNIQUE,
  region           VARCHAR(120) NOT NULL,
  pais             VARCHAR(80) NOT NULL,
  lat              DOUBLE PRECISION NOT NULL,
  lon              DOUBLE PRECISION NOT NULL,
  descripcion      TEXT NOT NULL DEFAULT '',
  precio_promedio  NUMERIC(10,2) NOT NULL DEFAULT 0,
  clima            VARCHAR(120) NOT NULL DEFAULT '',
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actividades (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  destino_id   INTEGER NOT NULL REFERENCES destinos(id) ON DELETE CASCADE,
  nombre       VARCHAR(140) NOT NULL,
  tipo         VARCHAR(60) NOT NULL,
  descripcion  TEXT NOT NULL DEFAULT '',
  costo        NUMERIC(10,2) NOT NULL DEFAULT 0,
  duracion_hrs NUMERIC(5,2) NOT NULL DEFAULT 1,
  activo       BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------- Corpus para RAG ----------
CREATE TABLE IF NOT EXISTS rag_documents (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  source     VARCHAR(200) NOT NULL DEFAULT 'Base de datos interna',
  category   VARCHAR(80) NOT NULL DEFAULT 'general',
  content    TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rag_chunks (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content     TEXT NOT NULL,
  tokens      INTEGER NOT NULL DEFAULT 0,
  embedding   vector(1536)
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding
  ON rag_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_document ON rag_chunks(document_id);

-- ---------- Conversaciones e historial ----------
CREATE TABLE IF NOT EXISTS conversations (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL DEFAULT 'Nueva conversación',
  summary    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            VARCHAR(12) NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content         TEXT NOT NULL,
  tokens          INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS agent_runs (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id      INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  input           TEXT NOT NULL,
  steps           JSONB NOT NULL DEFAULT '[]'::jsonb,
  output          TEXT NOT NULL DEFAULT '',
  tokens          INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Consumo de tokens ----------
CREATE TABLE IF NOT EXISTS usage_logs (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id   INTEGER REFERENCES services(id) ON DELETE SET NULL,
  endpoint     VARCHAR(80) NOT NULL DEFAULT '',
  kind         VARCHAR(20) NOT NULL DEFAULT 'chat'
                 CHECK (kind IN ('chat', 'agent', 'embedding')),
  tokens_in    INTEGER NOT NULL DEFAULT 0,
  tokens_out   INTEGER NOT NULL DEFAULT 0,
  tokens_total INTEGER NOT NULL DEFAULT 0,
  status       VARCHAR(20) NOT NULL DEFAULT 'ok',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_service_date ON usage_logs(service_id, created_at);

-- ---------- API keys para consumidores externos (Power BI / Postman) ----------
CREATE TABLE IF NOT EXISTS api_keys (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  key_hash   TEXT NOT NULL UNIQUE,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Vista de reportes (usada por la API y comparable con Power BI) ----------
CREATE OR REPLACE VIEW v_usage_daily AS
SELECT
  u.id                       AS user_id,
  u.name                     AS user_name,
  s.key                      AS service_key,
  s.name                     AS service_name,
  date_trunc('day', l.created_at)::date AS day,
  l.kind,
  COUNT(*)                   AS calls,
  COALESCE(SUM(l.tokens_total), 0) AS tokens
FROM usage_logs l
JOIN users u   ON u.id = l.user_id
LEFT JOIN services s ON s.id = l.service_id
GROUP BY u.id, u.name, s.key, s.name, date_trunc('day', l.created_at)::date, l.kind;
