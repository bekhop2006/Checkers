# Blitz Checkers

Русские шашки 8×8: blitz 3:00, rated multiplayer по ссылке, Elo (старт 1000), AI Coach, лидерборд, Stripe Pro.

## Monorepo

```
apps/web          — Next.js 15
packages/engine   — @checkers/engine
party/            — PartyKit multiplayer
supabase/         — SQL migrations
```

## Local dev

```bash
pnpm install
pnpm test                    # engine tests
pnpm dev:web                 # http://localhost:3000
pnpm dev:party               # PartyKit on :1999
```

Copy `.env.example` → `apps/web/.env.local` and configure Supabase.

### Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Run migrations from `supabase/migrations/`
3. Enable Email auth; add redirect URL `http://localhost:3000/**`

### Free deploy

| Service | Hosts |
|---------|--------|
| [Vercel](https://vercel.com) Hobby | `apps/web` (root: apps/web) |
| [Supabase](https://supabase.com) Free | DB + Auth |
| [PartyKit](https://partykit.io) Free | `party/` → `pnpm deploy` |

Env vars: see `.env.example`. Set `NEXT_PUBLIC_PARTYKIT_HOST` to your PartyKit host.

## Features

- **Регистрация** — профиль с `elo = 1000`
- **Rated PvP** — `/play/[roomId]`, Elo ± после партии
- **Локально / AI** — без изменения рейтинга
- **AI Coach** — 1/день free, безлимит Pro
- **Лидерборд** — global + по городу
