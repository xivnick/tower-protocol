do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  enemy_reflect_pct numeric := 0;\n  index integer;\nbegin' in definition) = 0
    or position(E'    for index in 1..player_essence_count loop\n      if player_essence_ready[index] <= duration_ticks then' in definition) = 0
    or position(E'    if enemy_essence_code is not null and enemy_essence_ready <= duration_ticks then' in definition) = 0
    or position(E'    if player_attack_gauge >= 1 then' in definition) = 0
    or position(E'      if monster_attack_gauge >= 1 then' in definition) = 0 then
    raise exception 'hunt_training_dummy_essence_action_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  enemy_reflect_pct numeric := 0;\n  index integer;\nbegin',
    E'  enemy_reflect_pct numeric := 0;\n  player_used_essence_action boolean := false;\n  enemy_used_essence_action boolean := false;\n  index integer;\nbegin'
  );

  definition := replace(
    definition,
    E'    for index in 1..player_essence_count loop\n      if player_essence_ready[index] <= duration_ticks then',
    E'    player_used_essence_action := false;\n    enemy_used_essence_action := false;\n    for index in 1..player_essence_count loop\n      if not player_used_essence_action and player_essence_ready[index] <= duration_ticks then'
  );

  definition := replace(
    definition,
    E'        player_essence_ready[index] := duration_ticks + public.essence_cooldown_tenths(player_essence_codes[index], player_essence_grades[index]);',
    E'        player_essence_ready[index] := duration_ticks + public.essence_cooldown_tenths(player_essence_codes[index], player_essence_grades[index]);\n        player_used_essence_action := true;'
  );

  definition := replace(
    definition,
    E'    if enemy_essence_code is not null and enemy_essence_ready <= duration_ticks then',
    E'    if not enemy_used_essence_action and enemy_essence_code is not null and enemy_essence_ready <= duration_ticks then'
  );

  definition := replace(
    definition,
    E'      enemy_essence_ready := duration_ticks + public.essence_cooldown_tenths(enemy_essence_code, enemy_essence_grade);',
    E'      enemy_essence_ready := duration_ticks + public.essence_cooldown_tenths(enemy_essence_code, enemy_essence_grade);\n      enemy_used_essence_action := true;'
  );

  definition := replace(
    definition,
    E'    if player_attack_gauge >= 1 then',
    E'    if player_attack_gauge >= 1 and not player_used_essence_action then'
  );

  definition := replace(
    definition,
    E'      if monster_attack_gauge >= 1 then',
    E'      if monster_attack_gauge >= 1 and not enemy_used_essence_action then'
  );

  execute definition;
end;
$$;
