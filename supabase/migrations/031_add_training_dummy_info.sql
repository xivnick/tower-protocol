create or replace function public.get_training_dummy_info()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  dummy_template public.monster_templates%rowtype;
  dummy_stats jsonb;
  dummy_vitality integer;
  dummy_endurance integer;
  dummy_max_hp numeric;
begin
  select * into target_character from public.characters where user_id = auth.uid();
  if not found then raise exception 'character_not_found'; end if;

  select * into dummy_template from public.monster_templates where code = 'training-dummy';
  if not found then raise exception 'monster_template_not_found'; end if;

  dummy_stats := public.monster_stats_at_level(dummy_template, target_character.level);
  dummy_vitality := (dummy_stats ->> 'vitality')::integer;
  dummy_endurance := (dummy_stats ->> 'endurance')::integer;
  dummy_max_hp := 100 + (target_character.level * 20) + (dummy_vitality * 10);

  return jsonb_build_object(
    'name', dummy_template.name,
    'level', target_character.level,
    'vitality', dummy_vitality,
    'endurance', dummy_endurance,
    'physical_defense', dummy_template.physical_defense,
    'max_hp', dummy_max_hp,
    'regeneration_per_second', dummy_max_hp * (dummy_endurance::numeric / 10000),
    'basic_attack_enabled', dummy_template.basic_attack_enabled
  );
end;
$$;

grant execute on function public.get_training_dummy_info() to authenticated;
