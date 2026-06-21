do $$
declare definition text;
begin
  select pg_get_functiondef('public.encounter_hunt_monster()'::regprocedure) into definition;
  if position(E'''logs'', ''[]''::jsonb' in definition) = 0 then
    raise exception 'encounter_hunt_monster_definition_changed';
  end if;
  definition := replace(
    definition,
    E'''logs'', ''[]''::jsonb',
    E'''logs'', jsonb_build_array(jsonb_build_object(
      ''time_tenths'', 0,
      ''kind'', ''encounter'',
      ''amount'', 0,
      ''target_hp'', (monster_stats ->> ''max_hp'')::numeric,
      ''target'', ''enemy''
    ))'
  );
  execute definition;
end;
$$;
