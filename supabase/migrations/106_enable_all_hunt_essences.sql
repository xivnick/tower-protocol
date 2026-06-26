-- Every monster currently available in the hunting grounds has an essence.
-- Keep the coefficients in server-side helpers so the battle resolver remains
-- authoritative for both players and monsters.
create or replace function public.essence_cooldown_tenths(essence_code text, essence_grade integer)
returns integer
language sql
immutable
as $$
  select case essence_code
    when 'angry-boar-might' then case when essence_grade >= 5 then 32 when essence_grade >= 4 then 35 when essence_grade >= 2 then 45 else 80 end
    when 'forest-wolf-flurry' then case when essence_grade >= 4 then 40 when essence_grade >= 2 then 50 else 90 end
    when 'firefly-spirit-ember' then case when essence_grade >= 4 then 20 when essence_grade >= 2 then 25 else 50 end
    when 'stone-beetle-stonehide' then case when essence_grade >= 4 then 40 when essence_grade >= 2 then 50 else 90 end
    when 'forest-warden-stag-charge' then case when essence_grade >= 4 then 40 when essence_grade >= 2 then 50 else 80 end
    when 'green-viper-fang' then case when essence_grade >= 4 then 38 when essence_grade >= 2 then 45 else 70 end
    when 'blackneedle-bat-leech' then case when essence_grade >= 4 then 38 when essence_grade >= 2 then 45 else 70 end
    when 'vine-hunter-bind' then case when essence_grade >= 4 then 40 when essence_grade >= 2 then 50 else 80 end
    when 'redthorn-beast-spines' then case when essence_grade >= 4 then 40 when essence_grade >= 2 then 50 else 80 end
    when 'blade-beetle-edge' then case when essence_grade >= 4 then 40 when essence_grade >= 2 then 50 else 80 end
    when 'crystal-lizard-refraction' then case when essence_grade >= 4 then 40 when essence_grade >= 2 then 50 else 80 end
    when 'crystaljaw-centipede-crush' then case when essence_grade >= 4 then 40 when essence_grade >= 2 then 50 else 80 end
    when 'cave-vampire-bat-bloodcry' then case when essence_grade >= 4 then 40 when essence_grade >= 2 then 50 else 80 end
    else 100
  end;
$$;

create or replace function public.essence_damage_percent(essence_code text, essence_grade integer)
returns numeric
language sql
immutable
as $$
  select case essence_code
    when 'forest-warden-stag-charge' then case essence_grade when 1 then 100 when 2 then 130 when 3 then 220 when 4 then 260 else 320 end
    when 'green-viper-fang' then case essence_grade when 1 then 50 when 2 then 60 when 3 then 90 when 4 then 110 else 130 end
    when 'vine-hunter-bind' then case essence_grade when 1 then 60 when 2 then 80 when 3 then 140 when 4 then 170 else 210 end
    when 'blackneedle-bat-leech' then case essence_grade when 1 then 70 when 2 then 90 when 3 then 180 when 4 then 220 else 260 end
    when 'crystaljaw-centipede-crush' then case essence_grade when 1 then 100 when 2 then 130 when 3 then 240 when 4 then 280 else 340 end
    when 'cave-vampire-bat-bloodcry' then case essence_grade when 1 then 80 when 2 then 100 when 3 then 190 when 4 then 230 else 280 end
    else 0
  end;
$$;

create or replace function public.essence_life_steal_percent(essence_code text, essence_grade integer)
returns numeric
language sql
immutable
as $$
  select case essence_code
    when 'forest-warden-stag-charge' then case essence_grade when 1 then 5 when 2 then 7 when 3 then 10 when 4 then 12 else 14 end
    when 'blackneedle-bat-leech' then case essence_grade when 1 then 20 when 2 then 25 when 3 then 30 when 4 then 35 else 40 end
    when 'cave-vampire-bat-bloodcry' then case essence_grade when 1 then 15 when 2 then 20 when 3 then 25 when 4 then 30 else 35 end
    else 0
  end;
$$;

create or replace function public.essence_is_active(essence_code text)
returns boolean
language sql
immutable
as $$
  select essence_code not in ('moss-slime-regeneration', 'leafshade-panther-counter', 'bigeye-bat-night-sight');
