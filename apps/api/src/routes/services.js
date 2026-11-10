import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/http.js';

const router = Router();
router.use(authRequired);

const schema = z.object({
  key: z.string().min(2).max(60).regex(/^[a-z0-9_]+$/),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).default(''),
  provider: z.string().max(40).default('groq'),
  model: z.string().max(80).default('openai/gpt-oss-120b'),
  system_prompt: z.string().max(4000).default(''),
  config: z.record(z.any()).default({}),
  active: z.boolean().default(true),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const onlyActive = req.user.role !== 'admin';
    const { rows } = await query(
      `SELECT id, key, name, description, provider, model, system_prompt, config, active, created_at
         FROM services
        ${onlyActive ? 'WHERE active = TRUE' : ''}
        ORDER BY id`,
    );
    res.json({ services: rows });
  }),
);

router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO services (key, name, description, provider, model, system_prompt, config, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
       RETURNING *`,
      [
        data.key,
        data.name,
        data.description,
        data.provider,
        data.model,
        data.system_prompt,
        JSON.stringify(data.config),
        data.active,
      ],
    );
    res.status(201).json({ service: rows[0] });
  }),
);

router.put(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    const { rows: current } = await query('SELECT * FROM services WHERE id = $1', [
      Number(req.params.id),
    ]);
    if (!current[0]) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Servicio no encontrado');

    const next = { ...current[0], ...data };
    const { rows } = await query(
      `UPDATE services
          SET key = $1, name = $2, description = $3, provider = $4, model = $5,
              system_prompt = $6, config = $7::jsonb, active = $8
        WHERE id = $9
        RETURNING *`,
      [
        next.key,
        next.name,
        next.description,
        next.provider,
        next.model,
        next.system_prompt,
        JSON.stringify(next.config),
        next.active,
        Number(req.params.id),
      ],
    );
    res.json({ service: rows[0] });
  }),
);

router.patch(
  '/:id/status',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const active = z.boolean().parse(req.body.active);
    const { rows } = await query(
      'UPDATE services SET active = $1 WHERE id = $2 RETURNING id, key, name, active',
      [active, Number(req.params.id)],
    );
    if (!rows[0]) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Servicio no encontrado');
    res.json({ service: rows[0] });
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { rowCount } = await query('DELETE FROM services WHERE id = $1', [Number(req.params.id)]);
    if (!rowCount) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Servicio no encontrado');
    res.json({ ok: true });
  }),
);

export default router;
