import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/http.js';

const router = Router();
router.use(authRequired);

const schema = z.object({
  destino_id: z.number().int().positive(),
  nombre: z.string().min(2).max(140),
  tipo: z.string().min(2).max(60),
  descripcion: z.string().max(2000).default(''),
  costo: z.number().min(0).default(0),
  duracion_hrs: z.number().min(0).default(1),
  activo: z.boolean().default(true),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const destinoId = req.query.destinoId ? Number(req.query.destinoId) : null;
    const { rows } = await query(
      `SELECT a.id, a.destino_id, d.nombre AS destino, a.nombre, a.tipo, a.descripcion,
              a.costo::float AS costo, a.duracion_hrs::float AS duracion_hrs, a.activo
         FROM actividades a
         JOIN destinos d ON d.id = a.destino_id
        WHERE ($1::int IS NULL OR a.destino_id = $1::int)
        ORDER BY d.nombre, a.nombre`,
      [destinoId],
    );
    res.json({ actividades: rows });
  }),
);

router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO actividades (destino_id, nombre, tipo, descripcion, costo, duracion_hrs, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        data.destino_id,
        data.nombre,
        data.tipo,
        data.descripcion,
        data.costo,
        data.duracion_hrs,
        data.activo,
      ],
    );
    res.status(201).json({ actividad: rows[0] });
  }),
);

router.put(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const { rows } = await query(
      `UPDATE actividades
          SET destino_id=$1, nombre=$2, tipo=$3, descripcion=$4, costo=$5, duracion_hrs=$6, activo=$7
        WHERE id=$8
        RETURNING *`,
      [
        data.destino_id,
        data.nombre,
        data.tipo,
        data.descripcion,
        data.costo,
        data.duracion_hrs,
        data.activo,
        Number(req.params.id),
      ],
    );
    if (!rows[0]) throw new AppError(404, 'ACTIVIDAD_NOT_FOUND', 'Actividad no encontrada');
    res.json({ actividad: rows[0] });
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { rowCount } = await query('DELETE FROM actividades WHERE id = $1', [
      Number(req.params.id),
    ]);
    if (!rowCount) throw new AppError(404, 'ACTIVIDAD_NOT_FOUND', 'Actividad no encontrada');
    res.json({ ok: true });
  }),
);

export default router;
