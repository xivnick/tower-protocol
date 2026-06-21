create or replace function public.get_my_hunt_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  hunt_state public.character_hunt_states%rowtype;
  player_max_hp numeric;
  stored_max_hp numeric;
  player_hp numeric;
  recovery_start_hp numeric;
begin
  select * into target_character from public.characters where user_id = auth.uid();
  if not found then raise exception 'character_not_found'; end if;
  insert into public.character_hunt_states (character_id) values (target_character.id) on conflict do nothing;
  select * into hunt_state from public.character_hunt_states where character_id = target_character.id;
  player_max_hp := 100 + (target_character.level * 20) + (target_character.vitality * 10);
  stored_max_hp := coalesce(hunt_state.player_recovery_max_hp, player_max_hp);
  player_hp := public.hunt_player_hp(hunt_state.player_recovery_start_hp, stored_max_hp, hunt_state.player_recovery_started_at, hunt_state.player_recovery_ends_at, player_max_hp);
  recovery_start_hp := coalesce(hunt_state.player_recovery_start_hp, stored_max_hp) * player_max_hp / nullif(stored_max_hp, 0);
  return jsonb_build_object(
    'available_at', hunt_state.available_at, 'last_battle', hunt_state.last_battle,
    'selected_hunt_ground_id', hunt_state.selected_hunt_ground_id,
    'player_current_hp', least(player_max_hp, player_hp * player_max_hp / nullif(stored_max_hp, 0)), 'player_max_hp', player_max_hp,
    'player_recovery_start_hp', recovery_start_hp, 'player_recovery_started_at', hunt_state.player_recovery_started_at,
    'recovery_ends_at', hunt_state.player_recovery_ends_at, 'is_defeat_recovery', hunt_state.is_defeat_recovery
  );
end;
$$;

do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;
  if position(E'  player_hp := public.hunt_player_hp(hunt_state.player_recovery_start_hp, hunt_state.player_recovery_max_hp, hunt_state.player_recovery_started_at, hunt_state.player_recovery_ends_at, player_max_hp, started_at);' in definition) = 0 then
    raise exception 'hunt_training_dummy_definition_changed';
  end if;
  definition := replace(definition,
    E'  player_hp := public.hunt_player_hp(hunt_state.player_recovery_start_hp, hunt_state.player_recovery_max_hp, hunt_state.player_recovery_started_at, hunt_state.player_recovery_ends_at, player_max_hp, started_at);',
    E'  player_hp := public.hunt_player_hp(hunt_state.player_recovery_start_hp, coalesce(hunt_state.player_recovery_max_hp, player_max_hp), hunt_state.player_recovery_started_at, hunt_state.player_recovery_ends_at, player_max_hp, started_at);\n  player_hp := least(player_max_hp, player_hp * player_max_hp / nullif(coalesce(hunt_state.player_recovery_max_hp, player_max_hp), 0));');
  execute definition;
end;
$$;
