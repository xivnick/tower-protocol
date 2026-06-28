do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  enemy_magic_attack_bonus_pct numeric := 0;\n  player_critical_damage_bonus_pct numeric := 0;' in definition) = 0
    or position(E'player_physical_attack_bonus_pct := player_physical_attack_bonus_pct + case when player_essence_grades[index] >= 5 then 8 else 5 end;' in definition) = 0
    or position(E'player_magic_attack_bonus_pct := player_magic_attack_bonus_pct + case when player_essence_grades[index] >= 5 then 8 else 5 end;' in definition) = 0
    or position(E'enemy_physical_attack_bonus_pct := enemy_physical_attack_bonus_pct + case when enemy_essence_grade >= 5 then 8 else 5 end;' in definition) = 0
    or position(E'enemy_magic_attack_bonus_pct := enemy_magic_attack_bonus_pct + case when enemy_essence_grade >= 5 then 8 else 5 end;' in definition) = 0
    or position(E'raw_damage := public.character_physical_attack(target_character) * (1 + player_physical_attack_bonus_pct / 100);' in definition) = 0
    or position(E'damage := greatest(1, floor(raw_damage * (100 / (100 + monster_defense)) * (1 + case when duration_ticks <= monster_poison_until then monster_poison_damage_taken_pct else 0 end / 100) * (1 - case when duration_ticks <= enemy_thorns_until then enemy_thorns_reduction_pct else 0 end / 100))::integer);' in definition) = 0
    or position(E'raw_damage := (monster_stats ->> ''physical_attack'')::numeric * (1 + enemy_physical_attack_bonus_pct / 100);' in definition) = 0
    or position(E'damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)) * (1 + case when duration_ticks <= player_poison_until then player_poison_damage_taken_pct else 0 end / 100) * (1 - coalesce((armor_stats ->> ''damage_taken_reduction_pct'')::numeric, 0) / 100) * (1 - case when duration_ticks <= player_thorns_until then player_thorns_reduction_pct else 0 end / 100))::integer);' in definition) = 0 then
    raise exception 'artificial_essence_alignment_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  enemy_magic_attack_bonus_pct numeric := 0;\n  player_critical_damage_bonus_pct numeric := 0;',
    E'  enemy_magic_attack_bonus_pct numeric := 0;\n  player_basic_attack_bonus_pct numeric := 0;\n  enemy_basic_attack_bonus_pct numeric := 0;\n  player_pierce_damage_bonus_pct numeric := 0;\n  enemy_pierce_damage_bonus_pct numeric := 0;\n  player_artificial_physical_until integer := -1;\n  enemy_artificial_physical_until integer := -1;\n  player_artificial_physical_pct numeric := 0;\n  enemy_artificial_physical_pct numeric := 0;\n  player_artificial_magic_until integer := -1;\n  enemy_artificial_magic_until integer := -1;\n  player_artificial_magic_pct numeric := 0;\n  enemy_artificial_magic_pct numeric := 0;\n  player_critical_damage_bonus_pct numeric := 0;'
  );

  definition := replace(
    definition,
    E'      player_physical_attack_bonus_pct := player_physical_attack_bonus_pct + public.artificial_essence_stat_percent(player_essence_codes[index], player_essence_grades[index]);',
    E'      player_physical_attack_bonus_pct := player_physical_attack_bonus_pct + public.artificial_essence_stat_percent(player_essence_codes[index], player_essence_grades[index]);\n      if player_essence_grades[index] >= 4 then player_basic_attack_bonus_pct := player_basic_attack_bonus_pct + case when player_essence_grades[index] >= 5 then 5 else 3 end; end if;'
  );

  definition := replace(
    definition,
    E'      player_pierce_chance_pct := greatest(player_pierce_chance_pct, public.artificial_pierce_chance_percent(player_essence_grades[index]));',
    E'      player_pierce_chance_pct := greatest(player_pierce_chance_pct, public.artificial_pierce_chance_percent(player_essence_grades[index]));\n      player_pierce_damage_bonus_pct := greatest(player_pierce_damage_bonus_pct, case when player_essence_grades[index] >= 5 then 8 when player_essence_grades[index] >= 4 then 5 else 0 end);'
  );

  definition := replace(
    definition,
    E'    if enemy_essence_code = ''artificial-might'' then enemy_physical_attack_bonus_pct := public.artificial_essence_stat_percent(enemy_essence_code, enemy_essence_grade); end if;',
    E'    if enemy_essence_code = ''artificial-might'' then enemy_physical_attack_bonus_pct := public.artificial_essence_stat_percent(enemy_essence_code, enemy_essence_grade); if enemy_essence_grade >= 4 then enemy_basic_attack_bonus_pct := case when enemy_essence_grade >= 5 then 5 else 3 end; end if; end if;'
  );

  definition := replace(
    definition,
    E'    if enemy_essence_code = ''artificial-pierce'' then enemy_pierce_chance_pct := public.artificial_pierce_chance_percent(enemy_essence_grade); end if;',
    E'    if enemy_essence_code = ''artificial-pierce'' then enemy_pierce_chance_pct := public.artificial_pierce_chance_percent(enemy_essence_grade); enemy_pierce_damage_bonus_pct := case when enemy_essence_grade >= 5 then 8 when enemy_essence_grade >= 4 then 5 else 0 end; end if;'
  );

  definition := replace(
    definition,
    E'player_physical_attack_bonus_pct := player_physical_attack_bonus_pct + case when player_essence_grades[index] >= 5 then 8 else 5 end;',
    E'player_artificial_physical_until := duration_ticks + 30; player_artificial_physical_pct := case when player_essence_grades[index] >= 5 then 8 else 5 end;'
  );

  definition := replace(
    definition,
    E'player_magic_attack_bonus_pct := player_magic_attack_bonus_pct + case when player_essence_grades[index] >= 5 then 8 else 5 end;',
    E'player_artificial_magic_until := duration_ticks + 30; player_artificial_magic_pct := case when player_essence_grades[index] >= 5 then 8 else 5 end;'
  );

  definition := replace(
    definition,
    E'enemy_physical_attack_bonus_pct := enemy_physical_attack_bonus_pct + case when enemy_essence_grade >= 5 then 8 else 5 end;',
    E'enemy_artificial_physical_until := duration_ticks + 30; enemy_artificial_physical_pct := case when enemy_essence_grade >= 5 then 8 else 5 end;'
  );

  definition := replace(
    definition,
    E'enemy_magic_attack_bonus_pct := enemy_magic_attack_bonus_pct + case when enemy_essence_grade >= 5 then 8 else 5 end;',
    E'enemy_artificial_magic_until := duration_ticks + 30; enemy_artificial_magic_pct := case when enemy_essence_grade >= 5 then 8 else 5 end;'
  );

  definition := replace(
    definition,
    E'raw_damage := public.character_physical_attack(target_character) * (1 + player_physical_attack_bonus_pct / 100) * public.artificial_essence_damage_percent(player_essence_codes[index], player_essence_grades[index]) / 100;',
    E'raw_damage := public.character_physical_attack(target_character) * (1 + (player_physical_attack_bonus_pct + case when duration_ticks <= player_artificial_physical_until then player_artificial_physical_pct else 0 end) / 100) * public.artificial_essence_damage_percent(player_essence_codes[index], player_essence_grades[index]) / 100;'
  );

  definition := replace(
    definition,
    E'raw_damage := public.character_magic_attack(target_character) * (1 + player_magic_attack_bonus_pct / 100) * public.artificial_essence_damage_percent(player_essence_codes[index], player_essence_grades[index]) / 100;',
    E'raw_damage := public.character_magic_attack(target_character) * (1 + (player_magic_attack_bonus_pct + case when duration_ticks <= player_artificial_magic_until then player_artificial_magic_pct else 0 end) / 100) * public.artificial_essence_damage_percent(player_essence_codes[index], player_essence_grades[index]) / 100;'
  );

  definition := replace(
    definition,
    E'raw_damage := (monster_stats ->> ''physical_attack'')::numeric * (1 + enemy_physical_attack_bonus_pct / 100) * public.artificial_essence_damage_percent(enemy_essence_code, enemy_essence_grade) / 100;',
    E'raw_damage := (monster_stats ->> ''physical_attack'')::numeric * (1 + (enemy_physical_attack_bonus_pct + case when duration_ticks <= enemy_artificial_physical_until then enemy_artificial_physical_pct else 0 end) / 100) * public.artificial_essence_damage_percent(enemy_essence_code, enemy_essence_grade) / 100;'
  );

  definition := replace(
    definition,
    E'raw_damage := (monster_stats ->> ''magic_attack'')::numeric * (1 + enemy_magic_attack_bonus_pct / 100) * public.artificial_essence_damage_percent(enemy_essence_code, enemy_essence_grade) / 100;',
    E'raw_damage := (monster_stats ->> ''magic_attack'')::numeric * (1 + (enemy_magic_attack_bonus_pct + case when duration_ticks <= enemy_artificial_magic_until then enemy_artificial_magic_pct else 0 end) / 100) * public.artificial_essence_damage_percent(enemy_essence_code, enemy_essence_grade) / 100;'
  );

  definition := replace(
    definition,
    E'raw_damage := public.character_physical_attack(target_character) * (1 + player_physical_attack_bonus_pct / 100);',
    E'raw_damage := public.character_physical_attack(target_character) * (1 + (player_physical_attack_bonus_pct + player_basic_attack_bonus_pct + case when duration_ticks <= player_artificial_physical_until then player_artificial_physical_pct else 0 end) / 100);'
  );

  definition := replace(
    definition,
    E'damage := greatest(1, floor(raw_damage * (100 / (100 + monster_defense)) * (1 + case when duration_ticks <= monster_poison_until then monster_poison_damage_taken_pct else 0 end / 100) * (1 - case when duration_ticks <= enemy_thorns_until then enemy_thorns_reduction_pct else 0 end / 100))::integer);',
    E'damage := greatest(1, floor(raw_damage * case when random() < player_pierce_chance_pct / 100 then (1 + player_pierce_damage_bonus_pct / 100) else (100 / (100 + monster_defense)) end * (1 + case when duration_ticks <= monster_poison_until then monster_poison_damage_taken_pct else 0 end / 100) * (1 - case when duration_ticks <= enemy_thorns_until then enemy_thorns_reduction_pct else 0 end / 100))::integer);'
  );

  definition := replace(
    definition,
    E'raw_damage := (monster_stats ->> ''physical_attack'')::numeric * (1 + enemy_physical_attack_bonus_pct / 100);',
    E'raw_damage := (monster_stats ->> ''physical_attack'')::numeric * (1 + (enemy_physical_attack_bonus_pct + enemy_basic_attack_bonus_pct + case when duration_ticks <= enemy_artificial_physical_until then enemy_artificial_physical_pct else 0 end) / 100);'
  );

  definition := replace(
    definition,
    E'damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)) * (1 + case when duration_ticks <= player_poison_until then player_poison_damage_taken_pct else 0 end / 100) * (1 - coalesce((armor_stats ->> ''damage_taken_reduction_pct'')::numeric, 0) / 100) * (1 - case when duration_ticks <= player_thorns_until then player_thorns_reduction_pct else 0 end / 100))::integer);',
    E'damage := greatest(1, floor(raw_damage * case when random() < enemy_pierce_chance_pct / 100 then (1 + enemy_pierce_damage_bonus_pct / 100) else (100 / (100 + player_defense)) end * (1 + case when duration_ticks <= player_poison_until then player_poison_damage_taken_pct else 0 end / 100) * (1 - coalesce((armor_stats ->> ''damage_taken_reduction_pct'')::numeric, 0) / 100) * (1 - case when duration_ticks <= player_thorns_until then player_thorns_reduction_pct else 0 end / 100))::integer);'
  );

  execute definition;
end;
$$;
