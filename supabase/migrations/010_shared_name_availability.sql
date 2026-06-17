drop index if exists public.profiles_nickname_unique_idx;

create unique index if not exists profiles_nickname_unique_idx
on public.profiles (nickname);

create unique index if not exists characters_name_unique_idx
on public.characters (name);

do $$
begin
  if exists (
    select 1
    from public.profiles p
    join public.characters c
      on c.name = p.nickname
     and c.user_id <> p.user_id
  ) then
    raise exception 'shared_name_conflict_existing_data';
  end if;
end;
$$;

create or replace function public.is_profile_name_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    btrim(candidate) = candidate
    and char_length(candidate) between 2 and 16
    and candidate ~ '^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_]+$'
    and not exists (
      select 1
      from public.profiles
      where nickname = candidate
    )
    and not exists (
      select 1
      from public.characters
      where name = candidate
        and user_id <> auth.uid()
    );
$$;

create or replace function public.is_character_name_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    btrim(candidate) = candidate
    and char_length(candidate) between 2 and 16
    and candidate ~ '^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_]+$'
    and not exists (
      select 1
      from public.characters
      where name = candidate
    )
    and not exists (
      select 1
      from public.profiles
      where nickname = candidate
        and user_id <> auth.uid()
    );
$$;

create or replace function public.is_nickname_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_profile_name_available(candidate);
$$;

grant execute on function public.is_profile_name_available(text) to authenticated;
grant execute on function public.is_character_name_available(text) to authenticated;
grant execute on function public.is_nickname_available(text) to authenticated;

create or replace function public.enforce_profile_name_available()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('shared-name:' || new.nickname));

  if exists (
    select 1
    from public.profiles
    where nickname = new.nickname
      and user_id <> new.user_id
  ) then
    raise exception 'shared_name_conflict';
  end if;

  if exists (
    select 1
    from public.characters
    where name = new.nickname
      and user_id <> new.user_id
  ) then
    raise exception 'shared_name_conflict';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_character_name_available()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('shared-name:' || new.name));

  if exists (
    select 1
    from public.characters
    where name = new.name
      and id <> new.id
  ) then
    raise exception 'shared_name_conflict';
  end if;

  if exists (
    select 1
    from public.profiles
    where nickname = new.name
      and user_id <> new.user_id
  ) then
    raise exception 'shared_name_conflict';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_shared_name on public.profiles;
create trigger profiles_enforce_shared_name
before insert or update of nickname on public.profiles
for each row
execute function public.enforce_profile_name_available();

drop trigger if exists characters_enforce_shared_name on public.characters;
create trigger characters_enforce_shared_name
before insert or update of name on public.characters
for each row
execute function public.enforce_character_name_available();
