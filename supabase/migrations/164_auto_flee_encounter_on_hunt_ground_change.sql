create or replace function public.select_hunt_ground(target_hunt_ground_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  hunt_state public.character_hunt_states%rowtype;
  next_available_at timestamptz;
begin
  if not exists (select 1 from public.hunt_grounds where id = target_hunt_ground_id and is_enabled) then
    raise exception 'hunt_ground_not_found';
  end if;
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  insert into public.character_hunt_states (character_id) values (target_character.id) on conflict do nothing;
  select * into hunt_state from public.character_hunt_states where character_id = target_character.id for update;

  if hunt_state.last_battle ->> 'status' = 'encountered' then
    next_available_at := clock_timestamp() + interval '1 second';
    update public.character_hunt_states
    set selected_hunt_ground_id = target_hunt_ground_id,
      available_at = next_available_at,
      last_battle = null
    where character_id = target_character.id;
    update public.characters set hunt_available_at = next_available_at where id = target_character.id;
  else
    update public.character_hunt_states
    set selected_hunt_ground_id = target_hunt_ground_id
    where character_id = target_character.id;
  end if;

  return public.get_my_hunt_state();
end;
$$;

grant execute on function public.select_hunt_ground(text) to authenticated;
