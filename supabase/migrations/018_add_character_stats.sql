alter table public.characters
add column if not exists strength integer not null default 1,
add column if not exists agility integer not null default 1,
add column if not exists dexterity integer not null default 1,
add column if not exists vitality integer not null default 1,
add column if not exists endurance integer not null default 1,
add column if not exists intelligence integer not null default 1,
add column if not exists wisdom integer not null default 1,
add column if not exists stat_points integer not null default 0,
add column if not exists bonus_stat_points integer not null default 0;

update public.characters
set stat_points = greatest(0, ((level - 1) * 5 + bonus_stat_points) - (
  strength + agility + dexterity + vitality + endurance + intelligence + wisdom - 7
));

alter table public.characters
drop constraint if exists characters_stats_min_check,
add constraint characters_stats_min_check
check (
  strength >= 1
  and agility >= 1
  and dexterity >= 1
  and vitality >= 1
  and endurance >= 1
  and intelligence >= 1
  and wisdom >= 1
  and stat_points >= 0
  and bonus_stat_points >= 0
);

alter table public.characters
drop constraint if exists characters_stats_total_check,
add constraint characters_stats_total_check
check (
  (strength + agility + dexterity + vitality + endurance + intelligence + wisdom) - 7 + stat_points
  = ((level - 1) * 5) + bonus_stat_points
);

create or replace function public.allocate_character_stats(
  strength_delta integer default 0,
  agility_delta integer default 0,
  dexterity_delta integer default 0,
  vitality_delta integer default 0,
  endurance_delta integer default 0,
  intelligence_delta integer default 0,
  wisdom_delta integer default 0
)
returns public.characters
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  delta_total integer;
begin
  strength_delta := coalesce(strength_delta, 0);
  agility_delta := coalesce(agility_delta, 0);
  dexterity_delta := coalesce(dexterity_delta, 0);
  vitality_delta := coalesce(vitality_delta, 0);
  endurance_delta := coalesce(endurance_delta, 0);
  intelligence_delta := coalesce(intelligence_delta, 0);
  wisdom_delta := coalesce(wisdom_delta, 0);

  if strength_delta < 0
    or agility_delta < 0
    or dexterity_delta < 0
    or vitality_delta < 0
    or endurance_delta < 0
    or intelligence_delta < 0
    or wisdom_delta < 0 then
    raise exception 'invalid_stat_delta';
  end if;

  delta_total := strength_delta
    + agility_delta
    + dexterity_delta
    + vitality_delta
    + endurance_delta
    + intelligence_delta
    + wisdom_delta;

  if delta_total <= 0 then
    raise exception 'empty_stat_delta';
  end if;

  select *
  into target_character
  from public.characters
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'character_not_found';
  end if;

  if target_character.stat_points < delta_total then
    raise exception 'insufficient_stat_points';
  end if;

  update public.characters
  set
    strength = strength + strength_delta,
    agility = agility + agility_delta,
    dexterity = dexterity + dexterity_delta,
    vitality = vitality + vitality_delta,
    endurance = endurance + endurance_delta,
    intelligence = intelligence + intelligence_delta,
    wisdom = wisdom + wisdom_delta,
    stat_points = stat_points - delta_total
  where id = target_character.id
  returning * into target_character;

  return target_character;
end;
$$;

grant execute on function public.allocate_character_stats(integer, integer, integer, integer, integer, integer, integer) to authenticated;

drop policy if exists "characters_insert_own" on public.characters;

create policy "characters_insert_own"
on public.characters
for insert
to authenticated
with check (
  auth.uid() = user_id
  and level = 1
  and experience = 0
  and strength = 1
  and agility = 1
  and dexterity = 1
  and vitality = 1
  and endurance = 1
  and intelligence = 1
  and wisdom = 1
  and stat_points = 0
  and bonus_stat_points = 0
);

drop function if exists public.train_my_character();

create function public.train_my_character()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  required_experience integer;
  reward_roll numeric;
  gained_experience integer;
  reward_tier text;
  level_before integer;
  level_ups integer := 0;
begin
  select *
  into target_character
  from public.characters
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'character_not_found';
  end if;

  level_before := target_character.level;

  if target_character.level >= 100 then
    update public.characters
    set experience = 0
    where id = target_character.id
    returning * into target_character;

    return jsonb_build_object(
      'character', to_jsonb(target_character),
      'gained_experience', 0,
      'reward_tier', 'max',
      'level_before', level_before,
      'level_after', target_character.level
    );
  end if;

  reward_roll := random();

  if reward_roll < 0.05 then
    reward_tier := 'great';
    gained_experience := floor(random() * 61)::integer + 60;
  elsif reward_roll < 0.30 then
    reward_tier := 'good';
    gained_experience := floor(random() * 20)::integer + 16;
  else
    reward_tier := 'normal';
    gained_experience := floor(random() * 11)::integer + 5;
  end if;

  target_character.experience := target_character.experience + gained_experience;

  while target_character.level < 100 loop
    required_experience := public.required_experience_for_level(target_character.level + 1);

    exit when required_experience is null or target_character.experience < required_experience;

    target_character.experience := target_character.experience - required_experience;
    target_character.level := target_character.level + 1;
    level_ups := level_ups + 1;
  end loop;

  if target_character.level = 100 then
    target_character.experience := 0;
  end if;

  update public.characters
  set
    level = target_character.level,
    experience = target_character.experience,
    stat_points = stat_points + (level_ups * 5)
  where id = target_character.id
  returning * into target_character;

  return jsonb_build_object(
    'character', to_jsonb(target_character),
    'gained_experience', gained_experience,
    'reward_tier', reward_tier,
    'level_before', level_before,
    'level_after', target_character.level
  );
end;
$$;

grant execute on function public.train_my_character() to authenticated;
