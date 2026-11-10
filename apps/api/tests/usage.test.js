import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db/pool.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));

import { query } from '../src/db/pool.js';
import { assertQuota, getQuota, recordUsage, usageReport } from '../src/services/usage.js';

describe('servicio de consumo de tokens', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calcula la cuota disponible del usuario', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT token_limit FROM users')) return { rows: [{ token_limit: 1000 }] };
      if (sql.includes('user_service_limits')) return { rows: [] };
      if (sql.includes('SUM(tokens_total)')) return { rows: [{ used: 250 }] };
      return { rows: [] };
    });

    const quota = await getQuota(1);
    expect(quota.limit).toBe(1000);
    expect(quota.used).toBe(250);
    expect(quota.remaining).toBe(750);
  });

  it('bloquea cuando el consumo alcanza el limite', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT token_limit FROM users')) return { rows: [{ token_limit: 100 }] };
      if (sql.includes('SUM(tokens_total)')) return { rows: [{ used: 100 }] };
      return { rows: [] };
    });

    await expect(assertQuota(1)).rejects.toMatchObject({ code: 'TOKEN_LIMIT', status: 429 });
  });

  it('registra el consumo sumando tokens de entrada y salida', async () => {
    query.mockResolvedValue({ rows: [{ id: 1, tokens_total: 30 }] });

    const result = await recordUsage({
      userId: 1,
      serviceId: 2,
      endpoint: '/api/chat',
      kind: 'chat',
      tokensIn: 10,
      tokensOut: 20,
    });

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('INSERT INTO usage_logs');
    expect(params).toEqual([1, 2, '/api/chat', 'chat', 10, 20, 30, 'ok']);
    expect(result.tokens_total).toBe(30);
  });

  it('agrega el reporte por servicio para la API y Power BI', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('date_trunc')) {
        return {
          rows: [
            { day: '2026-11-01', service_key: 'rag_chat', service_name: 'Chatbot', calls: 2, tokens: 120 },
          ],
        };
      }
      if (sql.includes('JOIN users u')) {
        return { rows: [{ user_id: 1, user_name: 'Demo', user_email: 'demo@x.test', calls: 2, tokens: 120 }] };
      }
      if (sql.includes('GROUP BY 1, 2')) {
        return {
          rows: [{ service_key: 'rag_chat', service_name: 'Chatbot', calls: 2, tokens: 120 }],
        };
      }
      return { rows: [{ calls: 2, tokens: 120 }] };
    });

    const report = await usageReport({ from: '2026-11-01', to: '2026-11-30' });
    expect(report.totals).toEqual({ calls: 2, tokens: 120 });
    expect(report.byService[0]).toMatchObject({ serviceKey: 'rag_chat', tokens: 120 });
    expect(report.byUser[0].userName).toBe('Demo');
    expect(report.daily[0].day).toBe('2026-11-01');
  });
});
