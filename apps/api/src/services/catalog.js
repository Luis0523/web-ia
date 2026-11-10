import { query } from '../db/pool.js';
import { AppError } from '../utils/http.js';

export const getActiveService = async (key) => {
  const { rows } = await query(
    'SELECT * FROM services WHERE key = $1 AND active = TRUE',
    [key],
  );
  if (!rows[0]) {
    throw new AppError(404, 'SERVICE_UNAVAILABLE', 'El servicio no existe o esta desactivado');
  }
  return rows[0];
};

export const findDestino = async (nombre) => {
  if (!nombre) return null;
  const { rows } = await query(
    `SELECT id, nombre, region, pais, lat, lon, precio_promedio::float AS precio_promedio, clima, descripcion
       FROM destinos
      WHERE activo = TRUE AND nombre ILIKE $1
      ORDER BY precio_promedio ASC
      LIMIT 1`,
    [`%${nombre}%`],
  );
  return rows[0] || null;
};
