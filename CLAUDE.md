# Project Context for Claude Code

## Engineering Philosophy

**Structure is more important than features.** Every piece of code must live in the right layer. Do not conflate routing, business logic, schemas, or prompts in a single file — even if it feels faster. A small codebase with clear separation of concerns is worth far more than a large one that's tangled. When adding new functionality, find the correct layer first, then write the code.

**Resource IDs are assigned by the backend, never by the frontend or agent.** A new resource (e.g. a conversation) has no ID until the backend persists it. The router is responsible for creating the DB record, obtaining the ID, and constructing the final response schema with it. Inner layers (agent, tools) must not receive or return IDs — they operate on raw data only. This keeps schema state consistent: a non-optional `id` field in a response type is always guaranteed to be set, with no nullable workarounds required.

---

## What this project is

A simplified clone of **Crunched** — an Excel add-in with an AI agent that can read from and write to spreadsheets. The task pane is a React UI served by Next.js; the AI agent runs in a FastAPI backend using the Anthropic API.

## Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | Next.js 14 (App Router), TypeScript, Office.js  |
| Backend   | Python 3.12, FastAPI, Anthropic SDK             |
| Dev env   | Two local processes (no Docker needed)          |

No database. No auth. No Docker.

---

## Frontend Structure Rules

**No inline styles.** All styles must live in CSS modules (`.module.css`) co-located with their component. Never use the `style` prop or a `styles: Record<string, React.CSSProperties>` object in TSX files.

**One component per file.** Each React component lives in its own file under `src/components/`. The `page.tsx` files are thin orchestrators — they manage state and wire components together, but contain no JSX beyond layout structure.

**Use `api.ts` for all HTTP calls.** Never call `fetch()` directly in components or pages. The `src/services/api.ts` client handles base URL, headers, and error parsing. Import `api.get` / `api.post` from there.

**No dead code.** If a feature is removed or was never wired up, delete its files entirely — components, routes, schemas, models, services. Dead code is not "harmless"; it creates confusion about what is actually used.

---

## Project Structure

```
crunched-case/
├── certs/
│   ├── localhost.pem          # mkcert HTTPS cert (for Next.js)
│   └── localhost-key.pem
├── manifest.xml               # Excel add-in manifest (sideloaded into ~/Library/…/wef/)
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app factory (redirect_slashes=False)
│   │   ├── core/
│   │   │   └── config.py      # Settings (ANTHROPIC_KEY from .env)
│   │   ├── schemas/
│   │   │   └── chat.py        # Pydantic models: ChatRequest, ChatResponse, WriteOperation, etc.
│   │   ├── agents/
│   │   │   └── chat_agent.py  # TOOLS, SYSTEM_PROMPT, run_agent() — all AI logic lives here
│   │   └── routers/
│   │       ├── __init__.py    # Registers chat router
│   │       └── chat.py        # Thin HTTP layer: validates request, calls run_agent(), returns response
│   ├── requirements.txt
│   ├── start.sh               # uvicorn on http://localhost:8000 (plain HTTP)
│   └── .env                   # ANTHROPIC_KEY=sk-ant-…
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx     # Minimal root layout (no Office.js script tag here)
    │   │   └── page.tsx       # Task pane chat UI ("use client")
    │   ├── hooks/
    │   │   └── useOffice.ts   # Office.js initialisation + getContext/applyOperations
    │   └── types/
    │       └── index.ts       # ChatMessage, WriteOperation, SpreadsheetContext, etc.
    ├── next.config.js          # Rewrites /api/* → http://localhost:8000/api/*
    └── package.json            # dev script uses --experimental-https with mkcert certs
```

---

## Running Locally

**Terminal 1 — Backend (plain HTTP):**
```bash
cd backend && ./start.sh
```

**Terminal 2 — Frontend (HTTPS via mkcert):**
```bash
cd frontend && npm run dev
```

Frontend: https://localhost:3000
Backend: http://localhost:8000 (never accessed directly by the browser)

---

## Architecture

All API calls from the task pane go through the **Next.js rewrite proxy**:

```
Excel WebView → https://localhost:3000/api/v1/chat   (same origin)
                       ↓ next.config.js rewrite
              → http://localhost:8000/api/v1/chat     (server-side, no CORS/SSL needed)
```

This means:
- The backend needs **no HTTPS** and no CORS config (it only receives requests from Next.js server)
- The browser never makes a cross-origin request

---

## Key Implementation Details

### Office.js initialisation (`useOffice.ts`)

Excel's WebView pre-injects Office.js before the page loads. We must **not** load it again from CDN (that overwrites the host's version). The hook checks `typeof Office` and only loads the CDN script in a plain browser (for dev previews).

```ts
if (typeof Office !== "undefined") {
  Office.onReady(() => setIsReady(true));   // inside Excel
} else {
  // load CDN script, then call onReady   // browser fallback
}
```

### Context sent to the agent

On every message, the frontend extracts:
- Sheet names
- Active sheet name
- Used range values (capped at 500 rows × 100 cols)
- Current selection address

This is POSTed to `/api/v1/chat` alongside the user message.

### Agent response

The backend returns `{ reply: string, operations: WriteOperation[] }`. Operations are applied by the frontend via `Excel.run`.

### FastAPI route conventions

- `redirect_slashes=False` on the app — avoids 307 redirects that break the Next.js proxy
- Route registered as `@router.post("")` (not `"/"`) so the path is `/api/v1/chat` with no trailing slash

---

## Loading the add-in in Excel (Mac)

```bash
cp manifest.xml ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/
```
Quit and reopen Excel. Then: **Insert → Add-ins → My Add-ins → Crunched**

---

## HTTPS Setup (one-time)

```bash
brew install mkcert
mkcert -install          # needs sudo password — run in terminal
# certs already generated in certs/
```

The `npm run dev` script in `frontend/package.json` references the cert files automatically.
