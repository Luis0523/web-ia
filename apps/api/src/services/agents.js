import { query } from '../db/pool.js';
import { AppError, estimateTokens } from '../utils/http.js';
import { findDestino } from './catalog.js';
import { getClima, getDistanciaKm, resolveCoords } from './external.js';
import { chatCompletion } from './llm.js';
import { assertQuota, getQuota, recordUsage } from './usage.js';

const toolDefinitions = {
  search_destinos: {
    type: 'function',
    function: {
      name: 'search_destinos',
      description: 'Busca destinos turisticos activos por texto, presupuesto maximo y clima.',
      parameters: {
        type: 'object',
        properties: {
          texto: { type: 'string', description: 'Intereses, actividad o palabra clave' },
          presupuesto_max: { type: 'number', description: 'Presupuesto maximo en USD por persona' },
          clima: { type: 'string', description: 'Clima deseado, por ejemplo calido, frio, templado' },
        },
      },
    },
  },
  get_actividades: {
    type: 'function',
    function: {
      name: 'get_actividades',
      description: 'Devuelve las actividades disponibles de un destino con sus costos y duracion.',
      parameters: {
        type: 'object',
        properties: { destino: { type: 'string', description: 'Nombre del destino' } },
        required: ['destino'],
      },
    },
  },
  get_clima: {
    type: 'function',
    function: {
      name: 'get_clima',
      description: 'Consulta el pronostico del clima de un destino usando una API externa.',
      parameters: {
        type: 'object',
        properties: {
          destino: { type: 'string', description: 'Nombre del destino' },
          lat: { type: 'number' },
          lon: { type: 'number' },
          dias: { type: 'number', description: 'Cantidad de dias de pronostico' },
        },
      },
    },
  },
  get_distancia: {
    type: 'function',
    function: {
      name: 'get_distancia',
      description: 'Calcula la distancia y duracion en auto entre dos destinos.',
      parameters: {
        type: 'object',
        properties: {
          origen: { type: 'string', description: 'Destino de origen' },
          destino: { type: 'string', description: 'Destino de llegada' },
        },
        required: ['origen', 'destino'],
      },
    },
  },
  buscar_alternativas: {
    type: 'function',
    function: {
      name: 'buscar_alternativas',
      description: 'Busca destinos alternativos segun presupuesto, clima y tipo de actividad.',
      parameters: {
        type: 'object',
        properties: {
          presupuesto_max: { type: 'number' },
          clima: { type: 'string' },
          tipo: { type: 'string', description: 'Tipo de actividad: playa, cultural, aventura, nieve, gastronomia' },
        },
      },
    },
  },
  recalcular_presupuesto: {
    type: 'function',
    function: {
      name: 'recalcular_presupuesto',
      description: 'Recalcula el costo total de un conjunto de actividades para N personas y dias.',
      parameters: {
        type: 'object',
        properties: {
          actividades: { type: 'array', items: { type: 'string' }, description: 'Nombres de actividades' },
          personas: { type: 'number' },
          dias: { type: 'number' },
          hospedaje_dia: { type: 'number', description: 'Costo de hospedaje por dia' },
        },
        required: ['actividades'],
      },
    },
  },
};

const agents = {
  itinerary: {
    serviceKey: 'agent_itinerary',
    tools: ['search_destinos', 'get_actividades', 'get_clima', 'get_distancia'],
  },
  adjust: {
    serviceKey: 'agent_adjust',
    tools: ['buscar_alternativas', 'get_clima', 'recalcular_presupuesto'],
  },
};

