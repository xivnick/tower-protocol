create or replace function public.hunt_training_dummy()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  hunt_state public.character_hunt_states%rowtype;
  dummy_template public.monster_templates%rowtype;
  dummy_stats jsonb;
  level_before integer;
  experience_before integer;
  gained_experience integer;
  duration_ticks integer := 0;
  max_duration_ticks integer := 600;
  started_at timestamptz := clock_timestamp();
  battle_ends_at timestamptz;
  attack_gauge numeric := 0;
  attacks_per_second numeric;
  critical_chance numeric;
  player_max_hp numeric;
  dummy_vitality integer;
  dummy_endurance integer;
  dummy_wisdom integer;
  dummy_max_hp numeric;
  dummy_hp numeric;
  dummy_defense numeric;
  dummy_regeneration_per_second numeric;
  damage integer;
  raw_damage numeric;
  healed_amount numeric;
  total_damage integer := 0;
  attack_count integer := 0;
  critical_count integer := 0;
  total_regeneration numeric := 0;
  is_critical boolean;
  logs jsonb := '[]'::jsonb;
  battle jsonb;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  insert into public.character_hunt_states (character_id) values (target_character.id) on conflict (character_id) do nothing;
  select * into hunt_state from public.character_hunt_states where character_id = target_character.id for update;
  if hunt_state.last_battle ->> 'status' = 'in_progress' then raise exception 'hunt_in_progress'; end if;
  if hunt_state.available_at is not null and hunt_state.available_at > started_at then raise exception 'hunt_on_cooldown'; end if;
  select * into dummy_template from public.monster_templates where code = 'training-dummy';
  if not found then raise exception 'monster_template_not_found'; end if;

  level_before := target_character.level;
  experience_before := target_character.experience;
  dummy_stats := public.monster_stats_at_level(dummy_template, level_before);
  dummy_vitality := (dummy_stats ->> 'vitality')::integer;
  dummy_endurance := (dummy_stats ->> 'endurance')::integer;
  dummy_wisdom := (dummy_stats ->> 'wisdom')::integer;
  dummy_defense := dummy_endurance + dummy_wisdom;
  gained_experience := round(public.experience_for_monster_level(level_before) * dummy_template.experience_multiplier)::integer;
  player_max_hp := 100 + (target_character.level * 20) + (target_character.vitality * 10);
  attacks_per_second := sqrt((100 + target_character.agility)::numeric / 100);
  critical_chance := least(target_character.dexterity, 100)::numeric / 100;
  dummy_max_hp := 100 + (level_before * 20) + (dummy_vitality * 10);
  dummy_hp := dummy_max_hp;
  dummy_regeneration_per_second := dummy_max_hp * (dummy_endurance::numeric / 10000);

  logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', 0, 'kind', 'encounter', 'amount', 0, 'target_hp', dummy_hp));
  attack_gauge := 1 - (attacks_per_second / 10);
  while duration_ticks < max_duration_ticks and dummy_hp > 0 loop
    duration_ticks := duration_ticks + 1;
    attack_gauge := attack_gauge + (attacks_per_second / 10);
    if attack_gauge >= 1 then
      attack_gauge := attack_gauge - 1;
      is_critical := random() < critical_chance;
      raw_damage := public.character_physical_attack(target_character);
      if is_critical then raw_damage := raw_damage * 1.5; end if;
      damage := greatest(1, floor(raw_damage * (100 / (100 + dummy_defense)))::integer);
      dummy_hp := greatest(0, dummy_hp - damage);
      total_damage := total_damage + damage;
      attack_count := attack_count + 1;
      if is_critical then critical_count := critical_count + 1; end if;
      logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', case when is_critical then 'critical' else 'attack' end, 'amount', damage, 'target_hp', dummy_hp));
      if dummy_hp <= 0 then
        logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'defeat', 'amount', 0, 'target_hp', 0));
        exit;
      end if;
    end if;
    if mod(duration_ticks, 10) = 0 and dummy_hp < dummy_max_hp then
      healed_amount := least(dummy_regeneration_per_second, dummy_max_hp - dummy_hp);
      dummy_hp := dummy_hp + healed_amount;
      total_regeneration := total_regeneration + healed_amount;
      logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'regeneration', 'amount', healed_amount, 'target_hp', dummy_hp));
    end if;
  end loop;
  if dummy_hp > 0 then raise exception 'training_dummy_not_defeated'; end if;

  battle_ends_at := started_at + (duration_ticks * interval '100 milliseconds');
  battle := jsonb_build_object(
    'hunt_ground_id', 'training-dummy', 'status', 'in_progress', 'started_at', started_at, 'ends_at', battle_ends_at,
    'player', jsonb_build_object('name', target_character.name, 'level', level_before, 'max_hp', player_max_hp, 'experience', experience_before),
    'enemy', jsonb_build_object('name', dummy_template.name, 'level', level_before, 'max_hp', dummy_max_hp),
    'gained_experience', gained_experience, 'level_before', level_before, 'level_after', level_before, 'experience_after', experience_before,
    'duration_ticks', duration_ticks, 'total_damage', total_damage, 'attack_count', attack_count,
    'critical_count', critical_count, 'total_regeneration', total_regeneration, 'logs', logs
  );
  update public.character_hunt_states set available_at = battle_ends_at, last_battle = battle where character_id = target_character.id;
  update public.characters set hunt_available_at = battle_ends_at where id = target_character.id;
  return jsonb_build_object('hunt_state', jsonb_build_object('available_at', battle_ends_at, 'last_battle', battle));
end;
$$;

grant execute on function public.hunt_training_dummy() to authenticated;
