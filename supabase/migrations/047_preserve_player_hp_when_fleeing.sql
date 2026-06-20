create or replace function public.flee_training_dummy_hunt()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  hunt_state public.character_hunt_states%rowtype;
  battle jsonb;
  elapsed_ticks integer;
  enemy_hp numeric;
  player_hp numeric;
  player_max_hp numeric;
  fled_at timestamptz := clock_timestamp();
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  select * into hunt_state from public.character_hunt_states where character_id = target_character.id for update;
  if not found or hunt_state.last_battle ->> 'status' <> 'in_progress' then raise exception 'no_hunt_to_flee'; end if;

  battle := hunt_state.last_battle;
  if (battle ->> 'ends_at')::timestamptz <= fled_at then raise exception 'hunt_already_complete'; end if;
  elapsed_ticks := least(
    (battle ->> 'duration_ticks')::integer,
    greatest(0, floor(extract(epoch from (fled_at - (battle ->> 'started_at')::timestamptz)) * 10)::integer)
  );

  select (entry ->> 'target_hp')::numeric into enemy_hp
  from jsonb_array_elements(battle -> 'logs') entry
  where (entry ->> 'target') = 'enemy' and (entry ->> 'time_tenths')::integer <= elapsed_ticks
  order by (entry ->> 'time_tenths')::integer desc limit 1;
  select (entry ->> 'target_hp')::numeric into player_hp
  from jsonb_array_elements(battle -> 'logs') entry
  where (entry ->> 'target') = 'player' and (entry ->> 'time_tenths')::integer <= elapsed_ticks
  order by (entry ->> 'time_tenths')::integer desc limit 1;

  player_max_hp := (battle -> 'player' ->> 'max_hp')::numeric;
  player_hp := coalesce(player_hp, (battle -> 'player' ->> 'start_hp')::numeric, player_max_hp);
  battle := jsonb_set(battle, '{player}', (battle -> 'player') || jsonb_build_object('current_hp', player_hp)) || jsonb_build_object(
    'status', 'fled', 'ended_at', fled_at, 'gained_experience', 0,
    'level_after', target_character.level, 'experience_after', target_character.experience,
    'logs', coalesce(battle -> 'logs', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('time_tenths', elapsed_ticks, 'kind', 'fled', 'amount', 0, 'target_hp', coalesce(enemy_hp, 0), 'target', 'enemy'))
  );
  update public.character_hunt_states
  set available_at = null, last_battle = battle,
      player_recovery_start_hp = player_hp, player_recovery_max_hp = player_max_hp,
      player_recovery_started_at = fled_at,
      is_defeat_recovery = true
  where character_id = target_character.id;
  update public.characters set hunt_available_at = null where id = target_character.id;
  return jsonb_build_object('hunt_state', public.get_my_hunt_state());
end;
$$;

grant execute on function public.flee_training_dummy_hunt() to authenticated;
