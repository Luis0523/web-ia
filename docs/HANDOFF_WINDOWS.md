# Handoff — Web IA Turismo (continuar en Windows)

Documento de contexto para el asistente de IA y para el estudiante al cambiar de equipo (Linux → Windows).
Última actualización: 10 de noviembre de 2026.

---

## 0. Resumen para el asistente de IA

Este repositorio es el **proyecto final** de una aplicación web con servicios de IA. Ya está **desplegado y funcionando** en Render. El trabajo pendiente es de **documentación/entrega** (Power BI, PDF, capturas), no de desarrollo principal.

- Dominio: **turismo** (destinos, actividades, clima, presupuesto).
- Stack: **React + Vite** (frontend) · **Node.js + Express ESM** (API) · **PostgreSQL 16 + pgvector** · **Groq** (`openai/gpt-oss-120b`) para generación · **OpenAI** `text-embedding-3-small` para embeddings · **Open-Meteo** y **OSRM** como fuentes externas.
- Deploy: un solo web service en **Render** sirve API + build de React. PostgreSQL gestionado en Render.
- CI/CD: **GitHub Actions** ejecuta lint + 17 pruebas + build; solo si pasa, despliega vía Render API.
- Estado: **verde**. Ver sección 1.

Al continuar, **no reescribas la arquitectura**: valida lo desplegado, ayuda con Power BI/PDF y usa las instrucciones de este documento.

---

## 1. Estado actual (verificado)

| Recurso | Valor |
| --- | --- |
| App + API | https://web-ia-pom9.onrender.com |
| Swagger | https://web-ia-pom9.onrender.com/api-docs |
| Especificación JSON | https://web-ia-pom9.onrender.com/api-docs.json |
| Repo | https://github.com/Luis0523/web-ia |
| Web service Render | `srv-dbp91uon74is73d8bvn0` (Oregon, plan free) |
| PostgreSQL Render | `dpg-dbp90nutlv9c73esqj9g-a` (expira 2026-12-10) |
| Power BI endpoint | `GET /api/bi/usage` con header `x-api-key: demo-bi-key-123` |

Verificado en producción:

- Health, Swagger, SPA y login contra PostgreSQL remoto.
- Chat RAG con Groq real y fuentes citadas.
- Chat **on-topic** responde (ej. “mejor temporada para Cusco” → cita `Guia general de Cusco`).
- Chat **off-topic** responde “sin información suficiente” y no inventa fuentes.
- Dos agentes multi-paso con herramientas reales (itinerario y ajuste).
- Reporte admin y endpoint Power BI devuelven los mismos totales.
- CI/CD: run verde, commit status `render-deploy` con `HTTP 201`, deploy en Render `live`.

---

## 2. Estructura del repositorio

```
apps/api        Express, rutas, servicios de IA, Swagger, pruebas (Vitest + Supertest)
apps/web        React + Vite
db/             schema.sql y seed.sql
docs/           arquitectura, colección Postman y este handoff
.github/        workflow CI/CD
docker-compose.yml   PostgreSQL 16 + pgvector local (puerto 5433)
render.yaml     Blueprint de referencia (el servicio actual se creó por API)
```

---

## 3. Cuentas demo

| Rol | Email | Contraseña |
| --- | --- | --- |
| Administrador | `admin@webia.test` | `Admin123!` |
| Usuario | `demo@webia.test` | `User123!` |

Estas cuentas y la API key de BI (`demo-bi-key-123`) son de demostración y están en el seed/README.

---

## 4. Secretos: dónde están (NO están en el repo)

Por seguridad, los valores reales **no** están en el repositorio:

- **Render → servicio `web-ia` → Environment**: `DATABASE_URL` (interna), `JWT_SECRET`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `BI_API_KEY`, `GROQ_MODEL`, embeddings, `RAG_*`.
- **GitHub → Settings → Secrets and variables → Actions → Repository secrets**: `RENDER_API_KEY`, `RENDER_SERVICE_ID`.
- **Local**: archivo `.env` en la raíz, **ignorado por git** (`.gitignore`). No se clona; hay que recrearlo.

