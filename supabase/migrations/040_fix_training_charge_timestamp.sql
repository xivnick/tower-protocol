create or replace function public.get_my_training_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character_id uuid;
  training_state public.character_training_states%rowtype;
  observed_at timestamptz := clock_timestamp();
  elapsed_charges integer;
  calculated_charges integer;
  next_recharge_at timestamptz;
begin
  select id into target_character_id from public.characters where user_id = auth.uid();
  if not found then raise exception 'character_not_found'; end if;

  insert into public.character_training_states (character_id)
  values (target_character_id)
  on conflict (character_id) do nothing;

  select * into training_state from public.character_training_states where character_id = target_character_id;
  elapsed_charges := greatest(0, floor(extract(epoch from (observed_at - training_state.last_recharged_at)) / 6)::integer);
  calculated_charges := least(10, training_state.charges + elapsed_charges);
  if calculated_charges < 10 then
    next_recharge_at := training_state.last_recharged_at + ((elapsed_charges + 1) * interval '6 seconds');
  end if;

  return jsonb_build_object('charges', calculated_charges, 'max_charges', 10, 'next_recharge_at', next_recharge_at);
end;
$$;

create or replace function public.train_my_character()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  training_state public.character_training_states%rowtype;
  required_experience integer;
  reward_roll numeric;
  gained_experience integer;
  reward_tier text;
  level_before integer;
  level_ups integer := 0;
  observed_at timestamptz := clock_timestamp();
  elapsed_charges integer;
  calculated_charges integer;
  recharged_at timestamptz;
  next_recharge_at timestamptz;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;

  insert into public.character_training_states (character_id)
  values (target_character.id)
  on conflict (character_id) do nothing;
  select * into training_state from public.character_training_states where character_id = target_character.id for update;

  elapsed_charges := greatest(0, floor(extract(epoch from (observed_at - training_state.last_recharged_at)) / 6)::integer);
  calculated_charges := least(10, training_state.charges + elapsed_charges);
  recharged_at := training_state.last_recharged_at + (elapsed_charges * interval '6 seconds');
  if calculated_charges = 10 then recharged_at := observed_at; end if;

  if target_character.level >= 100 then
    if calculated_charges < 10 then next_recharge_at := recharged_at + interval '6 seconds'; end if;
    return jsonb_build_object(
      'character', to_jsonb(target_character), 'gained_experience', 0, 'reward_tier', 'max',
      'level_before', target_character.level, 'level_after', target_character.level,
      'training_state', jsonb_build_object('charges', calculated_charges, 'max_charges', 10, 'next_recharge_at', next_recharge_at)
    );
  end if;

  if calculated_charges < 1 then raise exception 'training_charges_empty'; end if;

  calculated_charges := calculated_charges - 1;
  if calculated_charges < 10 then next_recharge_at := recharged_at + interval '6 seconds'; end if;
  update public.character_training_states
  set charges = calculated_charges, last_recharged_at = recharged_at
  where character_id = target_character.id;

  level_before := target_character.level;
  reward_roll := random();
  if reward_roll < 0.05 then
    reward_tier := 'great';
    gained_experience := floor(random() * 61)::integer + 60;
  elsif reward_roll < 0.30 then
    reward_tier := 'good';
    gained_experience := floor(random() * 20)::integer + 16;
  else
    reward_tier := 'normal';
    gained_experience := floor(random() * 11)::integer + 5;
  end if;

  target_character.experience := target_character.experience + gained_experience;
  while target_character.level < 100 loop
    required_experience := public.required_experience_for_level(target_character.level + 1);
    exit when required_experience is null or target_character.experience < required_experience;
    target_character.experience := target_character.experience - required_experience;
    target_character.level := target_character.level + 1;
    level_ups := level_ups + 1;
  end loop;
  if target_character.level = 100 then target_character.experience := 0; end if;

  update public.characters
  set level = target_character.level, experience = target_character.experience,
      stat_points = stat_points + (level_ups * 5)
  where id = target_character.id
  returning * into target_character;

  return jsonb_build_object(
    'character', to_jsonb(target_character), 'gained_experience', gained_experience, 'reward_tier', reward_tier,
    'level_before', level_before, 'level_after', target_character.level,
    'training_state', jsonb_build_object('charges', calculated_charges, 'max_charges', 10, 'next_recharge_at', next_recharge_at)
  );
end;
$$;

grant execute on function public.get_my_training_state() to authenticated;
grant execute on function public.train_my_character() to authenticated;
