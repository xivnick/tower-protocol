create or replace function public.essence_blade_bleed_duration_tenths(essence_grade integer)
returns integer
language sql
immutable
as $$
  select case when essence_grade >= 3 then 40 else 30 end;
$$;

create or replace function public.essence_blade_critical_damage_bonus_percent(essence_grade integer)
returns numeric
language sql
immutable
as $$
  select case when essence_grade >= 5 then 15 when essence_grade >= 4 then 10 else 0 end;
$$;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  player_blade_pct numeric := 0;\n  enemy_blade_pct numeric := 0;' in definition) = 0
    or position(E'player_blade_until := duration_ticks + case when player_essence_grades[index] >= 5 then 60 else 50 end; player_blade_pct := case player_essence_grades[index] when 1 then 15 when 2 then 25 when 3 then 45 when 4 then 55 else 65 end;' in definition) = 0
    or position(E'enemy_blade_until := duration_ticks + 50; enemy_blade_pct := 25;' in definition) = 0
    or position(E'if is_critical then raw_damage := raw_damage * (1.5 + player_critical_damage_bonus_pct / 100); end if;' in definition) = 0
    or position(E'if is_critical then raw_damage := raw_damage * (monster_critical_damage + enemy_critical_damage_bonus_pct / 100); end if;' in definition) = 0
    or position(E'if duration_ticks <= player_blade_until then monster_bleed_until := duration_ticks + 30; monster_bleed_damage := public.character_physical_attack(target_character) * player_blade_pct / 100; end if;' in definition) = 0
    or position(E'if duration_ticks <= enemy_blade_until then player_bleed_until := duration_ticks + 30; player_bleed_damage := (monster_stats ->> ''physical_attack'')::numeric * enemy_blade_pct / 100; end if;' in definition) = 0
    or position(E'damage := (damage_result ->> ''health_damage'')::integer; end if;\n      if duration_ticks <= player_bleed_until then' in definition) = 0
    or position(E'if duration_ticks <= player_bleed_until then damage := greatest(1, floor(player_bleed_damage * (100 / (100 + player_defense)) * (1 + case when duration_ticks <= player_poison_until then player_poison_damage_taken_pct else 0 end / 100))::integer); damage_result := public.apply_hunt_damage(player_hp, player_shield, player_shield_until, duration_ticks, damage);\n        player_hp := (damage_result ->> ''hp'')::numeric;\n        player_shield := (damage_result ->> ''shield'')::numeric;\n        shield_absorbed := (damage_result ->> ''absorbed'')::numeric;\n        healed_amount := shield_absorbed;\n        damage := (damage_result ->> ''health_damage'')::integer; end if;' in definition) = 0 then
    raise exception 'blade_beetle_edge_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  player_blade_pct numeric := 0;\n  enemy_blade_pct numeric := 0;',
    E'  player_blade_pct numeric := 0;\n  enemy_blade_pct numeric := 0;\n  player_blade_grade integer := 1;\n  enemy_blade_grade integer := 1;'
  );

  definition := replace(
    definition,
    E'player_blade_until := duration_ticks + case when player_essence_grades[index] >= 5 then 60 else 50 end; player_blade_pct := case player_essence_grades[index] when 1 then 15 when 2 then 25 when 3 then 45 when 4 then 55 else 65 end;',
    E'player_blade_until := duration_ticks + case when player_essence_grades[index] >= 5 then 60 else 50 end; player_blade_pct := case player_essence_grades[index] when 1 then 15 when 2 then 25 when 3 then 45 when 4 then 55 else 65 end; player_blade_grade := player_essence_grades[index];'
  );

  definition := replace(
    definition,
    E'enemy_blade_until := duration_ticks + 50; enemy_blade_pct := 25;',
    E'enemy_blade_until := duration_ticks + case when enemy_essence_grade >= 5 then 60 else 50 end; enemy_blade_pct := case enemy_essence_grade when 1 then 15 when 2 then 25 when 3 then 45 when 4 then 55 else 65 end; enemy_blade_grade := enemy_essence_grade;'
  );

  definition := replace(
    definition,
    E'if is_critical then raw_damage := raw_damage * (1.5 + player_critical_damage_bonus_pct / 100); end if;',
    E'if is_critical then raw_damage := raw_damage * (1.5 + player_critical_damage_bonus_pct / 100 + case when duration_ticks <= monster_bleed_until then public.essence_blade_critical_damage_bonus_percent(player_blade_grade) / 100 else 0 end); end if;'
  );

  definition := replace(
    definition,
    E'if is_critical then raw_damage := raw_damage * (monster_critical_damage + enemy_critical_damage_bonus_pct / 100); end if;',
    E'if is_critical then raw_damage := raw_damage * (monster_critical_damage + enemy_critical_damage_bonus_pct / 100 + case when duration_ticks <= player_bleed_until then public.essence_blade_critical_damage_bonus_percent(enemy_blade_grade) / 100 else 0 end); end if;'
  );

  definition := replace(
    definition,
    E'if duration_ticks <= player_blade_until then monster_bleed_until := duration_ticks + 30; monster_bleed_damage := public.character_physical_attack(target_character) * player_blade_pct / 100; end if;',
    E'if duration_ticks <= player_blade_until then monster_bleed_until := duration_ticks + public.essence_blade_bleed_duration_tenths(player_blade_grade); monster_bleed_damage := public.character_physical_attack(target_character) * player_blade_pct / 100; end if;'
  );

  definition := replace(
    definition,
    E'if duration_ticks <= enemy_blade_until then player_bleed_until := duration_ticks + 30; player_bleed_damage := (monster_stats ->> ''physical_attack'')::numeric * enemy_blade_pct / 100; end if;',
    E'if duration_ticks <= enemy_blade_until then player_bleed_until := duration_ticks + public.essence_blade_bleed_duration_tenths(enemy_blade_grade); player_bleed_damage := (monster_stats ->> ''physical_attack'')::numeric * enemy_blade_pct / 100; end if;'
  );

  definition := replace(
    definition,
    E'damage := (damage_result ->> ''health_damage'')::integer; end if;\n      if duration_ticks <= player_bleed_until then',
    E'damage := (damage_result ->> ''health_damage'')::integer; total_damage := total_damage + damage; logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_dot'', ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', ''칼날 딱정벌레의 날붙이'', ''grade'', player_blade_grade)); end if;\n      if duration_ticks <= player_bleed_until then'
  );

  definition := replace(
    definition,
    E'if duration_ticks <= player_bleed_until then damage := greatest(1, floor(player_bleed_damage * (100 / (100 + player_defense)) * (1 + case when duration_ticks <= player_poison_until then player_poison_damage_taken_pct else 0 end / 100))::integer); damage_result := public.apply_hunt_damage(player_hp, player_shield, player_shield_until, duration_ticks, damage);\n        player_hp := (damage_result ->> ''hp'')::numeric;\n        player_shield := (damage_result ->> ''shield'')::numeric;\n        shield_absorbed := (damage_result ->> ''absorbed'')::numeric;\n        healed_amount := shield_absorbed;\n        damage := (damage_result ->> ''health_damage'')::integer; end if;',
    E'if duration_ticks <= player_bleed_until then damage := greatest(1, floor(player_bleed_damage * (100 / (100 + player_defense)) * (1 + case when duration_ticks <= player_poison_until then player_poison_damage_taken_pct else 0 end / 100))::integer); damage_result := public.apply_hunt_damage(player_hp, player_shield, player_shield_until, duration_ticks, damage);\n        player_hp := (damage_result ->> ''hp'')::numeric;\n        player_shield := (damage_result ->> ''shield'')::numeric;\n        shield_absorbed := (damage_result ->> ''absorbed'')::numeric;\n        healed_amount := shield_absorbed;\n        damage := (damage_result ->> ''health_damage'')::integer; logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_dot'', ''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_blade_grade)); end if;'
  );

  execute definition;
end;
$$;
