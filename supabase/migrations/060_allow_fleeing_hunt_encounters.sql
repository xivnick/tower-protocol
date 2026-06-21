create or replace function public.flee_hunt_encounter()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  hunt_state public.character_hunt_states%rowtype;
  next_available_at timestamptz := clock_timestamp() + interval '1 second';
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  select * into hunt_state from public.character_hunt_states where character_id = target_character.id for update;
  if not found or hunt_state.last_battle ->> 'status' <> 'encountered' then raise exception 'no_monster_encounter'; end if;

  update public.character_hunt_states
  set available_at = next_available_at, last_battle = null
  where character_id = target_character.id;
  update public.characters set hunt_available_at = next_available_at where id = target_character.id;
  return jsonb_build_object('hunt_state', public.get_my_hunt_state());
end;
$$;

do $$
declare definition text;
begin
  select pg_get_functiondef('public.encounter_hunt_monster()'::regprocedure) into definition;
  if position(E'  if hunt_state.last_battle ->> ''status'' = ''encountered'' then raise exception ''monster_already_encountered''; end if;' in definition) = 0 then
    raise exception 'encounter_hunt_monster_definition_changed';
  end if;
  definition := replace(
    definition,
    E'  if hunt_state.last_battle ->> ''status'' = ''encountered'' then raise exception ''monster_already_encountered''; end if;',
    E'  if hunt_state.last_battle ->> ''status'' = ''encountered'' then raise exception ''monster_already_encountered''; end if;\n  if hunt_state.is_defeat_recovery and hunt_state.player_recovery_started_at + interval ''10 seconds'' > encountered_at then raise exception ''hunt_defeat_recovery''; end if;'
  );
  execute definition;
end;
$$;

grant execute on function public.flee_hunt_encounter() to authenticated;
