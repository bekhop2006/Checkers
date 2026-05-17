# Checkers — modern Russian draughts (8×8)

Современная веб‑платформа для **русских шашек 8×8**: реалтайм‑мультиплеер, партии против ИИ, разбор игры (AI Coach), задачи, локальные лидерборды и **Pro‑подписка через Stripe**.

Проект: **Beknur Tanibergen** · **nFactorial Incubator 26**

---

## Features

- **Realtime multiplayer**: friend‑link комнаты + ranked (WebSocket, server‑authoritative).
- **Checkers engine**: чистый Python движок + alpha‑beta поиск.
- **AI Coach**: аннотации ходов + человеческие объяснения (опционально через OpenAI).
- **Puzzles**: ежедневные задачи + стрик.
- **Kids Mode**: подсказки/упрощение (и ограничения на некоторые функции).
- **Stripe Pro** (test mode): Checkout + Portal + webhook с подписью.

## Tech stack

- Backend: FastAPI, async SQLAlchemy, PostgreSQL, WebSockets
- Frontend: Vite + React + TypeScript + Tailwind, Zustand
- Infra: Docker Compose + Caddy (auto‑HTTPS)

### Architecture (high level)

- **Frontend** (Vite) talks to the API via `VITE_API_BASE` (default `/api`) and to realtime games via `VITE_WS_BASE` (default `/ws`).
- **Backend** mounts REST under `/api/*` and WebSocket under `/ws/*` (see `backend/app/main.py`).
- **Caddy** terminates TLS and routes:
  - `/` → `web` (frontend)
  - `/api/*` → `api` (FastAPI)
  - `/ws/*` → `api` (WebSocket)
- **PostgreSQL** stores users, games, moves, puzzles, Stripe events/subscription state.

### How it works

#### Auth

- Cookie‑based auth. Frontend always sends `credentials: 'include'` (see `frontend/src/lib/api.ts`).
- If a request gets `401`, the client tries one refresh (`POST /api/auth/refresh`) and retries the original request.

#### Games (REST + WS)

- Create games via REST:
  - `POST /api/games/vs-ai`
  - `POST /api/games/friend`
  - `POST /api/games/ranked`
- Realtime games use WS:
  - Client requests a short‑lived ticket: `POST /api/auth/ws-ticket/{gameId}`
  - Then connects to `/ws/...` with that ticket.
- Moves are always **validated server‑side** with the engine; the server is the source of truth.

#### Engine + AI Coach

- Engine lives in `backend/app/games/engine/` and is **pure Python** (rules + move generation + search).
- AI Coach is optional:
  - If `OPENAI_API_KEY` is set, it produces human‑readable explanations.
  - If it’s empty, the app still runs end‑to‑end (coach falls back to templates).

#### Billing (Stripe)

- Stripe is **optional** and intended for test mode in hackathon/demo.
- Backend exposes:
  - `GET /api/billing/config` (feature flags + prices + skins)
  - `POST /api/billing/checkout`
  - `POST /api/billing/portal`
  - `POST /api/billing/webhook` (signature validation via `STRIPE_WEBHOOK_SECRET`)

---

## Quick start (local dev)

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker (optional, for production‑like run)

### 1) Configure env

```bash
cp .env.example .env
```

Minimal required for local play:
- `JWT_SECRET` (set to any random string for dev)

Optional:
- `OPENAI_API_KEY`, `OPENAI_MODEL` (AI Coach)
- `STRIPE_*` keys + price ids (Pro flows)
- `ALLOWED_ORIGINS` (CORS / cookies)

### 2) Install deps

```bash
make install
```

### 3) Run backend + frontend

In two terminals:

```bash
make backend
```

```bash
make frontend
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000` (health: `/healthz`)

### 4) Seed demo data (optional)

If you’re running via Docker (recommended for Postgres seeding):

```bash
make seed
```

Or local SQLite seed:

```bash
make seed-local
```

---

## Run with Docker (prod-ish)

```bash
docker compose up -d --build
```

Caddy will serve:
- frontend on `https://$DOMAIN`
- backend under `/api`
- websocket under `/ws`

See `.env.example` for `DOMAIN`, Stripe URLs, and CORS configuration.

Tip: for first-time DB init in Docker, use:

```bash
make seed
```

---

## Tests

Backend:

```bash
make test
```

Frontend:

```bash
cd frontend && npm run build
```

Note: the current `frontend` lint script uses ESLint v9 which expects `eslint.config.*`. If you want linting, you’ll need to add/migrate the config.

---

## Repo structure

```
backend/
  app/
    games/engine/     # russian checkers rules + search
    games/            # REST + WS + clocks + ELO
    auth/             # auth/session
    coach/            # AI Coach pipeline
    billing/          # Stripe Checkout/Portal/Webhook
    puzzles/          # puzzles + streak
frontend/
  src/
    components/
    features/
    pages/
docker-compose.yml
Caddyfile
.env.example
Makefile
```

---

## Credits

Built by **Beknur Tanibergen** for **nFactorial Incubator 26**.
