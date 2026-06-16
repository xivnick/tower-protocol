alter table public.profiles
drop constraint if exists profiles_nickname_format_check;

alter table public.profiles
add constraint profiles_nickname_format_check
check (
  nickname = btrim(nickname)
  and char_length(nickname) between 2 and 16
  and nickname ~ '^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_]+$'
)
not valid;

create or replace function public.is_nickname_available(candidate text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    char_length(btrim(candidate)) between 2 and 16
    and btrim(candidate) ~ '^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_]+$'
    and not exists (
      select 1
      from public.profiles
      where lower(nickname) = lower(btrim(candidate))
    );
$$;

grant execute on function public.is_nickname_available(text) to authenticated;
