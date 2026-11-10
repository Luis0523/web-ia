import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db/pool.js', () => ({ query: vi.fn(), pool: { end: vi.fn() } }));

import { query } from '../src/db/pool.js';
import { chunkText, retrieve } from '../src/services/rag.js';

describe('RAG', () => {
  beforeEach(() => vi.clearAllMocks());

  it('divide documentos largos en chunks con solapamiento', () => {
    const text = Array.from({ length: 40 }, (_, index) => `Frase numero ${index} sobre turismo.`).join(' ');
    const chunks = chunkText(text, 300, 50);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 320)).toBe(true);
  });

  it('recupera los documentos relevantes y descarta consultas sin coincidencia', async () => {
    query.mockResolvedValue({
      rows: [
        {
          id: 1,
          content: 'Cartagena tiene actividades culturales y playas. Actividades recomendadas en Cartagena.',
          chunk_index: 0,
          document_id: 1,
          title: 'Guia de Cartagena',
          source: 'BD interna',
          category: 'destinos',
        },
        {
          id: 2,
          content: 'Cusco requiere aclimatacion por la altura y el frio.',
          chunk_index: 0,
          document_id: 2,
          title: 'Guia de Cusco',
          source: 'BD interna',
          category: 'destinos',
        },
      ],
    });

    const results = await retrieve('actividades en Cartagena');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe('Guia de Cartagena');
    expect(results[0].score).toBeGreaterThanOrEqual(0.68);

    const empty = await retrieve('receta de pizza');
    expect(empty).toEqual([]);
  });
});
