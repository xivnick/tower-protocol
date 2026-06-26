do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  while duration_ticks < max_duration_ticks and monster_hp > 0 and player_hp > 0 loop\n    player_used_essence_action := false;' in definition) = 0
    or position(E'    duration_ticks := duration_ticks + 1;\n\n    player_attack_gauge := player_attack_gauge + (player_attacks_per_second / 10);' in definition) = 0 then
    raise exception 'hunt_training_dummy_tick_timing_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  while duration_ticks < max_duration_ticks and monster_hp > 0 and player_hp > 0 loop\n    player_used_essence_action := false;',
    E'  while duration_ticks < max_duration_ticks and monster_hp > 0 and player_hp > 0 loop\n    duration_ticks := duration_ticks + 1;\n    player_used_essence_action := false;'
  );

  definition := replace(
    definition,
    E'    duration_ticks := duration_ticks + 1;\n\n    player_attack_gauge := player_attack_gauge + (player_attacks_per_second / 10);',
    E'    player_attack_gauge := player_attack_gauge + (player_attacks_per_second / 10);'
  );

  execute definition;
end;
$$;
