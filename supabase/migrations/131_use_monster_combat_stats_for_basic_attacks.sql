create or replace function public.monster_combat_stats_at_level(template_row public.monster_templates, target_level integer)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  primary_stats jsonb;
  strength integer;
  agility integer;
  dexterity integer;
  vitality integer;
  endurance integer;
  intelligence integer;
  wisdom integer;
  base_attack numeric := public.combat_base_attack(target_level);
  attack_level_bonus numeric := greatest(0, target_level)::numeric;
  physical_attack_bonus numeric := 0;
  magic_attack_bonus numeric := 0;
  accuracy_score numeric;
  evasion_score numeric;
  physical_defense numeric;
  magic_defense numeric;
  max_hp numeric;
  attack_speed numeric;
begin
  primary_stats := public.monster_stats_at_level(template_row, target_level);
  strength := (primary_stats ->> 'strength')::integer;
  agility := (primary_stats ->> 'agility')::integer;
  dexterity := (primary_stats ->> 'dexterity')::integer;
  vitality := (primary_stats ->> 'vitality')::integer;
  endurance := (primary_stats ->> 'endurance')::integer;
  intelligence := (primary_stats ->> 'intelligence')::integer;
  wisdom := (primary_stats ->> 'wisdom')::integer;

  if template_row.growth_strength > 0 and template_row.growth_intelligence > 0 then
    physical_attack_bonus := attack_level_bonus * 0.5;
    magic_attack_bonus := attack_level_bonus * 0.5;
  elsif template_row.growth_intelligence > template_row.growth_strength then
    magic_attack_bonus := attack_level_bonus;
  else
    physical_attack_bonus := attack_level_bonus;
  end if;

  accuracy_score := dexterity + target_level;
  evasion_score := agility + target_level;
  physical_defense := endurance + target_level;
  magic_defense := wisdom + target_level;
  max_hp := (100 + (target_level * 20) + (vitality * 10)) * 1.3;
  attack_speed := 1 + agility::numeric / 100;

  return jsonb_build_object(
    'primary_stats', primary_stats,
    'physical_attack', base_attack + strength + physical_attack_bonus,
    'magic_attack', base_attack + intelligence + magic_attack_bonus,
    'physical_defense', physical_defense,
    'magic_defense', magic_defense,
    'max_hp', max_hp,
    'regeneration', max_hp * (endurance::numeric / 3000),
    'attacks_per_second', attack_speed,
    'cooldown_reduction', wisdom::numeric / (wisdom + 100),
    'accuracy', 100 + accuracy_score,
    'evasion', evasion_score,
    'evasion_rate', (evasion_score / (evasion_score + 100)) * 100,
    'critical_chance', least(dexterity, 100),
    'critical_damage', 150
  );
end;
$$;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  critical_chance numeric;\n  player_accuracy numeric;' in definition) = 0
    or position(E'  critical_chance := least(target_character.dexterity, 100)::numeric / 100;\n  player_accuracy := (100 + target_character.dexterity) * (1 - coalesce((weapon_stats ->> ''accuracy_penalty_pct'')::numeric, 0) / 100);' in definition) = 0
    or position(E'  monster_evasion := (monster_stats -> ''primary_stats'' ->> ''agility'')::numeric;' in definition) = 0
    or position(E'          raw_damage := (monster_stats ->> ''physical_attack'')::numeric;\n          if enemy_empower_pct > 0 then' in definition) = 0
    or position(E'''kind'', ''enemy_attack'', ''amount'', damage' in definition) = 0 then
    raise exception 'monster_basic_attack_stats_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  critical_chance numeric;\n  player_accuracy numeric;',
    E'  critical_chance numeric;\n  monster_critical_chance numeric;\n  monster_critical_damage numeric;\n  player_accuracy numeric;'
  );

  definition := replace(
    definition,
    E'  critical_chance := least(target_character.dexterity, 100)::numeric / 100;\n  player_accuracy := (100 + target_character.dexterity) * (1 - coalesce((weapon_stats ->> ''accuracy_penalty_pct'')::numeric, 0) / 100);',
    E'  critical_chance := least(target_character.dexterity, 100)::numeric / 100;\n  monster_critical_chance := coalesce((monster_stats ->> ''critical_chance'')::numeric, 0) / 100;\n  monster_critical_damage := coalesce((monster_stats ->> ''critical_damage'')::numeric, 150) / 100;\n  player_accuracy := (100 + target_character.dexterity) * (1 - coalesce((weapon_stats ->> ''accuracy_penalty_pct'')::numeric, 0) / 100);'
  );

  definition := replace(
    definition,
    E'  monster_evasion := (monster_stats -> ''primary_stats'' ->> ''agility'')::numeric;',
    E'  monster_evasion := coalesce((monster_stats ->> ''evasion'')::numeric, (monster_stats -> ''primary_stats'' ->> ''agility'')::numeric + monster_level);'
  );

  definition := replace(
    definition,
    E'          raw_damage := (monster_stats ->> ''physical_attack'')::numeric;\n          if enemy_empower_pct > 0 then',
    E'          raw_damage := (monster_stats ->> ''physical_attack'')::numeric;\n          is_critical := random() < monster_critical_chance;\n          if enemy_empower_pct > 0 then'
  );

  definition := replace(
    definition,
    E'          end if;\n          damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)) * (1 - coalesce((armor_stats ->> ''damage_taken_reduction_pct'')::numeric, 0) / 100))::integer);',
    E'          end if;\n          if is_critical then raw_damage := raw_damage * monster_critical_damage; end if;\n          damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)) * (1 - coalesce((armor_stats ->> ''damage_taken_reduction_pct'')::numeric, 0) / 100))::integer);'
  );

  definition := replace(
    definition,
    E'''kind'', ''enemy_attack'', ''amount'', damage',
    E'''kind'', case when is_critical then ''enemy_critical'' else ''enemy_attack'' end, ''amount'', damage'
  );

  execute definition;
end;
$$;