> ⚠️ Las llaves de Groq, OpenAI y Render se compartieron por chat durante el desarrollo. **Rótalas** cuando termine la entrega. Si se pierde la Render API key (solo se muestra una vez), crea una nueva en Render y actualiza el secret `RENDER_API_KEY` en GitHub.

Nunca hagas commit de `.env`, llaves ni contraseñas.

---

## 5. Clonar en Windows

Instala:

1. **Git for Windows** (incluye Git Bash).
2. **Node.js 22 LTS** (Render y CI usan 22). Verifica `node -v` y `npm -v`.
3. **Docker Desktop** (solo si vas a correr la base de datos localmente).
4. Opcional: **psql** (cliente PostgreSQL) o usa `docker compose exec`.
5. Opcional: VS Code.

Luego:

```powershell
git clone git@github.com:Luis0523/web-ia.git
cd web-ia
npm install
```

> El repo es público. Si no tienes SSH configurado en Windows, usa HTTPS:
> `git clone https://github.com/Luis0523/web-ia.git`.

---

## 6. Crear `.env` en Windows

Crea `.env` en la raíz (PowerShell):

```powershell
Copy-Item .env.example .env
notepad .env
```

Contenido base para **desarrollo local con Docker**:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5433/webia
JWT_SECRET=cambia-este-secreto-local
JWT_EXPIRES_IN=8h
GROQ_API_KEY=<pegar desde Render>
GROQ_MODEL=openai/gpt-oss-120b
GROQ_FAST_MODEL=openai/gpt-oss-20b
OPENAI_API_KEY=<pegar desde Render>
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIM=1536
BI_API_KEY=demo-bi-key-123
PORT=3000
NODE_ENV=development
RAG_MIN_SCORE=0.45
RAG_TOP_K=5
```

Los valores de `GROQ_API_KEY` y `OPENAI_API_KEY` se copian desde **Render → web-ia → Environment**.

Si quieres usar la base **remota** en vez de Docker, necesitas reabrir el acceso externo en Render (hoy está cerrado) y usar la URL externa con `?sslmode=require`. Para la demo local es más simple Docker.

---

## 7. Ejecutar en local (Docker)

```powershell
docker compose up -d db
```

> `docker-compose.yml` mapea el puerto **5433** (no 5432) para evitar conflictos.
> La primera vez, el contenedor ejecuta `db/schema.sql` y `db/seed.sql` automáticamente.

Si necesitas recrear la base desde cero:

```powershell
docker compose down -v
docker compose up -d db
```

Cargar esquema/seed manualmente si no tienes `psql`:

```powershell
Get-Content db/schema.sql | docker compose exec -T db psql -U postgres -d webia
Get-Content db/seed.sql   | docker compose exec -T db psql -U postgres -d webia
```

Indexar el corpus RAG (requiere `OPENAI_API_KEY`):

```powershell
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5433/webia"
npm run index:docs
```

Levantar API y frontend (dos terminales):

```powershell
npm run dev        # API en http://localhost:3000
npm run dev:web    # React en http://localhost:5173
```

La API también sirve el build estático si existe `apps/web/dist` (`npm run build`).

---

## 8. Verificar el sistema ya desplegado (sin montar nada local)

Abre la URL de producción y prueba el login. También puedes usar PowerShell:

```powershell
$base = "https://web-ia-pom9.onrender.com"

# Login
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"demo@webia.test","password":"User123!"}'
$token = $login.token

# Chat RAG
Invoke-RestMethod -Method Post -Uri "$base/api/chat" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{"message":"Cual es la mejor temporada para visitar Cusco?"}'

