do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  damage integer;\n  raw_damage numeric;' in definition) = 0
    or position(E'  player_thorns_pct numeric := 0;\n  enemy_thorns_pct numeric := 0;\n  player_blade_until integer := -1;' in definition) = 0
    or position(E'player_thorns_until := duration_ticks + case when player_essence_grades[index] >= 5 then 50 else 40 end; player_thorns_pct := case player_essence_grades[index] when 1 then 15 when 2 then 25 when 3 then 50 when 4 then 60 else 75 end;' in definition) = 0
    or position(E'enemy_thorns_until := duration_ticks + 40; enemy_thorns_pct := 25;' in definition) = 0
    or position(E'damage := greatest(1, floor(raw_damage * (100 / (100 + monster_defense)))::integer);' in definition) = 0
    or position(E'damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)) * (1 - coalesce((armor_stats ->> ''damage_taken_reduction_pct'')::numeric, 0) / 100))::integer);' in definition) = 0 then
    raise exception 'redthorn_spines_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  damage integer;\n  raw_damage numeric;',
    E'  damage integer;\n  primary_damage integer := 0;\n  raw_damage numeric;'
  );

  definition := replace(
    definition,
    E'  player_thorns_pct numeric := 0;\n  enemy_thorns_pct numeric := 0;\n  player_blade_until integer := -1;',
    E'  player_thorns_pct numeric := 0;\n  player_thorns_reduction_pct numeric := 0;\n  player_thorns_name text := ''붉은가시 맹수의 역린'';\n  player_thorns_grade integer := 1;\n  enemy_thorns_pct numeric := 0;\n  enemy_thorns_reduction_pct numeric := 0;\n  player_blade_until integer := -1;'
  );

  definition := replace(
    definition,
    E'player_thorns_until := duration_ticks + case when player_essence_grades[index] >= 5 then 50 else 40 end; player_thorns_pct := case player_essence_grades[index] when 1 then 15 when 2 then 25 when 3 then 50 when 4 then 60 else 75 end;',
    E'player_thorns_until := duration_ticks + case when player_essence_grades[index] >= 5 then 50 else 40 end; player_thorns_pct := case player_essence_grades[index] when 1 then 15 when 2 then 25 when 3 then 50 when 4 then 60 else 75 end; player_thorns_reduction_pct := case when player_essence_grades[index] >= 5 then 15 when player_essence_grades[index] >= 4 then 10 else 0 end; player_thorns_name := player_essence_names[index]; player_thorns_grade := player_essence_grades[index];'
  );

  definition := replace(
    definition,
    E'enemy_thorns_until := duration_ticks + 40; enemy_thorns_pct := 25;',
    E'enemy_thorns_until := duration_ticks + case when enemy_essence_grade >= 5 then 50 else 40 end; enemy_thorns_pct := case enemy_essence_grade when 1 then 15 when 2 then 25 when 3 then 50 when 4 then 60 else 75 end; enemy_thorns_reduction_pct := case when enemy_essence_grade >= 5 then 15 when enemy_essence_grade >= 4 then 10 else 0 end;'
  );

  definition := replace(
    definition,
    E'damage := greatest(1, floor(raw_damage * (100 / (100 + monster_defense)))::integer);',
    E'damage := greatest(1, floor(raw_damage * (100 / (100 + monster_defense)) * (1 - case when duration_ticks <= enemy_thorns_until then enemy_thorns_reduction_pct else 0 end / 100))::integer);'
  );

  definition := replace(
    definition,
    E'damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)) * (1 - coalesce((armor_stats ->> ''damage_taken_reduction_pct'')::numeric, 0) / 100))::integer);',
    E'damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)) * (1 - coalesce((armor_stats ->> ''damage_taken_reduction_pct'')::numeric, 0) / 100) * (1 - case when duration_ticks <= player_thorns_until then player_thorns_reduction_pct else 0 end / 100))::integer);'
  );

  definition := replace(
    definition,
    E'damage := (damage_result ->> ''health_damage'')::integer;\n        if duration_ticks <= player_blade_until then',
    E'damage := (damage_result ->> ''health_damage'')::integer;\n        primary_damage := damage;\n        if duration_ticks <= player_blade_until then'
  );

  definition := replace(
    definition,
    E'damage := (damage_result ->> ''health_damage'')::integer;\n          if duration_ticks <= enemy_blade_until then',
    E'damage := (damage_result ->> ''health_damage'')::integer;\n          primary_damage := damage;\n          if duration_ticks <= enemy_blade_until then'
  );

  definition := replace(
    definition,
    E'        if duration_ticks <= player_thorns_until then damage := greatest(1, floor(public.character_physical_attack(target_character) * player_thorns_pct / 100)::integer); damage_result := public.apply_hunt_damage(monster_hp, enemy_shield, enemy_shield_until, duration_ticks, damage);\n        monster_hp := (damage_result ->> ''hp'')::numeric;\n        enemy_shield := (damage_result ->> ''shield'')::numeric;\n        shield_absorbed := (damage_result ->> ''absorbed'')::numeric;\n        healed_amount := shield_absorbed;\n        damage := (damage_result ->> ''health_damage'')::integer; logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', ''붉은가시 맹수의 역린'', ''grade'', 1)); end if;\n',
    E''
  );

  definition := replace(
    definition,
    E'          if duration_ticks <= enemy_thorns_until then damage := greatest(1, floor((monster_stats ->> ''physical_attack'')::numeric * enemy_thorns_pct / 100)::integer); damage_result := public.apply_hunt_damage(player_hp, player_shield, player_shield_until, duration_ticks, damage);\n        player_hp := (damage_result ->> ''hp'')::numeric;\n        player_shield := (damage_result ->> ''shield'')::numeric;\n        shield_absorbed := (damage_result ->> ''absorbed'')::numeric;\n        healed_amount := shield_absorbed;\n        damage := (damage_result ->> ''health_damage'')::integer; logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', ''붉은가시 맹수의 역린'', ''grade'', enemy_essence_grade)); end if;\n',
    E''
  );

  definition := replace(
    definition,
    E'logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''critical'' else ''attack'' end, ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  monster_hp, ''target'', ''enemy''));\n        if duration_ticks <= player_flurry_until and monster_hp > 0 then',
    E'logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''critical'' else ''attack'' end, ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  monster_hp, ''target'', ''enemy''));\n        if duration_ticks <= player_thorns_until and monster_hp > 0 then\n          damage := greatest(1, floor(public.character_physical_attack(target_character) * player_thorns_pct / 100)::integer);\n          damage_result := public.apply_hunt_damage(monster_hp, enemy_shield, enemy_shield_until, duration_ticks, damage);\n          monster_hp := (damage_result ->> ''hp'')::numeric;\n          enemy_shield := (damage_result ->> ''shield'')::numeric;\n          shield_absorbed := (damage_result ->> ''absorbed'')::numeric;\n          damage := (damage_result ->> ''health_damage'')::integer;\n          total_damage := total_damage + damage;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', player_thorns_name, ''grade'', player_thorns_grade, ''effect'', ''가시 추가피해''));\n        end if;\n        if primary_damage > 0 and duration_ticks <= enemy_thorns_until and monster_hp > 0 then\n          damage := greatest(1, floor(primary_damage * enemy_thorns_pct / 100)::integer);\n          damage_result := public.apply_hunt_damage(player_hp, player_shield, player_shield_until, duration_ticks, damage);\n          player_hp := (damage_result ->> ''hp'')::numeric;\n          player_shield := (damage_result ->> ''shield'')::numeric;\n          shield_absorbed := (damage_result ->> ''absorbed'')::numeric;\n          damage := (damage_result ->> ''health_damage'')::integer;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade, ''effect'', ''가시 반사''));\n        end if;\n        if duration_ticks <= player_flurry_until and monster_hp > 0 then'
  );

  definition := replace(
    definition,
    E'logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''enemy_critical'' else ''enemy_attack'' end, ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  player_hp, ''target'', ''player''));\n          if coalesce((armor_stats ->> ''reflect_damage_flat'')::integer, 0) > 0 then',
    E'logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''enemy_critical'' else ''enemy_attack'' end, ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'',  player_hp, ''target'', ''player''));\n          if duration_ticks <= enemy_thorns_until and player_hp > 0 then\n            damage := greatest(1, floor((monster_stats ->> ''physical_attack'')::numeric * enemy_thorns_pct / 100)::integer);\n            damage_result := public.apply_hunt_damage(player_hp, player_shield, player_shield_until, duration_ticks, damage);\n            player_hp := (damage_result ->> ''hp'')::numeric;\n            player_shield := (damage_result ->> ''shield'')::numeric;\n            shield_absorbed := (damage_result ->> ''absorbed'')::numeric;\n            damage := (damage_result ->> ''health_damage'')::integer;\n            logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade, ''effect'', ''가시 추가피해''));\n          end if;\n          if primary_damage > 0 and duration_ticks <= player_thorns_until and player_hp > 0 then\n            damage := greatest(1, floor(primary_damage * player_thorns_pct / 100)::integer);\n            damage_result := public.apply_hunt_damage(monster_hp, enemy_shield, enemy_shield_until, duration_ticks, damage);\n            monster_hp := (damage_result ->> ''hp'')::numeric;\n            enemy_shield := (damage_result ->> ''shield'')::numeric;\n            shield_absorbed := (damage_result ->> ''absorbed'')::numeric;\n            damage := (damage_result ->> ''health_damage'')::integer;\n            logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', player_thorns_name, ''grade'', player_thorns_grade, ''effect'', ''가시 반사''));\n          end if;\n          if coalesce((armor_stats ->> ''reflect_damage_flat'')::integer, 0) > 0 then'
  );

  execute definition;
end;
$$;