$$;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  enemy_reflect_pct numeric := 0;\n  player_used_essence_action boolean := false;' in definition) = 0
    or position(E'        elsif player_essence_codes[index] = ''stone-beetle-stonehide'' then' in definition) = 0
    or position(E'      elsif enemy_essence_code = ''stone-beetle-stonehide'' then' in definition) = 0 then
    raise exception 'hunt_essence_definition_changed';
  end if;

  definition := replace(definition,
    E'  enemy_reflect_pct numeric := 0;\n  player_used_essence_action boolean := false;',
    E'  enemy_reflect_pct numeric := 0;\n  player_passive_regeneration_pct numeric := 0;\n  enemy_passive_regeneration_pct numeric := 0;\n  player_counter_empower_pct numeric := 0;\n  enemy_counter_empower_pct numeric := 0;\n  player_thorns_until integer := -1;\n  enemy_thorns_until integer := -1;\n  player_thorns_pct numeric := 0;\n  enemy_thorns_pct numeric := 0;\n  player_blade_until integer := -1;\n  enemy_blade_until integer := -1;\n  player_blade_pct numeric := 0;\n  enemy_blade_pct numeric := 0;\n  player_refraction_until integer := -1;\n  enemy_refraction_until integer := -1;\n  player_refraction_pct numeric := 0;\n  enemy_refraction_pct numeric := 0;\n  monster_poison_until integer := -1;\n  player_poison_until integer := -1;\n  monster_poison_damage numeric := 0;\n  player_poison_damage numeric := 0;\n  monster_bleed_until integer := -1;\n  player_bleed_until integer := -1;\n  monster_bleed_damage numeric := 0;\n  player_bleed_damage numeric := 0;\n  player_used_essence_action boolean := false;'
  );

  definition := replace(definition,
    E'  player_essence_ready := array_fill(0, array[player_essence_count]);\n\n  select template.code, template.name into enemy_essence_code, enemy_essence_name',
    E'  player_essence_ready := array_fill(0, array[player_essence_count]);\n  for index in 1..player_essence_count loop\n    if player_essence_codes[index] = ''bigeye-bat-night-sight'' then\n      player_accuracy := player_accuracy * (1 + (case player_essence_grades[index] when 1 then 5 when 2 then 10 when 3 then 18 when 4 then 22 else 28 end) / 100);\n    elsif player_essence_codes[index] = ''moss-slime-regeneration'' then\n      player_passive_regeneration_pct := greatest(player_passive_regeneration_pct, case player_essence_grades[index] when 1 then 2 when 2 then 4 when 3 then 8 when 4 then 10 else 12 end);\n    elsif player_essence_codes[index] = ''leafshade-panther-counter'' then\n      player_counter_empower_pct := greatest(player_counter_empower_pct, case player_essence_grades[index] when 1 then 60 when 2 then 120 when 3 then 240 when 4 then 300 else 360 end);\n    end if;\n  end loop;\n\n  select template.code, template.name into enemy_essence_code, enemy_essence_name'
  );

  definition := replace(definition,
    E'  logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''encounter'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy''));',
    E'  if enemy_essence_code = ''bigeye-bat-night-sight'' then\n    monster_accuracy := monster_accuracy * 1.10;\n  elsif enemy_essence_code = ''moss-slime-regeneration'' then\n    enemy_passive_regeneration_pct := 4;\n  elsif enemy_essence_code = ''leafshade-panther-counter'' then\n    enemy_counter_empower_pct := 120;\n  end if;\n\n  logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''encounter'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy''));'
  );

  definition := replace(definition,
    E'      if duration_ticks > 0 and not player_used_essence_action and player_essence_ready[index] <= duration_ticks then',
    E'      if duration_ticks > 0 and not player_used_essence_action and public.essence_is_active(player_essence_codes[index]) and player_essence_ready[index] <= duration_ticks then'
  );

  definition := replace(definition,
    E'        elsif player_essence_codes[index] = ''stone-beetle-stonehide'' then\n          player_shield_until := duration_ticks + 40;',
    E'        elsif player_essence_codes[index] = ''stone-beetle-stonehide'' then\n          player_shield_until := duration_ticks + 40;'
  );

  definition := replace(definition,
    E'        end if;\n        player_essence_ready[index] := duration_ticks + public.essence_cooldown_tenths(player_essence_codes[index], player_essence_grades[index]);',
    E'        elsif public.essence_damage_percent(player_essence_codes[index], player_essence_grades[index]) > 0 then\n          raw_damage := case when player_essence_codes[index] = ''vine-hunter-bind'' then public.character_magic_attack(target_character) else public.character_physical_attack(target_character) end * public.essence_damage_percent(player_essence_codes[index], player_essence_grades[index]) / 100;\n          damage := greatest(1, floor(raw_damage * (100 / (100 + case when player_essence_codes[index] = ''vine-hunter-bind'' then monster_magic_defense else monster_defense end)))::integer);\n          monster_hp := greatest(0, monster_hp - damage);\n          healed_amount := least(player_max_hp - player_hp, (case when player_essence_codes[index] = ''forest-warden-stag-charge'' then player_max_hp - player_hp else damage end) * public.essence_life_steal_percent(player_essence_codes[index], player_essence_grades[index]) / 100);\n          player_hp := player_hp + greatest(0, healed_amount);\n          if player_essence_codes[index] = ''green-viper-fang'' then monster_poison_until := duration_ticks + (case when player_essence_grades[index] >= 5 then 60 when player_essence_grades[index] >= 3 then 50 else 40 end); monster_poison_damage := public.character_magic_attack(target_character) * (case player_essence_grades[index] when 1 then 20 when 2 then 25 when 3 then 45 when 4 then 55 else 65 end) / 100; end if;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]), jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]));\n        elsif player_essence_codes[index] = ''redthorn-beast-spines'' then\n          player_thorns_until := duration_ticks + case when player_essence_grades[index] >= 5 then 50 else 40 end; player_thorns_pct := case player_essence_grades[index] when 1 then 15 when 2 then 25 when 3 then 50 when 4 then 60 else 75 end;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]));\n        elsif player_essence_codes[index] = ''blade-beetle-edge'' then\n          player_blade_until := duration_ticks + case when player_essence_grades[index] >= 5 then 60 else 50 end; player_blade_pct := case player_essence_grades[index] when 1 then 15 when 2 then 25 when 3 then 45 when 4 then 55 else 65 end;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]));\n        elsif player_essence_codes[index] = ''crystal-lizard-refraction'' then\n          player_refraction_until := duration_ticks + case when player_essence_grades[index] >= 5 then 50 else 40 end; player_refraction_pct := case player_essence_grades[index] when 1 then 15 when 2 then 25 when 3 then 50 when 4 then 60 else 75 end;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]));\n        end if;\n        player_essence_ready[index] := duration_ticks + public.essence_cooldown_tenths(player_essence_codes[index], player_essence_grades[index]);'
  );

  definition := replace(definition,
    E'    if duration_ticks > 0 and not action_used and not enemy_used_essence_action and enemy_essence_code is not null and enemy_essence_ready <= duration_ticks then',
    E'    if duration_ticks > 0 and not action_used and not enemy_used_essence_action and enemy_essence_code is not null and public.essence_is_active(enemy_essence_code) and enemy_essence_ready <= duration_ticks then'
  );

  definition := replace(definition,
    E'      elsif enemy_essence_code = ''stone-beetle-stonehide'' then\n        enemy_shield_until := duration_ticks + 40;',
    E'      elsif enemy_essence_code = ''stone-beetle-stonehide'' then\n        enemy_shield_until := duration_ticks + 40;'
  );

  definition := replace(definition,
    E'      end if;\n      enemy_essence_ready := duration_ticks + public.essence_cooldown_tenths(enemy_essence_code, enemy_essence_grade);',
    E'      elsif public.essence_damage_percent(enemy_essence_code, enemy_essence_grade) > 0 then\n        raw_damage := (case when enemy_essence_code = ''vine-hunter-bind'' then (monster_stats ->> ''magic_attack'')::numeric else (monster_stats ->> ''physical_attack'')::numeric end) * public.essence_damage_percent(enemy_essence_code, enemy_essence_grade) / 100;\n        damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)))::integer);\n        player_hp := greatest(0, player_hp - damage);\n        healed_amount := least(monster_max_hp - monster_hp, (case when enemy_essence_code = ''forest-warden-stag-charge'' then monster_max_hp - monster_hp else damage end) * public.essence_life_steal_percent(enemy_essence_code, enemy_essence_grade) / 100);\n        monster_hp := monster_hp + greatest(0, healed_amount);\n        if enemy_essence_code = ''green-viper-fang'' then player_poison_until := duration_ticks + 40; player_poison_damage := (monster_stats ->> ''magic_attack'')::numeric * .25; end if;\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade), jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n      elsif enemy_essence_code = ''redthorn-beast-spines'' then\n        enemy_thorns_until := duration_ticks + 40; enemy_thorns_pct := 25; logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n      elsif enemy_essence_code = ''blade-beetle-edge'' then\n        enemy_blade_until := duration_ticks + 50; enemy_blade_pct := 25; logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n      elsif enemy_essence_code = ''crystal-lizard-refraction'' then\n        enemy_refraction_until := duration_ticks + 40; enemy_refraction_pct := 25; logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n      end if;\n      enemy_essence_ready := duration_ticks + public.essence_cooldown_tenths(enemy_essence_code, enemy_essence_grade);'
  );

  definition := replace(definition,
    E'        monster_hp := greatest(0, monster_hp - damage);\n        total_damage := total_damage + damage; attack_count := attack_count + 1;',
    E'        monster_hp := greatest(0, monster_hp - damage);\n        if duration_ticks <= player_blade_until then monster_bleed_until := duration_ticks + 30; monster_bleed_damage := public.character_physical_attack(target_character) * player_blade_pct / 100; end if;\n        if duration_ticks <= player_refraction_until then damage := greatest(1, floor(public.character_magic_attack(target_character) * player_refraction_pct / 100 * (100 / (100 + monster_magic_defense)))::integer); monster_hp := greatest(0, monster_hp - damage); logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', ''수정 도마뱀의 굴절비늘'', ''grade'', 1)); end if;\n        if duration_ticks <= player_thorns_until then damage := greatest(1, floor(public.character_physical_attack(target_character) * player_thorns_pct / 100)::integer); monster_hp := greatest(0, monster_hp - damage); logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', ''붉은가시 맹수의 역린'', ''grade'', 1)); end if;\n        total_damage := total_damage + damage; attack_count := attack_count + 1;'
  );

  definition := replace(definition,
    E'          player_hp := greatest(0, player_hp - damage);\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''enemy_attack'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player''));',
    E'          player_hp := greatest(0, player_hp - damage);\n          if duration_ticks <= enemy_blade_until then player_bleed_until := duration_ticks + 30; player_bleed_damage := (monster_stats ->> ''physical_attack'')::numeric * enemy_blade_pct / 100; end if;\n          if duration_ticks <= enemy_refraction_until then damage := greatest(1, floor((monster_stats ->> ''magic_attack'')::numeric * enemy_refraction_pct / 100 * (100 / (100 + player_defense)))::integer); player_hp := greatest(0, player_hp - damage); logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', ''수정 도마뱀의 굴절비늘'', ''grade'', enemy_essence_grade)); end if;\n          if duration_ticks <= enemy_thorns_until then damage := greatest(1, floor((monster_stats ->> ''physical_attack'')::numeric * enemy_thorns_pct / 100)::integer); player_hp := greatest(0, player_hp - damage); logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', ''붉은가시 맹수의 역린'', ''grade'', enemy_essence_grade)); end if;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''enemy_attack'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player''));'
  );

  definition := replace(definition,
    E'        if not is_hit then\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''enemy_miss'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player''));',
    E'        if not is_hit then\n          if player_counter_empower_pct > 0 then player_empower_pct := player_counter_empower_pct; end if;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''enemy_miss'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player''));'
  );

  definition := replace(definition,
    E'    if mod(duration_ticks, 10) = 0 and player_hp < player_max_hp then',
    E'    if mod(duration_ticks, 10) = 0 then\n      if player_passive_regeneration_pct > 0 then healed_amount := (player_max_hp - player_hp) * player_passive_regeneration_pct / 100; player_hp := least(player_max_hp, player_hp + healed_amount); end if;\n      if enemy_passive_regeneration_pct > 0 then healed_amount := (monster_max_hp - monster_hp) * enemy_passive_regeneration_pct / 100; monster_hp := least(monster_max_hp, monster_hp + healed_amount); end if;\n      if duration_ticks <= monster_poison_until then damage := greatest(1, floor(monster_poison_damage * (100 / (100 + monster_magic_defense)))::integer); monster_hp := greatest(0, monster_hp - damage); logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', ''초록 독사의 독니'', ''grade'', 1)); end if;\n      if duration_ticks <= player_poison_until then damage := greatest(1, floor(player_poison_damage * (100 / (100 + player_defense)))::integer); player_hp := greatest(0, player_hp - damage); logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', ''초록 독사의 독니'', ''grade'', enemy_essence_grade)); end if;\n      if duration_ticks <= monster_bleed_until then damage := greatest(1, floor(monster_bleed_damage * (100 / (100 + monster_defense)))::integer); monster_hp := greatest(0, monster_hp - damage); end if;\n      if duration_ticks <= player_bleed_until then damage := greatest(1, floor(player_bleed_damage * (100 / (100 + player_defense)))::integer); player_hp := greatest(0, player_hp - damage); end if;\n    end if;\n\n    if mod(duration_ticks, 10) = 0 and player_hp < player_max_hp then'
  );

  execute definition;
end;
$$;