const execTool = async (name, args = {}) => {
  switch (name) {
    case 'search_destinos': {
      const { rows } = await query(
        `SELECT id, nombre, region, pais, precio_promedio::float AS precio_promedio, clima, descripcion
           FROM destinos
          WHERE activo = TRUE
            AND (nombre ILIKE $1 OR region ILIKE $1 OR descripcion ILIKE $1 OR clima ILIKE $1)
            AND ($2::numeric IS NULL OR precio_promedio <= $2::numeric)
            AND clima ILIKE $3
          ORDER BY precio_promedio ASC
          LIMIT 6`,
        [`%${args.texto || ''}%`, args.presupuesto_max ?? null, `%${args.clima || ''}%`],
      );
      return { destinos: rows };
    }

    case 'get_actividades': {
      const destino = await findDestino(args.destino);
      if (!destino) return { error: `No se encontro el destino ${args.destino}` };
      const { rows } = await query(
        `SELECT nombre, tipo, descripcion, costo::float AS costo, duracion_hrs::float AS duracion_hrs
           FROM actividades
          WHERE destino_id = $1 AND activo = TRUE
          ORDER BY costo ASC`,
        [destino.id],
      );
      return { destino: destino.nombre, actividades: rows };
    }

    case 'get_clima': {
      let lat = args.lat;
      let lon = args.lon;
      let destinoNombre = args.destino || null;
      if ((lat === undefined || lon === undefined) && args.destino) {
        const destino = await findDestino(args.destino);
        if (destino) {
          lat = destino.lat;
          lon = destino.lon;
          destinoNombre = destino.nombre;
        }
      }
      const clima = await getClima({ lat, lon, dias: args.dias || 5 });
      if (!clima) {
        return {
          destino: destinoNombre,
          error: 'No fue posible consultar el clima en este momento',
        };
      }
      return { destino: destinoNombre, ...clima };
    }

    case 'get_distancia': {
      const origen = await findDestino(args.origen);
      const destino = await findDestino(args.destino);
      if (!origen || !destino) return { error: 'No se encontraron ambos destinos' };
      const distancia = await getDistanciaKm(resolveCoords(origen), resolveCoords(destino));
      return { origen: origen.nombre, destino: destino.nombre, ...distancia };
    }

    case 'buscar_alternativas': {
      const { rows } = await query(
        `SELECT d.id, d.nombre, d.region, d.pais, d.precio_promedio::float AS precio_promedio,
                d.clima, d.descripcion
           FROM destinos d
          WHERE d.activo = TRUE
            AND ($1::numeric IS NULL OR d.precio_promedio <= $1::numeric)
            AND d.clima ILIKE $2
            AND ($3 = '%%' OR EXISTS (
                  SELECT 1 FROM actividades a
                   WHERE a.destino_id = d.id AND a.tipo ILIKE $3
                ))
          ORDER BY d.precio_promedio ASC
          LIMIT 6`,
        [args.presupuesto_max ?? null, `%${args.clima || ''}%`, `%${args.tipo || ''}%`],
      );
      return { alternativas: rows };
    }

    case 'recalcular_presupuesto': {
      const nombres = Array.isArray(args.actividades) ? args.actividades : [];
      if (nombres.length === 0) return { error: 'Debe indicar actividades' };
      const { rows } = await query(
        'SELECT nombre, costo::float AS costo FROM actividades WHERE nombre = ANY($1::text[])',
        [nombres],
      );
      const personas = Number(args.personas) || 1;
      const dias = Number(args.dias) || 1;
      const hospedajeDia = Number(args.hospedaje_dia) || 0;
      const actividadesTotal = rows.reduce((sum, row) => sum + Number(row.costo), 0) * personas;
      const hospedajeTotal = hospedajeDia * dias * personas;
      return {
        personas,
        dias,
        detalle: rows.map((row) => ({ nombre: row.nombre, costo: Number(row.costo) })),
        noEncontradas: nombres.filter((nombre) => !rows.some((row) => row.nombre === nombre)),
        actividadesTotal,
        hospedajeTotal,
        total: actividadesTotal + hospedajeTotal,
        moneda: 'USD',
      };
    }

    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
};

const parseArguments = (raw) => {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
};

export const runAgent = async ({ user, agentKey, input, conversationId = null }) => {
  const agent = agents[agentKey];
  if (!agent) throw new AppError(404, 'AGENT_NOT_FOUND', 'Agente no encontrado');

  const { rows } = await query('SELECT * FROM services WHERE key = $1 AND active = TRUE', [
    agent.serviceKey,
  ]);
  const service = rows[0];
  if (!service) {
    throw new AppError(404, 'SERVICE_UNAVAILABLE', 'El servicio no existe o esta desactivado');
  }

  await assertQuota(user.id, service.id);

  const tools = agent.tools.map((name) => toolDefinitions[name]);
  const messages = [
    { role: 'system', content: service.system_prompt },
    { role: 'user', content: input },
  ];

  const steps = [];
  let tokensIn = 0;
  let tokensOut = 0;
  let output = '';

  for (let iteration = 0; iteration < 5; iteration += 1) {
    const completion = await chatCompletion({
      messages,
      tools,
      model: service.model,
      toolChoice: 'auto',
    });

    tokensIn += completion.usage?.prompt_tokens || 0;
    tokensOut += completion.usage?.completion_tokens || 0;

    if (completion.toolCalls?.length) {
      messages.push({
        role: 'assistant',
        content: completion.content || '',
        tool_calls: completion.toolCalls,
      });

      for (const call of completion.toolCalls) {
        const toolName = call.function?.name;
        const args = parseArguments(call.function?.arguments);
        let result;
        try {
          result = await execTool(toolName, args);
        } catch (error) {
          result = { error: error.message };
        }
        steps.push({
          step: steps.length + 1,
          tool: toolName,
          arguments: args,
          result,
        });
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: toolName,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    output = completion.content || '';
    break;
  }

  if (!output) {
    messages.push({
      role: 'user',
      content: 'Con la informacion recopilada, entrega ahora la respuesta final en espanol.',
    });
    const finalCompletion = await chatCompletion({ messages, model: service.model });
    tokensIn += finalCompletion.usage?.prompt_tokens || 0;
    tokensOut += finalCompletion.usage?.completion_tokens || 0;
    output = finalCompletion.content || 'No fue posible completar la solicitud.';
  }

  const tokensTotal = tokensIn + tokensOut || estimateTokens(input + output);

  await query(
    `INSERT INTO agent_runs (user_id, service_id, conversation_id, input, steps, output, tokens)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
    [user.id, service.id, conversationId, input, JSON.stringify(steps), output, tokensTotal],
  );

  await recordUsage({
    userId: user.id,
    serviceId: service.id,
    endpoint: `/api/agents/${agentKey}`,
    kind: 'agent',
    tokensIn,
    tokensOut,
  });

  const quota = await getQuota(user.id, service.id);

  return {
    agent: agentKey,
    service: service.key,
    output,
    steps,
    toolsUsed: [...new Set(steps.map((step) => step.tool))],
    tokens: {
      used: tokensTotal,
      limit: quota.limit,
      totalUsed: quota.used,
      remaining: quota.remaining,
    },
  };
};
