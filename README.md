# Blitz Checkers

Русские шашки 8×8: blitz 3:00, rated multiplayer, Elo, AI Coach.

## Структура

```
checkers/
├── frontend/            # Next.js 15 — UI, страницы, API routes
├── backend/             # PartyKit (WebSocket), Supabase migrations
│   ├── src/             # checkers-room.ts
│   └── supabase/
├── packages/
│   ├── engine/          # @checkers/engine — правила шашек
│   └── shared-types/    # общие TypeScript-типы
└── .env                 # переменные окружения (корень, подхватывает frontend)
```

## Запуск

```bash
npm install
npm run dev:frontend     # http://localhost:3000
npm run dev:backend      # PartyKit :1999
npm test
npm run typecheck
```

Скопируй `.env.example` → `.env` в **корне** репозитория.

## Deploy

| Часть | Сервис | Папка |
|-------|--------|--------|
| Frontend | Vercel | `frontend/` |
| Backend (WS) | PartyKit | `backend/` → `npm run deploy -w backend` |
| БД | Supabase | миграции в `backend/supabase/migrations/` |