# Reporte BI
Invoke-RestMethod -Uri "$base/api/bi/usage" -Headers @{ "x-api-key" = "demo-bi-key-123" }
```

Considera el *cold start* del plan free: la primera petición puede tardar ~30 s.

---

## 9. Arquitectura y decisiones clave

- **Un solo deploy**: Express sirve la API y el build de React (sin CORS, un dominio).
- **PostgreSQL + pgvector**: tablas operativas, corpus RAG (`rag_documents`/`rag_chunks`), historial y consumo.
- **RAG**: embedding de la pregunta → búsqueda vectorial top-k en pgvector → si ningún chunk supera `RAG_MIN_SCORE` (0.45) o falla el proveedor, se usa **BM25 léxico** como respaldo. Si tampoco hay coincidencias → “sin información suficiente”.
- **Memoria conversacional**: últimos 6 mensajes de la conversación.
- **Agentes**: *function calling* de Groq. Herramientas:
  - Itinerario: `search_destinos`, `get_actividades`, `get_clima` (Open-Meteo), `get_distancia` (OSRM).
  - Ajuste: `buscar_alternativas`, `get_clima`, `recalcular_presupuesto`.
  - Cada ejecución guarda pasos en `agent_runs.steps`.
- **Control de tokens**: antes de ejecutar se suma `usage_logs` del mes; si alcanza el límite del usuario → `429 TOKEN_LIMIT`. Después se registra el consumo.
- **Modelos Groq**: la cuenta **no tiene** los modelos `llama-*`; se usan `openai/gpt-oss-120b` (principal) y `openai/gpt-oss-20b`. No cambies a llama sin verificar disponibilidad.
- **Groq no ofrece embeddings**: se usa OpenAI. Si no hay créditos/key, el sistema cae a BM25.

Detalle ampliado: `docs/arquitectura.md`.

---

## 10. Pruebas y CI/CD

```powershell
npm test        # Vitest + Supertest (17 pruebas)
npm run lint    # verificación de sintaxis
npm run build   # build de React
```

El workflow `.github/workflows/ci-cd.yml`:

1. `npm ci` (con `--include=dev` en Render build para instalar Vite).
2. `npm run lint`, `npm test`, `npm run build`.
3. Job `deploy` (solo push a `main`): llama a `POST https://api.render.com/v1/services/<id>/deploys` con `RENDER_API_KEY`.
4. Publica el resultado como **commit status** `render-deploy` (HTTP devuelto por Render).

El **auto-deploy de Render está desactivado** a propósito: así se cumple “desplegar solo si las pruebas pasan”. Para desplegar: `git push origin main` y esperar el run verde.

Si el deploy falla con `401`, revisa que `RENDER_API_KEY` tenga exactamente 32 caracteres (el status muestra `keylen`).

---

## 11. Base de datos

Tablas principales: `users`, `services`, `user_service_limits`, `destinos`, `actividades`, `rag_documents`, `rag_chunks`, `conversations`, `messages`, `agent_runs`, `usage_logs`, `api_keys`. Vista `v_usage_daily`.

- Seed: 2 usuarios, 3 servicios de IA, 8 destinos, 24 actividades, 10 documentos RAG, 1 API key de BI.
- La PostgreSQL free de Render **expira el 10/12/2026**. Si necesitas conservarla, pasa a plan pago o re-siembra.
- El acceso externo a la DB está **cerrado**; la API usa la URL interna.
- Reindexar tras agregar documentos o cambiar de proveedor de embeddings: panel admin **Documentos RAG → Reindexar todo**, o `POST /api/documents/reindex` con JWT de admin.

---

## 12. Pendientes para la entrega

1. **Power BI**: crear el `.pbix` con el endpoint `/api/bi/usage`, filtros por fecha y servicio, y dos visuales (consultas y tokens por servicio). Comparar con **Administración → Reporte general**.
2. **PDF**: propuesta, arquitectura (`docs/arquitectura.md`), modelo de datos y capturas de pantalla.
3. **Demo funcional**: app web, consumo de API desde Postman (`docs/postman_collection.json`) y reporte Power BI.
4. **Rotar llaves** expuestas durante el desarrollo (Groq, OpenAI, Render).
5. Opcional: capturas de Swagger y de los runs de CI/CD verdes.

---

## 13. Problemas conocidos y soluciones

