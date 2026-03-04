# Crunched — Take-Home Project

A simplified clone of **Crunched**, an Excel add-in with an AI agent that can read from and write to spreadsheets. The task pane is a React UI served by Next.js; the AI agent runs in a FastAPI backend using the Anthropic API.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Setup](#setup)
   - [Prerequisites](#prerequisites)
   - [Environment Variables](#environment-variables)
   - [Database](#database)
   - [Backend](#backend)
   - [Frontend](#frontend)
   - [Excel Add-in & HTTPS Certificate](#excel-add-in--https-certificate)
5. [Running Locally](#running-locally)
6. [Design Principles](#design-principles)
7. [Future Work](#future-work)

---

## Tech Stack

| Layer     | Technology                                                  |
|-----------|-------------------------------------------------------------|
| Frontend  | Next.js 14 (App Router), TypeScript, Office.js              |
| Backend   | Python 3.12, FastAPI, pydantic-ai, Anthropic SDK            |
| Database  | PostgreSQL + SQLAlchemy 2 + Alembic                         |
| AI Model  | Claude claude-opus-4-6 via Anthropic API                    |
| Dev tools | mkcert (HTTPS), uvicorn (ASGI server)                       |

---

## Architecture Overview

```
Excel WebView (task pane)
        │  HTTPS
        ▼
https://localhost:3000/api/v1/*    ← Next.js dev server
        │  next.config.js rewrite (server-side)
        ▼
http://localhost:8000/api/v1/*     ← FastAPI backend
        │
        ▼
    PostgreSQL (conversations, message history)
        │
        ▼
  Anthropic API (claude-opus-4-6)
```

All API calls from the task pane go through the **Next.js rewrite proxy**. This means:
- The backend requires no HTTPS and no CORS configuration — it only receives requests from the Next.js server process, never directly from the browser.
- The browser never makes a cross-origin request, avoiding all CORS complexity.

### Request / Response Flow

1. The task pane reads spreadsheet context (sheet names, active sheet, used range values up to 500 rows × 100 cols, current selection).
2. It POSTs `{ message, context, conversation_id? }` to `/api/v1/chat`.
3. The backend loads or creates a `Conversation` row, deserialises the stored pydantic-ai message history, runs the agent, and saves the updated history back.
4. The response includes `{ reply, operations, conversation_id }`.
5. The frontend applies any `WriteOperation` entries to the workbook via `Excel.run`.

---

## Project Structure

```
crunched-case/
├── certs/
│   ├── localhost.pem           # mkcert HTTPS cert (for Next.js)
│   └── localhost-key.pem
├── manifest.xml                # Excel add-in manifest
├── backend/
│   ├── alembic/                # DB migrations
│   │   └── versions/
│   ├── app/
│   │   ├── main.py             # FastAPI app factory
│   │   ├── core/
│   │   │   └── config.py       # Settings (reads .env)
│   │   ├── models/
│   │   │   └── conversation.py # SQLAlchemy Conversation model
│   │   ├── schemas/
│   │   │   └── chat.py         # Pydantic request/response schemas
│   │   ├── agents/
│   │   │   └── chat_agent.py   # TOOLS, SYSTEM_PROMPT, run_agent()
│   │   └── routers/
│   │       ├── chat.py         # POST /api/v1/chat
│   │       └── conversations.py# GET /api/v1/conversations[/{id}]
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── start.sh
│   └── .env                    # Not committed — see below
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx      # Root layout
    │   │   └── page.tsx        # Task pane chat UI
    │   ├── components/         # One component per file
    │   ├── hooks/
    │   │   └── useOffice.ts    # Office.js init + getContext/applyOperations
    │   ├── services/
    │   │   └── api.ts          # All HTTP calls go through here
    │   └── types/
    │       └── index.ts        # ChatMessage, WriteOperation, etc.
    ├── next.config.js          # Rewrites /api/* → http://localhost:8000/api/*
    └── package.json
```

---

## Setup

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.12+
- **PostgreSQL** running locally
- **mkcert** (for HTTPS certs — required by Excel's WebView)
- **Microsoft Excel** (Mac) with add-in support

### Environment Variables

Create `backend/.env` (never committed):

```env
# Anthropic
ANTHROPIC_KEY=sk-ant-your-key-here

# Database
DATABASE_URL=postgresql://<your-pg-user>@localhost:5432/crunched

# App
SECRET_KEY=change-me-in-production
```

All settings are defined in [backend/app/core/config.py](backend/app/core/config.py). `DATABASE_URL` defaults to `postgresql://sondrerogde@localhost:5432/crunched` — override it in `.env` if your local Postgres user differs. `ANTHROPIC_KEY` must be set for the agent to function.

### Database

1. Create the database:
   ```bash
   createdb crunched
   ```

2. Run all migrations from the `backend/` directory:
   ```bash
   cd backend
   alembic upgrade head
   ```

   If you add new models later, generate a migration and apply it:
   ```bash
   alembic revision --autogenerate -m "describe the change"
   alembic upgrade head
   ```

### Backend

1. Create and activate a virtual environment:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the server:
   ```bash
   ./start.sh
   ```
   This runs `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` over plain HTTP. Interactive API docs are available at http://localhost:8000/docs.

### Frontend

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```
   This starts Next.js on **https://localhost:3000** using the mkcert certs in `certs/`. The `--experimental-https` flags are already wired into the `dev` script in `package.json`.

### Excel Add-in & HTTPS Certificate

Excel's WebView only loads pages served over HTTPS with a trusted certificate. Complete these steps once per machine.

#### 1. Install mkcert and trust the local CA

```bash
brew install mkcert
mkcert -install    # adds the local CA to your system trust store (prompts for sudo)
```

#### 2. Generate certs (already done — `certs/` is committed)

If you ever need to regenerate them:
```bash
cd crunched-case
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1
```

The Next.js `dev` script picks them up automatically via the `--experimental-https-key/cert` flags.

#### 3. Sideload the manifest into Excel (Mac)

```bash
cp manifest.xml ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/
```

Quit Excel completely, then reopen it.

#### 4. Open the add-in

In Excel: **Insert → Add-ins → My Add-ins → Crunched**

The task pane will load from `https://localhost:3000`. Both the frontend and backend must be running before opening the pane.

---

## Running Locally

Open two terminals:

```bash
# Terminal 1 — Backend
cd backend && source .venv/bin/activate && ./start.sh

# Terminal 2 — Frontend
cd frontend && npm run dev
```

| Service  | URL                        |
|----------|----------------------------|
| Frontend | https://localhost:3000     |
| Backend  | http://localhost:8000      |
| API docs | http://localhost:8000/docs |

---

## Design Principles

The codebase follows strict **separation of concerns**. Every piece of code has exactly one layer it belongs to:

- **Routers** (`routers/`) are thin HTTP handlers. They validate the request, call into the agent layer, and construct the response. Crucially, they are responsible for creating DB records and assigning resource IDs — inner layers never receive or return IDs. This guarantees that a non-optional `id` field in a response schema is always set.
- **Agents** (`agents/`) contain all AI logic: the system prompt, tool definitions, and `run_agent()`. No HTTP or DB code lives here.
- **Schemas** (`schemas/`) define Pydantic models for request/response shapes only.
- **Models** (`models/`) are SQLAlchemy ORM models, kept entirely separate from Pydantic schemas.

On the frontend:
- All HTTP calls go through `src/services/api.ts` — never `fetch()` directly in components.
- One component per file; no inline styles (CSS modules only).
- `page.tsx` files are thin orchestrators with no business logic.

---

## Future Work

### Visualizing workbook changes
Before writing cells, the agent could return a diff preview that the user approves in the task pane. A side-by-side "before / after" view for the affected range would make bulk edits far safer and more transparent.

### User authentication
There is no auth today. Adding user accounts (JWT-based or OAuth via a provider like Clerk or Auth.js) would enable per-user conversation history, saved workbook contexts, and eventually billing. The `SECRET_KEY` and token-expiry settings in `config.py` are stubs ready for this.

### Specialized agents
The current single agent handles everything. A multi-agent architecture would let specialists handle different tasks — a **formula agent** that only writes Excel formulas, a **chart agent** for data visualisation, a **data-cleaning agent** for normalising messy ranges. Agents could be routed based on intent detection on the incoming message.

### Streaming responses
Long agent turns currently block until complete. Switching to server-sent events (SSE) or WebSockets would let the task pane show partial replies and tool-call progress in real time, significantly improving perceived responsiveness.

### Large workbook support
The current implementation hard-caps the data sent to the agent at 500 rows × 100 columns, silently dropping anything beyond that. This is acceptable for small sheets but breaks down for real-world workbooks. A proper solution would involve three changes:

- **Schema-first context**: Instead of dumping the full used range on every request, send only metadata upfront — sheet names, used-range dimensions, and column headers from row 1. This keeps the base prompt small regardless of workbook size.
- **Tool-based range access**: Add a `read_range(sheet, range)` agent tool so the model can pull specific slices of data on demand. The agent requests only what it needs, avoiding both the hard cap and the cost of sending irrelevant data.
- **Message history pruning**: Currently the full pydantic-ai message history (including all prior context payloads) is reloaded and resent on every turn. In a long conversation over a large sheet this grows unboundedly and will eventually hit the model's context window. A rolling-window or summarisation strategy would keep history token count stable.

### More scalable infrastructure
Several areas to grow into as usage scales:
- **LangGraph** for stateful, graph-based multi-agent orchestration with branching and cycles.
- **Portkey** (or similar LLM gateway) for model routing, rate-limit management, cost tracking, and fallback providers.
- **Containerization** — Docker Compose for local dev, Kubernetes or a managed container service (e.g. Railway, Fly.io, ECS) for production.
- **Background task queue** (Celery + Redis or ARQ) to handle long-running agent jobs without tying up HTTP connections.
- **Structured observability** — traces and spans via OpenTelemetry, feeding into a tool like Langfuse or Honeycomb for LLM-aware monitoring.
