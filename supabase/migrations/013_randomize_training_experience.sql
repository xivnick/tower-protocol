create or replace function public.train_my_character()
returns public.characters
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  required_experience integer;
  gained_experience integer;
begin
  select *
  into target_character
  from public.characters
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'character_not_found';
  end if;

  if target_character.level >= 100 then
    update public.characters
    set experience = 0
    where id = target_character.id
    returning * into target_character;

    return target_character;
  end if;

  gained_experience := floor(random() * 11)::integer + 5;
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

  return target_character;
end;
$$;
