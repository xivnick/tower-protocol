create table if not exists public.essence_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  monster_template_id uuid not null unique references public.monster_templates(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.essence_templates enable row level security;

create table if not exists public.character_essences (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  essence_template_id uuid not null references public.essence_templates(id) on delete restrict,
  grade integer not null default 1 check (grade between 1 and 5),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (character_id, essence_template_id, grade)
);

create index if not exists character_essences_character_id_created_at_idx
on public.character_essences (character_id, created_at desc);

alter table public.character_essences enable row level security;

drop trigger if exists character_essences_set_updated_at on public.character_essences;
create trigger character_essences_set_updated_at
before update on public.character_essences
for each row
execute function public.set_updated_at();

insert into public.hunt_grounds (id, name, recommended_min_level, recommended_max_level, sort_order, level_mode)
values ('hunt01', '초록 숲길 전반', 10, 15, 10, 'fixed')
on conflict (id) do update
set name = excluded.name,
    recommended_min_level = excluded.recommended_min_level,
    recommended_max_level = excluded.recommended_max_level,
    sort_order = excluded.sort_order,
    level_mode = excluded.level_mode,
    is_enabled = true;

insert into public.monster_templates (
  code, name, growth_strength, growth_agility, growth_dexterity, growth_vitality,
  growth_endurance, growth_intelligence, growth_wisdom, basic_attack_enabled, experience_multiplier
)
values
  ('angry-boar', '성난 멧돼지', 4, 0, 1, 3, 2, 0, 0, true, 1.00),
  ('forest-wolf', '숲 늑대', 2, 4, 3, 1, 0, 0, 0, true, 1.00),
  ('firefly-spirit', '반딧불 정령', 0, 2, 1, 1, 0, 4, 2, true, 1.00),
  ('stone-beetle', '바위 딱정벌레', 1, 0, 0, 4, 4, 0, 1, true, 1.00)
on conflict (code) do update
set name = excluded.name,
    growth_strength = excluded.growth_strength,
    growth_agility = excluded.growth_agility,
    growth_dexterity = excluded.growth_dexterity,
    growth_vitality = excluded.growth_vitality,
    growth_endurance = excluded.growth_endurance,
    growth_intelligence = excluded.growth_intelligence,
    growth_wisdom = excluded.growth_wisdom,
    basic_attack_enabled = excluded.basic_attack_enabled,
    experience_multiplier = excluded.experience_multiplier;

insert into public.hunt_ground_monsters (
  hunt_ground_id, monster_template_id, spawn_min_level, spawn_max_level, spawn_weight, sort_order, is_enabled
)
select 'hunt01', monster.id, 10, 15, 25, spawn.sort_order, true
from (
  values
    ('angry-boar'::text, 1),
    ('forest-wolf'::text, 2),
    ('firefly-spirit'::text, 3),
    ('stone-beetle'::text, 4)
) as spawn(monster_code, sort_order)
join public.monster_templates monster on monster.code = spawn.monster_code
where not exists (
  select 1 from public.hunt_ground_monsters existing
  where existing.hunt_ground_id = 'hunt01'
    and existing.monster_template_id = monster.id
);

insert into public.essence_templates (code, name, monster_template_id)
select essence.code, essence.name, monster.id
from (
  values
    ('angry-boar-might'::text, '성난 멧돼지의 괴력', 'angry-boar'::text),
    ('forest-wolf-flurry'::text, '숲 늑대의 연격', 'forest-wolf'::text),
    ('firefly-spirit-ember'::text, '반딧불 정령의 불씨', 'firefly-spirit'::text),
    ('stone-beetle-stonehide'::text, '바위 딱정벌레의 돌가죽', 'stone-beetle'::text)
) as essence(code, name, monster_code)
join public.monster_templates monster on monster.code = essence.monster_code
on conflict (code) do update
set name = excluded.name,
    monster_template_id = excluded.monster_template_id;

create or replace function public.hunt_credit_reward_for_level(monster_level integer)
returns integer
language sql
immutable
as $$
  select greatest(1, round(greatest(1, monster_level)::numeric * 2.5)::integer);
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
      do update set quantity = public.character_essences.quantity + 1;

      essence_reward := jsonb_build_object(
        'id', target_essence.id,
        'code', target_essence.code,
        'name', target_essence.name,
        'grade', 1,
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

revoke execute on function public.roll_hunt_victory_rewards(uuid, uuid, integer, integer) from public;
revoke execute on function public.roll_hunt_victory_rewards(uuid, uuid, integer, integer) from anon;
revoke execute on function public.roll_hunt_victory_rewards(uuid, uuid, integer, integer) from authenticated;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.settle_training_dummy_hunt()'::regprocedure) into definition;

  if position(E'gained_experience integer;' in definition) = 0
    or position(E'    update public.characters set level = target_character.level, experience = target_character.experience, stat_points = stat_points + (level_ups * 5), hunt_available_at = null where id = target_character.id returning * into target_character;\n    battle := battle || jsonb_build_object(''status'', ''victory'', ''ended_at'', clock_timestamp(), ''gained_experience'', gained_experience, ''level_after'', target_character.level, ''experience_after'', target_character.experience);' in definition) = 0 then
    raise exception 'settle_training_dummy_hunt_reward_definition_changed';
  end if;

  definition := replace(
    definition,
    E'gained_experience integer;',
    E'gained_experience integer; monster_level integer; gained_credits integer; rewards jsonb;'
  );

  definition := replace(
    definition,
    E'    update public.characters set level = target_character.level, experience = target_character.experience, stat_points = stat_points + (level_ups * 5), hunt_available_at = null where id = target_character.id returning * into target_character;\n    battle := battle || jsonb_build_object(''status'', ''victory'', ''ended_at'', clock_timestamp(), ''gained_experience'', gained_experience, ''level_after'', target_character.level, ''experience_after'', target_character.experience);',
    E'    monster_level := coalesce((battle -> ''enemy'' ->> ''level'')::integer, target_character.level);\n    gained_credits := public.hunt_credit_reward_for_level(monster_level);\n    rewards := public.roll_hunt_victory_rewards(target_character.id, (battle ->> ''monster_template_id'')::uuid, monster_level, gained_credits);\n    update public.characters set level = target_character.level, experience = target_character.experience, credits = credits + gained_credits, stat_points = stat_points + (level_ups * 5), hunt_available_at = null where id = target_character.id returning * into target_character;\n    battle := battle || jsonb_build_object(''status'', ''victory'', ''ended_at'', clock_timestamp(), ''gained_experience'', gained_experience, ''gained_credits'', gained_credits, ''rewards'', rewards, ''level_after'', target_character.level, ''experience_after'', target_character.experience);'
  );

  execute definition;
end;
$$;

grant execute on function public.hunt_credit_reward_for_level(integer) to authenticated;
