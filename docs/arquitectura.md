# Arquitectura - Web IA Turismo

## 1. Diagrama general

```mermaid
flowchart LR
  subgraph Consumidores
    U[Usuario / Administrador]
    GUI[Interfaz web React]
    PB[Power BI]
    PM[Postman / cliente externo]
  end

  subgraph "Servidor de aplicaciones (Render)"
    API[API REST Express]
    AUTH[Autenticacion JWT + roles]
    CHAT[Chatbot RAG + memoria]
    AG1[Agente de itinerario]
    AG2[Agente de ajuste]
    CRUD[CRUD y administracion]
    REP[Historial y reportes]
    LIM[Control de limites]
    SW[Swagger /api-docs]
  end

  subgraph "Servidor de datos (PostgreSQL 16)"
    DB[(PostgreSQL + pgvector)]
    RAG[(rag_documents / rag_chunks)]
    USR[(users / services)]
    LOG[(conversations / messages)]
    USE[(usage_logs / agent_runs)]
  end

  subgraph "Proveedores y fuentes externas"
    GROQ[Groq - LLM]
    OAI[OpenAI - embeddings]
    METEO[Open-Meteo - clima]
    OSRM[OSRM - distancias]
  end

  U --> GUI
  GUI -->|HTTPS JSON| API
  PM -->|HTTPS JSON + JWT| API
  PB -->|GET /api/bi/usage + x-api-key| API

  API --> AUTH
  API --> CHAT
  API --> AG1
  API --> AG2
  API --> CRUD
  API --> REP
  API --> SW
  CHAT --> LIM
  AG1 --> LIM
  AG2 --> LIM

  CHAT --> RAG
  AG1 --> DB
  AG2 --> DB
  CRUD --> USR
  REP --> USE
  LIM --> USE
  CHAT --> LOG

  CHAT -->|prompt + contexto| GROQ
  AG1 -->|function calling| GROQ
  AG2 -->|function calling| GROQ
  RAG -->|embeddings| OAI
  AG1 -->|clima| METEO
  AG2 -->|clima| METEO
  AG1 -->|distancias| OSRM
```

## 2. Recorrido de una solicitud desde la GUI

```mermaid
sequenceDiagram
  participant U as Usuario
  participant W as React
  participant A as API Express
  participant D as PostgreSQL
  participant G as Groq
  participant E as Embeddings/Externas

  U->>W: Escribe una pregunta
  W->>A: POST /api/chat (Bearer JWT)
  A->>A: Valida JWT y rol
  A->>D: SUM(tokens) del mes
  alt Limite alcanzado
    A-->>W: 429 TOKEN_LIMIT
  else Hay cupo
    A->>E: Embedding de la pregunta
    A->>D: Busqueda vectorial top-k
    A->>D: Ultimos 6 mensajes (memoria)
    A->>G: Prompt + contexto + historial
    G-->>A: Respuesta
    A->>D: INSERT messages + usage_logs
    A-->>W: Respuesta, fuentes y tokens restantes
  end
```

## 3. Recorrido desde un consumidor externo (Power BI)

```mermaid
sequenceDiagram
  participant P as Power BI
  participant A as API Express
  participant D as PostgreSQL

  P->>A: GET /api/bi/usage?from&to&service
  Note over P,A: Header x-api-key (sin JWT)
  A->>A: Valida API key (env o api_keys)
  A->>D: Agrega usage_logs por servicio y dia
  D-->>A: Totales, por servicio, diario, por usuario
  A-->>P: JSON
  Note over P: Visuales: consultas y tokens por servicio<br/>Slicers: fecha y servicio
```

El mismo endpoint y las mismas agregaciones alimentan el reporte web del administrador, garantizando resultados coincidentes.

## 4. Modelo de datos

```mermaid
erDiagram
  users ||--o{ conversations : tiene
  users ||--o{ usage_logs : genera
  users ||--o{ agent_runs : ejecuta
  users ||--o{ user_service_limits : posee
  services ||--o{ conversations : atiende
  services ||--o{ usage_logs : registra
  services ||--o{ user_service_limits : limita
  conversations ||--o{ messages : contiene
  rag_documents ||--o{ rag_chunks : divide
  agent_runs }o--|| services : usa

  users {
    int id PK
    string name
    string email
    string password_hash
    string role
    int token_limit
    bool active
  }
  services {
    int id PK
    string key
    string name
    string model
    string system_prompt
    jsonb config
    bool active
  }
  conversations {
    int id PK
    int user_id FK
    int service_id FK
    string title
    text summary
  }
  messages {
    int id PK
    int conversation_id FK
    string role
    text content
    int tokens
  }
  rag_documents {
    int id PK
    string title
    string source
    string category
    text content
  }
  rag_chunks {
    int id PK
    int document_id FK
    text content
    vector embedding
  }
  usage_logs {
    int id PK
    int user_id FK
    int service_id FK
    string kind
    int tokens_in
    int tokens_out
    int tokens_total
  }
  agent_runs {
    int id PK
    int user_id FK
    int service_id FK
    jsonb steps
    text output
  }
  user_service_limits {
    int id PK
    int user_id FK
    int service_id FK
    int token_limit
  }
```

## 5. Decisiones de arquitectura

- **Monorepo** con workspaces: un solo despliegue en Render sirve la API y el build de React, evitando CORS y simplificando CI/CD.
- **PostgreSQL + pgvector** como base de datos y Data Warehouse: almacena datos operativos, corpus RAG, historial y consumo.
- **Groq** para generacion y *function calling*; **OpenAI** para embeddings (Groq no los ofrece).
- **Open-Meteo y OSRM** como fuentes externas sin API key, usadas por los agentes.
- **Control de consumo** calculado desde `usage_logs` (fuente unica de verdad) para que web, API y Power BI coincidan.
- **Fallback BM25** cuando no hay `OPENAI_API_KEY`, manteniendo el sistema demostrable en cualquier entorno.

## 6. Seguridad

- JWT con expiracion; middleware de autenticacion y verificacion de rol.
- Contrasenas con bcrypt (pgcrypto en el seed).
- API keys hasheadas (SHA-256) para consumidores externos; la clave de BI puede definirse por variable de entorno.
- Validacion de entrada con Zod y manejo centralizado de errores.
- Limites de tokens verificados antes de cada ejecucion.
