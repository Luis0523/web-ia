# Web IA - Plataforma de servicios de IA para turismo

Aplicacion web con autenticacion, chatbot con RAG y dos agentes multi-paso para planificar viajes. Incluye historial de conversaciones, control de consumo de tokens, API REST documentada con Swagger, endpoint para Power BI, pruebas automatizadas y CI/CD.

## Aplicacion desplegada

| Recurso | URL |
| --- | --- |
| Web + API | https://web-ia-pom9.onrender.com |
| Swagger | https://web-ia-pom9.onrender.com/api-docs |
| Reporte BI | `GET https://web-ia-pom9.onrender.com/api/bi/usage` + header `x-api-key: demo-bi-key-123` |
| Repositorio | https://github.com/Luis0523/web-ia |

Cuentas demo: `admin@webia.test` / `Admin123!` y `demo@webia.test` / `User123!`.

Contexto completo para continuar el proyecto en otro equipo (Windows): [`docs/HANDOFF_WINDOWS.md`](docs/HANDOFF_WINDOWS.md). Guion para explicar y demostrar el RAG: [`docs/DEMO_RAG.md`](docs/DEMO_RAG.md).

> El plan gratuito de Render suspende la instancia por inactividad; la primera peticion puede tardar ~30 s.

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

## Despliegue en Render (ya realizado)

- Servicio web `web-ia` (`srv-dbp91uon74is73d8bvn0`), region Oregon, plan free. Construye React y lo sirve junto con la API en un solo dominio.
- PostgreSQL 16 + pgvector `web-ia-db` (`dpg-dbp90nutlv9c73esqj9g-a`), creado via API. La API usa la **URL interna**; el acceso externo quedo deshabilitado.
- Variables: `DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY`, `GROQ_MODEL`, `OPENAI_API_KEY`, `BI_API_KEY`, `RAG_*`, `EMBEDDING_*`.
- Build: `npm ci --include=dev && npm run build` · Start: `npm start` · Health: `/api/health`.
- La base se inicializo con `schema.sql`, `seed.sql` y la indexacion del corpus.

### Reindexar el corpus

Si agregas creditos de OpenAI, entra como administrador a **Documentos RAG → Reindexar todo**. La instancia ya tiene `OPENAI_API_KEY`; mientras no haya creditos el sistema usa BM25 y ese boton regenera los embeddings vectoriales.

### CI/CD (deploy solo si las pruebas pasan)

El auto-deploy de Render esta **desactivado** a proposito. El workflow `.github/workflows/ci-cd.yml` ejecuta lint, pruebas y build en cada push/PR a `main`; solo si todo pasa dispara el deploy. Configura en GitHub (Settings → Secrets and variables → Actions) una de estas opciones:

- `RENDER_API_KEY` + `RENDER_SERVICE_ID` = `srv-dbp91uon74is73d8bvn0`, o
- `RENDER_DEPLOY_HOOK` (Render → servicio → Settings → Deploy Hook).

Sin esos secrets el pipeline valida pero no despliega.

En este repositorio ya estan configurados `RENDER_API_KEY` y `RENDER_SERVICE_ID` como **Repository secrets**, por lo que cada push a `main` que pase las pruebas dispara un deploy en Render. El resultado del deploy se publica como *commit status* `render-deploy` (visible en la lista de commits) con el codigo HTTP devuelto por Render.

## Power BI

El endpoint `GET /api/bi/usage?from=YYYY-MM-DD&to=YYYY-MM-DD&service=rag_chat` devuelve el mismo reporte agregado que la web (totales, por servicio, diario y por usuario). Se autentica con la cabecera `x-api-key`.

Ejemplo en Power Query (M):

```m
let
  Url = "https://web-ia-pom9.onrender.com/api/bi/usage",
  Source = Json.Document(
    Web.Contents(Url, [
      Query = [from = "2026-11-01", to = "2026-11-30", service = "rag_chat"],
      Headers = [#"x-api-key" = "demo-bi-key-123"]
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

- **Groq no ofrece embeddings.** Se usa OpenAI para indexar y consultar el corpus. La cuenta de OpenAI entregada **no tiene creditos**, por lo que en produccion el RAG opera con busqueda lexica BM25 (mismo endpoint y fuentes). Al agregar creditos, reindexar desde el panel admin.
- El plan gratuito de PostgreSQL en Render **expira el 10 de diciembre de 2026**; para conservar la app mas alla, usar un plan pago o re-sembrar la base.
- El seed crea 8 destinos, 24 actividades, 10 documentos RAG y 3 servicios de IA.
