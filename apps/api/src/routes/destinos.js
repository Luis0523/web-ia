import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/http.js';

const router = Router();
router.use(authRequired);

const schema = z.object({
  nombre: z.string().min(2).max(120),
  region: z.string().min(2).max(120),
  pais: z.string().min(2).max(80),
  lat: z.number(),
  lon: z.number(),
  descripcion: z.string().max(3000).default(''),
  precio_promedio: z.number().min(0).default(0),
  clima: z.string().max(120).default(''),
  activo: z.boolean().default(true),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || '').trim();
    const { rows } = await query(
      `SELECT id, nombre, region, pais, lat, lon, descripcion,
              precio_promedio::float AS precio_promedio, clima, activo, created_at
         FROM destinos
        WHERE ($1 = '' OR nombre ILIKE $2 OR region ILIKE $2 OR pais ILIKE $2)
          AND (activo = TRUE OR $3 = TRUE)
        ORDER BY nombre ASC`,
      [search, `%${search}%`, req.user.role === 'admin'],
    );
    res.json({ destinos: rows });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT id, nombre, region, pais, lat, lon, descripcion,
              precio_promedio::float AS precio_promedio, clima, activo, created_at
         FROM destinos WHERE id = $1`,
      [Number(req.params.id)],
    );
    if (!rows[0]) throw new AppError(404, 'DESTINO_NOT_FOUND', 'Destino no encontrado');

    const { rows: actividades } = await query(
      `SELECT id, nombre, tipo, descripcion, costo::float AS costo, duracion_hrs::float AS duracion_hrs, activo
         FROM actividades WHERE destino_id = $1 ORDER BY nombre`,
      [Number(req.params.id)],
    );
    res.json({ destino: rows[0], actividades });
  }),
);

router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO destinos (nombre, region, pais, lat, lon, descripcion, precio_promedio, clima, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        data.nombre,
        data.region,
        data.pais,
        data.lat,
        data.lon,
        data.descripcion,
        data.precio_promedio,
        data.clima,
        data.activo,
      ],
    );
    res.status(201).json({ destino: rows[0] });
  }),
);

router.put(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const { rows } = await query(
      `UPDATE destinos
          SET nombre=$1, region=$2, pais=$3, lat=$4, lon=$5, descripcion=$6,
              precio_promedio=$7, clima=$8, activo=$9
        WHERE id=$10
        RETURNING *`,
      [
        data.nombre,
        data.region,
        data.pais,
        data.lat,
        data.lon,
        data.descripcion,
        data.precio_promedio,
        data.clima,
        data.activo,
        Number(req.params.id),
      ],
    );
    if (!rows[0]) throw new AppError(404, 'DESTINO_NOT_FOUND', 'Destino no encontrado');
    res.json({ destino: rows[0] });
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { rowCount } = await query('DELETE FROM destinos WHERE id = $1', [Number(req.params.id)]);
    if (!rowCount) throw new AppError(404, 'DESTINO_NOT_FOUND', 'Destino no encontrado');
    res.json({ ok: true });
  }),
);

export default router;
