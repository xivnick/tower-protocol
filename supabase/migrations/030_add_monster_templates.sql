create table public.monster_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  base_level integer not null default 1 check (base_level >= 1),
  stat_points_per_level integer not null default 5 check (stat_points_per_level >= 0),
  base_strength integer not null default 0 check (base_strength >= 0),
  base_agility integer not null default 0 check (base_agility >= 0),
  base_dexterity integer not null default 0 check (base_dexterity >= 0),
  base_vitality integer not null default 0 check (base_vitality >= 0),
  base_endurance integer not null default 0 check (base_endurance >= 0),
  base_intelligence integer not null default 0 check (base_intelligence >= 0),
  base_wisdom integer not null default 0 check (base_wisdom >= 0),
  growth_strength integer not null default 0 check (growth_strength >= 0),
  growth_agility integer not null default 0 check (growth_agility >= 0),
  growth_dexterity integer not null default 0 check (growth_dexterity >= 0),
  growth_vitality integer not null default 0 check (growth_vitality >= 0),
  growth_endurance integer not null default 0 check (growth_endurance >= 0),
  growth_intelligence integer not null default 0 check (growth_intelligence >= 0),
  growth_wisdom integer not null default 0 check (growth_wisdom >= 0),
  physical_defense integer not null default 0 check (physical_defense >= 0),
  basic_attack_enabled boolean not null default true,
  experience_multiplier numeric(5, 2) not null default 1 check (experience_multiplier > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.monster_templates enable row level security;

create trigger monster_templates_set_updated_at
before update on public.monster_templates
for each row
execute function public.set_updated_at();

insert into public.monster_templates (
  code, name, base_vitality, base_endurance,
  growth_vitality, growth_endurance, physical_defense,
  basic_attack_enabled, experience_multiplier
)
values ('training-dummy', '허수아비', 10, 10, 2, 1, 10, false, 1)
on conflict (code) do nothing;

create or replace function public.monster_stats_at_level(template_row public.monster_templates, target_level integer)
returns jsonb
language plpgsql
immutable
as $$
declare
  stat_keys text[] := array['strength', 'agility', 'dexterity', 'vitality', 'endurance', 'intelligence', 'wisdom'];
  base_values integer[] := array[
    template_row.base_strength, template_row.base_agility, template_row.base_dexterity,
    template_row.base_vitality, template_row.base_endurance, template_row.base_intelligence, template_row.base_wisdom
  ];
  weights integer[] := array[
    template_row.growth_strength, template_row.growth_agility, template_row.growth_dexterity,
    template_row.growth_vitality, template_row.growth_endurance, template_row.growth_intelligence, template_row.growth_wisdom
  ];
  values integer[] := base_values;
  allocated integer[] := array[0, 0, 0, 0, 0, 0, 0];
  total_points integer := greatest(0, target_level - template_row.base_level) * template_row.stat_points_per_level;
  total_weight integer := 0;
  used_points integer := 0;
  remaining_points integer;
  best_index integer;
  best_remainder numeric;
  current_remainder numeric;
  index integer;
  result jsonb := '{}'::jsonb;
begin
  for index in 1..array_length(weights, 1) loop
    total_weight := total_weight + weights[index];
  end loop;

  if total_weight > 0 then
    for index in 1..array_length(weights, 1) loop
      allocated[index] := floor((total_points::numeric * weights[index]) / total_weight)::integer;
      values[index] := values[index] + allocated[index];
      used_points := used_points + allocated[index];
    end loop;

    remaining_points := total_points - used_points;
    while remaining_points > 0 loop
      best_index := null;
      best_remainder := -1;
      for index in 1..array_length(weights, 1) loop
        if weights[index] > 0 and allocated[index] < total_points then
          current_remainder := ((total_points::numeric * weights[index]) / total_weight) - floor((total_points::numeric * weights[index]) / total_weight);
          if current_remainder > best_remainder then
            best_index := index;
            best_remainder := current_remainder;
          end if;
        end if;
      end loop;
      values[best_index] := values[best_index] + 1;
      allocated[best_index] := total_points;
      remaining_points := remaining_points - 1;
    end loop;
  end if;

  for index in 1..array_length(stat_keys, 1) loop
    result := result || jsonb_build_object(stat_keys[index], values[index]);
  end loop;
  return result;
end;
$$;

create or replace function public.experience_for_monster_level(monster_level integer)
returns integer
language sql
immutable
as $$
  select greatest(10, monster_level * 10);
$$;

create or replace function public.hunt_training_dummy()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  hunt_state public.character_hunt_states%rowtype;
  dummy_template public.monster_templates%rowtype;
  dummy_stats jsonb;
  level_before integer;
  experience_before integer;
  gained_experience integer;
  duration_ticks integer := 0;
  max_duration_ticks integer := 600;
  started_at timestamptz := clock_timestamp();
  battle_ends_at timestamptz;
  attack_gauge numeric := 0;
  attacks_per_second numeric;
  critical_chance numeric;
  player_max_hp numeric;
  dummy_vitality integer;
  dummy_endurance integer;
  dummy_max_hp numeric;
  dummy_hp numeric;
  dummy_physical_defense numeric;
  dummy_regeneration_per_second numeric;
  damage integer;
  raw_damage numeric;
  healed_amount numeric;
  total_damage integer := 0;
  attack_count integer := 0;
  critical_count integer := 0;
  total_regeneration numeric := 0;
  is_critical boolean;
  logs jsonb := '[]'::jsonb;
  battle jsonb;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;

  insert into public.character_hunt_states (character_id)
  values (target_character.id)
  on conflict (character_id) do nothing;
  select * into hunt_state from public.character_hunt_states where character_id = target_character.id for update;
  if hunt_state.last_battle ->> 'status' = 'in_progress' then raise exception 'hunt_in_progress'; end if;
  if hunt_state.available_at is not null and hunt_state.available_at > started_at then raise exception 'hunt_on_cooldown'; end if;

  select * into dummy_template from public.monster_templates where code = 'training-dummy';
  if not found then raise exception 'monster_template_not_found'; end if;

  level_before := target_character.level;
  experience_before := target_character.experience;
  dummy_stats := public.monster_stats_at_level(dummy_template, level_before);
  dummy_vitality := (dummy_stats ->> 'vitality')::integer;
  dummy_endurance := (dummy_stats ->> 'endurance')::integer;
  dummy_physical_defense := dummy_template.physical_defense;
  gained_experience := round(public.experience_for_monster_level(level_before) * dummy_template.experience_multiplier)::integer;
  player_max_hp := 100 + (target_character.level * 20) + (target_character.vitality * 10);
  attacks_per_second := sqrt((100 + target_character.agility)::numeric / 100);
  critical_chance := least(target_character.dexterity, 100)::numeric / 100;
  dummy_max_hp := 100 + (level_before * 20) + (dummy_vitality * 10);
  dummy_hp := dummy_max_hp;
  dummy_regeneration_per_second := dummy_max_hp * (dummy_endurance::numeric / 10000);

  logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', 0, 'kind', 'encounter', 'amount', 0, 'target_hp', dummy_hp));
  attack_gauge := 1 - (attacks_per_second / 10);
  while duration_ticks < max_duration_ticks and dummy_hp > 0 loop
    duration_ticks := duration_ticks + 1;
    attack_gauge := attack_gauge + (attacks_per_second / 10);
    if attack_gauge >= 1 then
      attack_gauge := attack_gauge - 1;
      is_critical := random() < critical_chance;
      raw_damage := public.character_physical_attack(target_character);
      if is_critical then raw_damage := raw_damage * 1.5; end if;
      damage := greatest(1, floor(raw_damage * (100 / (100 + dummy_physical_defense)))::integer);
      dummy_hp := greatest(0, dummy_hp - damage);
      total_damage := total_damage + damage;
      attack_count := attack_count + 1;
      if is_critical then critical_count := critical_count + 1; end if;
      logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', case when is_critical then 'critical' else 'attack' end, 'amount', damage, 'target_hp', dummy_hp));
      if dummy_hp <= 0 then
        logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'defeat', 'amount', 0, 'target_hp', 0));
        exit;
      end if;
    end if;
    if mod(duration_ticks, 10) = 0 and dummy_hp < dummy_max_hp then
      healed_amount := least(dummy_regeneration_per_second, dummy_max_hp - dummy_hp);
      dummy_hp := dummy_hp + healed_amount;
      total_regeneration := total_regeneration + healed_amount;
      logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'regeneration', 'amount', healed_amount, 'target_hp', dummy_hp));
    end if;
  end loop;
  if dummy_hp > 0 then raise exception 'training_dummy_not_defeated'; end if;

  battle_ends_at := started_at + (duration_ticks * interval '100 milliseconds');
  battle := jsonb_build_object(
    'hunt_ground_id', 'training-dummy', 'status', 'in_progress', 'started_at', started_at, 'ends_at', battle_ends_at,
    'player', jsonb_build_object('name', target_character.name, 'level', level_before, 'max_hp', player_max_hp, 'experience', experience_before),
    'enemy', jsonb_build_object('name', dummy_template.name, 'level', level_before, 'max_hp', dummy_max_hp),
    'gained_experience', gained_experience, 'level_before', level_before, 'level_after', level_before, 'experience_after', experience_before,
    'duration_ticks', duration_ticks, 'total_damage', total_damage, 'attack_count', attack_count,
    'critical_count', critical_count, 'total_regeneration', total_regeneration, 'logs', logs
  );
  update public.character_hunt_states set available_at = battle_ends_at, last_battle = battle where character_id = target_character.id;
  update public.characters set hunt_available_at = battle_ends_at where id = target_character.id;
  return jsonb_build_object('hunt_state', jsonb_build_object('available_at', battle_ends_at, 'last_battle', battle));
end;
$$;

grant execute on function public.experience_for_monster_level(integer) to authenticated;
grant execute on function public.hunt_training_dummy() to authenticated;
