import { createApp } from './app.js';
import { env } from './config/env.js';
import { query } from './db/pool.js';

const app = createApp();

const start = async () => {
  try {
    await query('SELECT 1');
    console.log('Conexion a PostgreSQL verificada');
  } catch (error) {
    console.error('No se pudo conectar a PostgreSQL:', error.message);
  }

  app.listen(env.port, () => {
    console.log(`API escuchando en http://localhost:${env.port}`);
    console.log(`Swagger disponible en http://localhost:${env.port}/api-docs`);
  });
};

start();
