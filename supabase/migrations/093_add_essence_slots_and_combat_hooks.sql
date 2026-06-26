create table if not exists public.character_essence_slots (
  character_id uuid not null references public.characters(id) on delete cascade,
  slot_index integer not null check (slot_index between 1 and 3),
  character_essence_id uuid not null references public.character_essences(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (character_id, slot_index),
  unique (character_id, character_essence_id)
);

alter table public.character_essence_slots enable row level security;

drop trigger if exists character_essence_slots_set_updated_at on public.character_essence_slots;
create trigger character_essence_slots_set_updated_at
before update on public.character_essence_slots
for each row
execute function public.set_updated_at();

create or replace function public.character_magic_attack(target_character public.characters)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare weapon jsonb := public.character_weapon_stats(target_character.id);
begin
  return (target_character.intelligence + coalesce((weapon ->> 'magic_attack_flat')::numeric, 0))
    * (1 + coalesce((weapon ->> 'magic_attack_pct')::numeric, 0) / 100);
end;
$$;

create or replace function public.essence_cooldown_tenths(essence_code text, essence_grade integer)
returns integer
language sql
immutable
as $$
  select case essence_code
    when 'angry-boar-might' then case when essence_grade >= 2 then 45 else 80 end
    when 'forest-wolf-flurry' then case when essence_grade >= 2 then 50 else 90 end
    when 'firefly-spirit-ember' then case when essence_grade >= 2 then 25 else 50 end
    when 'stone-beetle-stonehide' then case when essence_grade >= 2 then 50 else 90 end
    else 100
  end;
$$;

create or replace function public.get_my_essences()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target_character_id uuid;
begin
  select id into target_character_id from public.characters where user_id = auth.uid();
  if not found then raise exception 'character_not_found'; end if;

  return jsonb_build_object(
    'essences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', essence.id,
        'template_id', template.id,
        'code', template.code,
        'name', template.name,
        'grade', essence.grade,
        'quantity', essence.quantity,
        'equipped_slot_index', slot.slot_index,
        'created_at', essence.created_at
      ) order by slot.slot_index nulls last, essence.grade desc, essence.created_at desc)
      from public.character_essences essence
      join public.essence_templates template on template.id = essence.essence_template_id
      left join public.character_essence_slots slot on slot.character_essence_id = essence.id
      where essence.character_id = target_character_id
    ), '[]'::jsonb),
    'slots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slot_index', slot.slot_index,
        'character_essence_id', slot.character_essence_id
      ) order by slot.slot_index)
      from public.character_essence_slots slot
      where slot.character_id = target_character_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.equip_essence(target_character_essence_id uuid, target_slot_index integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target_character_id uuid;
begin
  if target_slot_index not between 1 and 3 then raise exception 'invalid_essence_slot'; end if;
  select id into target_character_id from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;

  if not exists (
    select 1 from public.character_essences
    where id = target_character_essence_id and character_id = target_character_id
  ) then
    raise exception 'essence_not_owned';
  end if;

  delete from public.character_essence_slots
  where character_id = target_character_id
    and character_essence_id = target_character_essence_id;

  insert into public.character_essence_slots (character_id, slot_index, character_essence_id)
  values (target_character_id, target_slot_index, target_character_essence_id)
  on conflict (character_id, slot_index)
  do update set character_essence_id = excluded.character_essence_id;

  return public.get_my_essences();
end;
$$;

create or replace function public.unequip_essence(target_slot_index integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target_character_id uuid;
begin
  if target_slot_index not between 1 and 3 then raise exception 'invalid_essence_slot'; end if;
  select id into target_character_id from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;

  delete from public.character_essence_slots
  where character_id = target_character_id and slot_index = target_slot_index;

  return public.get_my_essences();
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
  monster_level integer;
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
  player_accuracy numeric;
  monster_accuracy numeric;
  player_evasion numeric;
  monster_evasion numeric;
  is_hit boolean;
  weapon_stats jsonb;
  armor_stats jsonb;
  player_max_hp numeric;
  player_start_hp numeric;
  player_hp numeric;
  player_defense numeric;
  player_regeneration_per_second numeric;
  monster_max_hp numeric;
  monster_hp numeric;
  monster_defense numeric;
  monster_magic_defense numeric;
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
  player_essence_codes text[] := array[]::text[];
  player_essence_names text[] := array[]::text[];
  player_essence_grades integer[] := array[]::integer[];
  player_essence_ready integer[] := array[]::integer[];
  player_essence_count integer := 0;
  player_empower_pct numeric := 0;
  player_flurry_until integer := -1;
  player_flurry_pct numeric := 0;
  player_shield_until integer := -1;
  player_shield numeric := 0;
  enemy_essence_code text;
  enemy_essence_name text;
  enemy_essence_grade integer := 2;
  enemy_essence_ready integer := 0;
  enemy_empower_pct numeric := 0;
  enemy_flurry_until integer := -1;
  enemy_flurry_pct numeric := 0;
  enemy_shield_until integer := -1;
  enemy_shield numeric := 0;
  enemy_reflect_pct numeric := 0;
  index integer;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;

  insert into public.character_hunt_states (character_id) values (target_character.id) on conflict do nothing;
  select * into hunt_state from public.character_hunt_states where character_id = target_character.id for update;
  if hunt_state.last_battle ->> 'status' <> 'encountered' then raise exception 'no_monster_encounter'; end if;

  select * into monster_template from public.monster_templates where id = (hunt_state.last_battle ->> 'monster_template_id')::uuid;
  if not found then raise exception 'hunt_ground_monster_not_found'; end if;

  level_before := target_character.level;
  experience_before := target_character.experience;
  monster_level := (hunt_state.last_battle -> 'enemy' ->> 'level')::integer;
  monster_stats := public.monster_combat_stats_at_level(monster_template, monster_level);
  weapon_stats := public.character_weapon_stats(target_character.id);
  armor_stats := public.character_armor_stats(target_character.id);
  player_max_hp := 100 + (target_character.level * 20) + (target_character.vitality * 10);
  player_hp := public.hunt_player_hp(
    hunt_state.player_recovery_start_hp,
    coalesce(hunt_state.player_recovery_max_hp, player_max_hp),
    hunt_state.player_recovery_started_at,
    hunt_state.player_recovery_ends_at,
    player_max_hp,
    started_at
  );
  player_hp := least(player_max_hp, player_hp * player_max_hp / nullif(coalesce(hunt_state.player_recovery_max_hp, player_max_hp), 0));
  player_start_hp := player_hp;
  monster_max_hp := (monster_stats ->> 'max_hp')::numeric;
  monster_hp := monster_max_hp;
  monster_defense := public.combat_total_defense(monster_stats);
  monster_magic_defense := (monster_stats ->> 'magic_defense')::numeric;
  player_defense := (target_character.endurance + coalesce((armor_stats ->> 'physical_defense_flat')::numeric, 0)) * (1 + coalesce((armor_stats ->> 'physical_defense_pct')::numeric, 0) / 100)
    + (target_character.wisdom + coalesce((armor_stats ->> 'magic_defense_flat')::numeric, 0)) * (1 + coalesce((armor_stats ->> 'magic_defense_pct')::numeric, 0) / 100);
  player_regeneration_per_second := player_max_hp * (target_character.endurance::numeric / 3000);
  monster_regeneration_per_second := (monster_stats ->> 'regeneration')::numeric;
  player_attacks_per_second := (1 + target_character.agility::numeric / 100) * (1 + coalesce((weapon_stats ->> 'attack_speed_pct')::numeric, 0) / 100);
  monster_attacks_per_second := coalesce((monster_stats ->> 'attacks_per_second')::numeric, 0);
  critical_chance := least(target_character.dexterity, 100)::numeric / 100;
  player_accuracy := (100 + target_character.dexterity) * (1 - coalesce((weapon_stats ->> 'accuracy_penalty_pct')::numeric, 0) / 100);
  monster_accuracy := (monster_stats ->> 'accuracy')::numeric;
  player_evasion := (target_character.agility + coalesce((armor_stats ->> 'evasion_flat')::numeric, 0)) * (1 + coalesce((armor_stats ->> 'evasion_pct')::numeric, 0) / 100);
  monster_evasion := (monster_stats -> 'primary_stats' ->> 'agility')::numeric;
  gained_experience := round(public.experience_for_monster_level(monster_level) * monster_template.experience_multiplier)::integer;

  select coalesce(array_agg(template.code order by slot.slot_index), array[]::text[]),
         coalesce(array_agg(template.name order by slot.slot_index), array[]::text[]),
         coalesce(array_agg(essence.grade order by slot.slot_index), array[]::integer[])
  into player_essence_codes, player_essence_names, player_essence_grades
  from public.character_essence_slots slot
  join public.character_essences essence on essence.id = slot.character_essence_id
  join public.essence_templates template on template.id = essence.essence_template_id
  where slot.character_id = target_character.id;
  player_essence_count := coalesce(array_length(player_essence_codes, 1), 0);
  player_essence_ready := array_fill(0, array[player_essence_count]);

  select template.code, template.name into enemy_essence_code, enemy_essence_name
  from public.essence_templates template
  where template.monster_template_id = monster_template.id;

  logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', 0, 'kind', 'encounter', 'amount', 0, 'target_hp', monster_hp, 'target', 'enemy'));
  player_attack_gauge := 1 - (player_attacks_per_second / 10);
  monster_attack_gauge := 1 - (monster_attacks_per_second / 10);

  while duration_ticks < max_duration_ticks and monster_hp > 0 and player_hp > 0 loop
    for index in 1..player_essence_count loop
      if player_essence_ready[index] <= duration_ticks then
        if player_essence_codes[index] = 'angry-boar-might' then
          player_empower_pct := case when player_essence_grades[index] >= 2 then 90 else 60 end;
          logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'essence_cast', 'amount', 0, 'target_hp', monster_hp, 'target', 'enemy', 'source', 'player', 'name', player_essence_names[index], 'grade', player_essence_grades[index]));
        elsif player_essence_codes[index] = 'forest-wolf-flurry' then
          player_flurry_until := duration_ticks + 40;
          player_flurry_pct := case when player_essence_grades[index] >= 2 then 40 else 30 end;
          logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'essence_cast', 'amount', 0, 'target_hp', monster_hp, 'target', 'enemy', 'source', 'player', 'name', player_essence_names[index], 'grade', player_essence_grades[index]));
        elsif player_essence_codes[index] = 'firefly-spirit-ember' then
          raw_damage := public.character_magic_attack(target_character) * (case when player_essence_grades[index] >= 2 then 80 else 60 end) / 100;
          damage := greatest(1, floor(raw_damage * (100 / (100 + monster_magic_defense)))::integer);
          if enemy_shield_until >= duration_ticks and enemy_shield > 0 then
            healed_amount := least(enemy_shield, damage);
            enemy_shield := enemy_shield - healed_amount;
            damage := damage - healed_amount;
          end if;
          monster_hp := greatest(0, monster_hp - damage);
          total_damage := total_damage + damage;
          logs := logs || jsonb_build_array(
            jsonb_build_object('time_tenths', duration_ticks, 'kind', 'essence_cast', 'amount', 0, 'target_hp', monster_hp, 'target', 'enemy', 'source', 'player', 'name', player_essence_names[index], 'grade', player_essence_grades[index]),
            jsonb_build_object('time_tenths', duration_ticks, 'kind', 'essence_damage', 'amount', damage, 'target_hp', monster_hp, 'target', 'enemy', 'source', 'player', 'name', player_essence_names[index], 'grade', player_essence_grades[index])
          );
        elsif player_essence_codes[index] = 'stone-beetle-stonehide' then
          player_shield_until := duration_ticks + 40;
          player_shield := player_max_hp * (case when player_essence_grades[index] >= 2 then 10 else 8 end) / 100;
          logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'essence_shield', 'amount', player_shield, 'target_hp', player_hp, 'target', 'player', 'source', 'player', 'name', player_essence_names[index], 'grade', player_essence_grades[index]));
        end if;
        player_essence_ready[index] := duration_ticks + public.essence_cooldown_tenths(player_essence_codes[index], player_essence_grades[index]);
      end if;
    end loop;

    if enemy_essence_code is not null and enemy_essence_ready <= duration_ticks then
      if enemy_essence_code = 'angry-boar-might' then
        enemy_empower_pct := 90;
        logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'essence_cast', 'amount', 0, 'target_hp', player_hp, 'target', 'player', 'source', 'enemy', 'name', enemy_essence_name, 'grade', enemy_essence_grade));
      elsif enemy_essence_code = 'forest-wolf-flurry' then
        enemy_flurry_until := duration_ticks + 40;
        enemy_flurry_pct := 40;
        logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'essence_cast', 'amount', 0, 'target_hp', player_hp, 'target', 'player', 'source', 'enemy', 'name', enemy_essence_name, 'grade', enemy_essence_grade));
      elsif enemy_essence_code = 'firefly-spirit-ember' then
        raw_damage := (monster_stats ->> 'magic_attack')::numeric * 0.8;
        damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)))::integer);
        if player_shield_until >= duration_ticks and player_shield > 0 then
          healed_amount := least(player_shield, damage);
          player_shield := player_shield - healed_amount;
          damage := damage - healed_amount;
        end if;
        player_hp := greatest(0, player_hp - damage);
        logs := logs || jsonb_build_array(
          jsonb_build_object('time_tenths', duration_ticks, 'kind', 'essence_cast', 'amount', 0, 'target_hp', player_hp, 'target', 'player', 'source', 'enemy', 'name', enemy_essence_name, 'grade', enemy_essence_grade),
          jsonb_build_object('time_tenths', duration_ticks, 'kind', 'essence_damage', 'amount', damage, 'target_hp', player_hp, 'target', 'player', 'source', 'enemy', 'name', enemy_essence_name, 'grade', enemy_essence_grade)
        );
      elsif enemy_essence_code = 'stone-beetle-stonehide' then
        enemy_shield_until := duration_ticks + 40;
        enemy_shield := monster_max_hp * 0.10;
        enemy_reflect_pct := 15;
        logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'essence_shield', 'amount', enemy_shield, 'target_hp', monster_hp, 'target', 'enemy', 'source', 'enemy', 'name', enemy_essence_name, 'grade', enemy_essence_grade));
      end if;
      enemy_essence_ready := duration_ticks + public.essence_cooldown_tenths(enemy_essence_code, enemy_essence_grade);
    end if;

    if monster_hp <= 0 or player_hp <= 0 then exit; end if;
    duration_ticks := duration_ticks + 1;

    player_attack_gauge := player_attack_gauge + (player_attacks_per_second / 10);
    if player_attack_gauge >= 1 then
      player_attack_gauge := player_attack_gauge - 1;
      is_hit := random() >= monster_evasion / (monster_evasion + player_accuracy);
      if not is_hit then
        logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'miss', 'amount', 0, 'target_hp', monster_hp, 'target', 'enemy'));
      else
        is_critical := random() < critical_chance;
        raw_damage := public.character_physical_attack(target_character);
        if player_empower_pct > 0 then
          raw_damage := raw_damage * (1 + player_empower_pct / 100);
          player_empower_pct := 0;
        end if;
        if is_critical then raw_damage := raw_damage * 1.5; end if;
        damage := greatest(1, floor(raw_damage * (100 / (100 + monster_defense)))::integer);
        if weapon_stats ->> 'weapon_type' = 'bow' then
          damage := damage + coalesce((weapon_stats ->> 'on_hit_fixed_damage')::integer, 0);
        end if;
        if enemy_shield_until >= duration_ticks and enemy_shield > 0 then
          healed_amount := least(enemy_shield, damage);
          enemy_shield := enemy_shield - healed_amount;
          damage := damage - healed_amount;
        end if;
        monster_hp := greatest(0, monster_hp - damage);
        total_damage := total_damage + damage; attack_count := attack_count + 1;
        if is_critical then critical_count := critical_count + 1; end if;
        logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', case when is_critical then 'critical' else 'attack' end, 'amount', damage, 'target_hp', monster_hp, 'target', 'enemy'));
        if duration_ticks <= player_flurry_until and monster_hp > 0 then
          damage := greatest(1, floor(public.character_physical_attack(target_character) * player_flurry_pct / 100 * (100 / (100 + monster_defense)))::integer);
          monster_hp := greatest(0, monster_hp - damage);
          total_damage := total_damage + damage;
          logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'essence_extra_hit', 'amount', damage, 'target_hp', monster_hp, 'target', 'enemy', 'source', 'player', 'name', '숲 늑대의 연격', 'grade', 1));
        end if;
        if enemy_reflect_pct > 0 and enemy_shield_until >= duration_ticks and enemy_shield > 0 then
          damage := greatest(1, floor(monster_defense * enemy_reflect_pct / 100)::integer);
          player_hp := greatest(0, player_hp - damage);
          logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'essence_reflect', 'amount', damage, 'target_hp', player_hp, 'target', 'player', 'source', 'enemy', 'name', enemy_essence_name, 'grade', enemy_essence_grade));
        end if;
        if monster_hp <= 0 then
          logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'defeat', 'amount', 0, 'target_hp', 0, 'target', 'enemy'));
          exit;
        end if;
        if player_hp <= 0 then
          logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'player_defeat', 'amount', 0, 'target_hp', 0, 'target', 'player'));
          exit;
        end if;
      end if;
    end if;

    if monster_template.basic_attack_enabled then
      monster_attack_gauge := monster_attack_gauge + (monster_attacks_per_second / 10);
      if monster_attack_gauge >= 1 then
        monster_attack_gauge := monster_attack_gauge - 1;
        is_hit := random() >= player_evasion / (player_evasion + monster_accuracy);
        if not is_hit then
          logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'enemy_miss', 'amount', 0, 'target_hp', player_hp, 'target', 'player'));
        else
          raw_damage := (monster_stats ->> 'physical_attack')::numeric;
          if enemy_empower_pct > 0 then
            raw_damage := raw_damage * (1 + enemy_empower_pct / 100);
            enemy_empower_pct := 0;
          end if;
          damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)) * (1 - coalesce((armor_stats ->> 'damage_taken_reduction_pct')::numeric, 0) / 100))::integer);
          if player_shield_until >= duration_ticks and player_shield > 0 then
            healed_amount := least(player_shield, damage);
            player_shield := player_shield - healed_amount;
            damage := damage - healed_amount;
          end if;
          player_hp := greatest(0, player_hp - damage);
          logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'enemy_attack', 'amount', damage, 'target_hp', player_hp, 'target', 'player'));
          if coalesce((armor_stats ->> 'reflect_damage_flat')::integer, 0) > 0 then
            damage := (armor_stats ->> 'reflect_damage_flat')::integer;
            monster_hp := greatest(0, monster_hp - damage);
            logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'reflect', 'amount', damage, 'target_hp', monster_hp, 'target', 'enemy'));
          end if;
          if duration_ticks <= enemy_flurry_until and player_hp > 0 then
            damage := greatest(1, floor((monster_stats ->> 'physical_attack')::numeric * enemy_flurry_pct / 100 * (100 / (100 + player_defense)))::integer);
            if player_shield_until >= duration_ticks and player_shield > 0 then
              healed_amount := least(player_shield, damage);
              player_shield := player_shield - healed_amount;
              damage := damage - healed_amount;
            end if;
            player_hp := greatest(0, player_hp - damage);
            logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'essence_extra_hit', 'amount', damage, 'target_hp', player_hp, 'target', 'player', 'source', 'enemy', 'name', enemy_essence_name, 'grade', enemy_essence_grade));
          end if;
          if player_hp <= 0 then
            logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'player_defeat', 'amount', 0, 'target_hp', 0, 'target', 'player'));
            exit;
          end if;
          if monster_hp <= 0 then
            logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'defeat', 'amount', 0, 'target_hp', 0, 'target', 'enemy'));
            exit;
          end if;
        end if;
      end if;
    end if;

    if mod(duration_ticks, 10) = 0 and player_hp < player_max_hp then
      healed_amount := least(player_regeneration_per_second, player_max_hp - player_hp);
      if healed_amount > 0 then
        player_hp := player_hp + healed_amount;
        logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'player_regeneration', 'amount', healed_amount, 'target_hp', player_hp, 'target', 'player'));
      end if;
    end if;
    if mod(duration_ticks, 10) = 0 and monster_hp < monster_max_hp then
      healed_amount := least(monster_regeneration_per_second, monster_max_hp - monster_hp);
      if healed_amount > 0 then
        monster_hp := monster_hp + healed_amount; total_regeneration := total_regeneration + healed_amount;
        logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'regeneration', 'amount', healed_amount, 'target_hp', monster_hp, 'target', 'enemy'));
      end if;
    end if;
  end loop;

  if player_hp <= 0 then outcome := 'defeated'; gained_experience := 0;
  elsif monster_hp <= 0 then outcome := 'victory';
  else outcome := 'timed_out'; gained_experience := 0; logs := logs || jsonb_build_array(jsonb_build_object('time_tenths', duration_ticks, 'kind', 'timeout', 'amount', 0, 'target_hp', monster_hp, 'target', 'enemy'));
  end if;

  battle_ends_at := started_at + (duration_ticks * interval '100 milliseconds');
  recovery_seconds := case when player_hp <= 0 then 10 else 1 end;
  battle := jsonb_build_object(
    'hunt_ground_id', hunt_state.selected_hunt_ground_id,
    'monster_template_id', monster_template.id,
    'status', 'in_progress',
    'outcome', outcome,
    'started_at', started_at,
    'ends_at', battle_ends_at,
    'player', jsonb_build_object('name', target_character.name, 'level', level_before, 'max_hp', player_max_hp, 'start_hp', player_start_hp, 'current_hp', player_hp, 'experience', experience_before),
    'enemy', jsonb_build_object('name', monster_template.name, 'level', monster_level, 'max_hp', monster_max_hp, 'combat_stats', monster_stats, 'essence', jsonb_build_object('code', enemy_essence_code, 'name', enemy_essence_name, 'grade', enemy_essence_grade)),
    'gained_experience', gained_experience,
    'level_before', level_before,
    'level_after', level_before,
    'experience_after', experience_before,
    'duration_ticks', duration_ticks,
    'total_damage', total_damage,
    'attack_count', attack_count,
    'critical_count', critical_count,
    'total_regeneration', total_regeneration,
    'logs', logs
  );

  update public.character_hunt_states set available_at = battle_ends_at, last_battle = battle,
    player_recovery_start_hp = player_hp, player_recovery_max_hp = player_max_hp,
    player_recovery_started_at = battle_ends_at, player_recovery_ends_at = battle_ends_at + make_interval(secs => recovery_seconds),
    is_defeat_recovery = player_hp <= 0
  where character_id = target_character.id;
  update public.characters set hunt_available_at = battle_ends_at where id = target_character.id;
  return jsonb_build_object('hunt_state', public.get_my_hunt_state());
end;
$$;

grant execute on function public.get_my_essences() to authenticated;
grant execute on function public.equip_essence(uuid, integer) to authenticated;
grant execute on function public.unequip_essence(integer) to authenticated;
