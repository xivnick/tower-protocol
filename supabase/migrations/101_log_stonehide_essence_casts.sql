do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_shield'', ''amount'', player_shield, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]));' in definition) = 0
    or position(E'        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_shield'', ''amount'', enemy_shield, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));' in definition) = 0 then
    raise exception 'hunt_training_dummy_stonehide_log_definition_changed';
  end if;

  definition := replace(
    definition,
    E'        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_shield'', ''amount'', player_shield, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]));',
    E'        logs := logs || jsonb_build_array(\n          jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]),\n          jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_shield'', ''amount'', player_shield, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index])\n        );'
  );

  definition := replace(
    definition,
    E'        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_shield'', ''amount'', enemy_shield, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));',
    E'        logs := logs || jsonb_build_array(\n          jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade),\n          jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_shield'', ''amount'', enemy_shield, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade)\n        );'
  );

  execute definition;
end;
$$;