| Síntoma | Causa / solución |
| --- | --- |
| `401 Unauthorized` en deploy CI | `RENDER_API_KEY` mal copiada (longitud ≠ 32). Actualizar el repository secret. |
| `No cuento con información suficiente` para algo que sí existe | Umbral de embeddings. Con OpenAI se dejó `RAG_MIN_SCORE=0.45` + fallback BM25. Si cambias de proveedor, **reindexa**. |
| OpenAI `429 insufficient_quota` | La cuenta no tiene créditos. Mientras tanto opera BM25. Al recargar, reindexar. |
| `vite: not found` en Render | `npm ci` omitió devDependencies por `NODE_ENV=production`; el build usa `npm ci --include=dev`. |
| `SSL connection has been closed` al conectar a Render desde local | Acceso externo cerrado o falta `sslmode=require`. Reabrir en Render si se necesita. |
| Puerto 5432 ocupado | El compose local usa **5433**. |
| `psql` no reconocido en Windows | Instala el cliente o usa `docker compose exec -T db psql ...`. |
| `docker compose` falla por volúmenes viejos | `docker compose down -v` y volver a levantar. |
| La app tarda en responder | Cold start del plan free de Render. |
| Modelo Groq no existe | Usar `openai/gpt-oss-120b`/`gpt-oss-20b`; la cuenta no tiene `llama-*`. |

---

## 14. Instrucciones iniciales del proyecto (enunciado)

**Proyecto final — Aplicación web con servicios de Inteligencia Artificial**

Desarrollar una aplicación web que permita iniciar sesión y utilizar al menos tres servicios de IA. El estudiante elige el tema, objetivo, usuarios y funcionalidades.

- **Servicio principal**: chatbot con RAG que responde con información recuperada de un Data Warehouse o base de datos.
- **Servicios adicionales**: al menos dos servicios que consulten fuentes externas y combinen información en varios pasos (agentes).
- **Tecnologías libres**: frontend (React/Vue/Angular…), backend (Django/FastAPI/Express/NestJS…), datos (Snowflake/BigQuery/PostgreSQL/MySQL…), IA (Groq/OpenAI/Google/Anthropic…).

**Componentes requeridos**

1. **Propuesta y arquitectura**: objetivo, usuarios, fuentes, servicios; diagrama de componentes, tecnologías, hosting y comunicaciones; recorrido de una solicitud desde la GUI y desde un consumidor externo (Power BI).
2. **Aplicación web y administración**: login/logout con roles admin y usuario; CRUD de usuarios, configuración de servicios de IA y entidades propias; el admin gestiona datos de los servicios, activa/desactiva servicios y asigna límites de tokens por usuario; interfaz con menú de servicios, historial y consumo; chatbot para escribir preguntas y ver respuestas.
3. **Servicios de IA**: RAG con información de la BD/DW; identificar fuentes e indicar cuando no hay información suficiente; memoria conversacional; al menos dos servicios adicionales multi-paso (agentes) con resultados visibles en la web.
4. **Historial y control de consumo**: registrar cada conversación; usuario consulta su historial y consumo; admin consulta uso general con filtros por usuario, fecha y servicio; reporte web de consultas y consumo acumulado; verificar tokens antes de ejecutar y bloquear al alcanzar el límite.
5. **API REST**: exponer servicios de IA, historial y consumo; autenticación, permisos y límites; documentación Swagger; demostración con Postman.
6. **Power BI**: reporte que consuma la API y replique el reporte web con filtros por fecha y servicio; verificar coincidencia.
7. **Pruebas y despliegue**: pruebas automatizadas de servicios principales, historial y cálculo de consumo; desplegar app y API; CI/CD que ejecute pruebas al actualizar la rama principal y despliegue solo si pasan.

**Entregables**: repositorio Git con código, pruebas y CI/CD; script de creación de BD y datos; PDF con propuesta, arquitectura, modelo de datos y capturas; documentación Swagger y enlaces publicados; archivo de Power BI conectado a la API; demostración funcional.

**Fecha de entrega**: 10 de noviembre. **Valor**: 30 pts.

---

## 15. Checklist rápido en Windows

- [ ] Repo clonado y `npm install` sin errores.
- [ ] `.env` creado (no versionado) con las keys copiadas de Render.
- [ ] `node -v` = 22.x (o ≥ 20).
- [ ] Opcional: `docker compose up -d db` y API en `http://localhost:3000/api/health`.
- [ ] `npm test` → 17 pruebas en verde.
- [ ] Producción responde: health, login, chat on-topic/off-topic, BI.
- [ ] Power BI conectado a `/api/bi/usage` con `x-api-key`.
- [ ] PDF y capturas listos.
- [ ] Llaves rotadas antes/después de la entrega.
