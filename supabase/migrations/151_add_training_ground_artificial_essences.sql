insert into public.monster_templates (
  code, name, growth_strength, growth_agility, growth_dexterity, growth_vitality,
  growth_endurance, growth_intelligence, growth_wisdom, basic_attack_enabled, experience_multiplier
)
values
  ('artificial-strike-dummy', '강타 허수아비', 4, 1, 1, 2, 1, 0, 0, true, 1.00),
  ('artificial-might-dummy', '완력 허수아비', 4, 1, 1, 2, 1, 0, 0, true, 1.00),
  ('artificial-bolt-dummy', '마탄 허수아비', 0, 1, 1, 2, 1, 4, 2, true, 1.00),
  ('artificial-knowledge-dummy', '지식 허수아비', 0, 1, 1, 2, 1, 4, 2, true, 1.00),
  ('artificial-armor-dummy', '철갑 허수아비', 1, 0, 0, 3, 4, 0, 1, true, 1.00),
  ('artificial-guard-dummy', '수호 허수아비', 2, 2, 2, 3, 2, 0, 0, true, 1.00),
  ('artificial-life-dummy', '생명 허수아비', 1, 0, 0, 5, 2, 0, 0, true, 1.00),
  ('artificial-focus-dummy', '집중 허수아비', 1, 2, 4, 1, 0, 0, 0, true, 1.00),
  ('artificial-critical-dummy', '치명 허수아비', 3, 1, 4, 1, 0, 0, 0, true, 1.00),
  ('artificial-pierce-dummy', '관통 허수아비', 3, 1, 3, 1, 1, 0, 0, true, 1.00)
on conflict (code) do update
set name = excluded.name,
    growth_strength = excluded.growth_strength,
    growth_agility = excluded.growth_agility,
    growth_dexterity = excluded.growth_dexterity,
    growth_vitality = excluded.growth_vitality,
    growth_endurance = excluded.growth_endurance,
    growth_intelligence = excluded.growth_intelligence,
    growth_wisdom = excluded.growth_wisdom,
    basic_attack_enabled = excluded.basic_attack_enabled,
    experience_multiplier = excluded.experience_multiplier;

insert into public.essence_templates (code, name, monster_template_id)
select essence.code, essence.name, monster.id
from (values
  ('artificial-strike'::text, '인공 정수: 강타', 'artificial-strike-dummy'::text),
  ('artificial-might', '인공 정수: 완력', 'artificial-might-dummy'),
  ('artificial-bolt', '인공 정수: 마탄', 'artificial-bolt-dummy'),
  ('artificial-knowledge', '인공 정수: 지식', 'artificial-knowledge-dummy'),
  ('artificial-armor', '인공 정수: 철갑', 'artificial-armor-dummy'),
  ('artificial-guard', '인공 정수: 수호', 'artificial-guard-dummy'),
  ('artificial-life', '인공 정수: 생명', 'artificial-life-dummy'),
  ('artificial-focus', '인공 정수: 집중', 'artificial-focus-dummy'),
  ('artificial-critical', '인공 정수: 치명', 'artificial-critical-dummy'),
  ('artificial-pierce', '인공 정수: 관통', 'artificial-pierce-dummy')
) as essence(code, name, monster_code)
join public.monster_templates monster on monster.code = essence.monster_code
on conflict (code) do update
set name = excluded.name,
    monster_template_id = excluded.monster_template_id;

insert into public.hunt_ground_monsters (
  hunt_ground_id, monster_template_id, spawn_min_level, spawn_max_level, spawn_weight, sort_order, is_enabled
)
select ground.id, monster.id, spawn.relative_level, spawn.relative_level, 3, spawn.sort_order, true
from (values ('training-dummy'::text), ('wooden-doll'::text)) as ground(id)
cross join (values
  ('artificial-strike-dummy'::text, 0, 20),
  ('artificial-might-dummy', 0, 21),
  ('artificial-bolt-dummy', 0, 22),
  ('artificial-knowledge-dummy', 0, 23),
  ('artificial-armor-dummy', 0, 24),
  ('artificial-guard-dummy', 0, 25),
  ('artificial-life-dummy', 0, 26),
  ('artificial-focus-dummy', 0, 27),
  ('artificial-critical-dummy', 0, 28),
  ('artificial-pierce-dummy', 0, 29)
) as spawn(monster_code, relative_level, sort_order)
join public.monster_templates monster on monster.code = spawn.monster_code
where not exists (
  select 1
  from public.hunt_ground_monsters existing
  where existing.hunt_ground_id = ground.id
    and existing.monster_template_id = monster.id
);

