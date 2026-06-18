create or replace function public.required_experience_for_level(next_level integer)
returns integer
language sql
immutable
as $$
  select case
    when next_level between 2 and 100 then
      (ceil((power(next_level::numeric, 1.5) * 50) / 100) * 100)::integer
    else null
  end;
$$;

grant execute on function public.required_experience_for_level(integer) to authenticated;

alter table public.characters
add column if not exists level integer not null default 1,
add column if not exists experience integer not null default 0;

alter table public.characters
drop constraint if exists characters_level_check,
add constraint characters_level_check
check (level between 1 and 100);

alter table public.characters
drop constraint if exists characters_experience_check,
add constraint characters_experience_check
check (experience >= 0);

alter table public.characters
drop constraint if exists characters_progression_check,
add constraint characters_progression_check
check (
  (level < 100 and experience < public.required_experience_for_level(level + 1))
  or (level = 100 and experience = 0)
);

drop policy if exists "characters_insert_own" on public.characters;
drop policy if exists "characters_update_own" on public.characters;

create policy "characters_insert_own"
on public.characters
for insert
to authenticated
with check (
  auth.uid() = user_id
  and level = 1
  and experience = 0
);
