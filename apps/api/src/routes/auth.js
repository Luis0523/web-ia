import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { authRequired, signToken } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/http.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  tokenLimit: user.token_limit,
  active: user.active,
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesion y devuelve un JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Token y usuario }
 *       401: { description: Credenciales invalidas }
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = rows[0];

    if (!user || !user.active) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciales invalidas');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciales invalidas');

    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Devuelve el usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Usuario }
 */
router.get('/me', authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/logout', authRequired, (req, res) => {
  res.json({ ok: true, message: 'Sesion finalizada en el cliente' });
});

export default router;
