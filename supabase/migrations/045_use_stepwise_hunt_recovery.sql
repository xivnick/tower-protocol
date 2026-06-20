create or replace function public.hunt_player_hp(
  recovery_start_hp numeric,
  recovery_max_hp numeric,
  recovery_started_at timestamptz,
  recovery_ends_at timestamptz,
  fallback_max_hp numeric,
  at_time timestamptz default clock_timestamp()
)
returns numeric
language sql
stable
as $$
  select case
    when recovery_started_at is null or recovery_ends_at is null or recovery_max_hp is null then fallback_max_hp
    when at_time >= recovery_ends_at then recovery_max_hp
    when at_time <= recovery_started_at then coalesce(recovery_start_hp, fallback_max_hp)
    else least(
      recovery_max_hp,
      coalesce(recovery_start_hp, fallback_max_hp)
        + (recovery_max_hp * 0.2 * floor(extract(epoch from at_time - recovery_started_at) / 1)::numeric)
    )
  end;
$$;

create or replace function public.set_hunt_recovery_end_at()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  recovery_step numeric;
  recovery_seconds integer;
begin
  if new.player_recovery_started_at is distinct from old.player_recovery_started_at
    or new.player_recovery_start_hp is distinct from old.player_recovery_start_hp
    or new.player_recovery_max_hp is distinct from old.player_recovery_max_hp then
    recovery_step := coalesce(new.player_recovery_max_hp, 0) * 0.2;
    recovery_seconds := case
      when recovery_step <= 0 then 0
      else ceil(greatest(0, new.player_recovery_max_hp - coalesce(new.player_recovery_start_hp, new.player_recovery_max_hp)) / recovery_step)::integer
    end;
    new.player_recovery_ends_at := new.player_recovery_started_at + make_interval(secs => recovery_seconds);
  end if;
  return new;
end;
$$;

drop trigger if exists character_hunt_states_set_recovery_end_at on public.character_hunt_states;
create trigger character_hunt_states_set_recovery_end_at
before update on public.character_hunt_states
for each row execute function public.set_hunt_recovery_end_at();

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
  player_hp numeric;
begin
  select * into target_character from public.characters where user_id = auth.uid();
  if not found then raise exception 'character_not_found'; end if;
  insert into public.character_hunt_states (character_id) values (target_character.id) on conflict do nothing;
  select * into hunt_state from public.character_hunt_states where character_id = target_character.id;
  player_max_hp := 100 + (target_character.level * 20) + (target_character.vitality * 10);
  player_hp := public.hunt_player_hp(hunt_state.player_recovery_start_hp, hunt_state.player_recovery_max_hp, hunt_state.player_recovery_started_at, hunt_state.player_recovery_ends_at, player_max_hp);
  return jsonb_build_object(
    'available_at', hunt_state.available_at, 'last_battle', hunt_state.last_battle,
    'selected_hunt_ground_id', hunt_state.selected_hunt_ground_id,
    'player_current_hp', player_hp, 'player_max_hp', coalesce(hunt_state.player_recovery_max_hp, player_max_hp),
    'player_recovery_start_hp', hunt_state.player_recovery_start_hp,
    'player_recovery_started_at', hunt_state.player_recovery_started_at,
    'recovery_ends_at', hunt_state.player_recovery_ends_at,
    'is_defeat_recovery', hunt_state.is_defeat_recovery
  );
end;
$$;
