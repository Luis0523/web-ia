# Web IA - Plataforma de servicios de IA para turismo

Aplicacion web con autenticacion, chatbot con RAG y dos agentes multi-paso para planificar viajes. Incluye historial de conversaciones, control de consumo de tokens, API REST documentada con Swagger, endpoint para Power BI, pruebas automatizadas y CI/CD.

## Stack

| Capa | Tecnologia |
| --- | --- |
| Frontend | React + Vite + React Router |
| Backend / API | Node.js + Express (ESM) |
| Base de datos | PostgreSQL 16 + pgvector + pgcrypto |
| IA generativa | Groq (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`) |
| Embeddings | OpenAI `text-embedding-3-small` (fallback local BM25 si no hay key) |
| Fuentes externas | Open-Meteo (clima), OSRM (distancias) |
| Hosting | Render (API + frontend en el mismo servicio) + PostgreSQL de Render |
| CI/CD | GitHub Actions |

## Estructura

```
apps/api        Express, rutas, servicios de IA, Swagger, pruebas
apps/web        React (login, chat, agentes, historial, consumo, admin)
db/             schema.sql y seed.sql
docs/           coleccion Postman y arquitectura
.github/        workflow CI/CD
docker-compose.yml  PostgreSQL + pgvector local
render.yaml     Blueprint de Render (servicio + base de datos)
```

## Puesta en marcha local

Requisitos: Node 20+, Docker.

```bash
npm install
cp .env.example .env            # completar GROQ_API_KEY y OPENAI_API_KEY
docker compose up -d db         # PostgreSQL en localhost:5433 con pgvector
npm run db:setup                # crea esquema y datos demo
npm run index:docs              # genera embeddings del corpus RAG
npm run dev                     # API en http://localhost:3000
npm run dev:web                 # frontend en http://localhost:5173
```

`npm run db:setup` usa `psql` y la variable `DATABASE_URL`. Para el compose local:

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5433/webia
```

### Cuentas demo

| Rol | Email | Contrasena |
| --- | --- | --- |
| Administrador | `admin@webia.test` | `Admin123!` |
| Usuario | `demo@webia.test` | `User123!` |

## Servicios de IA

1. **Chatbot con RAG** (`POST /api/chat`)
   - Recupera chunks de `rag_chunks` (pgvector) o BM25 en modo local.
   - Cita las fuentes y responde "sin informacion suficiente" cuando el contexto no alcanza.
   - Memoria: ultimos 6 mensajes de la conversacion.
   - Cada mensaje queda en `messages` y cada ejecucion en `usage_logs`.

2. **Agente planificador de itinerario** (`POST /api/agents/itinerary`)
   - Herramientas: `search_destinos`, `get_actividades`, `get_clima` (Open-Meteo), `get_distancia` (OSRM).
   - Ejecuta varios pasos y guarda el detalle en `agent_runs.steps`.

3. **Agente de ajuste de viaje** (`POST /api/agents/adjust`)
   - Herramientas: `buscar_alternativas`, `get_clima`, `recalcular_presupuesto`.

## Control de tokens

- Cada usuario tiene `token_limit`; el administrador puede fijar limites por servicio en `user_service_limits`.
- Antes de ejecutar se calcula el consumo del mes con `SUM(usage_logs)`.
- Si el consumo alcanza el limite, la API responde `429 TOKEN_LIMIT` y no se llama al proveedor de IA.
- El consumo se registra automaticamente despues de cada ejecucion.

## Endpoints principales

| Metodo | Endpoint | Descripcion |
| --- | --- | --- |
| POST | `/api/auth/login` | Login y JWT |
| GET | `/api/auth/me` | Usuario autenticado |
| GET/POST/PUT/DELETE | `/api/users` | CRUD usuarios (admin) |
| GET/POST/PUT/PATCH/DELETE | `/api/services` | Servicios de IA y activacion (admin) |
| GET/POST/PUT/DELETE | `/api/destinos` | CRUD destinos |
| GET/POST/PUT/DELETE | `/api/actividades` | CRUD actividades |
| GET/POST/PUT/DELETE | `/api/documents` | CRUD documentos RAG (admin) |
| POST | `/api/documents/reindex` | Reindexar corpus (admin) |
| POST | `/api/chat` | Chatbot con RAG |
| GET | `/api/chat/conversations` | Historial de conversaciones |
| POST | `/api/agents/itinerary` | Agente planificador |
| POST | `/api/agents/adjust` | Agente de ajuste |
| GET | `/api/usage/me` | Cuota y consumo propio |
| GET | `/api/usage/admin/usage` | Reporte general con filtros |
| GET | `/api/bi/usage` | Reporte para Power BI (`x-api-key`) |

Documentacion interactiva: **`/api-docs`**. Especificacion JSON: **`/api-docs.json`**.

Coleccion Postman: `docs/postman_collection.json`.

## Pruebas

```bash
npm test        # Vitest + Supertest (17 pruebas)
npm run lint    # verificacion de sintaxis
npm run build   # build de React
```

Cubren: login y roles, bloqueo por limite de tokens, recuperacion RAG, registro de historial, calculo de consumo/agregacion, agentes con herramientas y proteccion del endpoint BI.

## Despliegue en Render

1. Crear un Blueprint con `render.yaml` (servicio web + PostgreSQL con pgvector).
2. Configurar en Render las variables: `GROQ_API_KEY`, `OPENAI_API_KEY`, `BI_API_KEY`. `JWT_SECRET` y `DATABASE_URL` se generan automaticamente.
3. Inicializar la base de datos remota desde local:

```bash
export DATABASE_URL="postgres://...render.com/webia?sslmode=require"
npm run db:setup
npm run index:docs
```

4. El servicio construye React y lo sirve junto con la API en un solo dominio.
5. Crear el secret `RENDER_DEPLOY_HOOK` en GitHub para el deploy automatico.

## CI/CD

`.github/workflows/ci-cd.yml` se ejecuta en cada push/PR a `main`: instala dependencias, valida sintaxis, ejecuta pruebas, construye el frontend y, solo si todo pasa en `main`, dispara el deploy hook de Render.

## Power BI

El endpoint `GET /api/bi/usage?from=YYYY-MM-DD&to=YYYY-MM-DD&service=rag_chat` devuelve el mismo reporte agregado que la web (totales, por servicio, diario y por usuario). Se autentica con la cabecera `x-api-key`.

Ejemplo en Power Query (M):

```m
let
  Url = "https://TU-SERVICIO.onrender.com/api/bi/usage",
  Source = Json.Document(
    Web.Contents(Url, [
      Query = [from = "2026-11-01", to = "2026-11-30", service = "rag_chat"],
      Headers = [#"x-api-key" = "TU_BI_API_KEY"]
    ])
  ),
  byService = Source[byService],
  Tabla = Table.FromList(byService, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
  Expandida = Table.ExpandRecordColumn(
    Tabla, "Column1", {"serviceKey", "serviceName", "calls", "tokens"}
  )
in
  Expandida
```

Usar `byService` para el grafico de tokens por servicio y `daily` para la serie por fecha. Comparar con el reporte web en **Administracion > Reporte general**.

## Notas tecnicas

- **Groq no ofrece embeddings.** Por eso se usa OpenAI para indexar y consultar el corpus. Si no hay `OPENAI_API_KEY`, el sistema usa busqueda lexica BM25 local para que la demo siga funcionando.
- El plan gratuito de PostgreSQL en Render **expira a los 30 dias**; para conservar la app mas alla, usar un plan pago o re-sembrar la base.
- El seed crea 8 destinos, 24 actividades, 10 documentos RAG y 3 servicios de IA.
