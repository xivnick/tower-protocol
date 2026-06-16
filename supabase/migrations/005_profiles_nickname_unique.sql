create unique index if not exists profiles_nickname_unique_idx
on public.profiles (lower(nickname));

create or replace function public.is_nickname_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    char_length(btrim(candidate)) between 2 and 16
    and not exists (
      select 1
      from public.profiles
      where lower(nickname) = lower(btrim(candidate))
    );
$$;

grant execute on function public.is_nickname_available(text) to authenticated;
