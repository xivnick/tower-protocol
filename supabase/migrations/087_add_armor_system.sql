create table public.character_armors (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  armor_type text not null check (armor_type in ('plate', 'leather', 'robe')),
  armor_variant text not null check (armor_variant in (
    'plate_reflect', 'plate_damage_reduction',
    'leather_evasion_flat', 'leather_evasion_pct',
    'robe_magic_defense_flat_cooldown_flat', 'robe_magic_defense_flat_cooldown_pct',
    'robe_magic_defense_pct_cooldown_flat', 'robe_magic_defense_pct_cooldown_pct'
  )),
  armor_level integer not null check (armor_level between 1 and 100),
  created_at timestamptz not null default now(),
  check (
    (armor_type = 'plate' and armor_variant in ('plate_reflect', 'plate_damage_reduction'))
    or (armor_type = 'leather' and armor_variant in ('leather_evasion_flat', 'leather_evasion_pct'))
    or (armor_type = 'robe' and armor_variant in (
      'robe_magic_defense_flat_cooldown_flat', 'robe_magic_defense_flat_cooldown_pct',
      'robe_magic_defense_pct_cooldown_flat', 'robe_magic_defense_pct_cooldown_pct'
    ))
  )
);

create index character_armors_character_id_created_at_idx
on public.character_armors (character_id, created_at desc);

alter table public.character_armors enable row level security;

alter table public.character_equipment
add column armor_id uuid unique references public.character_armors(id) on delete set null;

create or replace function public.armor_stats(armor_type text, armor_variant text, armor_level integer)
returns jsonb
language plpgsql
immutable
as $$
declare
  flat integer := 2 + floor(armor_level * 1.2)::integer;
  percent_bonus numeric := floor((5 + armor_level * 0.2) * 10) / 10;
  cooldown_flat integer := 1 + floor(armor_level * 0.35)::integer;
begin
  if armor_type = 'plate' and armor_variant = 'plate_reflect' then
    return jsonb_build_object('reflect_damage_flat', 2 + floor(armor_level * 0.7)::integer);
  elsif armor_type = 'plate' and armor_variant = 'plate_damage_reduction' then
    return jsonb_build_object('damage_taken_reduction_pct', floor((3 + armor_level * 0.08) * 10) / 10);
  elsif armor_type = 'leather' and armor_variant = 'leather_evasion_flat' then
    return jsonb_build_object('physical_defense_flat', flat, 'evasion_flat', flat);
  elsif armor_type = 'leather' and armor_variant = 'leather_evasion_pct' then
    return jsonb_build_object('physical_defense_flat', flat, 'evasion_pct', percent_bonus);
  elsif armor_type = 'robe' and armor_variant = 'robe_magic_defense_flat_cooldown_flat' then
    return jsonb_build_object('magic_defense_flat', flat, 'cooldown_flat', cooldown_flat);
  elsif armor_type = 'robe' and armor_variant = 'robe_magic_defense_flat_cooldown_pct' then
    return jsonb_build_object('magic_defense_flat', flat, 'cooldown_pct', percent_bonus);
  elsif armor_type = 'robe' and armor_variant = 'robe_magic_defense_pct_cooldown_flat' then
    return jsonb_build_object('magic_defense_pct', percent_bonus, 'cooldown_flat', cooldown_flat);
  elsif armor_type = 'robe' and armor_variant = 'robe_magic_defense_pct_cooldown_pct' then
    return jsonb_build_object('magic_defense_pct', percent_bonus, 'cooldown_pct', percent_bonus);
  end if;
  raise exception 'invalid_armor_variant';
end;
$$;

create or replace function public.character_armor_stats(target_character_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce((
    select public.armor_stats(armor.armor_type, armor.armor_variant, armor.armor_level)
      || jsonb_build_object('id', armor.id, 'armor_type', armor.armor_type, 'armor_variant', armor.armor_variant, 'armor_level', armor.armor_level)
    from public.character_equipment equipment
    join public.character_armors armor on armor.id = equipment.armor_id
    where equipment.character_id = target_character_id
  ), '{}'::jsonb);
$$;

create or replace function public.get_my_armors()
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
    'armors', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', armor.id, 'armor_type', armor.armor_type, 'armor_variant', armor.armor_variant,
        'armor_level', armor.armor_level, 'created_at', armor.created_at
      ) order by armor.created_at desc)
      from public.character_armors armor where armor.character_id = target_character_id
    ), '[]'::jsonb),
    'equipped_armor_id', (select equipment.armor_id from public.character_equipment equipment where equipment.character_id = target_character_id)
  );
end;
$$;

create or replace function public.open_armor_box()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  created_armor public.character_armors%rowtype;
  selected_type text;
  selected_variant text;
  selected_level integer;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  if target_character.credits < 100 then raise exception 'insufficient_credits'; end if;
  selected_type := (array['plate', 'leather', 'robe'])[floor(random() * 3)::integer + 1];
  selected_variant := case selected_type
    when 'plate' then (array['plate_reflect', 'plate_damage_reduction'])[floor(random() * 2)::integer + 1]
    when 'leather' then (array['leather_evasion_flat', 'leather_evasion_pct'])[floor(random() * 2)::integer + 1]
    else (array['robe_magic_defense_flat_cooldown_flat', 'robe_magic_defense_flat_cooldown_pct', 'robe_magic_defense_pct_cooldown_flat', 'robe_magic_defense_pct_cooldown_pct'])[floor(random() * 4)::integer + 1]
  end;
  selected_level := greatest(1, least(100, target_character.level + floor(random() * 7)::integer - 3));
  insert into public.character_armors (character_id, armor_type, armor_variant, armor_level)
  values (target_character.id, selected_type, selected_variant, selected_level)
  returning * into created_armor;
  update public.characters set credits = credits - 100 where id = target_character.id returning * into target_character;
  return jsonb_build_object('character', to_jsonb(target_character), 'armor', jsonb_build_object(
    'id', created_armor.id, 'armor_type', created_armor.armor_type, 'armor_variant', created_armor.armor_variant,
    'armor_level', created_armor.armor_level, 'created_at', created_armor.created_at
  ));
