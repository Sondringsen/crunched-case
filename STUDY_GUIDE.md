# Pre-Test Study Guide: Full Stack Engineering

> Focus areas for a 4-hour CRUD take-home test.
> Star ⭐ items are highest-yield — review these first.

---

## 1. REST API Design ⭐

**Core principle:** Resources are nouns, HTTP verbs are the actions.

| Method | Path            | Description                    | Status |
|--------|-----------------|--------------------------------|--------|
| GET    | /items          | List all items                 | 200    |
| POST   | /items          | Create a new item              | 201    |
| GET    | /items/{id}     | Get a single item              | 200    |
| PUT    | /items/{id}     | Replace an item entirely       | 200    |
| PATCH  | /items/{id}     | Partially update an item       | 200    |
| DELETE | /items/{id}     | Delete an item                 | 204    |

**Things to know cold:**
- `PUT` vs `PATCH`: PUT replaces the whole resource; PATCH applies partial updates
- `201` should include a `Location: /items/{new_id}` header (nice-to-have in tests)
- `404` for missing resources, `422` for validation errors, `401`/`403` for auth
- Query parameters for filtering/pagination: `GET /items?page=1&size=20&sort=name`
- Nested resources: `GET /users/{user_id}/orders` — only nest one level deep

**Pagination pattern (return this shape consistently):**
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "size": 20
}
```

---

## 2. Database Schema Design ⭐

**Normalization rules of thumb:**
- Each table = one entity
- No repeating columns (no `tag1`, `tag2`, `tag3` — use a join table)
- Foreign keys reference primary keys
- Timestamps (`created_at`, `updated_at`) on every table — interviewers notice this

**Relationships:**
- One-to-many: `orders.user_id → users.id` (FK on the "many" side)
- Many-to-many: use a junction/association table (`user_roles`, `post_tags`)
- One-to-one: FK + `UNIQUE` constraint

**Indexes:**
- Always index foreign keys
- Index columns you filter or sort by (`WHERE status = 'active'`, `ORDER BY created_at`)
- Primary keys are indexed automatically

**Quick schema checklist when you receive the spec:**
1. Identify all entities → one table each
2. Identify relationships → draw arrows, add FKs
3. Add `id`, `created_at`, `updated_at` to every table
4. Ask yourself: "What queries will the app run?" → add indexes for those

---

## 3. FastAPI Patterns ⭐

**Dependency injection** — the core FastAPI pattern:
```python
# DB session injected per request
@router.get("/items/{item_id}")
def get_item(item_id: int, db: Session = Depends(get_db)):
    ...

# Stacking dependencies
@router.post("/items")
def create_item(
    body: ItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # auth
):
    ...
```

**Pydantic schemas — three-schema pattern:**
```python
class ItemBase(BaseModel):
    name: str
    description: str | None = None

class ItemCreate(ItemBase):    # what the client sends (POST body)
    pass

class ItemUpdate(BaseModel):   # PATCH — all fields optional
    name: str | None = None
    description: str | None = None

class ItemRead(ItemBase):      # what the API returns
    id: int
    created_at: datetime
    class Config:
        from_attributes = True
