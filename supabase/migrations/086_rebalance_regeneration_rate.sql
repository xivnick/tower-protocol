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
    'regeneration', max_hp * (endurance::numeric / 3000),
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
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;
  if position('player_regeneration_per_second := player_max_hp * (target_character.endurance::numeric / 10000);' in definition) = 0 then
    raise exception 'hunt_training_dummy_regeneration_definition_changed';
  end if;

  definition := replace(
    definition,
    'player_regeneration_per_second := player_max_hp * (target_character.endurance::numeric / 10000);',
    'player_regeneration_per_second := player_max_hp * (target_character.endurance::numeric / 3000);'
  );
  execute definition;
end;
$$;
