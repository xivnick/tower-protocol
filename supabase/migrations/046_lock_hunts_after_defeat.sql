create or replace function public.enforce_hunt_defeat_recovery()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.last_battle ->> 'status' = 'in_progress'
    and coalesce(old.last_battle ->> 'status', '') <> 'in_progress'
    and old.is_defeat_recovery
    and old.player_recovery_started_at + interval '10 seconds' > clock_timestamp() then
    raise exception 'hunt_defeat_recovery';
  end if;
  return new;
end;
$$;

drop trigger if exists character_hunt_states_enforce_defeat_recovery on public.character_hunt_states;
create trigger character_hunt_states_enforce_defeat_recovery
before update on public.character_hunt_states
for each row execute function public.enforce_hunt_defeat_recovery();
