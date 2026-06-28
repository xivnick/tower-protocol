do $$
declare
  definition text;
  logs_declaration text := E'  logs jsonb := ''[]''::jsonb;\n  battle jsonb;';
  player_passive_block text := E'  player_essence_ready := array_fill(0, array[player_essence_count]);\n  for index in 1..player_essence_count loop\n    if player_essence_codes[index] = ''bigeye-bat-night-sight'' then\n      player_accuracy := player_accuracy * (1 + (case player_essence_grades[index] when 1 then 5 when 2 then 10 when 3 then 18 when 4 then 22 else 28 end) / 100);\n    elsif player_essence_codes[index] = ''moss-slime-regeneration'' then\n      player_passive_regeneration_pct := greatest(player_passive_regeneration_pct, case player_essence_grades[index] when 1 then 2 when 2 then 4 when 3 then 8 when 4 then 10 else 12 end);\n    elsif player_essence_codes[index] = ''leafshade-panther-counter'' then\n      player_counter_empower_pct := greatest(player_counter_empower_pct, case player_essence_grades[index] when 1 then 60 when 2 then 120 when 3 then 240 when 4 then 300 else 360 end);\n    end if;\n  end loop;';
  enemy_passive_block text := E'  if enemy_essence_code = ''bigeye-bat-night-sight'' then\n    monster_accuracy := monster_accuracy * 1.10;\n  elsif enemy_essence_code = ''moss-slime-regeneration'' then\n    enemy_passive_regeneration_pct := 4;\n  elsif enemy_essence_code = ''leafshade-panther-counter'' then\n    enemy_counter_empower_pct := 120;\n  end if;\n\n  logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''encounter'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy''));';
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(logs_declaration in definition) = 0
    or position(player_passive_block in definition) = 0
    or position(enemy_passive_block in definition) = 0 then
    raise exception 'passive_essence_start_log_definition_changed';
  end if;

  definition := replace(
    definition,
    logs_declaration,
    E'  logs jsonb := ''[]''::jsonb;\n  passive_logs jsonb := ''[]''::jsonb;\n  battle jsonb;'
  );

  definition := replace(
    definition,
    player_passive_block,
    E'  player_essence_ready := array_fill(0, array[player_essence_count]);\n  for index in 1..player_essence_count loop\n    if player_essence_codes[index] = ''bigeye-bat-night-sight'' then\n      player_accuracy := player_accuracy * (1 + (case player_essence_grades[index] when 1 then 5 when 2 then 10 when 3 then 18 when 4 then 22 else 28 end) / 100);\n      passive_logs := passive_logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index], ''effect'', ''명중 보정''));\n    elsif player_essence_codes[index] = ''moss-slime-regeneration'' then\n      player_passive_regeneration_pct := greatest(player_passive_regeneration_pct, case player_essence_grades[index] when 1 then 2 when 2 then 4 when 3 then 8 when 4 then 10 else 12 end);\n      passive_logs := passive_logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index], ''effect'', ''재생''));\n    elsif player_essence_codes[index] = ''leafshade-panther-counter'' then\n      player_counter_empower_pct := greatest(player_counter_empower_pct, case player_essence_grades[index] when 1 then 60 when 2 then 120 when 3 then 240 when 4 then 300 else 360 end);\n      passive_logs := passive_logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index], ''effect'', ''회피 후 일반공격 강화''));\n    end if;\n  end loop;'
  );

  definition := replace(
    definition,
    enemy_passive_block,
    E'  if enemy_essence_code = ''bigeye-bat-night-sight'' then\n    monster_accuracy := monster_accuracy * 1.10;\n    passive_logs := passive_logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade, ''effect'', ''명중 보정''));\n  elsif enemy_essence_code = ''moss-slime-regeneration'' then\n    enemy_passive_regeneration_pct := 4;\n    passive_logs := passive_logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade, ''effect'', ''재생''));\n  elsif enemy_essence_code = ''leafshade-panther-counter'' then\n    enemy_counter_empower_pct := 120;\n    passive_logs := passive_logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade, ''effect'', ''회피 후 일반공격 강화''));\n  end if;\n\n  logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''encounter'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'')) || passive_logs;'
  );

  execute definition;
end;
$$;
