-- A combat tick grants one action to each combatant, not one action shared by
-- both combatants. Each side still chooses either an essence or a basic attack.
do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  enemy_used_essence_action boolean := false;\n  action_used boolean := false;\n  index integer;' in definition) = 0
    or position(E'    enemy_used_essence_action := false;\n    action_used := false;\n    for index in 1..player_essence_count loop' in definition) = 0
    or position(E'    if duration_ticks > 0 and not action_used and not enemy_used_essence_action' in definition) = 0
    or position(E'    if player_attack_gauge >= 1 and not action_used and not player_used_essence_action then' in definition) = 0
    or position(E'      if monster_attack_gauge >= 1 and not action_used and not enemy_used_essence_action then' in definition) = 0 then
    raise exception 'hunt_combatant_action_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  enemy_used_essence_action boolean := false;\n  action_used boolean := false;\n  index integer;',
    E'  enemy_used_essence_action boolean := false;\n  index integer;'
  );
  definition := replace(
    definition,
    E'    enemy_used_essence_action := false;\n    action_used := false;\n    for index in 1..player_essence_count loop',
    E'    enemy_used_essence_action := false;\n    for index in 1..player_essence_count loop'
  );
  definition := replace(
    definition,
    E'        player_used_essence_action := true;\n        action_used := true;',
    E'        player_used_essence_action := true;'
  );
  definition := replace(
    definition,
    E'    if duration_ticks > 0 and not action_used and not enemy_used_essence_action',
    E'    if duration_ticks > 0 and not enemy_used_essence_action'
  );
  definition := replace(
    definition,
    E'      enemy_used_essence_action := true;\n      action_used := true;',
    E'      enemy_used_essence_action := true;'
  );
  definition := replace(
    definition,
    E'    if player_attack_gauge >= 1 and not action_used and not player_used_essence_action then',
    E'    if player_attack_gauge >= 1 and not player_used_essence_action then'
  );
  definition := replace(
    definition,
    E'      player_attack_gauge := player_attack_gauge - 1;\n      action_used := true;\n      is_hit := random()',
    E'      player_attack_gauge := player_attack_gauge - 1;\n      is_hit := random()'
  );
  definition := replace(
    definition,
    E'      if monster_attack_gauge >= 1 and not action_used and not enemy_used_essence_action then',
    E'      if monster_attack_gauge >= 1 and not enemy_used_essence_action then'
  );
  definition := replace(
    definition,
    E'        monster_attack_gauge := monster_attack_gauge - 1;\n        action_used := true;\n        is_hit := random()',
    E'        monster_attack_gauge := monster_attack_gauge - 1;\n        is_hit := random()'
  );

  execute definition;
end;
$$;
