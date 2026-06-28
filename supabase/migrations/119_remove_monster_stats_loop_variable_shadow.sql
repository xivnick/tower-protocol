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

  for stat_index in 1..array_length(stat_keys, 1) loop
    result := result || jsonb_build_object(stat_keys[stat_index], values[stat_index]);
  end loop;
  return result;
end;
$$;
