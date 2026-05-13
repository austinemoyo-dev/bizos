# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BizOS is a business + personal finance operating system for Dash & Co. It is split into two independent projects:

- `backend/` — FastAPI + PostgreSQL + SQLAlchemy + Alembic
- `frontend/` — Next.js 14 (App Router) + TypeScript + Tailwind + Dexie.js + Zustand + Framer Motion

The spec documents at the repo root define everything to be built:
- [DESIGN.md](DESIGN.md) — full UI/UX design system (colors, typography, components, layouts)
- [backend/BACKEND_PROMPT.md](backend/BACKEND_PROMPT.md) — complete backend spec
- [frontend/FRONTEND_PROMPT.md](frontend/FRONTEND_PROMPT.md) — complete frontend spec

---

## Backend Commands (once `bizos-backend/` exists)

```bash
# Setup
cd bizos-backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # then fill in DATABASE_URL and SECRET_KEY

# Database migrations
alembic upgrade head
alembic revision --autogenerate -m "description"

# Run dev server
uvicorn main:app --reload --port 8000

# Tests
pytest
pytest tests/test_repairs.py          # single file
pytest tests/test_repairs.py::test_fn  # single test
```

## Frontend Commands (once `bizos-frontend/` exists)

```bash
cd bizos-frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL

npm run dev     # http://localhost:3000
npm run build
npm run lint
```

---

## Architecture

### Backend

Layered structure: `routers/` → `services/` → `models/` (SQLAlchemy ORM). Pydantic `schemas/` are separate from ORM models. `core/` holds config, DB session, JWT security, and `get_current_user`/`role_required` dependencies.

All API routes are prefixed `/api/v1/`. JWT auth with access + refresh tokens. Role-based access: `super_admin > owner > accountant > technician > staff > viewer`.

### Frontend

Next.js App Router with an authenticated route group `src/app/(app)/`. State split between:
- **Zustand** (`lib/stores/`) — auth, UI (toasts, online status, active scope)
- **Dexie** (`lib/db/dexie.ts`) — IndexedDB for offline-first reads/writes
- **React Query** — server state and cache

Offline mutations go through `lib/sync/syncQueue.ts` which queues to Dexie's `pendingSync` table and flushes when back online. The API client at `lib/api/client.ts` handles auth headers and auto-refresh.

The app has two scopes — **Business** and **Personal** — toggled via `uiStore.activeScope`. Scope determines sidebar navigation and accent color (blue vs purple).

---

## Critical Business Logic

These rules are non-negotiable and must not be simplified:

**Profit** is always computed, never stored: `Revenue - Expenses` where revenue = repair charges + sales.

**Tithe** = 10% of profit, auto-created (unpaid) when a repair job is marked `completed`. Tithe only becomes an `Expense` record when marked paid.

**Available Balance** = Profit − paid tithe amounts.

**Repair job parts** are locked once status is `completed` or `delivered`. Status can only move forward (received → diagnosed → in_progress → completed → delivered), never backward.

**Damaged parts**: when `JobPart.damaged=True`, a `StockMovement(type=damage)` AND an `Expense(category=damage_loss)` are both created. Damaged part cost is excluded from the parts_cost in the profit formula (it's already an expense).

**Inventory restock** always creates both a `StockMovement(type=purchase)` and an `Expense(category=inventory)`.

**Food vendor payment** (batch): marks credits paid, creates `FoodVendorPayment`, and creates a `PersonalTransaction(type=expense, category=food)`.

---

## Design System Constants

All currency amounts must use `font-family: Space Mono` (never DM Sans for numbers). Format: `₦124,500.00` via `formatNaira()` in `lib/format.ts`.

Profit/loss coloring is absolute: profit = `--accent-green` (#10B981), loss = `--accent-red` (#EF4444). No exceptions.

No external UI component libraries (no shadcn, MUI, Chakra). All components built from scratch using Tailwind + CSS custom properties from DESIGN.md. No `react-hook-form` — use controlled components with `useState`.

Charts use **Recharts** only. Styling follows `CHART_THEME` in [DESIGN.md](DESIGN.md#8-charts--data-visualization).
