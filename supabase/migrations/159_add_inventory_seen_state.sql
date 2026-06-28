alter table public.character_weapons
add column if not exists seen_at timestamptz;

alter table public.character_armors
add column if not exists seen_at timestamptz;

alter table public.character_essences
add column if not exists seen_at timestamptz;

update public.character_weapons
set seen_at = created_at
where seen_at is null;

update public.character_armors
set seen_at = created_at
where seen_at is null;

update public.character_essences
set seen_at = created_at
where seen_at is null;

create or replace function public.get_inventory_notice_status()
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
    'equipment', exists (
      select 1 from public.character_weapons weapon
      where weapon.character_id = target_character_id and weapon.seen_at is null
    ) or exists (
      select 1 from public.character_armors armor
      where armor.character_id = target_character_id and armor.seen_at is null
    ),
    'essence', exists (
      select 1 from public.character_essences essence
      where essence.character_id = target_character_id and essence.seen_at is null
    )
  );
end;
$$;

create or replace function public.mark_inventory_item_seen(item_kind text, item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target_character_id uuid;
begin
  select id into target_character_id from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;

  if item_kind = 'weapon' then
    update public.character_weapons
    set seen_at = coalesce(seen_at, clock_timestamp())
    where id = item_id and character_id = target_character_id;
    if not found then raise exception 'weapon_not_owned'; end if;
  elsif item_kind = 'armor' then
    update public.character_armors
    set seen_at = coalesce(seen_at, clock_timestamp())
    where id = item_id and character_id = target_character_id;
    if not found then raise exception 'armor_not_owned'; end if;
  elsif item_kind = 'essence' then
    update public.character_essences
    set seen_at = coalesce(seen_at, clock_timestamp())
    where id = item_id and character_id = target_character_id;
    if not found then raise exception 'essence_not_owned'; end if;
  else
    raise exception 'invalid_inventory_item_kind';
  end if;

  return public.get_inventory_notice_status();
end;
$$;

create or replace function public.get_my_weapons()
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
    'weapons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', weapon.id,
        'weapon_type', weapon.weapon_type,
        'weapon_level', weapon.weapon_level,
        'created_at', weapon.created_at,
        'seen_at', weapon.seen_at
      ) order by weapon.created_at desc)
      from public.character_weapons weapon
      where weapon.character_id = target_character_id
    ), '[]'::jsonb),
    'equipped_weapon_id', (
      select equipment.weapon_id from public.character_equipment equipment where equipment.character_id = target_character_id
    )
  );
end;
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
        'armor_level', armor.armor_level, 'created_at', armor.created_at, 'seen_at', armor.seen_at
      ) order by armor.created_at desc)
      from public.character_armors armor where armor.character_id = target_character_id
    ), '[]'::jsonb),
    'equipped_armor_id', (select equipment.armor_id from public.character_equipment equipment where equipment.character_id = target_character_id)
  );
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
        'created_at', essence.created_at,
        'seen_at', essence.seen_at
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

create or replace function public.roll_hunt_victory_rewards(
  target_character_id uuid,
  defeated_monster_template_id uuid,
  monster_level integer,
  gained_credits integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  equipment_roll numeric := random();
  equipment_kind text := null;
  selected_weapon_type text;
  selected_armor_type text;
  selected_armor_variant text;
  created_weapon public.character_weapons%rowtype;
  created_armor public.character_armors%rowtype;
  target_essence public.essence_templates%rowtype;
  created_essence public.character_essences%rowtype;
  essence_reward jsonb := null;
  equipment_reward jsonb := null;
begin
  if equipment_roll < 0.15 then
    if random() < 0.5 then
      equipment_kind := 'weapon';
      selected_weapon_type := (array['longsword', 'greatsword', 'dagger', 'bow', 'wand', 'staff'])[floor(random() * 6)::integer + 1];
      insert into public.character_weapons (character_id, weapon_type, weapon_level)
      values (target_character_id, selected_weapon_type, greatest(1, least(100, monster_level)))
      returning * into created_weapon;

      equipment_reward := jsonb_build_object(
        'kind', equipment_kind,
        'id', created_weapon.id,
        'type', created_weapon.weapon_type,
        'level', created_weapon.weapon_level
      );
    else
      equipment_kind := 'armor';
      selected_armor_type := (array['plate', 'leather', 'robe'])[floor(random() * 3)::integer + 1];
      selected_armor_variant := case selected_armor_type
        when 'plate' then (array['plate_reflect', 'plate_damage_reduction'])[floor(random() * 2)::integer + 1]
        when 'leather' then (array['leather_evasion_flat', 'leather_evasion_pct'])[floor(random() * 2)::integer + 1]
        else (array[
          'robe_magic_defense_flat_cooldown_flat',
          'robe_magic_defense_flat_cooldown_pct',
          'robe_magic_defense_pct_cooldown_flat',
          'robe_magic_defense_pct_cooldown_pct'
        ])[floor(random() * 4)::integer + 1]
      end;

      insert into public.character_armors (character_id, armor_type, armor_variant, armor_level)
      values (target_character_id, selected_armor_type, selected_armor_variant, greatest(1, least(100, monster_level)))
      returning * into created_armor;

      equipment_reward := jsonb_build_object(
        'kind', equipment_kind,
        'id', created_armor.id,
        'type', created_armor.armor_type,
        'variant', created_armor.armor_variant,
        'level', created_armor.armor_level
      );
    end if;
  end if;

  if random() < 0.10 then
    select * into target_essence
    from public.essence_templates
    where monster_template_id = defeated_monster_template_id;

    if found then
      insert into public.character_essences (character_id, essence_template_id, grade, quantity)
      values (target_character_id, target_essence.id, 1, 1)
      on conflict (character_id, essence_template_id, grade)
      do update set quantity = public.character_essences.quantity + 1, seen_at = null
      returning * into created_essence;

      essence_reward := jsonb_build_object(
        'id', created_essence.id,
        'code', target_essence.code,
        'name', target_essence.name,
        'grade', created_essence.grade,
        'quantity', 1
      );
    end if;
  end if;

  return jsonb_build_object(
    'credits', gained_credits,
    'equipment', equipment_reward,
    'essence', essence_reward
  );
end;
$$;

revoke execute on function public.get_inventory_notice_status() from public;
revoke execute on function public.get_inventory_notice_status() from anon;
grant execute on function public.get_inventory_notice_status() to authenticated;

revoke execute on function public.mark_inventory_item_seen(text, uuid) from public;
revoke execute on function public.mark_inventory_item_seen(text, uuid) from anon;
grant execute on function public.mark_inventory_item_seen(text, uuid) to authenticated;

revoke execute on function public.roll_hunt_victory_rewards(uuid, uuid, integer, integer) from public;
revoke execute on function public.roll_hunt_victory_rewards(uuid, uuid, integer, integer) from anon;
revoke execute on function public.roll_hunt_victory_rewards(uuid, uuid, integer, integer) from authenticated;