create or replace function public.artificial_essence_stat_percent(essence_code text, essence_grade integer)
returns numeric
language sql
immutable
as $$
  select case essence_code
    when 'artificial-might' then case essence_grade when 1 then 2 when 2 then 4 when 3 then 6 when 4 then 7 else 8 end
    when 'artificial-knowledge' then case essence_grade when 1 then 2 when 2 then 4 when 3 then 6 when 4 then 7 else 8 end
    when 'artificial-armor' then case essence_grade when 1 then 3 when 2 then 6 when 3 then 9 when 4 then 10 else 12 end
    when 'artificial-life' then case essence_grade when 1 then 2 when 2 then 4 when 3 then 6 when 4 then 7 else 8 end
    when 'artificial-critical' then case essence_grade when 1 then 4 when 2 then 8 when 3 then 12 when 4 then 14 else 16 end
    else 0
  end;
$$;

create or replace function public.artificial_essence_damage_percent(essence_code text, essence_grade integer)
returns numeric
language sql
immutable
as $$
  select case essence_code
    when 'artificial-strike' then case essence_grade when 1 then 50 when 2 then 65 when 3 then 100 when 4 then 120 else 145 end
    when 'artificial-bolt' then case essence_grade when 1 then 50 when 2 then 65 when 3 then 100 when 4 then 120 else 145 end
    else 0
  end;
$$;

create or replace function public.artificial_guard_shield_percent(essence_grade integer)
returns numeric
language sql
immutable
as $$
  select case essence_grade when 1 then 0.20 when 2 then 0.25 when 3 then 0.40 when 4 then 0.45 else 0.55 end;
$$;

create or replace function public.artificial_focus_accuracy_percent(essence_grade integer)
returns numeric
language sql
immutable
as $$
  select case essence_grade when 1 then 5 when 2 then 7 when 3 then 11 when 4 then 13 else 16 end;
$$;

create or replace function public.artificial_pierce_chance_percent(essence_grade integer)
returns numeric
language sql
immutable
as $$
  select case essence_grade when 1 then 3 when 2 then 6 when 3 then 9 when 4 then 10 else 12 end;
$$;

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
    when 'artificial-strike' then case when essence_grade >= 4 then 40 when essence_grade >= 2 then 50 else 80 end
    when 'artificial-bolt' then case when essence_grade >= 4 then 40 when essence_grade >= 2 then 50 else 80 end
    when 'artificial-guard' then case when essence_grade >= 4 then 45 when essence_grade >= 2 then 55 else 90 end
    when 'artificial-focus' then case when essence_grade >= 4 then 50 when essence_grade >= 2 then 60 else 100 end
    else 100
  end;
$$;

create or replace function public.essence_is_active(essence_code text)
returns boolean
language sql
immutable
as $$
  select essence_code not in (
    'moss-slime-regeneration',
    'leafshade-panther-counter',
    'bigeye-bat-night-sight',
    'artificial-might',
    'artificial-knowledge',
    'artificial-armor',
    'artificial-life',
    'artificial-critical',
    'artificial-pierce'
  );
$$;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.roll_hunt_victory_rewards(uuid,uuid,integer,integer)'::regprocedure) into definition;

  if position(E'  if random() < 0.10 then\n    select * into target_essence\n    from public.essence_templates\n    where monster_template_id = defeated_monster_template_id;\n\n    if found then' in definition) = 0 then
    raise exception 'artificial_essence_reward_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  if random() < 0.10 then\n    select * into target_essence\n    from public.essence_templates\n    where monster_template_id = defeated_monster_template_id;\n\n    if found then',
    E'  select * into target_essence\n  from public.essence_templates\n  where monster_template_id = defeated_monster_template_id;\n\n  if found and (target_essence.code like ''artificial-%'' or random() < 0.10) then'
  );

  definition := replace(
    definition,
    E'    end if;\n  end if;\n\n  return jsonb_build_object(',
    E'  end if;\n\n  return jsonb_build_object('
  );

  execute definition;
