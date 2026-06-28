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
  max_hp := (100 + (target_level * 30) + (vitality * 10)) * 1.1;
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
  function_name text;
  definition text;
begin
  foreach function_name in array array[
    'public.get_my_hunt_state()',
    'public.encounter_hunt_monster()',
    'public.hunt_training_dummy()'
  ] loop
    select pg_get_functiondef(function_name::regprocedure) into definition;

    if position(E'100 + (target_character.level * 20) + (target_character.vitality * 10)' in definition) = 0 then
      raise exception 'player_hp_formula_not_found_in_%', function_name;
    end if;

    definition := replace(
      definition,
      E'100 + (target_character.level * 20) + (target_character.vitality * 10)',
      E'100 + (target_character.level * 30) + (target_character.vitality * 10)'
    );

    execute definition;
  end loop;
end;
$$;
