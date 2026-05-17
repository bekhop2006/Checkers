create table if not exists public.rating_history (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  elo_before int not null,
  elo_after int not null,
  delta int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.coach_reports (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  summary_ru text not null,
  headline text,
  moments_json jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.rating_history enable row level security;
alter table public.coach_reports enable row level security;

create policy "Users read own rating history" on public.rating_history
  for select using (auth.uid() = user_id);

create policy "Users read own coach reports" on public.coach_reports
  for select using (auth.uid() = user_id);

-- Finish rated match and update Elo atomically
create or replace function public.finish_rated_match(
  p_match_id uuid,
  p_winner_id uuid,
  p_ended_reason text
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  m public.matches%rowtype;
  w_elo int;
  b_elo int;
  w_score float;
  b_score float;
  calc record;
  new_w int;
  new_b int;
  d_w int;
  d_b int;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;
  if m.status = 'finished' then
    return jsonb_build_object('already_finished', true);
  end if;

  select elo into w_elo from public.profiles where id = m.white_id;
  select elo into b_elo from public.profiles where id = m.black_id;

  if p_winner_id = m.white_id then
    w_score := 1; b_score := 0;
  elsif p_winner_id = m.black_id then
    w_score := 0; b_score := 1;
  else
    w_score := 0.5; b_score := 0.5;
  end if;

  new_w := round(w_elo + 32 * (w_score - (1.0 / (1 + power(10, (b_elo - w_elo) / 400.0)))));
  new_b := round(b_elo + 32 * (b_score - (1.0 / (1 + power(10, (w_elo - b_elo) / 400.0)))));
  d_w := new_w - w_elo;
  d_b := new_b - b_elo;

  update public.profiles set elo = new_w,
    wins = wins + case when w_score = 1 then 1 else 0 end,
    losses = losses + case when w_score = 0 then 1 else 0 end,
    draws = draws + case when w_score = 0.5 then 1 else 0 end
  where id = m.white_id;

  update public.profiles set elo = new_b,
    wins = wins + case when b_score = 1 then 1 else 0 end,
    losses = losses + case when b_score = 0 then 1 else 0 end,
    draws = draws + case when b_score = 0.5 then 1 else 0 end
  where id = m.black_id;

  update public.matches set
    status = 'finished',
    winner_id = p_winner_id,
    ended_reason = p_ended_reason,
    white_elo_before = w_elo,
    black_elo_before = b_elo,
    white_elo_delta = d_w,
    black_elo_delta = d_b,
    finished_at = now()
  where id = p_match_id;

  insert into public.rating_history (match_id, user_id, elo_before, elo_after, delta)
  values (p_match_id, m.white_id, w_elo, new_w, d_w),
         (p_match_id, m.black_id, b_elo, new_b, d_b);

  return jsonb_build_object(
    'white', jsonb_build_object('before', w_elo, 'after', new_w, 'delta', d_w),
    'black', jsonb_build_object('before', b_elo, 'after', new_b, 'delta', d_b)
  );
end;
$$;

-- Leaderboard view
create or replace view public.leaderboard_global as
select id, username, city, elo, wins, losses, draws,
  row_number() over (order by elo desc) as rank
from public.profiles
where username is not null
order by elo desc;

grant select on public.leaderboard_global to anon, authenticated;
