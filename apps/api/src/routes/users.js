import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { authRequired, requireRole } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/http.js';

const router = Router();
router.use(authRequired, requireRole('admin'));

const baseSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  role: z.enum(['admin', 'user']).default('user'),
  token_limit: z.number().int().min(0).default(50000),
  active: z.boolean().default(true),
});

const createSchema = baseSchema.extend({ password: z.string().min(6).max(100) });
const updateSchema = baseSchema.partial().extend({ password: z.string().min(6).max(100).optional() });

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  tokenLimit: user.token_limit,
  active: user.active,
  createdAt: user.created_at,
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      'SELECT id, name, email, role, token_limit, active, created_at FROM users ORDER BY id',
    );
    res.json({ users: rows.map(publicUser) });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const hash = await bcrypt.hash(data.password, 10);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role, token_limit, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, token_limit, active, created_at`,
      [data.name, data.email.toLowerCase(), hash, data.role, data.token_limit, data.active],
    );
    res.status(201).json({ user: publicUser(rows[0]) });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const id = Number(req.params.id);

    const { rows: current } = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (!current[0]) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');

    const next = {
      name: data.name ?? current[0].name,
      email: (data.email ?? current[0].email).toLowerCase(),
      role: data.role ?? current[0].role,
      token_limit: data.token_limit ?? current[0].token_limit,
      active: data.active ?? current[0].active,
      password_hash: data.password ? await bcrypt.hash(data.password, 10) : current[0].password_hash,
    };

    const { rows } = await query(
      `UPDATE users
          SET name = $1, email = $2, role = $3, token_limit = $4, active = $5, password_hash = $6
        WHERE id = $7
        RETURNING id, name, email, role, token_limit, active, created_at`,
      [next.name, next.email, next.role, next.token_limit, next.active, next.password_hash, id],
    );

    res.json({ user: publicUser(rows[0]) });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.user.id) {
      throw new AppError(400, 'CANNOT_DELETE_SELF', 'No puede eliminar su propio usuario');
    }
    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
    if (!rowCount) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
    res.json({ ok: true });
  }),
);

router.get(
  '/:id/limits',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT l.service_id, s.key AS service_key, s.name AS service_name, l.token_limit
         FROM user_service_limits l
         JOIN services s ON s.id = l.service_id
        WHERE l.user_id = $1`,
      [Number(req.params.id)],
    );
    res.json({ limits: rows });
  }),
);

router.put(
  '/:id/limits/:serviceId',
  asyncHandler(async (req, res) => {
    const tokenLimit = z.number().int().min(0).parse(req.body.token_limit);
    const userId = Number(req.params.id);
    const serviceId = Number(req.params.serviceId);

    const { rows } = await query(
      `INSERT INTO user_service_limits (user_id, service_id, token_limit)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, service_id)
       DO UPDATE SET token_limit = EXCLUDED.token_limit
       RETURNING user_id, service_id, token_limit`,
      [userId, serviceId, tokenLimit],
    );
    res.json({ limit: rows[0] });
  }),
);

router.delete(
  '/:id/limits/:serviceId',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM user_service_limits WHERE user_id = $1 AND service_id = $2', [
      Number(req.params.id),
      Number(req.params.serviceId),
    ]);
    res.json({ ok: true });
  }),
);

export default router;
