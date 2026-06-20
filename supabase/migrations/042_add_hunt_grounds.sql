create table public.hunt_grounds (
  id text primary key,
  name text not null,
  recommended_min_level integer not null,
  recommended_max_level integer not null,
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  check (recommended_min_level >= 1 and recommended_max_level >= recommended_min_level)
);

create table public.hunt_ground_monsters (
  hunt_ground_id text not null references public.hunt_grounds(id) on delete cascade,
  monster_template_id uuid not null references public.monster_templates(id) on delete restrict,
  spawn_weight integer not null default 1 check (spawn_weight > 0),
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  primary key (hunt_ground_id, monster_template_id)
);

insert into public.hunt_grounds (id, name, recommended_min_level, recommended_max_level, sort_order)
values
  ('training-dummy', '허수아비 훈련장', 1, 100, 1),
  ('wooden-doll', '목각인형 훈련장', 1, 100, 2);

insert into public.monster_templates (
  code, name, growth_strength, growth_vitality, basic_attack_enabled, experience_multiplier
)
values ('wooden-doll', '목각인형', 1, 1, true, 1)
on conflict (code) do nothing;

insert into public.hunt_ground_monsters (hunt_ground_id, monster_template_id)
select 'training-dummy', id from public.monster_templates where code = 'training-dummy'
on conflict do nothing;

insert into public.hunt_ground_monsters (hunt_ground_id, monster_template_id)
select 'wooden-doll', id from public.monster_templates where code = 'wooden-doll'
on conflict do nothing;

create or replace function public.get_hunt_grounds()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'recommended_min_level', recommended_min_level,
    'recommended_max_level', recommended_max_level
  ) order by sort_order), '[]'::jsonb)
  from hunt_grounds where is_enabled;
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
  update public.character_hunt_states set selected_hunt_ground_id = target_hunt_ground_id where character_id = target_character.id returning * into hunt_state;
  return public.get_my_hunt_state();
end;
$$;

grant execute on function public.get_hunt_grounds() to authenticated;
grant execute on function public.select_hunt_ground(text) to authenticated;
