# Cómo explicar y demostrar el chatbot con RAG

Guía para la exposición y para que el docente pueda comprobar que el chatbot **no responde de memoria**: responde con datos recuperados de la base de datos.

---

## 1. Qué es RAG (explicación de 30 segundos)

**RAG = Retrieval-Augmented Generation** (Generación Aumentada por Recuperación).

Un chatbot normal responde con lo que el modelo “recuerda” de su entrenamiento. Nuestro chatbot hace esto antes de responder:

1. Convierte la pregunta en un **embedding** (un vector numérico).
2. Busca en PostgreSQL los fragmentos más parecidos con **pgvector** (similitud coseno).
3. Toma los mejores fragmentos (top-k) como **contexto**.
4. Envía a Groq: *“responde solo con este contexto”*.
5. Devuelve la respuesta **citando las fuentes** y sus puntajes.
6. Si ningún fragmento supera el umbral, responde: **“No cuento con información suficiente”**.

No es *fine-tuning*: el modelo no se reentrena; la base de datos se consulta **en cada pregunta**. Por eso, si cambias un dato en la base, la respuesta cambia.

Flujo real del proyecto: `POST /api/chat` → `apps/api/src/services/rag.js` (`retrieve`) → `rag_chunks` (pgvector) → `apps/api/src/services/chat.js` (arma el prompt) → Groq → respuesta + `sources` + `usage_logs`.

---

## 2. Qué evidencia se ve en la app

En cada respuesta del chatbot:

- **Pills de fuentes** con el puntaje: `Guia general de Cusco y Machu Picchu · similitud 0.673`.
- **“Ver contexto recuperado (N fragmentos)”**: muestra el texto exacto de la BD que se envió al modelo y de qué documento salió.
- **Tokens usados / restantes**.
- En **Administración → Documentos RAG**: los documentos y cuántos *chunks* tiene cada uno.
- En **Swagger/Postman**: el JSON de respuesta incluye `sources[]` con `title`, `source`, `score`, `snippet`, además de `tokens`.

Eso es la prueba visible: la respuesta está atada a fragmentos concretos de la base.

---

## 3. Guion de demostración (10 minutos)

### Paso 0 — Login
`demo@webia.test` / `User123!` (o admin).

### Paso 1 — Pregunta on-topic
Pregunta:

> ¿Cuál es la mejor temporada para visitar Cusco?

Debe responder con la temporada seca (mayo–septiembre) y citar:

- `Guia general de Cusco y Machu Picchu` (similitud ≈ 0.67)
- `Clima y mejores temporadas` (≈ 0.54)

Abre **“Ver contexto recuperado”** y muestra el fragmento textual de la guía. Explica: *“esto es lo que se envió al modelo como contexto”*.

### Paso 2 — Dato que solo existe en la base
Pregunta:

> ¿Cuál es el presupuesto promedio para 4 días en Cartagena?

Debe responder **≈ 1 800 USD** citando `Guia general de Cartagena`. Ese dato está escrito en `rag_documents`, no lo inventa el modelo.

### Paso 3 — Pregunta fuera del dominio
Pregunta:

> Dame una receta de pizza margarita

Debe responder **“No cuento con información suficiente…”**, con **0 fuentes**. Esto demuestra que está “anclado” a la base y no es un chatbot genérico.

### Paso 4 — Prueba de fuego (la más convincente)
Entra como **admin** → **Documentos RAG** → crea un documento:

- **Título:** `Politica de prueba RAG`
- **Categoría:** `pruebas`
- **Contenido:** `Politica interna de prueba: el tour nocturno de Cartagena cuesta 77 USD por persona e incluye cena y transporte. Este dato solo existe en la base de datos de la aplicacion.`

Al guardar, el sistema lo divide en chunks y genera embeddings automáticamente.

Ahora, como usuario, pregunta:

> ¿Cuánto cuesta el tour nocturno de Cartagena?

Debe responder **77 USD** citando `Politica de prueba RAG`. Ese dato **no existe** en el modelo ni en Internet: lo acabas de escribir en la base. Esa es la prueba de que hay recuperación real.

Al terminar, elimina el documento de prueba (o desactívalo) desde el panel admin.

### Paso 5 — El corpus y la indexación
En **Administración → Documentos RAG** muestra:

- 10 documentos base (guías, clima, políticas, recomendaciones).
- Chunks por documento.
- Botón **Reindexar todo** (regenera embeddings).

Explica: *“los documentos se trocean y se indexan como vectores; eso es el Data Warehouse que alimenta el RAG”*.

