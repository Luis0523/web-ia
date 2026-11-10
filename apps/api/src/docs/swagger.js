const paths = {
  '/api/health': {
    get: { tags: ['Sistema'], summary: 'Estado del servicio', responses: { 200: { description: 'OK' } } },
  },
  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Inicia sesion y devuelve un JWT',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', example: 'admin@webia.test' },
                password: { type: 'string', example: 'Admin123!' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Token y usuario' },
        401: { description: 'Credenciales invalidas' },
      },
    },
  },
  '/api/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Usuario autenticado',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Usuario' }, 401: { description: 'No autenticado' } },
    },
  },
  '/api/users': {
    get: {
      tags: ['Usuarios'],
      summary: 'Lista usuarios (admin)',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Lista' } },
    },
    post: {
      tags: ['Usuarios'],
      summary: 'Crea usuario (admin)',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
                password: { type: 'string' },
                role: { type: 'string', enum: ['admin', 'user'] },
                token_limit: { type: 'integer' },
              },
            },
          },
        },
      },
      responses: { 201: { description: 'Creado' } },
    },
  },
  '/api/users/{id}': {
    put: {
      tags: ['Usuarios'],
      summary: 'Actualiza usuario (admin)',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: { 200: { description: 'Actualizado' } },
    },
    delete: {
      tags: ['Usuarios'],
      summary: 'Elimina usuario (admin)',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      responses: { 200: { description: 'Eliminado' } },
    },
  },
  '/api/services': {
    get: {
      tags: ['Servicios'],
      summary: 'Lista servicios de IA',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Lista' } },
    },
    post: {
      tags: ['Servicios'],
      summary: 'Crea servicio (admin)',
      security: [{ bearerAuth: [] }],
      responses: { 201: { description: 'Creado' } },
    },
  },
  '/api/services/{id}/status': {
    patch: {
      tags: ['Servicios'],
      summary: 'Activa o desactiva un servicio (admin)',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
      requestBody: {
        content: { 'application/json': { schema: { type: 'object', properties: { active: { type: 'boolean' } } } } },
      },
      responses: { 200: { description: 'Actualizado' } },
    },
  },
  '/api/destinos': {
    get: {
      tags: ['Datos'],
      summary: 'Lista destinos',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'query', name: 'search', schema: { type: 'string' } }],
      responses: { 200: { description: 'Lista' } },
    },
    post: {
      tags: ['Datos'],
      summary: 'Crea destino (admin)',
      security: [{ bearerAuth: [] }],
      responses: { 201: { description: 'Creado' } },
    },
  },
  '/api/actividades': {
    get: {
      tags: ['Datos'],
      summary: 'Lista actividades',
      security: [{ bearerAuth: [] }],
      parameters: [{ in: 'query', name: 'destinoId', schema: { type: 'integer' } }],
      responses: { 200: { description: 'Lista' } },
    },
  },
  '/api/documents': {
    get: {
      tags: ['RAG'],
      summary: 'Lista documentos del corpus (admin)',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Lista' } },
    },
    post: {
      tags: ['RAG'],
      summary: 'Crea documento e indexa embeddings (admin)',
      security: [{ bearerAuth: [] }],
      responses: { 201: { description: 'Creado' } },
    },
  },
  '/api/documents/reindex': {
    post: {
      tags: ['RAG'],
      summary: 'Reindexa todo el corpus (admin)',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Indexado' } },
    },
  },
  '/api/chat': {
    post: {
      tags: ['Chat'],
      summary: 'Chatbot con RAG y memoria',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['message'],
              properties: {
                message: { type: 'string' },
                conversationId: { type: 'integer', nullable: true },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Respuesta con fuentes y tokens' },
        429: { description: 'Limite de tokens alcanzado' },
      },
    },
  },
  '/api/chat/conversations': {
    get: {
      tags: ['Chat'],
      summary: 'Historial de conversaciones del usuario',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Lista' } },
    },
  },
  '/api/agents/itinerary': {
    post: {
      tags: ['Agentes'],
      summary: 'Agente planificador de itinerario',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', properties: { input: { type: 'string' } } },
          },
        },
      },
      responses: { 200: { description: 'Plan y pasos' }, 429: { description: 'Limite alcanzado' } },
    },
  },
  '/api/agents/adjust': {
    post: {
      tags: ['Agentes'],
      summary: 'Agente de ajuste de viaje',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', properties: { input: { type: 'string' } } },
          },
        },
      },
      responses: { 200: { description: 'Alternativas' }, 429: { description: 'Limite alcanzado' } },
    },
  },
  '/api/usage/me': {
    get: {
      tags: ['Consumo'],
      summary: 'Consumo y cuota del usuario',
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: 'Cuota y reporte' } },
    },
  },
  '/api/usage/admin/usage': {
    get: {
      tags: ['Consumo'],
      summary: 'Reporte general con filtros (admin)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'userId', schema: { type: 'integer' } },
        { in: 'query', name: 'from', schema: { type: 'string', format: 'date' } },
        { in: 'query', name: 'to', schema: { type: 'string', format: 'date' } },
        { in: 'query', name: 'service', schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Reporte' } },
    },
  },
  '/api/bi/usage': {
    get: {
      tags: ['BI'],
      summary: 'Reporte para Power BI (x-api-key)',
      security: [{ apiKeyAuth: [] }],
      parameters: [
        { in: 'query', name: 'from', schema: { type: 'string', format: 'date' } },
        { in: 'query', name: 'to', schema: { type: 'string', format: 'date' } },
        { in: 'query', name: 'service', schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Reporte agregado' }, 401: { description: 'API key invalida' } },
    },
  },
};

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Web IA - Plataforma de servicios de IA para turismo',
    version: '1.0.0',
    description: 'Chatbot con RAG, agentes multi-paso, historial y control de consumo de tokens.',
  },
  servers: [{ url: '/', description: 'Servidor actual' }],
  tags: [
    { name: 'Sistema' },
    { name: 'Auth' },
    { name: 'Usuarios' },
    { name: 'Servicios' },
    { name: 'Datos' },
    { name: 'RAG' },
    { name: 'Chat' },
    { name: 'Agentes' },
    { name: 'Consumo' },
    { name: 'BI' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      apiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
    },
  },
  paths,
};
