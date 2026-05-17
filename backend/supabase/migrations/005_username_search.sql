-- Case-insensitive unique nicknames + search by username
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username))
  where username is not null;

create index if not exists profiles_username_idx on public.profiles (username);
