alter table public.character_hunt_states
  add column if not exists player_recovery_start_hp numeric,
  add column if not exists player_recovery_max_hp numeric,
  add column if not exists player_recovery_started_at timestamptz,
  add column if not exists player_recovery_ends_at timestamptz,
  add column if not exists is_defeat_recovery boolean not null default false;

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
    else least(recovery_max_hp, coalesce(recovery_start_hp, fallback_max_hp)
      + (recovery_max_hp - coalesce(recovery_start_hp, fallback_max_hp))
        * extract(epoch from at_time - recovery_started_at)
        / nullif(extract(epoch from recovery_ends_at - recovery_started_at), 0))
  end;
$$;

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
    'recovery_ends_at', hunt_state.player_recovery_ends_at,
    'is_defeat_recovery', hunt_state.is_defeat_recovery
  );
end;
$$;

create or replace function public.hunt_training_dummy()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  hunt_state public.character_hunt_states%rowtype;
  monster_template public.monster_templates%rowtype;
  monster_stats jsonb;
  level_before integer;
  experience_before integer;
  gained_experience integer;
  duration_ticks integer := 0;
  max_duration_ticks integer := 600;
  started_at timestamptz := clock_timestamp();
  battle_ends_at timestamptz;
  player_attack_gauge numeric := 0;
  monster_attack_gauge numeric := 0;
  player_attacks_per_second numeric;
  monster_attacks_per_second numeric;
  critical_chance numeric;
  player_max_hp numeric;
  player_start_hp numeric;
  player_hp numeric;
  monster_max_hp numeric;
  monster_hp numeric;
  monster_defense numeric;
  player_defense numeric;
  monster_regeneration_per_second numeric;
  damage integer;
  raw_damage numeric;
  healed_amount numeric;
  total_damage integer := 0;
  attack_count integer := 0;
  critical_count integer := 0;
  total_regeneration numeric := 0;
  is_critical boolean;
  outcome text;
  recovery_seconds integer;
  logs jsonb := '[]'::jsonb;
  battle jsonb;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  insert into public.character_hunt_states (character_id) values (target_character.id) on conflict do nothing;
  select * into hunt_state from public.character_hunt_states where character_id = target_character.id for update;
  if hunt_state.last_battle ->> 'status' = 'in_progress' then raise exception 'hunt_in_progress'; end if;
  if hunt_state.available_at is not null and hunt_state.available_at > started_at then raise exception 'hunt_on_cooldown'; end if;

  select mt.* into monster_template
  from public.hunt_ground_monsters hgm
  join public.monster_templates mt on mt.id = hgm.monster_template_id
  where hgm.hunt_ground_id = hunt_state.selected_hunt_ground_id and hgm.is_enabled
  order by hgm.sort_order, mt.code limit 1;
  if not found then raise exception 'hunt_ground_monster_not_found'; end if;

  level_before := target_character.level;
  experience_before := target_character.experience;
  monster_stats := public.monster_combat_stats_at_level(monster_template, level_before);
  player_max_hp := 100 + (target_character.level * 20) + (target_character.vitality * 10);
  player_hp := public.hunt_player_hp(hunt_state.player_recovery_start_hp, hunt_state.player_recovery_max_hp, hunt_state.player_recovery_started_at, hunt_state.player_recovery_ends_at, player_max_hp, started_at);
  player_start_hp := player_hp;
  monster_max_hp := (monster_stats ->> 'max_hp')::numeric;
  monster_hp := monster_max_hp;
  monster_defense := public.combat_total_defense(monster_stats);
  player_defense := target_character.endurance + target_character.wisdom;
  monster_regeneration_per_second := (monster_stats ->> 'regeneration')::numeric;
  player_attacks_per_second := sqrt((100 + target_character.agility)::numeric / 100);
  monster_attacks_per_second := coalesce((monster_stats ->> 'attacks_per_second')::numeric, 0);
  critical_chance := least(target_character.dexterity, 100)::numeric / 100;
  gained_experience := round(public.experience_for_monster_level(level_before) * monster_template.experience_multiplier)::integer;
  logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', 0, 'kind', 'encounter', 'amount', 0, 'target_hp', monster_hp, 'target', 'enemy'));
  player_attack_gauge := 1 - (player_attacks_per_second / 10);
  monster_attack_gauge := 1 - (monster_attacks_per_second / 10);

  while duration_ticks < max_duration_ticks and monster_hp > 0 and player_hp > 0 loop
    duration_ticks := duration_ticks + 1;
    player_attack_gauge := player_attack_gauge + (player_attacks_per_second / 10);
    if player_attack_gauge >= 1 then
      player_attack_gauge := player_attack_gauge - 1;
      is_critical := random() < critical_chance;
      raw_damage := public.character_physical_attack(target_character);
      if is_critical then raw_damage := raw_damage * 1.5; end if;
      damage := greatest(1, floor(raw_damage * (100 / (100 + monster_defense)))::integer);
      monster_hp := greatest(0, monster_hp - damage);
      total_damage := total_damage + damage; attack_count := attack_count + 1;
      if is_critical then critical_count := critical_count + 1; end if;
      logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', case when is_critical then 'critical' else 'attack' end, 'amount', damage, 'target_hp', monster_hp, 'target', 'enemy'));
      if monster_hp <= 0 then
        logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'defeat', 'amount', 0, 'target_hp', 0, 'target', 'enemy'));
        exit;
      end if;
    end if;
    if monster_template.basic_attack_enabled then
      monster_attack_gauge := monster_attack_gauge + (monster_attacks_per_second / 10);
      if monster_attack_gauge >= 1 then
        monster_attack_gauge := monster_attack_gauge - 1;
        raw_damage := (monster_stats ->> 'physical_attack')::numeric;
        damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)))::integer);
        player_hp := greatest(0, player_hp - damage);
        logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'enemy_attack', 'amount', damage, 'target_hp', player_hp, 'target', 'player'));
        if player_hp <= 0 then
          logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'player_defeat', 'amount', 0, 'target_hp', 0, 'target', 'player'));
          exit;
        end if;
      end if;
    end if;
    if mod(duration_ticks, 10) = 0 and monster_hp < monster_max_hp then
      healed_amount := least(monster_regeneration_per_second, monster_max_hp - monster_hp);
      monster_hp := monster_hp + healed_amount; total_regeneration := total_regeneration + healed_amount;
      logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'regeneration', 'amount', healed_amount, 'target_hp', monster_hp, 'target', 'enemy'));
    end if;
  end loop;

  if monster_hp <= 0 then outcome := 'victory';
  elsif player_hp <= 0 then outcome := 'defeated'; gained_experience := 0;
  else outcome := 'timed_out'; gained_experience := 0; logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'timeout', 'amount', 0, 'target_hp', monster_hp, 'target', 'enemy'));
  end if;
  battle_ends_at := started_at + (duration_ticks * interval '100 milliseconds');
  recovery_seconds := case when player_hp <= 0 then 10 else 1 end;
  battle := jsonb_build_object(
    'hunt_ground_id', hunt_state.selected_hunt_ground_id, 'status', 'in_progress', 'outcome', outcome, 'started_at', started_at, 'ends_at', battle_ends_at,
    'player', jsonb_build_object('name', target_character.name, 'level', level_before, 'max_hp', player_max_hp, 'start_hp', player_start_hp, 'current_hp', player_hp, 'experience', experience_before),
    'enemy', jsonb_build_object('name', monster_template.name, 'level', level_before, 'max_hp', monster_max_hp),
    'gained_experience', gained_experience, 'level_before', level_before, 'level_after', level_before, 'experience_after', experience_before,
    'duration_ticks', duration_ticks, 'total_damage', total_damage, 'attack_count', attack_count, 'critical_count', critical_count, 'total_regeneration', total_regeneration, 'logs', logs
  );
  update public.character_hunt_states set available_at = battle_ends_at, last_battle = battle,
    player_recovery_start_hp = player_hp, player_recovery_max_hp = player_max_hp,
    player_recovery_started_at = battle_ends_at, player_recovery_ends_at = battle_ends_at + make_interval(secs => recovery_seconds),
    is_defeat_recovery = player_hp <= 0 where character_id = target_character.id;
  update public.characters set hunt_available_at = battle_ends_at where id = target_character.id;
  return jsonb_build_object('hunt_state', public.get_my_hunt_state());
