drop function if exists public.train_my_character();

create function public.train_my_character()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  required_experience integer;
  reward_roll numeric;
  gained_experience integer;
  reward_tier text;
  level_before integer;
begin
  select *
  into target_character
  from public.characters
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'character_not_found';
  end if;

  level_before := target_character.level;

  if target_character.level >= 100 then
    update public.characters
    set experience = 0
    where id = target_character.id
    returning * into target_character;

    return jsonb_build_object(
      'character', to_jsonb(target_character),
      'gained_experience', 0,
      'reward_tier', 'max',
      'level_before', level_before,
      'level_after', target_character.level
    );
  end if;

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
  end loop;

  if target_character.level = 100 then
    target_character.experience := 0;
  end if;

  update public.characters
  set
    level = target_character.level,
    experience = target_character.experience
  where id = target_character.id
  returning * into target_character;

  return jsonb_build_object(
    'character', to_jsonb(target_character),
    'gained_experience', gained_experience,
    'reward_tier', reward_tier,
    'level_before', level_before,
    'level_after', target_character.level
  );
end;
$$;

grant execute on function public.train_my_character() to authenticated;