```

**Router response model pattern:**
```python
@router.post("/", response_model=ItemRead, status_code=201)
def create_item(body: ItemCreate, db: Session = Depends(get_db)):
    item = Item(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
```

**Background tasks** (if needed):
```python
from fastapi import BackgroundTasks
def send_email(email: str): ...

@router.post("/register")
def register(body: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = create_user(db, body)
    background_tasks.add_task(send_email, user.email)
    return user
```

---

## 4. SQLAlchemy 2.x Patterns ⭐

**Basic CRUD:**
```python
from sqlalchemy.orm import Session

# Create
item = Item(name="foo")
db.add(item)
db.commit()
db.refresh(item)  # reload from DB to get generated fields

# Read one
item = db.get(Item, item_id)              # by PK (preferred)
item = db.scalar(select(Item).where(Item.id == item_id))

# Read many
items = db.scalars(select(Item)).all()
items = db.scalars(select(Item).where(Item.status == "active").limit(20)).all()

# Update
item.name = "bar"
db.commit()
db.refresh(item)

# Delete
db.delete(item)
db.commit()
```

**Count query:**
```python
from sqlalchemy import func, select
total = db.scalar(select(func.count()).select_from(Item))
```

**Pagination:**
```python
items = db.scalars(select(Item).offset((page - 1) * size).limit(size)).all()
```

---

## 5. Alembic Cheat Sheet

```bash
# One-time setup (already done in this project)
alembic init alembic

# Create a migration after changing a model
alembic revision --autogenerate -m "add users table"

# Apply all pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# See current migration state
alembic current
```

**Important:** Alembic only auto-detects changes if models are imported in `alembic/env.py`. The project is already wired up for this.

---

## 6. React + TypeScript Patterns ⭐

**Typed API call pattern:**
```typescript
interface Item { id: number; name: string; }

// In a component
const [items, setItems] = useState<Item[]>([]);
useEffect(() => {
  api.get<Item[]>("/items").then(setItems);
}, []);
```

**Form handling (controlled):**
```typescript
const [form, setForm] = useState({ name: "", description: "" });

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await api.post("/items", form);
  onSuccess();
};
```

**Conditional rendering:**
```tsx
if (loading) return <p>Loading...</p>;
if (error) return <p>Error: {error}</p>;
return <ItemList items={data ?? []} />;
```

**React Router v6 basics:**
```tsx
import { BrowserRouter, Routes, Route, useParams, useNavigate } from "react-router-dom";

// In App.tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/items/:id" element={<ItemDetailPage />} />
  </Routes>
</BrowserRouter>

// In ItemDetailPage
const { id } = useParams<{ id: string }>();
const navigate = useNavigate();
```

---

## 7. Authentication (JWT) — Quick Reference

**Backend flow:**
1. `POST /auth/login` — verify password with passlib, return JWT
2. All protected routes use `Depends(get_current_user)`
3. `get_current_user` decodes the JWT and returns the user or raises 401

**Token creation:**
```python
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(subject: int, expires_delta: timedelta) -> str:
    expire = datetime.utcnow() + expires_delta
    return jwt.encode({"sub": str(subject), "exp": expire}, settings.SECRET_KEY, algorithm="HS256")
```

**Password hashing:**
```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"])

pwd_context.hash("plaintext")          # hash when storing
pwd_context.verify("plaintext", hash)  # verify on login
```

**Frontend:**
- Store token in `localStorage` (already handled in `api.ts`)
- On logout: `localStorage.removeItem("token"); navigate("/login")`
- Protect routes with a wrapper that checks for a token

---

## 8. Architecture Decisions You May Be Asked About

**Why separate services from routers?**
Routers handle HTTP concerns (request/response). Services handle business logic. This makes logic testable without HTTP and lets you swap transports later.

**Why use Pydantic schemas instead of returning ORM models directly?**
- Avoids accidentally exposing sensitive fields (e.g., hashed passwords)
- Provides a stable API contract even when the DB schema changes
- `response_model` gives you automatic validation and documentation

**SQL vs NoSQL — when to choose what?**
- Use SQL (PostgreSQL) for: relational data, transactions, complex queries, financial data
- Use NoSQL for: document stores, high write throughput, flexible schema, caching (Redis)
- In a take-home test: default to PostgreSQL unless told otherwise

**Sync vs async FastAPI?**
- Regular `def` endpoints are run in a thread pool — fine for most DB work with SQLAlchemy sync
- `async def` endpoints are for genuinely async I/O (e.g., async HTTP calls, async DB drivers)
- Don't mix: don't call blocking code from an `async def` endpoint without `run_in_executor`

**How would you scale this?**
- Database: connection pooling (pgBouncer), read replicas for heavy reads
- Backend: horizontal scaling behind a load balancer (stateless because JWT is stateless)
- Caching: Redis for frequently-read, infrequently-changed data
- Queues: Celery + Redis for async tasks (emails, processing)

---

## 9. Common Mistakes to Avoid in Tests

- **Forgetting `db.refresh(item)` after commit** — the object won't have DB-generated fields
- **Returning the SQLAlchemy model directly** instead of using `response_model` — FastAPI will complain
- **Not handling 404s** — always check if a record exists before operating on it
- **Hardcoding config values** — use environment variables via `config.py`
- **No error boundaries in React** — at minimum, show an error state when API calls fail
- **Blocking the UI** — disable submit buttons while requests are in flight
- **Not running migrations** — if you add a model but forget `alembic upgrade head`, you'll get table-not-found errors

---

## 10. Time Management for a 4-Hour Test

**Suggested order:**
1. **Read the whole spec first** (10 min) — understand all requirements before writing any code
2. **Design the DB schema on paper** (10 min) — list tables, columns, relationships
3. **Set up the project** (15 min) — clone this template, rename, run docker-compose up
4. **Backend first** — models → migrations → schemas → routers (work resource by resource)
5. **Frontend second** — pages and API wiring
6. **Auth last** — only if you have time; a working app without auth > broken app with auth

**"Done well" > "done poorly":**
- One complete resource with proper validation, error handling, and a test is worth more than five incomplete ones
- Clean code, consistent naming, and a working `/health` endpoint signal experience
- Leave `TODO:` comments for things you didn't finish rather than leaving dead code
