import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import request from 'supertest';

vi.mock('../src/db/pool.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));

import { query } from '../src/db/pool.js';
import { createApp } from '../src/app.js';
import { signToken } from '../src/middleware/auth.js';

const app = createApp();

let demoUser;
let adminUser;
let activeUser;

beforeAll(async () => {
  const hash = await bcrypt.hash('User123!', 10);
  demoUser = {
    id: 1,
    name: 'Demo',
    email: 'demo@webia.test',
    password_hash: hash,
    role: 'user',
    token_limit: 60000,
    active: true,
    created_at: new Date(),
  };
  adminUser = {
    ...demoUser,
    id: 9,
    name: 'Admin',
    email: 'admin@webia.test',
    role: 'admin',
    token_limit: 999999,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  activeUser = demoUser;
  query.mockImplementation(async (sql) => {
    if (sql.includes('FROM users WHERE email')) return { rows: [demoUser] };
    if (sql.includes('SELECT id, name, email, role, token_limit, active, created_at FROM users WHERE id')) {
      return { rows: activeUser ? [activeUser] : [] };
    }
    if (sql.includes('FROM users ORDER BY id')) return { rows: [demoUser, adminUser] };
    if (sql.includes('SELECT token_limit FROM users')) return { rows: [{ token_limit: 10 }] };
    if (sql.includes('SUM(tokens_total)')) return { rows: [{ used: 10 }] };
    if (sql.includes('FROM services')) {
      return {
        rows: [
          {
            id: 1,
            key: 'rag_chat',
            name: 'Chatbot',
            model: 'llama-3.3-70b-versatile',
            system_prompt: 'Asesor',
            active: true,
          },
        ],
      };
    }
    if (sql.includes('FROM api_keys')) return { rows: [] };
    return { rows: [] };
  });
});

describe('API REST', () => {
  it('expone el estado del servicio', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('inicia sesion con credenciales validas y rechaza invalidas', async () => {
    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@webia.test', password: 'User123!' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTypeOf('string');
    expect(ok.body.user.email).toBe('demo@webia.test');

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo@webia.test', password: 'incorrecta' });
    expect(bad.status).toBe(401);
  });

  it('restringe el CRUD de usuarios al administrador', async () => {
    const userToken = signToken(demoUser);
    const forbidden = await request(app).get('/api/users').set('Authorization', `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);

    activeUser = adminUser;
    const adminToken = signToken(adminUser);
    const allowed = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.users).toHaveLength(2);
  });

  it('exige autenticacion para los servicios de IA', async () => {
    const response = await request(app).post('/api/chat').send({ message: 'hola' });
    expect(response.status).toBe(401);
  });

  it('bloquea el chat cuando se alcanza el limite de tokens', async () => {
    const token = signToken(demoUser);
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Que destinos recomiendas?' });

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('TOKEN_LIMIT');
  });

  it('protege el endpoint de Power BI con API key', async () => {
    const noKey = await request(app).get('/api/bi/usage');
    expect(noKey.status).toBe(401);

    const wrongKey = await request(app).get('/api/bi/usage').set('x-api-key', 'incorrecta');
    expect(wrongKey.status).toBe(401);

    const ok = await request(app).get('/api/bi/usage').set('x-api-key', 'test-bi-key');
    expect(ok.status).toBe(200);
    expect(ok.body.totals).toBeDefined();
  });
});
