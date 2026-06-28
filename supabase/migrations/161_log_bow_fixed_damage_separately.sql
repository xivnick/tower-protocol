create or replace function public.annotate_hunt_log_links(source_logs jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  result jsonb := '[]'::jsonb;
  entry jsonb;
  entry_kind text;
  entry_source text;
  entry_effect text;
  entry_time integer;
  log_sequence integer := 0;
  parent_sequence integer;
  current_log_time integer := null;
  latest_player_sequence integer := null;
  latest_enemy_sequence integer := null;
begin
  for entry in select value from jsonb_array_elements(coalesce(source_logs, '[]'::jsonb)) loop
    log_sequence := log_sequence + 1;
    entry_kind := entry ->> 'kind';
    entry_source := entry ->> 'source';
    entry_effect := entry ->> 'effect';
    entry_time := (entry ->> 'time_tenths')::integer;
    parent_sequence := null;

    if current_log_time is distinct from entry_time then
      current_log_time := entry_time;
      latest_player_sequence := null;
      latest_enemy_sequence := null;
    end if;

    if entry_kind = 'essence_damage' and entry_effect = '가시 반사' then
      if entry_source = 'enemy' then
        parent_sequence := latest_player_sequence;
      elsif entry_source = 'player' then
        parent_sequence := latest_enemy_sequence;
      end if;
    elsif entry_kind in ('essence_damage', 'essence_dot', 'essence_heal', 'essence_shield', 'weapon_fixed_damage', 'essence_extra_hit', 'essence_reflect', 'reflect', 'shield_absorb') then
      if entry_source = 'enemy' then
        parent_sequence := latest_enemy_sequence;
      elsif entry_source = 'player' then
        parent_sequence := latest_player_sequence;
      end if;
    elsif entry_kind = 'essence_status' then
      if entry_source = 'enemy' then
        parent_sequence := coalesce(latest_enemy_sequence, latest_player_sequence);
      elsif entry_source = 'player' then
        parent_sequence := coalesce(latest_player_sequence, latest_enemy_sequence);
      end if;
    end if;

    entry := entry || jsonb_build_object('sequence', log_sequence);
    if parent_sequence is not null then
      entry := entry || jsonb_build_object('parent_sequence', parent_sequence);
    end if;

    result := result || jsonb_build_array(entry);

    if parent_sequence is null and entry_kind in ('attack', 'critical', 'miss') then
      latest_player_sequence := log_sequence;
    elsif parent_sequence is null and entry_kind in ('enemy_attack', 'enemy_critical', 'enemy_miss') then
      latest_enemy_sequence := log_sequence;
    elsif parent_sequence is null and entry_kind = 'essence_cast' then
      if entry_source = 'enemy' then
        latest_enemy_sequence := log_sequence;
      else
        latest_player_sequence := log_sequence;
      end if;
    end if;
  end loop;

  return result;
end;
$$;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  shield_absorbed numeric := 0;\n  player_used_essence_action boolean := false;' in definition) = 0
    or position(E'        if weapon_stats ->> ''weapon_type'' = ''bow'' then\n          damage := damage + coalesce((weapon_stats ->> ''on_hit_fixed_damage'')::integer, 0);\n        end if;' in definition) = 0
    or position(E'logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_extra_hit'', ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', ''숲 늑대의 연격'', ''grade'', 1));\n        end if;' in definition) = 0
    or position(E'''kind'', ''weapon_fixed_damage''' in definition) > 0 then
    raise exception 'bow_fixed_damage_log_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  shield_absorbed numeric := 0;\n  player_used_essence_action boolean := false;',
    E'  shield_absorbed numeric := 0;\n  weapon_fixed_damage integer := 0;\n  player_used_essence_action boolean := false;'
  );

  definition := replace(
    definition,
    E'        if weapon_stats ->> ''weapon_type'' = ''bow'' then\n          damage := damage + coalesce((weapon_stats ->> ''on_hit_fixed_damage'')::integer, 0);\n        end if;',
    E'        weapon_fixed_damage := case when weapon_stats ->> ''weapon_type'' = ''bow'' then coalesce((weapon_stats ->> ''on_hit_fixed_damage'')::integer, 0) else 0 end;'
  );

  definition := replace(
    definition,
    E'logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''critical'' else ''attack'' end, ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  monster_hp, ''target'', ''enemy''));\n        if duration_ticks <= player_guard_until and player_guard_remaining > 0 then',
    E'logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''critical'' else ''attack'' end, ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  monster_hp, ''target'', ''enemy''));\n        if weapon_fixed_damage > 0 and monster_hp > 0 then\n          damage := weapon_fixed_damage;\n          damage_result := public.apply_hunt_damage(monster_hp, enemy_shield, enemy_shield_until, duration_ticks, damage);\n          monster_hp := (damage_result ->> ''hp'')::numeric;\n          enemy_shield := (damage_result ->> ''shield'')::numeric;\n          shield_absorbed := (damage_result ->> ''absorbed'')::numeric;\n          damage := (damage_result ->> ''health_damage'')::integer;\n          total_damage := total_damage + damage;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''weapon_fixed_damage'', ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', ''활''));\n        end if;\n        if duration_ticks <= player_guard_until and player_guard_remaining > 0 then'
  );

  definition := replace(
    definition,
    E'logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_extra_hit'', ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', ''숲 늑대의 연격'', ''grade'', 1));\n        end if;',
    E'logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_extra_hit'', ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', ''숲 늑대의 연격'', ''grade'', 1));\n          if weapon_fixed_damage > 0 and monster_hp > 0 then\n            damage := weapon_fixed_damage;\n            damage_result := public.apply_hunt_damage(monster_hp, enemy_shield, enemy_shield_until, duration_ticks, damage);\n            monster_hp := (damage_result ->> ''hp'')::numeric;\n            enemy_shield := (damage_result ->> ''shield'')::numeric;\n            shield_absorbed := (damage_result ->> ''absorbed'')::numeric;\n            damage := (damage_result ->> ''health_damage'')::integer;\n            total_damage := total_damage + damage;\n            logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''weapon_fixed_damage'', ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', ''활''));\n          end if;\n        end if;'
  );

  if regexp_count(definition, E'''kind'', ''weapon_fixed_damage''') < 2 then
    raise exception 'bow_fixed_damage_log_update_failed';
  end if;

  execute definition;
end;
$$;
