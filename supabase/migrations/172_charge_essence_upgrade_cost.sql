create or replace function public.essence_upgrade_cost(essence_grade integer)
returns integer
language sql
immutable
as $$
  select case essence_grade
    when 1 then 100
    when 2 then 300
    when 3 then 900
    when 4 then 2700
    else 0
  end;
$$;

create or replace function public.upgrade_essence(target_character_essence_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  source_essence public.character_essences%rowtype;
  upgraded_essence public.character_essences%rowtype;
  equipped_slot_index integer;
  upgrade_cost integer;
  inventory jsonb;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;

  select * into source_essence
  from public.character_essences
  where id = target_character_essence_id
    and character_id = target_character.id
  for update;
  if not found then raise exception 'essence_not_owned'; end if;
  if source_essence.grade >= 5 then raise exception 'essence_max_grade'; end if;
  if source_essence.quantity < 3 then raise exception 'insufficient_essence_quantity'; end if;

  upgrade_cost := public.essence_upgrade_cost(source_essence.grade);
  if target_character.credits < upgrade_cost then raise exception 'insufficient_credits'; end if;

  select slot_index into equipped_slot_index
  from public.character_essence_slots
  where character_id = target_character.id
    and character_essence_id = source_essence.id;

  update public.characters
  set credits = credits - upgrade_cost
  where id = target_character.id
  returning * into target_character;

  if source_essence.quantity = 3 then
    delete from public.character_essences
    where id = source_essence.id;
  else
    update public.character_essences
    set quantity = quantity - 3
    where id = source_essence.id;
  end if;

  insert into public.character_essences (character_id, essence_template_id, grade, quantity)
  values (target_character.id, source_essence.essence_template_id, source_essence.grade + 1, 1)
  on conflict (character_id, essence_template_id, grade)
  do update set quantity = public.character_essences.quantity + 1
  returning * into upgraded_essence;

  if equipped_slot_index is not null then
    insert into public.character_essence_slots (character_id, slot_index, character_essence_id)
    values (target_character.id, equipped_slot_index, upgraded_essence.id)
    on conflict (character_id, slot_index)
    do update set character_essence_id = excluded.character_essence_id;
  end if;

  inventory := public.get_my_essences();
  return inventory || jsonb_build_object(
    'character', to_jsonb(target_character),
    'spent_credits', upgrade_cost,
    'upgraded_essence_id', upgraded_essence.id
  );
end;
$$;

grant execute on function public.essence_upgrade_cost(integer) to authenticated;
grant execute on function public.upgrade_essence(uuid) to authenticated;
