do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;
  if position(E'''kind'', ''player_regeneration''' in definition) = 0 then raise exception 'hunt_training_dummy_definition_changed'; end if;
  definition := replace(definition,
    E'      logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''player_regeneration'', ''amount'', healed_amount, ''target_hp'', player_hp, ''target'', ''player''));',
    E'      if healed_amount > 0 then\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''player_regeneration'', ''amount'', healed_amount, ''target_hp'', player_hp, ''target'', ''player''));\n      end if;');
  definition := replace(definition,
    E'      logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''regeneration'', ''amount'', healed_amount, ''target_hp'', monster_hp, ''target'', ''enemy''));',
    E'      if healed_amount > 0 then\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''regeneration'', ''amount'', healed_amount, ''target_hp'', monster_hp, ''target'', ''enemy''));\n      end if;');
  execute definition;
end;
$$;
