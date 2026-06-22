create table public.character_weapons (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  weapon_type text not null check (weapon_type in ('longsword', 'greatsword', 'dagger', 'bow', 'wand', 'staff')),
  weapon_level integer not null check (weapon_level between 1 and 100),
  created_at timestamptz not null default now()
);

create index character_weapons_character_id_created_at_idx
on public.character_weapons (character_id, created_at desc);

alter table public.character_weapons enable row level security;

create table public.character_equipment (
  character_id uuid primary key references public.characters(id) on delete cascade,
  weapon_id uuid unique references public.character_weapons(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.character_equipment enable row level security;

create trigger character_equipment_set_updated_at
before update on public.character_equipment
for each row
execute function public.set_updated_at();

create or replace function public.weapon_stats(weapon_type text, weapon_level integer)
returns jsonb
language plpgsql
immutable
as $$
declare
  power integer := 3 + floor(weapon_level * 1.5)::integer;
begin
  if weapon_type = 'longsword' then
    return jsonb_build_object('physical_attack_flat', power);
  elsif weapon_type = 'greatsword' then
    return jsonb_build_object('physical_attack_pct', 2 + floor(weapon_level * 0.1)::integer);
  elsif weapon_type = 'dagger' then
    return jsonb_build_object(
      'accuracy_penalty', 2 + floor(weapon_level * 0.05)::integer,
      'on_hit_physical_attack_pct', 6 + weapon_level * 0.12
    );
  elsif weapon_type = 'bow' then
    return jsonb_build_object(
      'accuracy_penalty', 1 + floor(weapon_level * 0.03)::integer,
      'on_hit_fixed_damage', 2 + floor(weapon_level * 1.1)::integer
    );
  elsif weapon_type = 'wand' then
    return jsonb_build_object('magic_attack_flat', power);
  elsif weapon_type = 'staff' then
    return jsonb_build_object('magic_attack_pct', 2 + floor(weapon_level * 0.1)::integer);
  end if;

  raise exception 'invalid_weapon_type';
end;
$$;

create or replace function public.character_weapon_stats(target_character_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select public.weapon_stats(weapon.weapon_type, weapon.weapon_level)
        || jsonb_build_object('id', weapon.id, 'weapon_type', weapon.weapon_type, 'weapon_level', weapon.weapon_level)
      from public.character_equipment equipment
      join public.character_weapons weapon on weapon.id = equipment.weapon_id
      where equipment.character_id = target_character_id
    ),
    '{}'::jsonb
  );
$$;

create or replace function public.character_physical_attack(target_character public.characters)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare weapon jsonb := public.character_weapon_stats(target_character.id);
begin
  return (target_character.strength + coalesce((weapon ->> 'physical_attack_flat')::numeric, 0))
    * (1 + coalesce((weapon ->> 'physical_attack_pct')::numeric, 0) / 100);
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
        'created_at', weapon.created_at
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

create or replace function public.open_weapon_box()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  created_weapon public.character_weapons%rowtype;
  selected_weapon_type text;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  if target_character.credits < 100 then raise exception 'insufficient_credits'; end if;

  selected_weapon_type := (array['longsword', 'greatsword', 'dagger', 'bow', 'wand', 'staff'])[floor(random() * 6)::integer + 1];
  insert into public.character_weapons (character_id, weapon_type, weapon_level)
  values (target_character.id, selected_weapon_type, target_character.level)
  returning * into created_weapon;

  update public.characters set credits = credits - 100 where id = target_character.id returning * into target_character;

  return jsonb_build_object(
    'character', to_jsonb(target_character),
    'weapon', jsonb_build_object(
      'id', created_weapon.id,
      'weapon_type', created_weapon.weapon_type,
      'weapon_level', created_weapon.weapon_level,
      'created_at', created_weapon.created_at
    )
  );
end;
$$;

create or replace function public.equip_weapon(target_weapon_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target_character_id uuid;
begin
  select id into target_character_id from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  if not exists (select 1 from public.character_weapons where id = target_weapon_id and character_id = target_character_id) then
    raise exception 'weapon_not_owned';
  end if;

  insert into public.character_equipment (character_id, weapon_id)
  values (target_character_id, target_weapon_id)
  on conflict (character_id) do update set weapon_id = excluded.weapon_id;
  return public.get_my_weapons();
end;
$$;

create or replace function public.unequip_weapon()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target_character_id uuid;
begin
  select id into target_character_id from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  insert into public.character_equipment (character_id, weapon_id)
  values (target_character_id, null)
  on conflict (character_id) do update set weapon_id = null;
  return public.get_my_weapons();
end;
$$;

do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;
  if position(E'  is_hit boolean;\n  player_max_hp numeric;' in definition) = 0
    or position(E'  player_accuracy := 100 + target_character.dexterity;' in definition) = 0
    or position(E'      monster_hp := greatest(0, monster_hp - damage);' in definition) = 0 then
    raise exception 'hunt_training_dummy_definition_changed';
  end if;

  definition := replace(definition,
    E'  is_hit boolean;\n  player_max_hp numeric;',
    E'  is_hit boolean;\n  weapon_stats jsonb;\n  player_max_hp numeric;');
  definition := replace(definition,
    E'  critical_chance := least(target_character.dexterity, 100)::numeric / 100;\n  player_accuracy := 100 + target_character.dexterity;',
    E'  weapon_stats := public.character_weapon_stats(target_character.id);\n  critical_chance := least(target_character.dexterity, 100)::numeric / 100;\n  player_accuracy := 100 + target_character.dexterity - coalesce((weapon_stats ->> ''accuracy_penalty'')::numeric, 0);');
  definition := replace(definition,
    E'      monster_hp := greatest(0, monster_hp - damage);',
    E'      if weapon_stats ->> ''weapon_type'' = ''dagger'' then\n        damage := damage + floor(public.character_physical_attack(target_character) * coalesce((weapon_stats ->> ''on_hit_physical_attack_pct'')::numeric, 0) / 100)::integer;\n      elsif weapon_stats ->> ''weapon_type'' = ''bow'' then\n        damage := damage + coalesce((weapon_stats ->> ''on_hit_fixed_damage'')::integer, 0);\n      end if;\n      monster_hp := greatest(0, monster_hp - damage);');
  execute definition;
end;
$$;

grant execute on function public.get_my_weapons() to authenticated;
grant execute on function public.open_weapon_box() to authenticated;
grant execute on function public.equip_weapon(uuid) to authenticated;
grant execute on function public.unequip_weapon() to authenticated;
