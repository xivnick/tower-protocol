create or replace function public.encounter_hunt_monster()
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
  player_max_hp numeric;
  player_hp numeric;
  encountered_at timestamptz := clock_timestamp();
  battle jsonb;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;

  insert into public.character_hunt_states (character_id) values (target_character.id) on conflict do nothing;
  select * into hunt_state from public.character_hunt_states where character_id = target_character.id for update;
  if hunt_state.last_battle ->> 'status' = 'in_progress' then raise exception 'hunt_in_progress'; end if;
  if hunt_state.last_battle ->> 'status' = 'encountered' then raise exception 'monster_already_encountered'; end if;
  if hunt_state.available_at is not null and hunt_state.available_at > encountered_at then raise exception 'hunt_on_cooldown'; end if;

  select mt.* into monster_template
  from public.hunt_ground_monsters hgm
  join public.monster_templates mt on mt.id = hgm.monster_template_id
  where hgm.hunt_ground_id = hunt_state.selected_hunt_ground_id and hgm.is_enabled
  order by hgm.sort_order, mt.code
  limit 1;
  if not found then raise exception 'hunt_ground_monster_not_found'; end if;

  monster_stats := public.monster_combat_stats_at_level(monster_template, target_character.level);
  player_max_hp := 100 + (target_character.level * 20) + (target_character.vitality * 10);
  player_hp := public.hunt_player_hp(
    hunt_state.player_recovery_start_hp,
    coalesce(hunt_state.player_recovery_max_hp, player_max_hp),
    hunt_state.player_recovery_started_at,
    hunt_state.player_recovery_ends_at,
    player_max_hp,
    encountered_at
  );
  player_hp := least(player_max_hp, player_hp * player_max_hp / nullif(coalesce(hunt_state.player_recovery_max_hp, player_max_hp), 0));

  battle := jsonb_build_object(
    'hunt_ground_id', hunt_state.selected_hunt_ground_id,
    'status', 'encountered',
    'started_at', encountered_at,
    'player', jsonb_build_object('name', target_character.name, 'level', target_character.level, 'max_hp', player_max_hp, 'start_hp', player_hp, 'current_hp', player_hp, 'experience', target_character.experience),
    'enemy', jsonb_build_object('name', monster_template.name, 'level', target_character.level, 'max_hp', (monster_stats ->> 'max_hp')::numeric, 'combat_stats', monster_stats),
    'gained_experience', 0,
    'level_before', target_character.level,
    'level_after', target_character.level,
    'experience_after', target_character.experience,
    'duration_ticks', 0,
    'total_damage', 0,
    'attack_count', 0,
    'critical_count', 0,
    'total_regeneration', 0,
    'logs', '[]'::jsonb
  );

  update public.character_hunt_states set last_battle = battle where character_id = target_character.id;
  return jsonb_build_object('hunt_state', public.get_my_hunt_state());
end;
$$;

do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;
  if position(E'  if hunt_state.last_battle ->> ''status'' = ''in_progress'' then raise exception ''hunt_in_progress''; end if;' in definition) = 0 then
    raise exception 'hunt_training_dummy_definition_changed';
  end if;
  definition := replace(
    definition,
    E'  if hunt_state.last_battle ->> ''status'' = ''in_progress'' then raise exception ''hunt_in_progress''; end if;',
    E'  if hunt_state.last_battle ->> ''status'' <> ''encountered'' then raise exception ''no_monster_encounter''; end if;'
  );
  execute definition;
end;
$$;

create or replace function public.select_hunt_ground(target_hunt_ground_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  hunt_state public.character_hunt_states%rowtype;
begin
  if not exists (select 1 from public.hunt_grounds where id = target_hunt_ground_id and is_enabled) then
    raise exception 'hunt_ground_not_found';
  end if;
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  insert into public.character_hunt_states (character_id) values (target_character.id) on conflict do nothing;
  select * into hunt_state from public.character_hunt_states where character_id = target_character.id for update;
  if hunt_state.last_battle ->> 'status' = 'encountered' then raise exception 'monster_encountered'; end if;
  update public.character_hunt_states set selected_hunt_ground_id = target_hunt_ground_id where character_id = target_character.id;
  return public.get_my_hunt_state();
end;
$$;

grant execute on function public.encounter_hunt_monster() to authenticated;
