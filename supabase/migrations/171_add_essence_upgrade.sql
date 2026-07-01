create or replace function public.upgrade_essence(target_character_essence_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character_id uuid;
  source_essence public.character_essences%rowtype;
  upgraded_essence public.character_essences%rowtype;
  equipped_slot_index integer;
  inventory jsonb;
begin
  select id into target_character_id from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;

  select * into source_essence
  from public.character_essences
  where id = target_character_essence_id
    and character_id = target_character_id
  for update;
  if not found then raise exception 'essence_not_owned'; end if;
  if source_essence.grade >= 5 then raise exception 'essence_max_grade'; end if;
  if source_essence.quantity < 3 then raise exception 'insufficient_essence_quantity'; end if;

  select slot_index into equipped_slot_index
  from public.character_essence_slots
  where character_id = target_character_id
    and character_essence_id = source_essence.id;

  if source_essence.quantity = 3 then
    delete from public.character_essences
    where id = source_essence.id;
  else
    update public.character_essences
    set quantity = quantity - 3
    where id = source_essence.id;
  end if;

  insert into public.character_essences (character_id, essence_template_id, grade, quantity)
  values (target_character_id, source_essence.essence_template_id, source_essence.grade + 1, 1)
  on conflict (character_id, essence_template_id, grade)
  do update set quantity = public.character_essences.quantity + 1
  returning * into upgraded_essence;

  if equipped_slot_index is not null then
    insert into public.character_essence_slots (character_id, slot_index, character_essence_id)
    values (target_character_id, equipped_slot_index, upgraded_essence.id)
    on conflict (character_id, slot_index)
    do update set character_essence_id = excluded.character_essence_id;
  end if;

  inventory := public.get_my_essences();
  return inventory || jsonb_build_object('upgraded_essence_id', upgraded_essence.id);
end;
$$;

grant execute on function public.upgrade_essence(uuid) to authenticated;
