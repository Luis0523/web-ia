import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db/pool.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));
vi.mock('../src/services/llm.js', () => ({ chatCompletion: vi.fn() }));
vi.mock('../src/services/usage.js', () => ({
  assertQuota: vi.fn(),
  getQuota: vi.fn(),
  recordUsage: vi.fn(),
}));

import { query } from '../src/db/pool.js';
import { chatCompletion } from '../src/services/llm.js';
import { assertQuota, getQuota, recordUsage } from '../src/services/usage.js';
import { runAgent } from '../src/services/agents.js';

const user = { id: 2, name: 'Demo', role: 'user' };
const service = {
  id: 4,
  key: 'agent_itinerary',
  model: 'llama-3.3-70b-versatile',
  system_prompt: 'Planifica viajes',
};

describe('agente multi-paso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertQuota.mockResolvedValue({});
    getQuota.mockResolvedValue({ limit: 5000, used: 300, remaining: 4700 });
    query.mockImplementation(async (sql) => {
      if (sql.includes('FROM services')) return { rows: [service] };
      if (sql.includes('FROM destinos')) {
        return { rows: [{ id: 1, nombre: 'Cartagena', region: 'Bolivar', pais: 'Colombia', lat: 10, lon: -75 }] };
      }
      if (sql.includes('FROM actividades')) {
        return {
          rows: [
            { nombre: 'Tour amurallado', tipo: 'cultural', descripcion: 'Recorrido', costo: 120, duracion_hrs: 3 },
          ],
        };
      }
      return { rows: [] };
    });
  });

  it('ejecuta herramientas, guarda pasos y registra tokens', async () => {
    chatCompletion
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'get_actividades', arguments: JSON.stringify({ destino: 'Cartagena' }) },
          },
        ],
        usage: { prompt_tokens: 80, completion_tokens: 10, total_tokens: 90 },
      })
      .mockResolvedValueOnce({
        content: 'Itinerario final en Cartagena.',
        toolCalls: [],
        usage: { prompt_tokens: 120, completion_tokens: 40, total_tokens: 160 },
      });

    const result = await runAgent({
      user,
      agentKey: 'itinerary',
      input: 'Arma un itinerario en Cartagena',
    });

    expect(result.output).toBe('Itinerario final en Cartagena.');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].tool).toBe('get_actividades');
    expect(result.toolsUsed).toEqual(['get_actividades']);
    expect(result.tokens.used).toBe(250);

    const runInsert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO agent_runs'));
    expect(runInsert).toBeTruthy();
    expect(recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 2, serviceId: 4, kind: 'agent' }),
    );
  });

  it('rechaza agentes desconocidos', async () => {
    await expect(runAgent({ user, agentKey: 'inexistente', input: 'hola' })).rejects.toMatchObject({
      code: 'AGENT_NOT_FOUND',
    });
  });
});
