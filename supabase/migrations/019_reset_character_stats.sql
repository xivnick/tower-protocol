create or replace function public.reset_character_stats()
returns public.characters
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
begin
  select *
  into target_character
  from public.characters
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'character_not_found';
  end if;

  update public.characters
  set
    strength = 1,
    agility = 1,
    dexterity = 1,
    vitality = 1,
    endurance = 1,
    intelligence = 1,
    wisdom = 1,
    stat_points = ((level - 1) * 5) + bonus_stat_points
  where id = target_character.id
  returning * into target_character;

  return target_character;
end;
$$;

grant execute on function public.reset_character_stats() to authenticated;
