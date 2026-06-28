do $$
declare
  definition text;
  player_counter_miss text := E'        if not is_hit then\n          if player_counter_empower_pct > 0 then player_empower_pct := player_counter_empower_pct; end if;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''enemy_miss'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player''));';
  enemy_counter_miss text := E'      if not is_hit then\n        if enemy_counter_empower_pct > 0 then enemy_empower_pct := enemy_counter_empower_pct; end if;\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''miss'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy''));';
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(player_counter_miss in definition) = 0
    or position(enemy_counter_miss in definition) = 0 then
    raise exception 'essence_status_effect_definition_changed';
  end if;

  definition := replace(
    definition,
    player_counter_miss,
    E'        if not is_hit then\n          if player_counter_empower_pct > 0 then\n            player_empower_pct := player_counter_empower_pct;\n            logs := logs || jsonb_build_array(\n              jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''enemy_miss'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player''),\n              jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', ''잎그늘 표범의 그림자 반격'', ''effect'', ''일반공격 강화'')\n            );\n          else\n            logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''enemy_miss'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player''));\n          end if;'
  );

  definition := replace(
    definition,
    enemy_counter_miss,
    E'      if not is_hit then\n        if enemy_counter_empower_pct > 0 then\n          enemy_empower_pct := enemy_counter_empower_pct;\n          logs := logs || jsonb_build_array(\n            jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''miss'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy''),\n            jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''effect'', ''일반공격 강화'')\n          );\n        else\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''miss'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy''));\n        end if;'
  );

  execute definition;
end;
$$;

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
    entry_time := (entry ->> 'time_tenths')::integer;
    parent_sequence := null;

    if current_log_time is distinct from entry_time then
      current_log_time := entry_time;
      latest_player_sequence := null;
      latest_enemy_sequence := null;
    end if;

    if entry_kind in ('essence_damage', 'essence_dot', 'essence_heal', 'essence_shield', 'essence_extra_hit', 'essence_reflect', 'reflect', 'shield_absorb') then
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

    if parent_sequence is null and entry_kind in ('attack', 'critical', 'miss', 'essence_cast') then
      latest_player_sequence := log_sequence;
    elsif parent_sequence is null and entry_kind in ('enemy_attack', 'enemy_critical', 'enemy_miss') then
      latest_enemy_sequence := log_sequence;
    end if;
  end loop;

  return result;
end;
$$;
