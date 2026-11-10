import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

// Render expone una URL interna sin SSL y una externa con SSL.
// Solo activamos TLS cuando la cadena lo exige o apunta al host publico.
const useSsl =
  !env.databaseUrl.includes('localhost') &&
  (env.databaseUrl.includes('sslmode=require') || /\.render\.com/.test(env.databaseUrl));

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error.message);
});

export const query = (text, params) => pool.query(text, params);
