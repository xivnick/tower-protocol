update public.monster_templates
set stat_points_per_level = 5
where code = any (array[
  'angry-boar', 'forest-wolf', 'firefly-spirit', 'stone-beetle',
  'forest-warden-stag', 'green-viper', 'vine-hunter', 'moss-slime',
  'leafshade-panther', 'redthorn-beast', 'blackneedle-bat', 'bigeye-bat',
  'blade-beetle', 'crystal-lizard', 'crystaljaw-centipede', 'cave-vampire-bat'
]);

create or replace function public.monster_stats_at_level(template_row public.monster_templates, target_level integer)
returns jsonb
language plpgsql
immutable
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
      allocations[index] := floor((total_points::numeric * weights[index]) / total_weight)::integer;
      values[index] := values[index] + allocations[index];
      used_points := used_points + allocations[index];
    end loop;

    remaining_points := total_points - used_points;
    while remaining_points > 0 loop
      best_index := null;
      best_remainder := -1;
      for index in 1..array_length(weights, 1) loop
        if weights[index] > 0 and allocations[index] < total_points then
          current_remainder := ((total_points::numeric * weights[index]) / total_weight) - floor((total_points::numeric * weights[index]) / total_weight);
          if current_remainder > best_remainder then
            best_index := index;
            best_remainder := current_remainder;
          end if;
        end if;
      end loop;
      values[best_index] := values[best_index] + 1;
      allocations[best_index] := total_points;
      remaining_points := remaining_points - 1;
    end loop;
  end if;

  for index in 1..array_length(stat_keys, 1) loop
    result := result || jsonb_build_object(stat_keys[index], values[index]);
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
  effective_bonus numeric;
  effective_strength numeric;
  effective_agility numeric;
  effective_dexterity numeric;
  effective_intelligence numeric;
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
  effective_bonus := target_level::numeric * 0.5;
  effective_strength := strength + effective_bonus;
  effective_agility := agility + effective_bonus;
  effective_dexterity := dexterity + effective_bonus;
  effective_intelligence := intelligence + effective_bonus;
  max_hp := 100 + (target_level * 20) + (vitality * 10);
  attack_speed := 1 + effective_agility / 100;

  return jsonb_build_object(
    'primary_stats', primary_stats,
    'effective_stats', jsonb_build_object(
      'strength', effective_strength,
      'agility', effective_agility,
      'dexterity', effective_dexterity,
      'vitality', vitality,
      'endurance', endurance,
      'intelligence', effective_intelligence,
      'wisdom', wisdom
    ),
    'physical_attack', effective_strength,
    'magic_attack', effective_intelligence,
    'physical_defense', endurance,
    'magic_defense', wisdom,
    'max_hp', max_hp,
    'regeneration', max_hp * (endurance::numeric / 3000),
    'attacks_per_second', attack_speed,
    'cooldown_reduction', wisdom::numeric / (wisdom + 100),
    'accuracy', 100 + effective_dexterity,
    'evasion_rate', (effective_agility / (effective_agility + 100)) * 100,
    'critical_chance', least(effective_dexterity, 100),
    'critical_damage', 150
  );
end;
$$;
