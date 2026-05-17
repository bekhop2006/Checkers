# Checkers — шашки нового поколения

Современная веб-платформа для игры в **русские шашки 8×8** с реалтайм-мультиплеером, ИИ-тренером на базе Claude, рейтингом по городам, режимом для детей и **Stripe-подпиской Pro**.

> 🎓 Хакатон nFactorial 26 · Beknur Tanibergeb · Уровень «Великий».

[Live demo](https://your-domain.example) · [GitHub](https://github.com/your-handle/checkers)

> Перед отправкой замените ссылки выше на реальные URL деплоя и репозитория.

---

## Для кого и зачем

Шашки — лучшая на свете игра, которой не везёт с цифровым опытом: интерфейсы из 2007-го, унылые отчёты и нулевая социалка. Мы строим продукт, который объединяет **четыре аудитории** в одном приложении:

- **Блиц-игроки** — короткие азартные дуэли 1/3/5 минут.
- **Дети 6-12** — мягкий режим с подсказками и понятным ИИ-тренером, защита PIN-ом.
- **Те, кто тренирует мышление** — ежедневные тактические задачи и стрики.
- **Любители онлайн-партий** — мультиплеер по ссылке без регистрации соперника.

Поверх — **AI Coach**, который не просто оценивает ходы в сантипешках, а **объясняет на человеческом языке**, что было лучше («Здесь ты мог сделать двойное взятие на c5, а сыгранный ход открыл дамку сопернику»). И настоящий **paywall на Stripe** — продукт сразу выглядит как стартап, а не курсовая.

## Почему это ценно

| Фишка | Что выделяет на рынке |
|---|---|
| 🤝 **Мультиплеер по ссылке** | WebSocket-комнаты, сервер — единственный источник правды, переподключение без потери позиции, гостевой вход по ссылке без регистрации (friend mode) |
| 🤖 **AI Coach (engine + Claude)** | Свой alpha-beta движок находит блёндеры → Claude формулирует разбор простыми словами, по аудитории (adult / kid / expert) |
| 🏙 **Рейтинг по городам** | Локальный ELO для Алматы / Астаны / Шымкента / … — соревнование со «своими» |
| 🧒 **Детский режим** | Большие фигуры, всегда видимые подсказки, кид-тон ИИ-тренера, защита PIN |
| 💳 **Pro на Stripe (test mode)** | Реальный Checkout, webhook с подписью, премиум-скины (реально применяются к доске/фигурам) и эксперт-уровень ИИ |
| ⚡ **Self-host** | Один `docker compose up` поднимает Caddy + auto-HTTPS, frontend, FastAPI и Postgres |

## Стек

| Уровень | Технологии |
|---|---|
| Backend | **FastAPI** + async SQLAlchemy 2.x + **PostgreSQL** + WebSockets, **pure-Python** движок русских шашек (alpha-beta, transposition table) |
| AI Coach | Собственный анализатор позиции + **Anthropic Claude** (`claude-haiku-4-5`) с **prompt caching** |
| Frontend | **Vite + React 18 + TypeScript**, Tailwind, Zustand, TanStack Query, чистые CSS-анимации |
| Биллинг | **Stripe Checkout** + Customer Portal + webhook с проверкой подписи |
| Деплой | **Docker Compose** + **Caddy** (auto-HTTPS Let's Encrypt) |

---

## Быстрый старт (локально)

### Требования
- Python 3.11+ и [uv](https://docs.astral.sh/uv/) (`brew install uv` / `pipx install uv`)
- Node.js 20+
- (опционально) [Stripe CLI](https://stripe.com/docs/stripe-cli) для приёма вебхуков

### 1. Backend

```bash
cp .env.example .env                # отредактируйте по желанию
cd backend
uv sync --extra dev                 # установка зависимостей
uv run python -m app.scripts.seed   # cоздаст таблицы + 5 стартовых задач + demo-user
uv run uvicorn app.main:app --reload --port 8000
```

API на `http://localhost:8000`, healthcheck — `/healthz`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                          # http://localhost:5173
```

Vite уже проксирует `/api` и `/ws` на бэкенд (см. `vite.config.ts`).

### 3. Stripe (опционально, тестовый режим)

```bash
stripe listen --forward-to localhost:8000/api/billing/webhook
# Скопируйте whsec_… в .env (STRIPE_WEBHOOK_SECRET)
```

Тестовая карта в Checkout: **`4242 4242 4242 4242`**, любая дата в будущем, любой CVC.

### 4. Anthropic (опционально)

Без `ANTHROPIC_API_KEY` AI Coach работает на шаблонных описаниях — приложение демонстрируется в полном виде, просто без живой LLM-нарративы.

---

## Деплой на сервер (Docker + Caddy + auto-HTTPS)

```bash
git clone https://github.com/your-handle/checkers && cd checkers
cp .env.example .env       # обязательно укажите DOMAIN, JWT_SECRET, STRIPE_*, ANTHROPIC_API_KEY
docker compose up -d --build
```

- Caddy сам получит TLS-сертификат от Let's Encrypt для `$DOMAIN`.
- `api` дойдёт до `/healthz` через `db.healthy`.
- Postgres-данные живут в volume `dbdata`.

Логи: `docker compose logs -f`. Стоп: `docker compose down`.

---

## Архитектура

```
┌────────┐   HTTPS   ┌────────┐   /api/*  ┌──────────────┐    asyncpg     ┌──────────┐
│ Browser│─────────▶│  Caddy │───────────▶│  FastAPI app │───────────────▶│ Postgres │
└────────┘           │  TLS   │   /ws/*    │  + engine    │                │  16      │
     ▲ WSS ──────────│        │───────────▶│  + AI Coach  │                └──────────┘
     │               └────────┘            │  + Stripe    │
     │                                     └──────┬───────┘
     │                                            │ HTTPS
     │                                            ▼
     │                                     ┌──────────────┐
     │                                     │ Claude API   │
     └─────────────────────────────────────│ Stripe API   │
                                           └──────────────┘
```

- Движок шашек — **чистый Python без FastAPI-импортов**, используется и для AI-соперника, и для AI Coach.
- Server-authoritative: WebSocket принимает только `{type:"move", path}`, валидирует через движок, применяет, броадкастит обновлённое состояние и таймеры.
- Режимы матчей: `vs_ai`, `friend`, `ranked` (в ranked изменяется ELO; в friend поддержан гостевой вход по ссылке).
- AI Coach запускается **фоновой задачей** в момент завершения партии: движок размечает ходы (blunder / mistake / brilliant), LLM пишет 3–5 предложений на самые ключевые моменты с prompt-кешированием системного контекста.
- Stripe webhook валидирует подпись (`stripe.Webhook.construct_event`) и хранит `event.id` в таблице `stripe_events` для **идемпотентности**.
- Kids Mode policy: в kids mode отключены чат в партиях и billing endpoints (`/billing/checkout`, `/billing/portal`).

## Структура репозитория

```
Checkers/
  backend/
    app/
      games/engine/   ← движок русских шашек + alpha-beta поиск
      games/          ← REST + WebSocket multiplayer + clocks + ELO
      auth/           ← JWT-cookies, кэшируемый user lookup
      coach/          ← анализатор + Claude prompts
      billing/        ← Stripe Checkout + Portal + webhooks
      leaderboard/    ← global / city / weekly
      puzzles/        ← daily puzzle + streaks
      scripts/seed.py ← наполнение базы стартовыми данными
    tests/            ← 31 тест: правила движка + API smoke + поиск + WS manager
  frontend/
    src/
      components/Board ← клик-в-клик с подсветкой обязательных взятий
      features/game    ← WS-хук с автореконнектом
      pages            ← Home, Match, Review, Leaderboard, Pricing, Profile, Settings, Puzzle…
  docker-compose.yml + Caddyfile + .env.example
  Makefile  (быстрые команды для dev / test / migrate / seed)
```

---

## Тесты

```bash
cd backend && uv run pytest
```

31 тест: 19 покрывают rule-edge cases движка (мульти-капчер, mid-chain promotion, flying king, mandatory capture в любую сторону, stalemate, threefold repetition, 50-move rule), 4 — поисковый движок (находит выигрышное взятие, укладывается в time-budget), 7 — HTTP API smoke/e2e (signup → vs-AI → history, guest join по ссылке, ranked create/join, Pro/kids billing guards), 1 — проверка WS connection manager.

Frontend:
```bash
cd frontend && npm run typecheck && npm run build
```

---

## План дальше (если время в хакатоне ещё останется)

- 🌐 Полная RU/EN локализация + i18n-словари.
- 🔊 Звуковой дизайн (move / capture / flag).
- 🎯 ELO-матчмейкинг (сейчас только friend-link и vs-AI).
- 🎮 International 10×10 + English checkers как дополнительные режимы.
- 🏟 Турниры на еженедельной основе.

---

## Креды

Сделал **Beknur Tanibergeb** на nFactorial 26. Спасибо менторам и судьям — играйте сами и подскажите, что улучшить.
