create or replace function public.essence_unlocked_slot_count(character_level integer)
returns integer
language sql
immutable
as $$
  select case when character_level >= 30 then 3 when character_level >= 10 then 2 else 1 end;
$$;

create or replace function public.equip_essence(target_character_essence_id uuid, target_slot_index integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target_character public.characters%rowtype;
begin
  if target_slot_index not between 1 and 3 then raise exception 'invalid_essence_slot'; end if;
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  if target_slot_index > public.essence_unlocked_slot_count(target_character.level) then raise exception 'essence_slot_locked'; end if;

  if not exists (
    select 1 from public.character_essences
    where id = target_character_essence_id and character_id = target_character.id
  ) then
    raise exception 'essence_not_owned';
  end if;

  delete from public.character_essence_slots
  where character_id = target_character.id
    and character_essence_id = target_character_essence_id;

  insert into public.character_essence_slots (character_id, slot_index, character_essence_id)
  values (target_character.id, target_slot_index, target_character_essence_id)
  on conflict (character_id, slot_index)
  do update set character_essence_id = excluded.character_essence_id;

  return public.get_my_essences();
end;
$$;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  where slot.character_id = target_character.id;' in definition) = 0 then
    raise exception 'hunt_essence_slot_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  where slot.character_id = target_character.id;',
    E'  where slot.character_id = target_character.id\n    and slot.slot_index <= public.essence_unlocked_slot_count(target_character.level);'
  );
  execute definition;
end;
$$;

grant execute on function public.essence_unlocked_slot_count(integer) to authenticated;