### Paso 6 — API y consumo
En Swagger (`/api-docs`) o Postman:

1. `POST /api/auth/login` → guarda el token.
2. `POST /api/chat` con `{ "message": "¿Cuál es la mejor temporada para visitar Cusco?" }` → muestra el JSON con `sources`, `score`, `snippet` y `tokens`.
3. `GET /api/usage/me` → consumo y cuota.
4. `GET /api/bi/usage` con `x-api-key: demo-bi-key-123` → reporte para Power BI.

### Paso 7 (opcional) — Desactivar una fuente
Edita un documento y desmarca **Activo** (o elimínalo), pregunta de nuevo y muestra que ya no lo cita. Al reactivarlo, vuelve a aparecer. Esto prueba que la base controla la respuesta.

---

## 4. Preguntas sugeridas y qué esperar

| Pregunta | Fuente esperada | Qué demuestra |
| --- | --- | --- |
| ¿Cuál es la mejor temporada para visitar Cusco? | Guia de Cusco / Clima | Recuperación + cita |
| ¿Cuál es el presupuesto para 4 días en Cartagena? | Guia de Cartagena | Dato exacto de la BD |
| ¿Qué destinos recomiendas para viajar con niños? | Recomendaciones / Políticas | Búsqueda semántica |
| ¿Qué hacer en Bariloche en invierno? | Guia de Bariloche | Fuente específica |
| Dame una receta de pizza | *(ninguna)* | “Sin información suficiente” |
| ¿Cuánto cuesta el tour nocturno de Cartagena? (tras crear el doc de prueba) | Politica de prueba RAG | Prueba de fuego: lee la BD en vivo |

---

## 5. Qué decirle al inge (resumen oral)

> “El chatbot no responde con conocimiento general. Cada pregunta se convierte en un vector, se buscan los fragmentos más similares en PostgreSQL con pgvector, y esos fragmentos se inyectan en el prompt. El modelo tiene instrucciones de responder solo con ese contexto y citar la fuente. Si la similitud no alcanza un umbral, responde que no hay información suficiente. Todo el consumo de tokens y el historial quedan registrados en la base. Por eso, si cambio un documento en el panel admin, la respuesta cambia: la prueba es que puedo crear un dato inventado y el chatbot lo responde citándolo.”

---

## 6. Dónde está el código (si piden verlo)

| Archivo | Qué muestra |
| --- | --- |
| `apps/api/src/services/rag.js` | Chunking, `retrieve` (pgvector + fallback BM25), `indexDocument` |
| `apps/api/src/services/chat.js` | Recuperación, armado del prompt, memoria, registro de tokens |
| `apps/api/src/services/embeddings.js` | Embeddings con OpenAI (fallback local) |
| `db/schema.sql` | `rag_chunks.embedding vector(1536)` + índice HNSW |
| `apps/web/src/pages/Chat.jsx` | Fuentes y panel “Ver contexto recuperado” |
| `apps/api/tests/rag.test.js` / `tests/chat.test.js` | Pruebas automáticas del RAG |

Consulta SQL que hace la búsqueda vectorial (referencia):

```sql
SELECT c.content, d.title, 1 - (c.embedding <=> $1::vector) AS score
FROM rag_chunks c
JOIN rag_documents d ON d.id = c.document_id
WHERE d.active = TRUE
ORDER BY c.embedding <=> $1::vector
LIMIT 5;
```

---

## 7. Capturas recomendadas para el PDF

1. Respuesta on-topic con pills de fuentes y panel de contexto abierto.
2. Respuesta off-topic (“sin información suficiente”, 0 fuentes).
3. Documento de prueba creado en admin + respuesta citándolo con 77 USD.
4. Postman/Swagger mostrando `sources` con `score` y `snippet`.
5. Panel de consumo (`/usage`) con tokens y consultas.
6. Reporte Power BI vs. reporte web (mismos totales).

---

## 8. Notas técnicas

- Embeddings: OpenAI `text-embedding-3-small` (1536 dimensiones); búsqueda con pgvector.
- Umbral actual `RAG_MIN_SCORE=0.45`; si no se supera, se complementa con BM25 léxico; si tampoco hay coincidencias → “sin información suficiente”.
- Memoria: se envían los últimos 6 mensajes de la conversación.
- Modelo: Groq `openai/gpt-oss-120b`.
- Si cambias de proveedor de embeddings o agregas documentos: **Documentos RAG → Reindexar todo**.
