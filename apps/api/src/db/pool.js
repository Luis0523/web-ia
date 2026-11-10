import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

const useSsl =
  env.nodeEnv === 'production' && !env.databaseUrl.includes('localhost');

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error.message);
});

export const query = (text, params) => pool.query(text, params);
