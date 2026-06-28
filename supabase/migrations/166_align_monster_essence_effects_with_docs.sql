create or replace function public.essence_empower_percent(essence_code text, essence_grade integer)
returns numeric
language sql
immutable
as $$
  select case essence_code
    when 'angry-boar-might' then case essence_grade when 1 then 60 when 2 then 90 when 3 then 180 when 4 then 220 else 260 end
    else 0
  end;
$$;

create or replace function public.essence_flurry_percent(essence_grade integer)
returns numeric
language sql
immutable
as $$
  select case essence_grade when 1 then 30 when 2 then 40 when 3 then 80 when 4 then 95 else 110 end;
$$;

create or replace function public.essence_firefly_damage_percent(essence_grade integer)
returns numeric
language sql
immutable
as $$
  select case essence_grade when 1 then 60 when 2 then 80 when 3 then 160 when 4 then 180 else 220 end;
$$;

create or replace function public.essence_stonehide_shield_percent(essence_grade integer)
returns numeric
language sql
immutable
as $$
  select case essence_grade when 1 then 8 when 2 then 10 when 3 then 20 when 4 then 24 else 28 end;
$$;

create or replace function public.essence_stonehide_reflect_percent(essence_grade integer)
returns numeric
language sql
immutable
as $$
  select case essence_grade when 1 then 0 when 2 then 15 when 3 then 30 when 4 then 35 else 45 end;
$$;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  definition := replace(
    definition,
    E'player_empower_pct := case when player_essence_grades[index] >= 2 then 90 else 60 end;',
    E'player_empower_pct := public.essence_empower_percent(player_essence_codes[index], player_essence_grades[index]);'
  );
  definition := replace(
    definition,
    E'enemy_empower_pct := 90;',
    E'enemy_empower_pct := public.essence_empower_percent(enemy_essence_code, enemy_essence_grade);'
  );

  definition := replace(
    definition,
    E'player_flurry_until := duration_ticks + 40;\n          player_flurry_pct := case when player_essence_grades[index] >= 2 then 40 else 30 end;',
    E'player_flurry_until := duration_ticks + case when player_essence_grades[index] >= 5 then 50 else 40 end;\n          player_flurry_pct := public.essence_flurry_percent(player_essence_grades[index]);'
  );
  definition := replace(
    definition,
    E'enemy_flurry_until := duration_ticks + 40;\n        enemy_flurry_pct := 40;',
    E'enemy_flurry_until := duration_ticks + case when enemy_essence_grade >= 5 then 50 else 40 end;\n        enemy_flurry_pct := public.essence_flurry_percent(enemy_essence_grade);'
  );

  definition := replace(
    definition,
    E'raw_damage := public.character_magic_attack(target_character) * (case when player_essence_grades[index] >= 2 then 80 else 60 end) / 100;',
    E'raw_damage := public.character_magic_attack(target_character) * public.essence_firefly_damage_percent(player_essence_grades[index]) / 100;'
  );
  definition := replace(
    definition,
    E'raw_damage := (monster_stats ->> ''magic_attack'')::numeric * 0.8;',
    E'raw_damage := (monster_stats ->> ''magic_attack'')::numeric * public.essence_firefly_damage_percent(enemy_essence_grade) / 100;'
  );

  definition := replace(
    definition,
    E'player_shield_until := duration_ticks + 40;\n          player_shield := player_max_hp * (case when player_essence_grades[index] >= 2 then 10 else 8 end) / 100;',
    E'player_shield_until := duration_ticks + case when player_essence_grades[index] >= 5 then 50 else 40 end;\n          player_shield := player_max_hp * public.essence_stonehide_shield_percent(player_essence_grades[index]) / 100;'
  );
  definition := replace(
    definition,
    E'enemy_shield_until := duration_ticks + 40;\n        enemy_shield := monster_max_hp * 0.10;\n        enemy_reflect_pct := 15;',
    E'enemy_shield_until := duration_ticks + case when enemy_essence_grade >= 5 then 50 else 40 end;\n        enemy_shield := monster_max_hp * public.essence_stonehide_shield_percent(enemy_essence_grade) / 100;\n        enemy_reflect_pct := public.essence_stonehide_reflect_percent(enemy_essence_grade);'
  );

  definition := replace(
    definition,
    E'if enemy_essence_code = ''bigeye-bat-night-sight'' then\n    monster_accuracy := monster_accuracy * 1.10;',
    E'if enemy_essence_code = ''bigeye-bat-night-sight'' then\n    monster_accuracy := monster_accuracy * (1 + (case enemy_essence_grade when 1 then 5 when 2 then 10 when 3 then 18 when 4 then 22 else 28 end) / 100);'
  );
  definition := replace(
    definition,
    E'elsif enemy_essence_code = ''moss-slime-regeneration'' then\n    enemy_passive_regeneration_pct := 4;',
    E'elsif enemy_essence_code = ''moss-slime-regeneration'' then\n    enemy_passive_regeneration_pct := case enemy_essence_grade when 1 then 2 when 2 then 4 when 3 then 8 when 4 then 10 else 12 end;'
  );
  definition := replace(
    definition,
    E'elsif enemy_essence_code = ''leafshade-panther-counter'' then\n    enemy_counter_empower_pct := 120;',
    E'elsif enemy_essence_code = ''leafshade-panther-counter'' then\n    enemy_counter_empower_pct := case enemy_essence_grade when 1 then 60 when 2 then 120 when 3 then 240 when 4 then 300 else 360 end;'
  );

  execute definition;
end;
$$;
