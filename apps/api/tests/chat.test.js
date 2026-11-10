import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db/pool.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));
vi.mock('../src/services/rag.js', () => ({
  retrieve: vi.fn(),
  buildContext: vi.fn(() => 'contexto de prueba'),
}));
vi.mock('../src/services/llm.js', () => ({ chatCompletion: vi.fn() }));
vi.mock('../src/services/usage.js', () => ({
  assertQuota: vi.fn(),
  getQuota: vi.fn(),
  recordUsage: vi.fn(),
}));

import { query } from '../src/db/pool.js';
import { retrieve } from '../src/services/rag.js';
import { chatCompletion } from '../src/services/llm.js';
import { assertQuota, getQuota, recordUsage } from '../src/services/usage.js';
import { handleChat } from '../src/services/chat.js';

const user = { id: 1, name: 'Demo', role: 'user' };
const service = { id: 3, key: 'rag_chat', model: 'llama-3.3-70b-versatile', system_prompt: 'Asesor' };

describe('chatbot con RAG', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertQuota.mockResolvedValue({ limit: 1000, used: 0, remaining: 1000 });
    getQuota.mockResolvedValue({ limit: 1000, used: 50, remaining: 950 });
    query.mockImplementation(async (sql) => {
      if (sql.includes('INSERT INTO conversations')) return { rows: [{ id: 7 }] };
      if (sql.includes('SELECT id FROM conversations')) return { rows: [{ id: 5 }] };
      return { rows: [] };
    });
  });

  it('responde con contexto, guarda mensajes y registra consumo', async () => {
    retrieve.mockResolvedValue([
      { title: 'Guia de Cartagena', source: 'BD', category: 'destinos', content: 'Playas', score: 0.9 },
      { title: 'Politicas', source: 'BD', category: 'politicas', content: 'Presupuesto', score: 0.8 },
    ]);
    chatCompletion.mockResolvedValue({
      content: 'Te recomiendo Cartagena.',
      toolCalls: [],
      usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
    });

    const result = await handleChat({ user, service, message: 'Que ver en Cartagena?', conversationId: null });

    expect(result.answer).toBe('Te recomiendo Cartagena.');
    expect(result.sources).toHaveLength(2);
    expect(result.insufficient).toBe(false);
    expect(result.conversationId).toBe(7);
    expect(chatCompletion).toHaveBeenCalledOnce();

    const inserts = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO messages'));
    expect(inserts).toHaveLength(2);
    expect(recordUsage).toHaveBeenCalledOnce();
    expect(recordUsage.mock.calls[0][0]).toMatchObject({ userId: 1, serviceId: 3, kind: 'chat' });
  });

  it('indica que no hay informacion suficiente cuando no recupera contexto', async () => {
    retrieve.mockResolvedValue([]);

    const result = await handleChat({ user, service, message: 'Receta de pizza', conversationId: null });

    expect(result.insufficient).toBe(true);
    expect(result.answer).toContain('No cuento con informacion suficiente');
    expect(result.sources).toEqual([]);
    expect(chatCompletion).not.toHaveBeenCalled();
  });

  it('valida la pertenencia de la conversacion', async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(
      handleChat({ user, service, message: 'Hola', conversationId: 99 }),
    ).rejects.toMatchObject({ code: 'CONVERSATION_NOT_FOUND', status: 404 });
  });
});
