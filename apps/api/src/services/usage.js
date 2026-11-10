import { query } from '../db/pool.js';
import { AppError } from '../utils/http.js';

export const firstOfMonth = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
};

const toDateOnly = (value) => (value ? new Date(value).toISOString().slice(0, 10) : null);

export const getQuota = async (userId, serviceId = null) => {
  const { rows: userRows } = await query(
    'SELECT token_limit FROM users WHERE id = $1',
    [userId],
  );
  if (!userRows[0]) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');

  let limit = userRows[0].token_limit;
  let usedParams = [userId, firstOfMonth().toISOString()];
  let usedSql =
    'SELECT COALESCE(SUM(tokens_total), 0)::int AS used FROM usage_logs WHERE user_id = $1 AND created_at >= $2';

  if (serviceId) {
    const { rows: overrideRows } = await query(
      'SELECT token_limit FROM user_service_limits WHERE user_id = $1 AND service_id = $2',
      [userId, serviceId],
    );
    if (overrideRows[0]) {
      limit = overrideRows[0].token_limit;
      usedSql += ' AND service_id = $3';
      usedParams = [userId, firstOfMonth().toISOString(), serviceId];
    }
  }

  const { rows } = await query(usedSql, usedParams);
  const used = Number(rows[0]?.used || 0);

  return {
    limit: Number(limit),
    used,
    remaining: Math.max(0, Number(limit) - used),
    periodStart: firstOfMonth().toISOString(),
  };
};

export const assertQuota = async (userId, serviceId = null) => {
  const quota = await getQuota(userId, serviceId);
  if (quota.used >= quota.limit) {
    throw new AppError(
      429,
      'TOKEN_LIMIT',
      `Limite de tokens alcanzado (${quota.used}/${quota.limit}). Contacte al administrador.`,
    );
  }
  return quota;
};

export const recordUsage = async ({
  userId,
  serviceId = null,
  endpoint = '',
  kind = 'chat',
  tokensIn = 0,
  tokensOut = 0,
  status = 'ok',
}) => {
  const tokensTotal = Number(tokensIn) + Number(tokensOut);
  const { rows } = await query(
    `INSERT INTO usage_logs (user_id, service_id, endpoint, kind, tokens_in, tokens_out, tokens_total, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, tokens_total`,
    [userId, serviceId, endpoint, kind, tokensIn, tokensOut, tokensTotal, status],
  );
  return rows[0];
};

const buildFilters = ({ userId, from, to, service }) => {
  const clauses = [];
  const params = [];

  if (userId) {
    params.push(userId);
    clauses.push(`l.user_id = $${params.length}`);
  }
  if (from) {
    params.push(toDateOnly(from));
    clauses.push(`l.created_at >= $${params.length}::date`);
  }
  if (to) {
    params.push(toDateOnly(to));
    clauses.push(`l.created_at < ($${params.length}::date + interval '1 day')`);
  }
  if (service) {
    params.push(service);
    clauses.push(`s.key = $${params.length}`);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
};

export const usageReport = async ({ userId = null, from = null, to = null, service = null } = {}) => {
  const { where, params } = buildFilters({ userId, from, to, service });
  const join = 'FROM usage_logs l LEFT JOIN services s ON s.id = l.service_id';

  const [totalsResult, byServiceResult, dailyResult, byUserResult] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS calls, COALESCE(SUM(l.tokens_total), 0)::int AS tokens ${join} ${where}`,
      params,
    ),
    query(
      `SELECT COALESCE(s.key, 'sin_servicio') AS service_key,
              COALESCE(s.name, 'Sin servicio') AS service_name,
              COUNT(*)::int AS calls,
              COALESCE(SUM(l.tokens_total), 0)::int AS tokens
         ${join} ${where}
        GROUP BY 1, 2
        ORDER BY tokens DESC`,
      params,
    ),
    query(
      `SELECT date_trunc('day', l.created_at)::date AS day,
              COALESCE(s.key, 'sin_servicio') AS service_key,
              COALESCE(s.name, 'Sin servicio') AS service_name,
              COUNT(*)::int AS calls,
              COALESCE(SUM(l.tokens_total), 0)::int AS tokens
         ${join} ${where}
        GROUP BY 1, 2, 3
        ORDER BY 1 ASC`,
      params,
    ),
    query(
      `SELECT u.id AS user_id, u.name AS user_name, u.email AS user_email,
              COUNT(*)::int AS calls,
              COALESCE(SUM(l.tokens_total), 0)::int AS tokens
         FROM usage_logs l
         LEFT JOIN services s ON s.id = l.service_id
         JOIN users u ON u.id = l.user_id
         ${where}
        GROUP BY u.id, u.name, u.email
        ORDER BY tokens DESC`,
      params,
    ),
  ]);

  return {
    range: {
      from: from ? toDateOnly(from) : null,
      to: to ? toDateOnly(to) : null,
      service,
      userId,
    },
    totals: {
      calls: Number(totalsResult.rows[0]?.calls || 0),
      tokens: Number(totalsResult.rows[0]?.tokens || 0),
    },
    byService: byServiceResult.rows.map((row) => ({
      serviceKey: row.service_key,
      serviceName: row.service_name,
      calls: Number(row.calls),
      tokens: Number(row.tokens),
    })),
    daily: dailyResult.rows.map((row) => ({
      day: row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day),
      serviceKey: row.service_key,
      serviceName: row.service_name,
      calls: Number(row.calls),
      tokens: Number(row.tokens),
    })),
    byUser: byUserResult.rows.map((row) => ({
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      calls: Number(row.calls),
      tokens: Number(row.tokens),
    })),
  };
};

export const userHistory = async (userId, { from = null, to = null } = {}) => {
  const params = [userId];
  const clauses = ['c.user_id = $1'];

  if (from) {
    params.push(toDateOnly(from));
    clauses.push(`c.created_at >= $${params.length}::date`);
  }
  if (to) {
    params.push(toDateOnly(to));
    clauses.push(`c.created_at < ($${params.length}::date + interval '1 day')`);
  }

  const { rows } = await query(
    `SELECT c.id, c.title, c.created_at, c.updated_at,
            s.key AS service_key, s.name AS service_name,
            (SELECT COUNT(*)::int FROM messages m WHERE m.conversation_id = c.id) AS messages
       FROM conversations c
       JOIN services s ON s.id = c.service_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY c.updated_at DESC
      LIMIT 100`,
    params,
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    service: { key: row.service_key, name: row.service_name },
    messages: row.messages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};
