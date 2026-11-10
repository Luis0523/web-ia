import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { AppError, asyncHandler } from '../utils/http.js';

export const signToken = (user) =>
  jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );

export const authRequired = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Token no proporcionado');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Token invalido o expirado');
  }

  const { rows } = await query(
    'SELECT id, name, email, role, token_limit, active, created_at FROM users WHERE id = $1',
    [payload.sub],
  );
  const user = rows[0];
  if (!user || !user.active) {
    throw new AppError(401, 'USER_INACTIVE', 'El usuario no existe o esta desactivado');
  }
  req.user = user;
  next();
});

export const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return next(new AppError(403, 'FORBIDDEN', 'No tiene permisos para esta operacion'));
  }
  next();
};

export const requireApiKey = asyncHandler(async (req, res, next) => {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (!key) throw new AppError(401, 'API_KEY_REQUIRED', 'Se requiere la cabecera x-api-key');

  if (key === env.biApiKey) {
    req.apiConsumer = 'env';
    return next();
  }

  const hash = crypto.createHash('sha256').update(String(key)).digest('hex');
  const { rows } = await query(
    'SELECT id, name FROM api_keys WHERE key_hash = $1 AND active = TRUE',
    [hash],
  );
  if (!rows[0]) throw new AppError(401, 'INVALID_API_KEY', 'API key invalida o desactivada');

  req.apiConsumer = rows[0].name;
  next();
});
