create or replace function public.hunt_training_dummy()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  required_experience integer;
  level_before integer;
  level_ups integer := 0;
  gained_experience integer := 10;
  duration_ticks integer := 0;
  max_duration_ticks integer := 600;
  attack_gauge numeric := 0;
  attacks_per_second numeric;
  critical_chance numeric;
  dummy_max_hp numeric := 100;
  dummy_hp numeric := 100;
  dummy_physical_defense numeric := 10;
  dummy_regeneration_per_second numeric := 1;
  damage integer;
  raw_damage numeric;
  healed_amount numeric;
  total_damage integer := 0;
  attack_count integer := 0;
  critical_count integer := 0;
  total_regeneration numeric := 0;
  is_critical boolean;
  logs jsonb := '[]'::jsonb;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;

  if not found then
    raise exception 'character_not_found';
  end if;

  if target_character.hunt_available_at is not null and target_character.hunt_available_at > clock_timestamp() then
    raise exception 'hunt_on_cooldown';
  end if;

  level_before := target_character.level;
  attacks_per_second := sqrt((100 + target_character.agility)::numeric / 100);
  critical_chance := least(target_character.dexterity, 100)::numeric / 100;

  -- 조우는 [0.0s]에 실행되는 첫 행동이다.
  logs := logs || jsonb_build_array(jsonb_build_object(
    'time_tenths', 0,
    'kind', 'encounter',
    'amount', 0,
    'target_hp', dummy_hp
  ));

  -- 일반공격은 준비돼 있지만, 조우 행동 다음 틱에서만 실행된다.
  attack_gauge := 1 - (attacks_per_second / 10);

  while duration_ticks < max_duration_ticks and dummy_hp > 0 loop
    duration_ticks := duration_ticks + 1;
    attack_gauge := attack_gauge + (attacks_per_second / 10);

    if attack_gauge >= 1 then
      attack_gauge := attack_gauge - 1;
      is_critical := random() < critical_chance;
      raw_damage := public.character_physical_attack(target_character);

      if is_critical then
        raw_damage := raw_damage * 1.5;
      end if;

      damage := greatest(1, floor(raw_damage * (100 / (100 + dummy_physical_defense)))::integer);
      dummy_hp := greatest(0, dummy_hp - damage);
      total_damage := total_damage + damage;
      attack_count := attack_count + 1;

      if is_critical then
        critical_count := critical_count + 1;
      end if;

      logs := logs || jsonb_build_array(jsonb_build_object(
        'time_tenths', duration_ticks,
        'kind', case when is_critical then 'critical' else 'attack' end,
        'amount', damage,
        'target_hp', dummy_hp
      ));

      if dummy_hp <= 0 then
        logs := logs || jsonb_build_array(jsonb_build_object(
          'time_tenths', duration_ticks,
          'kind', 'defeat',
          'amount', 0,
          'target_hp', 0
        ));
        exit;
      end if;
    end if;

    if mod(duration_ticks, 10) = 0 and dummy_hp < dummy_max_hp then
      healed_amount := least(dummy_regeneration_per_second, dummy_max_hp - dummy_hp);
      dummy_hp := dummy_hp + healed_amount;
      total_regeneration := total_regeneration + healed_amount;

      logs := logs || jsonb_build_array(jsonb_build_object(
        'time_tenths', duration_ticks,
        'kind', 'regeneration',
        'amount', healed_amount,
        'target_hp', dummy_hp
      ));
    end if;
  end loop;

  if dummy_hp > 0 then
    raise exception 'training_dummy_not_defeated';
  end if;

  if target_character.level < 100 then
    target_character.experience := target_character.experience + gained_experience;

    while target_character.level < 100 loop
      required_experience := public.required_experience_for_level(target_character.level + 1);
      exit when required_experience is null or target_character.experience < required_experience;
      target_character.experience := target_character.experience - required_experience;
      target_character.level := target_character.level + 1;
      level_ups := level_ups + 1;
    end loop;

    if target_character.level = 100 then
      target_character.experience := 0;
    end if;
  else
    gained_experience := 0;
  end if;

  update public.characters
  set
    level = target_character.level,
    experience = target_character.experience,
    stat_points = stat_points + (level_ups * 5),
    hunt_available_at = clock_timestamp() + (duration_ticks * interval '100 milliseconds')
  where id = target_character.id
  returning * into target_character;

  return jsonb_build_object(
    'character', to_jsonb(target_character),
    'gained_experience', gained_experience,
    'level_before', level_before,
    'level_after', target_character.level,
    'duration_ticks', duration_ticks,
    'total_damage', total_damage,
    'attack_count', attack_count,
    'critical_count', critical_count,
    'total_regeneration', total_regeneration,
    'logs', logs
  );
end;
$$;
