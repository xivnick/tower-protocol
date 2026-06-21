create or replace function public.hunt_player_hp(
  recovery_start_hp numeric, recovery_max_hp numeric, recovery_started_at timestamptz,
  recovery_ends_at timestamptz, fallback_max_hp numeric, at_time timestamptz default clock_timestamp()
)
returns numeric language sql stable as $$
  select case
    when recovery_started_at is null or recovery_ends_at is null or recovery_max_hp is null then fallback_max_hp
    when at_time >= recovery_ends_at then recovery_max_hp
    when at_time <= recovery_started_at then coalesce(recovery_start_hp, fallback_max_hp)
    when extract(epoch from recovery_ends_at - recovery_started_at) >= 10 then least(recovery_max_hp,
      coalesce(recovery_start_hp, fallback_max_hp) + (recovery_max_hp - coalesce(recovery_start_hp, fallback_max_hp))
      * floor(extract(epoch from at_time - recovery_started_at)) / extract(epoch from recovery_ends_at - recovery_started_at))
    else least(recovery_max_hp, coalesce(recovery_start_hp, fallback_max_hp)
      + recovery_max_hp * 0.2 * floor(extract(epoch from at_time - recovery_started_at))::numeric)
  end;
$$;

create or replace function public.set_hunt_recovery_end_at()
returns trigger language plpgsql set search_path = public as $$
declare recovery_step numeric; recovery_seconds integer;
begin
  if new.player_recovery_started_at is distinct from old.player_recovery_started_at
    or new.player_recovery_start_hp is distinct from old.player_recovery_start_hp
    or new.player_recovery_max_hp is distinct from old.player_recovery_max_hp then
    recovery_step := coalesce(new.player_recovery_max_hp, 0) * 0.2;
    recovery_seconds := case when new.is_defeat_recovery then 10 when recovery_step <= 0 then 0
      else ceil(greatest(0, new.player_recovery_max_hp - coalesce(new.player_recovery_start_hp, new.player_recovery_max_hp)) / recovery_step)::integer end;
    new.player_recovery_ends_at := new.player_recovery_started_at + make_interval(secs => recovery_seconds);
  end if;
  return new;
end;
$$;
