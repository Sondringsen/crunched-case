# Project Context for Claude Code

## Stack Overview

| Layer     | Technology                               |
|-----------|------------------------------------------|
| Backend   | Python 3.12, FastAPI, SQLAlchemy 2.x     |
| Database  | PostgreSQL 16, Alembic for migrations    |
| Frontend  | Next.js 14 (App Router), TypeScript      |
| Auth      | JWT via python-jose + passlib            |
| Dev env   | docker-compose (db + backend + frontend) |

---

## Project Structure

```
project/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app factory, middleware, router mount
│   │   ├── dependencies.py    # Shared FastAPI dependencies (get_db, auth)
│   │   ├── core/
│   │   │   ├── config.py      # Settings via pydantic-settings (.env)
│   │   │   └── database.py    # SQLAlchemy engine, SessionLocal, Base, get_db
│   │   ├── models/            # SQLAlchemy ORM models (one file per entity)
│   │   ├── schemas/           # Pydantic schemas: *Create, *Read, *Update
│   │   ├── routers/           # FastAPI routers (one file per resource)
│   │   └── services/          # Business logic (called by routers)
│   ├── alembic/               # DB migrations
│   ├── tests/                 # pytest tests, conftest.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router — one folder per route
│   │   │   ├── layout.tsx     # Root layout (html/body shell)
│   │   │   └── page.tsx       # Home page "/"
│   │   ├── components/        # Reusable UI components (always Client or Server)
│   │   ├── hooks/             # Custom hooks — must be used in Client Components
│   │   ├── services/api.ts    # Typed fetch wrapper (works client + server side)
│   │   ├── types/             # Shared TypeScript interfaces
│   │   └── store/             # Global state (Context, Zustand, etc.)
│   ├── next.config.js         # Rewrites /api/* → FastAPI backend
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
└── docker-compose.yml
```

---

## Backend Conventions

### Adding a new resource (e.g. `items`)

1. **Model** — `app/models/item.py`
   ```python
   import uuid
   from sqlalchemy import Column, Integer, String
   from sqlalchemy.dialects.postgresql import UUID
   from app.core.database import Base
   from app.models.base import TimestampMixin

   class Item(Base, TimestampMixin):
       __tablename__ = "items"
       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
       name = Column(String, nullable=False)
   ```
   Then add `from app.models.item import Item` to `app/models/__init__.py`.

2. **Schema** — `app/schemas/item.py`
   ```python
   from pydantic import BaseModel

   class ItemBase(BaseModel):
       name: str

   class ItemCreate(ItemBase): pass
   class ItemUpdate(BaseModel):
       name: str | None = None  # all fields optional for PATCH

   class ItemRead(ItemBase):
       id: uuid.UUID
       class Config:
           from_attributes = True
   ```
   Add `import uuid` at the top of the schema file.

3. **Service** — `app/services/item_service.py`
   Pure functions that take a `db: Session` and domain objects. No HTTP logic here.

4. **Router** — `app/routers/items.py`
   ```python
   from fastapi import APIRouter, Depends
   from sqlalchemy.orm import Session
   from app.dependencies import get_db

   router = APIRouter()

   @router.get("/", response_model=list[ItemRead])
   def list_items(db: Session = Depends(get_db)):
       ...
   ```
   Register it in `app/routers/__init__.py`:
   ```python
   from app.routers import items
   router.include_router(items.router, prefix="/items", tags=["items"])
   ```

5. **Migration**
   ```bash
   alembic revision --autogenerate -m "add items table"
   alembic upgrade head
   ```

### HTTP status codes to use
- `200` — successful GET / PUT / PATCH
- `201` — successful POST (resource created)
- `204` — successful DELETE (no body)
- `404` — not found → raise `HTTPException(status_code=404, detail="Not found")`
- `422` — validation error (FastAPI handles this automatically via Pydantic)
- `401` / `403` — unauthenticated / unauthorized

### Error handling pattern
```python
from fastapi import HTTPException

def get_item_or_404(db, item_id: uuid.UUID):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item
```

---

## Database Conventions

- Always use Alembic for schema changes — never modify the DB directly.
- Use `TimestampMixin` (from `app/models/base.py`) on every model.
- Foreign keys should always have an explicit `index=True`.
- Always use `UUID` primary keys (`uuid.uuid4`) — never `Integer` serials, which are prone to race conditions and enumeration.