end;
$$;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  enemy_reflect_pct numeric := 0;\n  player_passive_regeneration_pct numeric := 0;' in definition) = 0
    or position(E'  monster_poison_damage_taken_pct numeric := 0;\n  player_poison_damage_taken_pct numeric := 0;' in definition) = 0
    or position(E'  player_essence_ready := array_fill(0, array[player_essence_count]);' in definition) = 0
    or position(E'  if enemy_essence_code = ''bigeye-bat-night-sight'' then' in definition) = 0
    or position(E'        if player_essence_codes[index] = ''angry-boar-might'' then' in definition) = 0
    or position(E'      if enemy_essence_code = ''angry-boar-might'' then' in definition) = 0 then
    raise exception 'artificial_essence_combat_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  enemy_reflect_pct numeric := 0;\n  player_passive_regeneration_pct numeric := 0;',
    E'  enemy_reflect_pct numeric := 0;\n  player_physical_attack_bonus_pct numeric := 0;\n  enemy_physical_attack_bonus_pct numeric := 0;\n  player_magic_attack_bonus_pct numeric := 0;\n  enemy_magic_attack_bonus_pct numeric := 0;\n  player_critical_damage_bonus_pct numeric := 0;\n  enemy_critical_damage_bonus_pct numeric := 0;\n  player_pierce_chance_pct numeric := 0;\n  enemy_pierce_chance_pct numeric := 0;\n  player_guard_until integer := -1;\n  enemy_guard_until integer := -1;\n  player_guard_remaining integer := 0;\n  enemy_guard_remaining integer := 0;\n  player_guard_shield_pct numeric := 0;\n  enemy_guard_shield_pct numeric := 0;\n  player_focus_until integer := -1;\n  enemy_focus_until integer := -1;\n  player_focus_accuracy_pct numeric := 0;\n  enemy_focus_accuracy_pct numeric := 0;\n  player_focus_crit_pct numeric := 0;\n  enemy_focus_crit_pct numeric := 0;\n  player_passive_regeneration_pct numeric := 0;'
  );

  definition := replace(
    definition,
    E'  monster_poison_damage_taken_pct numeric := 0;\n  player_poison_damage_taken_pct numeric := 0;',
    E'  monster_poison_damage_taken_pct numeric := 0;\n  player_poison_damage_taken_pct numeric := 0;\n  base_player_max_hp numeric;'
  );

  definition := replace(
    definition,
    E'  player_essence_ready := array_fill(0, array[player_essence_count]);',
    E'  player_essence_ready := array_fill(0, array[player_essence_count]);\n  base_player_max_hp := player_max_hp;'
  );

  definition := replace(
    definition,
    E'    end if;\n  end loop;\n\n  select template.code, template.name into enemy_essence_code, enemy_essence_name',
    E'    elsif player_essence_codes[index] = ''artificial-might'' then\n      player_physical_attack_bonus_pct := player_physical_attack_bonus_pct + public.artificial_essence_stat_percent(player_essence_codes[index], player_essence_grades[index]);\n      passive_logs := passive_logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index], ''effect'', ''물리 공격력 증가''));\n    elsif player_essence_codes[index] = ''artificial-knowledge'' then\n      player_magic_attack_bonus_pct := player_magic_attack_bonus_pct + public.artificial_essence_stat_percent(player_essence_codes[index], player_essence_grades[index]);\n      passive_logs := passive_logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index], ''effect'', ''마법 공격력 증가''));\n    elsif player_essence_codes[index] = ''artificial-armor'' then\n      player_defense := player_defense * (1 + public.artificial_essence_stat_percent(player_essence_codes[index], player_essence_grades[index]) / 100);\n      passive_logs := passive_logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index], ''effect'', ''방어력 증가''));\n    elsif player_essence_codes[index] = ''artificial-life'' then\n      player_max_hp := player_max_hp * (1 + public.artificial_essence_stat_percent(player_essence_codes[index], player_essence_grades[index]) / 100);\n      passive_logs := passive_logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index], ''effect'', ''최대 HP 증가''));\n    elsif player_essence_codes[index] = ''artificial-critical'' then\n      player_critical_damage_bonus_pct := player_critical_damage_bonus_pct + public.artificial_essence_stat_percent(player_essence_codes[index], player_essence_grades[index]);\n      if player_essence_grades[index] >= 4 then critical_chance := critical_chance + (case when player_essence_grades[index] >= 5 then 0.03 else 0.02 end); end if;\n      passive_logs := passive_logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index], ''effect'', ''치명타 피해 증가''));\n    elsif player_essence_codes[index] = ''artificial-pierce'' then\n      player_pierce_chance_pct := greatest(player_pierce_chance_pct, public.artificial_pierce_chance_percent(player_essence_grades[index]));\n      passive_logs := passive_logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index], ''effect'', ''일반공격 관통''));\n    end if;\n  end loop;\n  if player_max_hp > base_player_max_hp then\n    player_hp := least(player_max_hp, player_hp * player_max_hp / nullif(base_player_max_hp, 0));\n  end if;\n\n  select template.code, template.name into enemy_essence_code, enemy_essence_name'
  );

  definition := replace(
    definition,
    E'  if enemy_essence_code = ''bigeye-bat-night-sight'' then',
    E'  if enemy_essence_code in (''artificial-might'', ''artificial-knowledge'', ''artificial-armor'', ''artificial-life'', ''artificial-critical'', ''artificial-pierce'') then\n    if enemy_essence_code = ''artificial-might'' then enemy_physical_attack_bonus_pct := public.artificial_essence_stat_percent(enemy_essence_code, enemy_essence_grade); end if;\n    if enemy_essence_code = ''artificial-knowledge'' then enemy_magic_attack_bonus_pct := public.artificial_essence_stat_percent(enemy_essence_code, enemy_essence_grade); end if;\n    if enemy_essence_code = ''artificial-armor'' then monster_defense := monster_defense * (1 + public.artificial_essence_stat_percent(enemy_essence_code, enemy_essence_grade) / 100); end if;\n    if enemy_essence_code = ''artificial-life'' then monster_max_hp := monster_max_hp * (1 + public.artificial_essence_stat_percent(enemy_essence_code, enemy_essence_grade) / 100); monster_hp := monster_max_hp; end if;\n    if enemy_essence_code = ''artificial-critical'' then enemy_critical_damage_bonus_pct := public.artificial_essence_stat_percent(enemy_essence_code, enemy_essence_grade); if enemy_essence_grade >= 4 then monster_critical_chance := monster_critical_chance + (case when enemy_essence_grade >= 5 then 0.03 else 0.02 end); end if; end if;\n    if enemy_essence_code = ''artificial-pierce'' then enemy_pierce_chance_pct := public.artificial_pierce_chance_percent(enemy_essence_grade); end if;\n    passive_logs := passive_logs || jsonb_build_array(jsonb_build_object(''time_tenths'', 0, ''kind'', ''essence_status'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade, ''effect'', ''인공 정수''));\n  elsif enemy_essence_code = ''bigeye-bat-night-sight'' then'
  );

  definition := replace(
    definition,
    E'        if player_essence_codes[index] = ''angry-boar-might'' then',
    E'        if player_essence_codes[index] = ''artificial-strike'' then\n          raw_damage := public.character_physical_attack(target_character) * (1 + player_physical_attack_bonus_pct / 100) * public.artificial_essence_damage_percent(player_essence_codes[index], player_essence_grades[index]) / 100;\n          damage := greatest(1, floor(raw_damage * (100.0 / (100 + monster_defense)))::integer);\n          monster_hp := greatest(0, monster_hp - damage); total_damage := total_damage + damage;\n          if player_essence_grades[index] >= 4 then player_physical_attack_bonus_pct := player_physical_attack_bonus_pct + case when player_essence_grades[index] >= 5 then 8 else 5 end; end if;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]), jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]));\n        elsif player_essence_codes[index] = ''artificial-bolt'' then\n          raw_damage := public.character_magic_attack(target_character) * (1 + player_magic_attack_bonus_pct / 100) * public.artificial_essence_damage_percent(player_essence_codes[index], player_essence_grades[index]) / 100;\n          damage := greatest(1, floor(raw_damage * (100.0 / (100 + monster_magic_defense)))::integer);\n          monster_hp := greatest(0, monster_hp - damage); total_damage := total_damage + damage;\n          if player_essence_grades[index] >= 4 then player_magic_attack_bonus_pct := player_magic_attack_bonus_pct + case when player_essence_grades[index] >= 5 then 8 else 5 end; end if;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]), jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]));\n        elsif player_essence_codes[index] = ''artificial-guard'' then\n          player_guard_until := duration_ticks + case when player_essence_grades[index] >= 5 then 50 else 40 end;\n          player_guard_remaining := 10;\n          player_guard_shield_pct := public.artificial_guard_shield_percent(player_essence_grades[index]);\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]));\n        elsif player_essence_codes[index] = ''artificial-focus'' then\n          player_focus_until := duration_ticks + case when player_essence_grades[index] >= 5 then 60 when player_essence_grades[index] >= 3 then 50 else 40 end;\n          player_focus_accuracy_pct := public.artificial_focus_accuracy_percent(player_essence_grades[index]);\n          player_focus_crit_pct := case when player_essence_grades[index] >= 5 then 5 when player_essence_grades[index] >= 4 then 3 else 0 end;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index]));\n        elsif player_essence_codes[index] = ''angry-boar-might'' then'
  );

  definition := replace(
    definition,
    E'      if enemy_essence_code = ''angry-boar-might'' then',
    E'      if enemy_essence_code = ''artificial-strike'' then\n        raw_damage := (monster_stats ->> ''physical_attack'')::numeric * (1 + enemy_physical_attack_bonus_pct / 100) * public.artificial_essence_damage_percent(enemy_essence_code, enemy_essence_grade) / 100;\n        damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)))::integer);\n        player_hp := greatest(0, player_hp - damage);\n        if enemy_essence_grade >= 4 then enemy_physical_attack_bonus_pct := enemy_physical_attack_bonus_pct + case when enemy_essence_grade >= 5 then 8 else 5 end; end if;\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade), jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n      elsif enemy_essence_code = ''artificial-bolt'' then\n        raw_damage := (monster_stats ->> ''magic_attack'')::numeric * (1 + enemy_magic_attack_bonus_pct / 100) * public.artificial_essence_damage_percent(enemy_essence_code, enemy_essence_grade) / 100;\n        damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)))::integer);\n        player_hp := greatest(0, player_hp - damage);\n        if enemy_essence_grade >= 4 then enemy_magic_attack_bonus_pct := enemy_magic_attack_bonus_pct + case when enemy_essence_grade >= 5 then 8 else 5 end; end if;\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade), jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_damage'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n      elsif enemy_essence_code = ''artificial-guard'' then\n        enemy_guard_until := duration_ticks + case when enemy_essence_grade >= 5 then 50 else 40 end;\n        enemy_guard_remaining := 10;\n        enemy_guard_shield_pct := public.artificial_guard_shield_percent(enemy_essence_grade);\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n      elsif enemy_essence_code = ''artificial-focus'' then\n        enemy_focus_until := duration_ticks + case when enemy_essence_grade >= 5 then 60 when enemy_essence_grade >= 3 then 50 else 40 end;\n        enemy_focus_accuracy_pct := public.artificial_focus_accuracy_percent(enemy_essence_grade);\n        enemy_focus_crit_pct := case when enemy_essence_grade >= 5 then 5 when enemy_essence_grade >= 4 then 3 else 0 end;\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_cast'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n      elsif enemy_essence_code = ''angry-boar-might'' then'
  );

  definition := replace(
    definition,
    E'      is_hit := random() >= monster_evasion / (monster_evasion + player_accuracy);',
    E'      is_hit := random() >= monster_evasion / (monster_evasion + player_accuracy * (1 + case when duration_ticks <= player_focus_until then player_focus_accuracy_pct else 0 end / 100));'
  );

  definition := replace(
    definition,
    E'        is_critical := random() < critical_chance;',
    E'        is_critical := random() < critical_chance + case when duration_ticks <= player_focus_until then player_focus_crit_pct / 100 else 0 end;'
  );

  definition := replace(
    definition,
    E'        raw_damage := public.character_physical_attack(target_character);',
    E'        raw_damage := public.character_physical_attack(target_character) * (1 + player_physical_attack_bonus_pct / 100);'
  );

  definition := replace(
    definition,
    E'        if is_critical then raw_damage := raw_damage * 1.5; end if;',
    E'        if is_critical then raw_damage := raw_damage * (1.5 + player_critical_damage_bonus_pct / 100); end if;'
  );

  definition := replace(
    definition,
    E'        damage := greatest(1, floor(raw_damage * (100 / (100 + monster_defense)))::integer);',
    E'        damage := greatest(1, floor(raw_damage * case when random() < player_pierce_chance_pct / 100 then 1 else (100 / (100 + monster_defense)) end)::integer);'
  );

  definition := replace(
    definition,
    E'        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''critical'' else ''attack'' end, ''amount'', damage, ''target_hp'', monster_hp, ''target'', ''enemy''));',
    E'        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''critical'' else ''attack'' end, ''amount'', damage, ''target_hp'', monster_hp, ''target'', ''enemy''));\n        if duration_ticks <= player_guard_until and player_guard_remaining > 0 then\n          player_shield_until := greatest(player_shield_until, player_guard_until);\n          healed_amount := player_max_hp * player_guard_shield_pct / 100;\n          player_shield := player_shield + healed_amount;\n          player_guard_remaining := player_guard_remaining - 1;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_shield'', ''amount'', healed_amount, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', ''인공 정수: 수호'', ''grade'', 1));\n        end if;'
  );

  definition := replace(
    definition,
    E'        is_hit := random() >= player_evasion / (player_evasion + monster_accuracy);',
    E'        is_hit := random() >= player_evasion / (player_evasion + monster_accuracy * (1 + case when duration_ticks <= enemy_focus_until then enemy_focus_accuracy_pct else 0 end / 100));'
  );

  definition := replace(
    definition,
    E'          raw_damage := (monster_stats ->> ''physical_attack'')::numeric;',
    E'          raw_damage := (monster_stats ->> ''physical_attack'')::numeric * (1 + enemy_physical_attack_bonus_pct / 100);'
  );

  definition := replace(
    definition,
    E'          is_critical := random() < monster_critical_chance;',
    E'          is_critical := random() < monster_critical_chance + case when duration_ticks <= enemy_focus_until then enemy_focus_crit_pct / 100 else 0 end;'
  );

  definition := replace(
    definition,
    E'          if is_critical then raw_damage := raw_damage * monster_critical_damage; end if;',
    E'          if is_critical then raw_damage := raw_damage * (monster_critical_damage + enemy_critical_damage_bonus_pct / 100); end if;'
  );

  definition := replace(
    definition,
    E'          damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)) * (1 - coalesce((armor_stats ->> ''damage_taken_reduction_pct'')::numeric, 0) / 100))::integer);',
    E'          damage := greatest(1, floor(raw_damage * case when random() < enemy_pierce_chance_pct / 100 then 1 else (100 / (100 + player_defense)) end * (1 - coalesce((armor_stats ->> ''damage_taken_reduction_pct'')::numeric, 0) / 100))::integer);'
  );

  definition := replace(
    definition,
    E'          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''enemy_critical'' else ''enemy_attack'' end, ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player''));',
    E'          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', case when is_critical then ''enemy_critical'' else ''enemy_attack'' end, ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player''));\n          if duration_ticks <= enemy_guard_until and enemy_guard_remaining > 0 then\n            enemy_shield_until := greatest(enemy_shield_until, enemy_guard_until);\n            healed_amount := monster_max_hp * enemy_guard_shield_pct / 100;\n            enemy_shield := enemy_shield + healed_amount;\n            enemy_guard_remaining := enemy_guard_remaining - 1;\n            logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_shield'', ''amount'', healed_amount, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n          end if;'
  );

  execute definition;
end;
$$;
