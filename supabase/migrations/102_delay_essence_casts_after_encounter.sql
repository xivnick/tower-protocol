do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'      if not player_used_essence_action and player_essence_ready[index] <= duration_ticks then' in definition) = 0
    or position(E'    if not enemy_used_essence_action and enemy_essence_code is not null and enemy_essence_ready <= duration_ticks then' in definition) = 0 then
    raise exception 'hunt_training_dummy_essence_delay_definition_changed';
  end if;

  definition := replace(
    definition,
    E'      if not player_used_essence_action and player_essence_ready[index] <= duration_ticks then',
    E'      if duration_ticks > 0 and not player_used_essence_action and player_essence_ready[index] <= duration_ticks then'
  );

  definition := replace(
    definition,
    E'    if not enemy_used_essence_action and enemy_essence_code is not null and enemy_essence_ready <= duration_ticks then',
    E'    if duration_ticks > 0 and not enemy_used_essence_action and enemy_essence_code is not null and enemy_essence_ready <= duration_ticks then'
  );

  execute definition;
end;
$$;
