create type match_status as enum ('waiting', 'active', 'finished');
create type match_mode as enum ('blitz', 'local', 'ai', 'friend');

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  room_id text unique,
  white_id uuid references public.profiles (id),
  black_id uuid references public.profiles (id),
  rated boolean not null default true,
  mode match_mode not null default 'blitz',
  status match_status not null default 'waiting',
  winner_id uuid references public.profiles (id),
  ended_reason text,
  white_elo_before int,
  black_elo_before int,
  white_elo_delta int,
  black_elo_delta int,
  board_json jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.moves (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  ply int not null,
  notation text not null,
  board_snapshot_json jsonb,
  created_at timestamptz not null default now()
);

alter table public.matches enable row level security;
alter table public.moves enable row level security;

create policy "Anyone read finished matches" on public.matches
  for select using (true);

create policy "Players read own active matches" on public.matches
  for select using (
    auth.uid() = white_id or auth.uid() = black_id
  );

create policy "Authenticated insert matches" on public.matches
  for insert with check (auth.uid() is not null);

create policy "Players update own matches" on public.matches
  for update using (
    auth.uid() = white_id or auth.uid() = black_id
  );

create policy "Read moves for visible matches" on public.moves
  for select using (true);

create policy "Insert moves for match players" on public.moves
  for insert with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.white_id = auth.uid() or m.black_id = auth.uid())
    )
  );

create index matches_room_id_idx on public.matches (room_id);
create index matches_white_id_idx on public.matches (white_id);
create index matches_black_id_idx on public.matches (black_id);
