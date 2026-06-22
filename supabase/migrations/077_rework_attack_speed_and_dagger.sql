create or replace function public.weapon_stats(weapon_type text, weapon_level integer)
returns jsonb
language plpgsql
stable
as $$
declare
  power integer := 3 + floor(weapon_level * 1.5)::integer;
begin
  if weapon_type = 'longsword' then
    return jsonb_build_object('physical_attack_flat', power);
  elsif weapon_type = 'greatsword' then
    return jsonb_build_object('physical_attack_pct', 2 + floor(weapon_level * 0.1)::integer);
  elsif weapon_type = 'dagger' then
    return jsonb_build_object(
      'accuracy_penalty_pct', least(23, 15 + floor((weapon_level - 1) / 12)::integer),
      'attack_speed_pct', 20 + floor(weapon_level * 0.2)::integer
    );
  elsif weapon_type = 'bow' then
    return jsonb_build_object(
      'accuracy_penalty_pct', least(18, 10 + floor((weapon_level - 1) / 12)::integer),
      'on_hit_fixed_damage', 2 + floor(weapon_level * 1.1)::integer
    );
  elsif weapon_type = 'wand' then
    return jsonb_build_object('magic_attack_flat', power);
  elsif weapon_type = 'staff' then
    return jsonb_build_object('magic_attack_pct', 2 + floor(weapon_level * 0.1)::integer);
  end if;

  raise exception 'invalid_weapon_type';
end;
$$;

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
  max_hp := 100 + (target_level * 20) + (vitality * 10);
  attack_speed := 1 + agility::numeric / 100;

  return jsonb_build_object(
    'primary_stats', primary_stats,
    'physical_attack', strength,
    'magic_attack', intelligence,
    'physical_defense', endurance,
    'magic_defense', wisdom,
    'max_hp', max_hp,
    'regeneration', max_hp * (endurance::numeric / 10000),
    'attacks_per_second', attack_speed,
    'cooldown_reduction', wisdom::numeric / (wisdom + 100),
    'accuracy', 100 + dexterity,
    'evasion_rate', (agility::numeric / (agility + 100)) * 100,
    'critical_chance', least(dexterity, 100),
    'critical_damage', 150
  );
end;
$$;

do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;
  if position(E'  player_attacks_per_second := sqrt((100 + target_character.agility)::numeric / 100);' in definition) = 0
    or position(E'  weapon_stats := public.character_weapon_stats(target_character.id);\n  critical_chance := least(target_character.dexterity, 100)::numeric / 100;' in definition) = 0
    or position(E'  player_accuracy := 100 + target_character.dexterity - coalesce((weapon_stats ->> ''accuracy_penalty'')::numeric, 0);' in definition) = 0
    or position(E'      if weapon_stats ->> ''weapon_type'' = ''dagger'' then' in definition) = 0 then
    raise exception 'hunt_training_dummy_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  player_attacks_per_second := sqrt((100 + target_character.agility)::numeric / 100);',
    E'  weapon_stats := public.character_weapon_stats(target_character.id);\n  player_attacks_per_second := (1 + target_character.agility::numeric / 100) * (1 + coalesce((weapon_stats ->> ''attack_speed_pct'')::numeric, 0) / 100);'
  );
  definition := replace(
    definition,
    E'  weapon_stats := public.character_weapon_stats(target_character.id);\n  critical_chance := least(target_character.dexterity, 100)::numeric / 100;',
    E'  critical_chance := least(target_character.dexterity, 100)::numeric / 100;'
  );
  definition := replace(
    definition,
    E'  player_accuracy := 100 + target_character.dexterity - coalesce((weapon_stats ->> ''accuracy_penalty'')::numeric, 0);',
    E'  player_accuracy := (100 + target_character.dexterity) * (1 - coalesce((weapon_stats ->> ''accuracy_penalty_pct'')::numeric, 0) / 100);'
  );
  definition := replace(
    definition,
    E'      if weapon_stats ->> ''weapon_type'' = ''dagger'' then\n        damage := damage + floor(public.character_physical_attack(target_character) * coalesce((weapon_stats ->> ''on_hit_physical_attack_pct'')::numeric, 0) / 100)::integer;\n      elsif weapon_stats ->> ''weapon_type'' = ''bow'' then\n        damage := damage + coalesce((weapon_stats ->> ''on_hit_fixed_damage'')::integer, 0);\n      end if;',
    E'      if weapon_stats ->> ''weapon_type'' = ''bow'' then\n        damage := damage + coalesce((weapon_stats ->> ''on_hit_fixed_damage'')::integer, 0);\n      end if;'
  );
  execute definition;
end;
$$;
