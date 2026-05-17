-- Use username/city from signup metadata when creating profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta_username text := nullif(trim(new.raw_user_meta_data->>'username'), '');
  meta_city text := nullif(trim(new.raw_user_meta_data->>'city'), '');
begin
  insert into public.profiles (id, username, city)
  values (
    new.id,
    coalesce(meta_username, 'player_' || substr(new.id::text, 1, 8)),
    meta_city
  );
  return new;
end;
$$;