### Accessing the database
The project runs in Docker. Connect to the database with:
```bash
docker exec -it crunched-case-db-1 psql -d myapp -U user
```

### Useful Alembic commands
```bash
# Create a migration (run from backend/)
alembic revision --autogenerate -m "describe what changed"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

---

## Frontend Conventions (Next.js App Router)

### Server Components vs Client Components

By default, every file in `src/app/` is a **Server Component** — it runs only on the server and can `async/await` directly.

Add `"use client"` at the top of any file that uses:
- `useState`, `useEffect`, or any other hook
- Browser APIs (`localStorage`, `window`, etc.)
- Event handlers (`onClick`, `onChange`, etc.)
- The `useApi` hook or interactive UI

```tsx
// Server Component — no directive needed, can fetch directly
export default async function ItemsPage() {
  const items = await api.get<Item[]>("/items"); // runs server-side
  return <ItemList items={items} />;
}

// Client Component — needs interactivity
"use client";
export default function ItemForm() {
  const [name, setName] = useState("");
  ...
}
```

### Adding a new route

Create a folder under `src/app/` with a `page.tsx`:
```
src/app/
├── items/
│   ├── page.tsx          → /items
│   └── [id]/
│       └── page.tsx      → /items/123
```

Dynamic route params are passed as props:
```tsx
export default function ItemDetailPage({ params }: { params: { id: string } }) {
  ...
}
```

### API calls
Use the `api` helper from `src/services/api.ts` — it works on both server and client:
```typescript
import { api } from "@/services/api";

const items = await api.get<Item[]>("/items");
const created = await api.post<Item>("/items", { name: "foo" });
await api.delete(`/items/${id}`);
```

### Data fetching in Client Components
Use the `useApi` hook for read-only data:
```typescript
"use client";
const { data, loading, error, refetch } = useApi(() => api.get<Item[]>("/items"));
```

For mutations (POST/PUT/DELETE) in Client Components:
```typescript
const [loading, setLoading] = useState(false);
const handleDelete = async (id: number) => {
  setLoading(true);
  try {
    await api.delete(`/items/${id}`);
    refetch();
  } finally {
    setLoading(false);
  }
};
```

### Component structure
- `app/**/page.tsx` — route entry points; prefer Server Components here
- `components/` — shared UI; label with `"use client"` only if needed
- `hooks/` — always Client Component territory (hooks don't work server-side)
- Never put `useState`/`useEffect` in a Server Component

### TypeScript
- Define an interface for every API entity in `src/types/index.ts`
- Always type API responses — never use `any`
- Prefer plain function declarations over `React.FC`

### Environment variables
- Prefix with `NEXT_PUBLIC_` for variables needed in the browser
- Server-only variables (no prefix) are safe and not exposed to the client
- Set in `.env.local` locally; the example is in `.env.example`

---

## Running Locally

```bash
cp .env.example .env
docker-compose up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API docs: http://localhost:8000/api/v1/docs

---

## Testing
```bash
# Backend (from backend/)
pytest tests/ -v

# Single test file
pytest tests/test_items.py -v
```

---

## Common Pitfalls to Avoid

- **Don't put business logic in routers.** Routers only validate input and call services.
- **Don't forget to register models in `app/models/__init__.py`** — Alembic won't see them otherwise.
- **Don't call `db.commit()` in tests** — the conftest rolls back automatically.
- **Don't use `response_model` on DELETE endpoints** — return `Response(status_code=204)` instead.
- **CORS** — if the frontend can't reach the backend, check `CORS_ORIGINS` in config.
- **Next.js proxy** — for local dev, API calls go through Next.js rewrites in `next.config.js`, not directly to the backend.
- **Forgetting `"use client"`** — if you get a "hooks can only be used in Client Components" error, add `"use client"` at the top of the file.
- **`localStorage` in Server Components** — always guard with `typeof window !== "undefined"` or move to a Client Component.

---

## Auth (when needed)

If the test requires authentication, the fastest pattern is:

1. Hash passwords with `passlib`: `pwd_context.hash(password)`
2. Issue JWT on login with `python-jose`
3. Add a `get_current_user` dependency that decodes the token and returns the user
4. Protect routes with `current_user: User = Depends(get_current_user)`

Token storage on the frontend: `localStorage.setItem("token", token)` — the `api.ts` helper already picks this up automatically (client-side only).
