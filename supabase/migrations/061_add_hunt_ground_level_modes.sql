alter table public.hunt_grounds
  add column level_mode text not null default 'scaling'
    check (level_mode in ('scaling', 'fixed'));

alter table public.hunt_ground_monsters
  add column id uuid default gen_random_uuid(),
  add column spawn_min_level integer not null default 0,
  add column spawn_max_level integer not null default 0;

update public.hunt_ground_monsters set id = gen_random_uuid() where id is null;
alter table public.hunt_ground_monsters alter column id set not null;
alter table public.hunt_ground_monsters drop constraint hunt_ground_monsters_pkey;
alter table public.hunt_ground_monsters add primary key (id);
alter table public.hunt_ground_monsters
  add constraint hunt_ground_monsters_spawn_level_range_check
  check (spawn_max_level >= spawn_min_level);

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
  selected_monster_template_id uuid;
  ground_level_mode text;
  spawn_min_level integer;
  spawn_max_level integer;
  selected_spawn_level integer;
  monster_level integer;
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
  if hunt_state.is_defeat_recovery and hunt_state.player_recovery_started_at + interval '10 seconds' > encountered_at then raise exception 'hunt_defeat_recovery'; end if;
  if hunt_state.available_at is not null and hunt_state.available_at > encountered_at then raise exception 'hunt_on_cooldown'; end if;

  select mt.id, hg.level_mode, hgm.spawn_min_level, hgm.spawn_max_level
  into selected_monster_template_id, ground_level_mode, spawn_min_level, spawn_max_level
  from public.hunt_ground_monsters hgm
  join public.hunt_grounds hg on hg.id = hgm.hunt_ground_id
  join public.monster_templates mt on mt.id = hgm.monster_template_id
  where hgm.hunt_ground_id = hunt_state.selected_hunt_ground_id and hgm.is_enabled
  order by -ln(1.0 - random()) / hgm.spawn_weight
  limit 1;
  if not found then raise exception 'hunt_ground_monster_not_found'; end if;
  select * into monster_template from public.monster_templates where id = selected_monster_template_id;

  selected_spawn_level := spawn_min_level + floor(random() * (spawn_max_level - spawn_min_level + 1))::integer;
  if ground_level_mode = 'scaling' then
    monster_level := greatest(1, target_character.level + selected_spawn_level);
  else
    if selected_spawn_level < 1 then raise exception 'invalid_fixed_hunt_spawn_level'; end if;
    monster_level := selected_spawn_level;
  end if;

  monster_stats := public.monster_combat_stats_at_level(monster_template, monster_level);
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
    'monster_template_id', monster_template.id,
    'status', 'encountered',
    'started_at', encountered_at,
    'player', jsonb_build_object('name', target_character.name, 'level', target_character.level, 'max_hp', player_max_hp, 'start_hp', player_hp, 'current_hp', player_hp, 'experience', target_character.experience),
    'enemy', jsonb_build_object('name', monster_template.name, 'level', monster_level, 'max_hp', (monster_stats ->> 'max_hp')::numeric, 'combat_stats', monster_stats),
    'gained_experience', 0,
    'level_before', target_character.level,
    'level_after', target_character.level,
    'experience_after', target_character.experience,
    'duration_ticks', 0,
    'total_damage', 0,
    'attack_count', 0,
    'critical_count', 0,
    'total_regeneration', 0,
    'logs', jsonb_build_array(jsonb_build_object('time_tenths', 0, 'kind', 'encounter', 'amount', 0, 'target_hp', (monster_stats ->> 'max_hp')::numeric, 'target', 'enemy'))
  );

  update public.character_hunt_states set last_battle = battle where character_id = target_character.id;
  return jsonb_build_object('hunt_state', public.get_my_hunt_state());
end;
$$;

do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;
  if position(E'  level_before integer;' in definition) = 0
    or position(E'  select mt.* into monster_template\n  from public.hunt_ground_monsters hgm\n  join public.monster_templates mt on mt.id = hgm.monster_template_id\n  where hgm.hunt_ground_id = hunt_state.selected_hunt_ground_id and hgm.is_enabled\n  order by hgm.sort_order, mt.code limit 1;\n  if not found then raise exception ''hunt_ground_monster_not_found''; end if;' in definition) = 0 then
    raise exception 'hunt_training_dummy_definition_changed';
  end if;
  definition := replace(definition, E'  level_before integer;', E'  level_before integer;\n  monster_level integer;');
  definition := replace(
    definition,
    E'  select mt.* into monster_template\n  from public.hunt_ground_monsters hgm\n  join public.monster_templates mt on mt.id = hgm.monster_template_id\n  where hgm.hunt_ground_id = hunt_state.selected_hunt_ground_id and hgm.is_enabled\n  order by hgm.sort_order, mt.code limit 1;\n  if not found then raise exception ''hunt_ground_monster_not_found''; end if;',
    E'  select * into monster_template from public.monster_templates where id = (hunt_state.last_battle ->> ''monster_template_id'')::uuid;\n  if not found then raise exception ''hunt_ground_monster_not_found''; end if;'
  );
  definition := replace(definition, E'  level_before := target_character.level;', E'  level_before := target_character.level;\n  monster_level := (hunt_state.last_battle -> ''enemy'' ->> ''level'')::integer;');
  definition := replace(definition, E'  monster_stats := public.monster_combat_stats_at_level(monster_template, level_before);', E'  monster_stats := public.monster_combat_stats_at_level(monster_template, monster_level);');
  definition := replace(definition, E'  gained_experience := round(public.experience_for_monster_level(level_before) * monster_template.experience_multiplier)::integer;', E'  gained_experience := round(public.experience_for_monster_level(monster_level) * monster_template.experience_multiplier)::integer;');
  definition := replace(definition, E'''enemy'', jsonb_build_object(''name'', monster_template.name, ''level'', level_before, ''max_hp'', monster_max_hp, ''combat_stats'', monster_stats)', E'''enemy'', jsonb_build_object(''name'', monster_template.name, ''level'', monster_level, ''max_hp'', monster_max_hp, ''combat_stats'', monster_stats)');
  execute definition;
end;
$$;
