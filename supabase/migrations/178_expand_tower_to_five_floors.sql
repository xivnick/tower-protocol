insert into public.hunt_grounds (
  id, name, recommended_min_level, recommended_max_level, sort_order, is_enabled, level_mode
)
values
  ('tower-floor-2', '탑 2층', 2, 2, 1002, false, 'fixed'),
  ('tower-floor-3', '탑 3층', 3, 3, 1003, false, 'fixed'),
  ('tower-floor-4', '탑 4층', 4, 4, 1004, false, 'fixed'),
  ('tower-floor-5', '탑 5층', 5, 5, 1005, false, 'fixed')
on conflict (id) do update
set name = excluded.name,
    recommended_min_level = excluded.recommended_min_level,
    recommended_max_level = excluded.recommended_max_level,
    sort_order = excluded.sort_order,
    is_enabled = false,
    level_mode = excluded.level_mode;

insert into public.hunt_ground_monsters (
  hunt_ground_id, monster_template_id, spawn_min_level, spawn_max_level, spawn_weight, sort_order, is_enabled
)
select floor.hunt_ground_id, monster.id, floor.monster_level, floor.monster_level, 1, 1, true
from (values
  ('tower-floor-2'::text, 'forest-wolf'::text, 2),
  ('tower-floor-3'::text, 'firefly-spirit'::text, 3),
  ('tower-floor-4'::text, 'stone-beetle'::text, 4),
  ('tower-floor-5'::text, 'forest-warden-stag'::text, 5)
) as floor(hunt_ground_id, monster_code, monster_level)
join public.monster_templates monster on monster.code = floor.monster_code
where not exists (
  select 1
  from public.hunt_ground_monsters existing
  where existing.hunt_ground_id = floor.hunt_ground_id
    and existing.monster_template_id = monster.id
);

create or replace function public.get_my_tower_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character_id uuid;
  tower_progress public.character_tower_progress%rowtype;
begin
  select id into target_character_id
  from public.characters
  where user_id = auth.uid();

  if not found then
    raise exception 'character_not_found';
  end if;

  insert into public.character_tower_progress (character_id)
  values (target_character_id)
  on conflict (character_id) do nothing;

  select * into tower_progress
  from public.character_tower_progress
  where character_id = target_character_id;

  return jsonb_build_object(
    'highest_cleared_floor', tower_progress.highest_cleared_floor,
    'supported_floor', 5,
    'last_battle', tower_progress.last_battle
  );
end;
$$;

