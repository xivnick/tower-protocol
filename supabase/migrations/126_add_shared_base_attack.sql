create or replace function public.combat_base_attack(target_level integer)
returns integer
language sql
immutable
as $$
  select floor(greatest(0, target_level)::numeric * 0.7)::integer;
$$;

create or replace function public.weapon_stats(weapon_type text, weapon_level integer)
returns jsonb
language plpgsql
stable
as $$
declare
  power integer := 3 + floor(weapon_level * 1.5)::integer;
  percent_bonus numeric := floor((18 + weapon_level * 0.4) * 10) / 10;
  bow_accuracy_penalty integer := least(35, 12 + floor((weapon_level - 1) / 4)::integer);
  bow_required_dexterity integer := ceiling(100 / (1 - bow_accuracy_penalty::numeric / 100) - 100)::integer;
  bow_fixed_damage integer := floor(power * 0.65 + bow_required_dexterity * 0.5)::integer;
begin
  if weapon_type = 'longsword' then
    return jsonb_build_object('physical_attack_flat', power);
  elsif weapon_type = 'greatsword' then
    return jsonb_build_object('physical_attack_pct', percent_bonus);
  elsif weapon_type = 'dagger' then
    return jsonb_build_object(
      'accuracy_penalty_pct', least(23, 15 + floor((weapon_level - 1) / 12)::integer),
      'attack_speed_pct', 20 + floor(weapon_level * 0.2)::integer
    );
  elsif weapon_type = 'bow' then
    return jsonb_build_object(
      'accuracy_penalty_pct', bow_accuracy_penalty,
      'on_hit_fixed_damage', bow_fixed_damage
    );
  elsif weapon_type = 'wand' then
    return jsonb_build_object('magic_attack_flat', power);
  elsif weapon_type = 'staff' then
    return jsonb_build_object('magic_attack_pct', percent_bonus);
  end if;

  raise exception 'invalid_weapon_type';
end;
$$;

create or replace function public.character_physical_attack(target_character public.characters)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  weapon jsonb := public.character_weapon_stats(target_character.id);
  base_attack numeric := public.combat_base_attack(target_character.level);
begin
  return (base_attack + target_character.strength + coalesce((weapon ->> 'physical_attack_flat')::numeric, 0))
    * (1 + coalesce((weapon ->> 'physical_attack_pct')::numeric, 0) / 100);
end;
$$;

create or replace function public.character_magic_attack(target_character public.characters)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  weapon jsonb := public.character_weapon_stats(target_character.id);
  base_attack numeric := public.combat_base_attack(target_character.level);
begin
  return (base_attack + target_character.intelligence + coalesce((weapon ->> 'magic_attack_flat')::numeric, 0))
    * (1 + coalesce((weapon ->> 'magic_attack_pct')::numeric, 0) / 100);
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
  base_attack numeric := public.combat_base_attack(target_level);
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

  accuracy_score := dexterity + target_level;
  evasion_score := agility + target_level;
  physical_defense := endurance + target_level;
  magic_defense := wisdom + target_level;
  max_hp := 100 + (target_level * 20) + (vitality * 10);
  attack_speed := 1 + agility::numeric / 100;

  return jsonb_build_object(
    'primary_stats', primary_stats,
    'physical_attack', base_attack + strength,
    'magic_attack', base_attack + intelligence,
    'physical_defense', physical_defense,
    'magic_defense', magic_defense,
    'max_hp', max_hp,
    'regeneration', max_hp * (endurance::numeric / 3000),
    'attacks_per_second', attack_speed,
    'cooldown_reduction', wisdom::numeric / (wisdom + 100),
    'accuracy', 100 + accuracy_score,
    'evasion_rate', (evasion_score / (evasion_score + 100)) * 100,
    'critical_chance', least(dexterity, 100),
    'critical_damage', 150
  );
end;
$$;
