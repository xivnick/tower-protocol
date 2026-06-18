alter table public.characters
alter column strength set default 10,
alter column agility set default 10,
alter column dexterity set default 10,
alter column vitality set default 10,
alter column endurance set default 10,
alter column intelligence set default 10,
alter column wisdom set default 10;

alter table public.characters
drop constraint if exists characters_stats_total_check,
drop constraint if exists characters_stats_min_check;

update public.characters
set
  strength = strength + 9,
  agility = agility + 9,
  dexterity = dexterity + 9,
  vitality = vitality + 9,
  endurance = endurance + 9,
  intelligence = intelligence + 9,
  wisdom = wisdom + 9;

alter table public.characters
add constraint characters_stats_min_check
check (
  strength >= 10
  and agility >= 10
  and dexterity >= 10
  and vitality >= 10
  and endurance >= 10
  and intelligence >= 10
  and wisdom >= 10
  and stat_points >= 0
  and bonus_stat_points >= 0
);

alter table public.characters
add constraint characters_stats_total_check
check (
  (strength + agility + dexterity + vitality + endurance + intelligence + wisdom) - 70 + stat_points
  = ((level - 1) * 5) + bonus_stat_points
);

drop policy if exists "characters_insert_own" on public.characters;

create policy "characters_insert_own"
on public.characters
for insert
to authenticated
with check (
  auth.uid() = user_id
  and level = 1
  and experience = 0
  and strength = 10
  and agility = 10
  and dexterity = 10
  and vitality = 10
  and endurance = 10
  and intelligence = 10
  and wisdom = 10
  and stat_points = 0
  and bonus_stat_points = 0
);

create or replace function public.reset_character_stats()
returns public.characters
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
begin
  select *
  into target_character
  from public.characters
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'character_not_found';
  end if;

  update public.characters
  set
    strength = 10,
    agility = 10,
    dexterity = 10,
    vitality = 10,
    endurance = 10,
    intelligence = 10,
    wisdom = 10,
    stat_points = ((level - 1) * 5) + bonus_stat_points
  where id = target_character.id
  returning * into target_character;

  return target_character;
end;
$$;

grant execute on function public.reset_character_stats() to authenticated;
