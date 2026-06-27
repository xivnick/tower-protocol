do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  monster_poison_damage numeric := 0;\n  player_poison_damage numeric := 0;' in definition) = 0
    or position(E'if player_essence_codes[index] = ''green-viper-fang'' then monster_poison_until := duration_ticks + (case when player_essence_grades[index] >= 5 then 60 when player_essence_grades[index] >= 3 then 50 else 40 end); monster_poison_damage := public.character_magic_attack(target_character) * (case player_essence_grades[index] when 1 then 20 when 2 then 25 when 3 then 45 when 4 then 55 else 65 end) / 100; end if;' in definition) = 0
    or position(E'if enemy_essence_code = ''green-viper-fang'' then player_poison_until := duration_ticks + 40; player_poison_damage := (monster_stats ->> ''magic_attack'')::numeric * .25; end if;' in definition) = 0 then
    raise exception 'green_viper_poison_bonus_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  monster_poison_damage numeric := 0;\n  player_poison_damage numeric := 0;',
    E'  monster_poison_damage numeric := 0;\n  player_poison_damage numeric := 0;\n  monster_poison_damage_taken_pct numeric := 0;\n  player_poison_damage_taken_pct numeric := 0;'
  );

  definition := replace(
    definition,
    E'if player_essence_codes[index] = ''green-viper-fang'' then monster_poison_until := duration_ticks + (case when player_essence_grades[index] >= 5 then 60 when player_essence_grades[index] >= 3 then 50 else 40 end); monster_poison_damage := public.character_magic_attack(target_character) * (case player_essence_grades[index] when 1 then 20 when 2 then 25 when 3 then 45 when 4 then 55 else 65 end) / 100; end if;',
    E'if player_essence_codes[index] = ''green-viper-fang'' then monster_poison_until := duration_ticks + (case when player_essence_grades[index] >= 5 then 60 when player_essence_grades[index] >= 3 then 50 else 40 end); monster_poison_damage := public.character_magic_attack(target_character) * (case player_essence_grades[index] when 1 then 20 when 2 then 25 when 3 then 45 when 4 then 55 else 65 end) / 100; monster_poison_damage_taken_pct := case when player_essence_grades[index] >= 5 then 12 when player_essence_grades[index] >= 4 then 8 else 0 end; end if;'
  );

  definition := replace(
    definition,
    E'if enemy_essence_code = ''green-viper-fang'' then player_poison_until := duration_ticks + 40; player_poison_damage := (monster_stats ->> ''magic_attack'')::numeric * .25; end if;',
    E'if enemy_essence_code = ''green-viper-fang'' then player_poison_until := duration_ticks + (case when enemy_essence_grade >= 5 then 60 when enemy_essence_grade >= 3 then 50 else 40 end); player_poison_damage := (monster_stats ->> ''magic_attack'')::numeric * (case enemy_essence_grade when 1 then 20 when 2 then 25 when 3 then 45 when 4 then 55 else 65 end) / 100; player_poison_damage_taken_pct := case when enemy_essence_grade >= 5 then 12 when enemy_essence_grade >= 4 then 8 else 0 end; end if;'
  );

  -- Player -> monster damage while the monster is poisoned by green viper.
  definition := replace(
    definition,
    E'* (1 - case when duration_ticks <= enemy_thorns_until then enemy_thorns_reduction_pct else 0 end / 100)',
    E'* (1 + case when duration_ticks <= monster_poison_until then monster_poison_damage_taken_pct else 0 end / 100) * (1 - case when duration_ticks <= enemy_thorns_until then enemy_thorns_reduction_pct else 0 end / 100)'
  );

  definition := replace(
    definition,
    E'public.character_magic_attack(target_character) * player_refraction_pct / 100 * (100 / (100 + monster_defense))',
    E'public.character_magic_attack(target_character) * player_refraction_pct / 100 * (100 / (100 + monster_defense)) * (1 + case when duration_ticks <= monster_poison_until then monster_poison_damage_taken_pct else 0 end / 100)'
  );

  definition := replace(
    definition,
    E'public.character_physical_attack(target_character) * player_thorns_pct / 100',
    E'public.character_physical_attack(target_character) * player_thorns_pct / 100 * (1 + case when duration_ticks <= monster_poison_until then monster_poison_damage_taken_pct else 0 end / 100)'
  );

  definition := replace(
    definition,
    E'public.character_physical_attack(target_character) * player_flurry_pct / 100 * (100 / (100 + monster_defense))',
    E'public.character_physical_attack(target_character) * player_flurry_pct / 100 * (100 / (100 + monster_defense)) * (1 + case when duration_ticks <= monster_poison_until then monster_poison_damage_taken_pct else 0 end / 100)'
  );

  definition := replace(
    definition,
    E'monster_poison_damage * (100 / (100 + monster_defense))',
    E'monster_poison_damage * (100 / (100 + monster_defense)) * (1 + case when duration_ticks <= monster_poison_until then monster_poison_damage_taken_pct else 0 end / 100)'
  );

  definition := replace(
    definition,
    E'monster_bleed_damage * (100 / (100 + monster_defense))',
    E'monster_bleed_damage * (100 / (100 + monster_defense)) * (1 + case when duration_ticks <= monster_poison_until then monster_poison_damage_taken_pct else 0 end / 100)'
  );

  -- Enemy -> player damage while the player is poisoned by green viper.
  definition := replace(
    definition,
    E'raw_damage * (100 / (100 + player_defense))',
    E'raw_damage * (100 / (100 + player_defense)) * (1 + case when duration_ticks <= player_poison_until then player_poison_damage_taken_pct else 0 end / 100)'
  );

  definition := replace(
    definition,
    E'(monster_stats ->> ''magic_attack'')::numeric * enemy_refraction_pct / 100 * (100 / (100 + player_defense))',
    E'(monster_stats ->> ''magic_attack'')::numeric * enemy_refraction_pct / 100 * (100 / (100 + player_defense)) * (1 + case when duration_ticks <= player_poison_until then player_poison_damage_taken_pct else 0 end / 100)'
  );

  definition := replace(
    definition,
    E'(monster_stats ->> ''physical_attack'')::numeric * enemy_thorns_pct / 100',
    E'(monster_stats ->> ''physical_attack'')::numeric * enemy_thorns_pct / 100 * (1 + case when duration_ticks <= player_poison_until then player_poison_damage_taken_pct else 0 end / 100)'
  );

  definition := replace(
    definition,
    E'(monster_stats ->> ''physical_attack'')::numeric * enemy_flurry_pct / 100 * (100 / (100 + player_defense))',
    E'(monster_stats ->> ''physical_attack'')::numeric * enemy_flurry_pct / 100 * (100 / (100 + player_defense)) * (1 + case when duration_ticks <= player_poison_until then player_poison_damage_taken_pct else 0 end / 100)'
  );

  definition := replace(
    definition,
    E'player_poison_damage * (100 / (100 + player_defense))',
    E'player_poison_damage * (100 / (100 + player_defense)) * (1 + case when duration_ticks <= player_poison_until then player_poison_damage_taken_pct else 0 end / 100)'
  );

  definition := replace(
    definition,
    E'player_bleed_damage * (100 / (100 + player_defense))',
    E'player_bleed_damage * (100 / (100 + player_defense)) * (1 + case when duration_ticks <= player_poison_until then player_poison_damage_taken_pct else 0 end / 100)'
  );

  execute definition;
end;
$$;
