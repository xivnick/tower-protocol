do $$
declare definition text;
begin
  select pg_get_functiondef('public.encounter_hunt_monster()'::regprocedure) into definition;
  if position(E'  if hunt_state.is_defeat_recovery and not hunt_state.auto_hunt_enabled and hunt_state.player_recovery_started_at + interval ''10 seconds'' > encountered_at then raise exception ''hunt_defeat_recovery''; end if;' in definition) = 0 then
    raise exception 'encounter_hunt_monster_definition_changed';
  end if;
  definition := replace(definition,
    E'  if hunt_state.is_defeat_recovery and not hunt_state.auto_hunt_enabled and hunt_state.player_recovery_started_at + interval ''10 seconds'' > encountered_at then raise exception ''hunt_defeat_recovery''; end if;',
    E'  if hunt_state.is_defeat_recovery and hunt_state.player_recovery_started_at + interval ''10 seconds'' > encountered_at then raise exception ''hunt_defeat_recovery''; end if;');
  execute definition;
end;
$$;