create or replace function public.challenge_tower_floor(p_floor integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  hunt_state public.character_hunt_states%rowtype;
  tower_progress public.character_tower_progress%rowtype;
  saved_hunt_available_at timestamptz;
  tower_battle jsonb;
  tower_ground_id text;
  observed_at timestamptz := clock_timestamp();
begin
  if p_floor is null or p_floor < 1 or p_floor > 5 then
    raise exception 'tower_floor_not_supported';
  end if;

  select * into target_character
  from public.characters
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'character_not_found';
  end if;

  insert into public.character_tower_progress (character_id)
  values (target_character.id)
  on conflict (character_id) do nothing;

  select * into tower_progress
  from public.character_tower_progress
  where character_id = target_character.id
  for update;

  if p_floor > tower_progress.highest_cleared_floor + 1 then
    raise exception 'tower_floor_locked';
  end if;

  if tower_progress.last_battle ->> 'status' = 'in_progress' then
    if (tower_progress.last_battle ->> 'ends_at')::timestamptz > observed_at then
      raise exception 'tower_battle_in_progress';
    end if;
    raise exception 'tower_battle_requires_settlement';
  end if;

  insert into public.character_hunt_states (character_id)
  values (target_character.id)
  on conflict (character_id) do nothing;

  select * into hunt_state
  from public.character_hunt_states
  where character_id = target_character.id
  for update;

  if hunt_state.last_battle ->> 'status' in ('encountered', 'in_progress') then
    raise exception 'hunt_in_progress';
  end if;

  if hunt_state.available_at is not null and hunt_state.available_at > observed_at then
    raise exception 'hunt_on_cooldown';
  end if;

  if hunt_state.player_recovery_ends_at is not null and hunt_state.player_recovery_ends_at > observed_at then
    raise exception 'tower_recovery_in_progress';
  end if;

  saved_hunt_available_at := target_character.hunt_available_at;
  tower_ground_id := 'tower-floor-' || p_floor;

  update public.character_hunt_states
  set selected_hunt_ground_id = tower_ground_id,
      available_at = null,
      last_battle = null,
      player_recovery_start_hp = null,
      player_recovery_max_hp = null,
      player_recovery_started_at = null,
      player_recovery_ends_at = null,
      is_defeat_recovery = false,
      auto_hunt_enabled = false,
      auto_hunt_remaining = 0
  where character_id = target_character.id;

  perform public.encounter_hunt_monster();
  perform public.hunt_training_dummy();

  select last_battle into tower_battle
  from public.character_hunt_states
  where character_id = target_character.id;

  if tower_battle is null then
    raise exception 'tower_battle_not_created';
  end if;

  tower_battle := tower_battle || jsonb_build_object(
    'tower_floor', p_floor,
    'gained_experience', 0,
    'gained_credits', 0,
    'rewards', null
  );

  update public.character_hunt_states
  set selected_hunt_ground_id = hunt_state.selected_hunt_ground_id,
      available_at = hunt_state.available_at,
      last_battle = hunt_state.last_battle,
      player_recovery_start_hp = hunt_state.player_recovery_start_hp,
      player_recovery_max_hp = hunt_state.player_recovery_max_hp,
      player_recovery_started_at = hunt_state.player_recovery_started_at,
      player_recovery_ends_at = hunt_state.player_recovery_ends_at,
      is_defeat_recovery = hunt_state.is_defeat_recovery,
      auto_hunt_enabled = hunt_state.auto_hunt_enabled,
      auto_hunt_remaining = hunt_state.auto_hunt_remaining
  where character_id = target_character.id;

  update public.characters
  set hunt_available_at = saved_hunt_available_at
  where id = target_character.id;

  update public.character_tower_progress
  set last_battle = tower_battle
  where character_id = target_character.id;

  return public.get_my_tower_state();
end;
$$;

create or replace function public.settle_tower_battle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character_id uuid;
  tower_progress public.character_tower_progress%rowtype;
  tower_battle jsonb;
  tower_floor integer;
  outcome text;
  final_status text;
begin
  select id into target_character_id
  from public.characters
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'character_not_found';
  end if;

  select * into tower_progress
  from public.character_tower_progress
  where character_id = target_character_id
  for update;

  if not found or tower_progress.last_battle is null then
    raise exception 'tower_battle_not_found';
  end if;

  if tower_progress.last_battle ->> 'status' <> 'in_progress' then
    return public.get_my_tower_state();
  end if;

  if (tower_progress.last_battle ->> 'ends_at')::timestamptz > clock_timestamp() then
    raise exception 'tower_battle_in_progress';
  end if;

  tower_battle := tower_progress.last_battle;
  tower_floor := (tower_battle ->> 'tower_floor')::integer;

  if tower_floor is null or tower_floor < 1 or tower_floor > 5 then
    raise exception 'tower_floor_not_supported';
  end if;

  outcome := tower_battle ->> 'outcome';
  final_status := case outcome
    when 'victory' then 'victory'
    when 'defeated' then 'defeated'
    else 'timed_out'
  end;

  tower_battle := tower_battle || jsonb_build_object(
    'status', final_status,
    'ended_at', clock_timestamp()
  );

  update public.character_tower_progress
  set highest_cleared_floor = case
        when final_status = 'victory' then greatest(highest_cleared_floor, tower_floor)
        else highest_cleared_floor
      end,
      last_battle = tower_battle
  where character_id = target_character_id;

  return public.get_my_tower_state();
end;
$$;

create or replace function public.challenge_tower_floor_one()
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select public.challenge_tower_floor(1);
$$;

create or replace function public.settle_tower_floor_one()
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select public.settle_tower_battle();
$$;

revoke execute on function public.challenge_tower_floor(integer) from public, anon;
revoke execute on function public.settle_tower_battle() from public, anon;
grant execute on function public.challenge_tower_floor(integer) to authenticated;
grant execute on function public.settle_tower_battle() to authenticated;
