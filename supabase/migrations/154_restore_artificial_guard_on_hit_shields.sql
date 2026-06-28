do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'player_guard_shield_pct numeric := 0;' in definition) = 0
    or position(E'player_guard_until := duration_ticks + case when player_essence_grades[index] >= 5 then 50 else 40 end;' in definition) = 0
    or position(E'player_shield_until := greatest(player_shield_until, player_guard_until);' in definition) > 0 then
    raise exception 'hunt_training_dummy_guard_definition_unexpected';
  end if;

  definition := replace(
    definition,
    E'logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''critical'' else ''attack'' end, ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  monster_hp, ''target'', ''enemy''));\n        if duration_ticks <= player_thorns_until and monster_hp > 0 then',
    E'logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''critical'' else ''attack'' end, ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  monster_hp, ''target'', ''enemy''));\n        if duration_ticks <= player_guard_until and player_guard_remaining > 0 then\n          player_shield_until := greatest(player_shield_until, player_guard_until);\n          healed_amount := player_max_hp * player_guard_shield_pct / 100;\n          player_shield := player_shield + healed_amount;\n          player_guard_remaining := player_guard_remaining - 1;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_shield'', ''amount'', healed_amount, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]));\n        end if;\n        if duration_ticks <= player_thorns_until and monster_hp > 0 then'
  );

  definition := replace(
    definition,
    E'logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''enemy_critical'' else ''enemy_attack'' end, ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  player_hp, ''target'', ''player''));\n          if duration_ticks <= enemy_thorns_until and player_hp > 0 then',
    E'logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''enemy_critical'' else ''enemy_attack'' end, ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  player_hp, ''target'', ''player''));\n          if duration_ticks <= enemy_guard_until and enemy_guard_remaining > 0 then\n            enemy_shield_until := greatest(enemy_shield_until, enemy_guard_until);\n            healed_amount := monster_max_hp * enemy_guard_shield_pct / 100;\n            enemy_shield := enemy_shield + healed_amount;\n            enemy_guard_remaining := enemy_guard_remaining - 1;\n            logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_shield'', ''amount'', healed_amount, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n          end if;\n          if duration_ticks <= enemy_thorns_until and player_hp > 0 then'
  );

  if position(E'player_shield_until := greatest(player_shield_until, player_guard_until);' in definition) = 0
    or position(E'enemy_shield_until := greatest(enemy_shield_until, enemy_guard_until);' in definition) = 0 then
    raise exception 'hunt_training_dummy_guard_restore_failed';
  end if;

  execute definition;
end;
$$;
