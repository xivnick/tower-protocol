create or replace function public.monster_stats_at_level(template_row public.monster_templates, target_level integer)
returns jsonb
language plpgsql
stable
as $$
declare
  stat_keys text[] := array['strength', 'agility', 'dexterity', 'vitality', 'endurance', 'intelligence', 'wisdom'];
  weights integer[] := array[
    template_row.growth_strength, template_row.growth_agility, template_row.growth_dexterity,
    template_row.growth_vitality, template_row.growth_endurance, template_row.growth_intelligence, template_row.growth_wisdom
  ];
  values integer[] := array[10, 10, 10, 10, 10, 10, 10];
  allocations integer[] := array[0, 0, 0, 0, 0, 0, 0];
  total_points integer := greatest(0, target_level - template_row.base_level) * template_row.stat_points_per_level;
  level_combat_bonus integer := floor(target_level::numeric * 0.5)::integer;
  total_weight integer := 0;
  used_points integer := 0;
  remaining_points integer;
  best_index integer;
  best_remainder numeric;
  current_remainder numeric;
  result jsonb := '{}'::jsonb;
begin
  for stat_index in 1..array_length(weights, 1) loop
    total_weight := total_weight + weights[stat_index];
  end loop;

  if total_weight > 0 then
    for stat_index in 1..array_length(weights, 1) loop
      allocations[stat_index] := floor((total_points::numeric * weights[stat_index]) / total_weight)::integer;
      values[stat_index] := values[stat_index] + allocations[stat_index];
      used_points := used_points + allocations[stat_index];
    end loop;

    remaining_points := total_points - used_points;
    while remaining_points > 0 loop
      best_index := null;
      best_remainder := -1;
      for stat_index in 1..array_length(weights, 1) loop
        if weights[stat_index] > 0 and allocations[stat_index] < total_points then
          current_remainder := ((total_points::numeric * weights[stat_index]) / total_weight) - floor((total_points::numeric * weights[stat_index]) / total_weight);
          if current_remainder > best_remainder then
            best_index := stat_index;
            best_remainder := current_remainder;
          end if;
        end if;
      end loop;
      values[best_index] := values[best_index] + 1;
      allocations[best_index] := total_points;
      remaining_points := remaining_points - 1;
    end loop;
  end if;

  values[1] := values[1] + level_combat_bonus;
  values[2] := values[2] + level_combat_bonus;
  values[3] := values[3] + level_combat_bonus;
  values[6] := values[6] + level_combat_bonus;

  for stat_index in 1..array_length(stat_keys, 1) loop
    result := result || jsonb_build_object(stat_keys[stat_index], values[stat_index]);
  end loop;
  return result;
end;
$$;

create or replace function public.monster_combat_stats_at_level(template_row public.monster_templates, target_level integer)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  primary_stats jsonb;
  strength integer;
  agility integer;
  dexterity integer;
  vitality integer;
  endurance integer;
  intelligence integer;
  wisdom integer;
  max_hp numeric;
  attack_speed numeric;
begin
  primary_stats := public.monster_stats_at_level(template_row, target_level);
  strength := (primary_stats ->> 'strength')::integer;
  agility := (primary_stats ->> 'agility')::integer;
  dexterity := (primary_stats ->> 'dexterity')::integer;
  vitality := (primary_stats ->> 'vitality')::integer;
  endurance := (primary_stats ->> 'endurance')::integer;
  intelligence := (primary_stats ->> 'intelligence')::integer;
  wisdom := (primary_stats ->> 'wisdom')::integer;
  max_hp := 100 + (target_level * 20) + (vitality * 10);
  attack_speed := 1 + agility::numeric / 100;

  return jsonb_build_object(
    'primary_stats', primary_stats,
    'physical_attack', strength,
    'magic_attack', intelligence,
    'physical_defense', endurance,
    'magic_defense', wisdom,
    'max_hp', max_hp,
    'regeneration', max_hp * (endurance::numeric / 3000),
    'attacks_per_second', attack_speed,
    'cooldown_reduction', wisdom::numeric / (wisdom + 100),
    'accuracy', 100 + dexterity,
    'evasion_rate', (agility::numeric / (agility + 100)) * 100,
    'critical_chance', least(dexterity, 100),
    'critical_damage', 150
  );
end;
$$;