end;
$$;

create or replace function public.settle_training_dummy_hunt()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target_character public.characters%rowtype; hunt_state public.character_hunt_states%rowtype; battle jsonb; required_experience integer; level_ups integer := 0; gained_experience integer;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  select * into hunt_state from public.character_hunt_states where character_id = target_character.id for update;
  if not found or hunt_state.last_battle ->> 'status' <> 'in_progress' then raise exception 'no_hunt_to_settle'; end if;
  battle := hunt_state.last_battle;
  if (battle ->> 'ends_at')::timestamptz > clock_timestamp() then raise exception 'hunt_still_in_progress'; end if;
  if battle ->> 'outcome' = 'victory' then
    gained_experience := (battle ->> 'gained_experience')::integer;
    if target_character.level >= 100 then gained_experience := 0;
    else target_character.experience := target_character.experience + gained_experience;
      while target_character.level < 100 loop
        required_experience := public.required_experience_for_level(target_character.level + 1);
        exit when required_experience is null or target_character.experience < required_experience;
        target_character.experience := target_character.experience - required_experience; target_character.level := target_character.level + 1; level_ups := level_ups + 1;
      end loop;
      if target_character.level = 100 then target_character.experience := 0; end if;
    end if;
    update public.characters set level = target_character.level, experience = target_character.experience, stat_points = stat_points + (level_ups * 5), hunt_available_at = null where id = target_character.id returning * into target_character;
    battle := battle || jsonb_build_object('status', 'victory', 'ended_at', clock_timestamp(), 'gained_experience', gained_experience, 'level_after', target_character.level, 'experience_after', target_character.experience);
  else
    update public.characters set hunt_available_at = null where id = target_character.id returning * into target_character;
    battle := battle || jsonb_build_object('status', case when battle ->> 'outcome' = 'defeated' then 'defeated' else 'timed_out' end, 'ended_at', clock_timestamp(), 'gained_experience', 0, 'level_after', target_character.level, 'experience_after', target_character.experience);
  end if;
  update public.character_hunt_states set available_at = null, last_battle = battle where character_id = target_character.id;
  return jsonb_build_object('character', to_jsonb(target_character), 'hunt_state', public.get_my_hunt_state());
end;
$$;

grant execute on function public.hunt_training_dummy() to authenticated;
grant execute on function public.settle_training_dummy_hunt() to authenticated;