end;
$$;

create or replace function public.equip_armor(target_armor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target_character_id uuid;
begin
  select id into target_character_id from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  if not exists (select 1 from public.character_armors where id = target_armor_id and character_id = target_character_id) then raise exception 'armor_not_owned'; end if;
  insert into public.character_equipment (character_id, armor_id) values (target_character_id, target_armor_id)
  on conflict (character_id) do update set armor_id = excluded.armor_id;
  return public.get_my_armors();
end;
$$;

create or replace function public.unequip_armor()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target_character_id uuid;
begin
  select id into target_character_id from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  insert into public.character_equipment (character_id, armor_id) values (target_character_id, null)
  on conflict (character_id) do update set armor_id = null;
  return public.get_my_armors();
end;
$$;

create or replace function public.sell_armor(target_armor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target_character public.characters%rowtype; sale_price integer := 20;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  if not exists (select 1 from public.character_armors where id = target_armor_id and character_id = target_character.id) then raise exception 'armor_not_owned'; end if;
  if exists (select 1 from public.character_equipment where armor_id = target_armor_id) then raise exception 'equipped_armor_cannot_be_sold'; end if;
  delete from public.character_armors where id = target_armor_id;
  update public.characters set credits = credits + sale_price where id = target_character.id returning * into target_character;
  return jsonb_build_object('character', to_jsonb(target_character), 'gained_credits', sale_price);
end;
$$;

do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;
  if position(E'  weapon_stats jsonb;\n  player_max_hp numeric;' in definition) = 0
    or position(E'  player_defense := target_character.endurance + target_character.wisdom;' in definition) = 0
    or position(E'  player_evasion := target_character.agility;' in definition) = 0
    or position(E'        player_hp := greatest(0, player_hp - damage);\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''enemy_attack'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player''));\n        if player_hp <= 0 then' in definition) = 0 then
    raise exception 'hunt_training_dummy_armor_definition_changed';
  end if;
  definition := replace(definition, E'  weapon_stats jsonb;\n  player_max_hp numeric;', E'  weapon_stats jsonb;\n  armor_stats jsonb;\n  player_max_hp numeric;');
  definition := replace(definition, E'  player_defense := target_character.endurance + target_character.wisdom;', E'  armor_stats := public.character_armor_stats(target_character.id);\n  player_defense := (target_character.endurance + coalesce((armor_stats ->> ''physical_defense_flat'')::numeric, 0)) * (1 + coalesce((armor_stats ->> ''physical_defense_pct'')::numeric, 0) / 100) + (target_character.wisdom + coalesce((armor_stats ->> ''magic_defense_flat'')::numeric, 0)) * (1 + coalesce((armor_stats ->> ''magic_defense_pct'')::numeric, 0) / 100);');
  definition := replace(definition, E'  player_evasion := target_character.agility;', E'  player_evasion := (target_character.agility + coalesce((armor_stats ->> ''evasion_flat'')::numeric, 0)) * (1 + coalesce((armor_stats ->> ''evasion_pct'')::numeric, 0) / 100);');
  definition := replace(definition, E'        damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)) * (100 + damage_variance) / 100)::integer);\n        player_hp := greatest(0, player_hp - damage);\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''enemy_attack'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player''));\n        if player_hp <= 0 then', E'        damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)) * (100 + damage_variance) / 100 * (1 - coalesce((armor_stats ->> ''damage_taken_reduction_pct'')::numeric, 0) / 100))::integer);\n        player_hp := greatest(0, player_hp - damage);\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''enemy_attack'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player''));\n        if coalesce((armor_stats ->> ''reflect_damage_flat'')::integer, 0) > 0 then\n          damage := (armor_stats ->> ''reflect_damage_flat'')::integer;\n          monster_hp := greatest(0, monster_hp - damage);\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''reflect'', ''amount'', damage, ''target_hp'', monster_hp, ''target'', ''enemy''));\n        end if;\n        if player_hp <= 0 then');
  definition := replace(definition, E'        if player_hp <= 0 then\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''player_defeat'', ''amount'', 0, ''target_hp'', 0, ''target'', ''player''));\n          exit;\n        end if;', E'        if player_hp <= 0 then\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''player_defeat'', ''amount'', 0, ''target_hp'', 0, ''target'', ''player''));\n          exit;\n        end if;\n        if monster_hp <= 0 then\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''defeat'', ''amount'', 0, ''target_hp'', 0, ''target'', ''enemy''));\n          exit;\n        end if;');
  definition := replace(definition, E'  if monster_hp <= 0 then outcome := ''victory'';\n  elsif player_hp <= 0 then outcome := ''defeated''; gained_experience := 0;', E'  if player_hp <= 0 then outcome := ''defeated''; gained_experience := 0;\n  elsif monster_hp <= 0 then outcome := ''victory'';');
  execute definition;
end;
$$;

grant execute on function public.get_my_armors() to authenticated;
grant execute on function public.open_armor_box() to authenticated;
grant execute on function public.equip_armor(uuid) to authenticated;
grant execute on function public.unequip_armor() to authenticated;
grant execute on function public.sell_armor(uuid) to authenticated;
