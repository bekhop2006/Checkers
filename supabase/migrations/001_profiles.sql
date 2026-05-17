-- Profiles with default Elo 1000
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  city text,
  avatar_url text,
  elo int not null default 1000,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  is_pro boolean not null default false,
  coach_uses_today int not null default 0,
  coach_reset_date date default current_date,
  stripe_customer_id text,
  owned_skins text[] default '{}',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles read" on public.profiles
  for select using (true);

create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'player_' || substr(new.id::text, 1, 8));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
