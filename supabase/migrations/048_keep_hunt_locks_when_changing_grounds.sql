create or replace function public.enforce_hunt_defeat_recovery()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  previous_status text;
begin
  previous_status := old.last_battle ->> 'status';
  if new.last_battle ->> 'status' = 'in_progress'
    and coalesce(previous_status, '') <> 'in_progress'
    and previous_status in ('defeated', 'fled')
    and old.player_recovery_started_at + interval '10 seconds' > clock_timestamp() then
    if previous_status = 'fled' then raise exception 'hunt_retreat_recovery'; end if;
    raise exception 'hunt_defeat_recovery';
  end if;
  return new;
end;
$$;
