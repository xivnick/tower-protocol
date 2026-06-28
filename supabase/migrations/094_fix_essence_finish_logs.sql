do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;
  if position(E'    if monster_hp <= 0 or player_hp <= 0 then exit; end if;\n    duration_ticks := duration_ticks + 1;' in definition) = 0 then
    raise exception 'hunt_training_dummy_essence_finish_definition_changed';
  end if;

  definition := replace(
    definition,
    E'    if monster_hp <= 0 or player_hp <= 0 then exit; end if;\n    duration_ticks := duration_ticks + 1;',
    E'    if monster_hp <= 0 then\n      logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''defeat'', ''amount'', 0, ''target_hp'', 0, ''target'', ''enemy''));\n      exit;\n    end if;\n    if player_hp <= 0 then\n      logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''player_defeat'', ''amount'', 0, ''target_hp'', 0, ''target'', ''player''));\n      exit;\n    end if;\n    duration_ticks := duration_ticks + 1;'
  );

  execute definition;
end;
$$;
