insert into public.monster_templates (
  code, name, growth_strength, growth_agility, growth_dexterity, growth_vitality,
  growth_endurance, growth_intelligence, growth_wisdom, basic_attack_enabled, experience_multiplier
)
select
  replace(code, '-dummy', '-wooden-doll'),
  replace(name, '허수아비', '목각인형'),
  growth_strength, growth_agility, growth_dexterity, growth_vitality,
  growth_endurance, growth_intelligence, growth_wisdom,
  true,
  experience_multiplier
from public.monster_templates
where code like 'artificial-%-dummy'
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

delete from public.hunt_ground_monsters hgm
using public.monster_templates monster
where hgm.hunt_ground_id = 'wooden-doll'
  and hgm.monster_template_id = monster.id
  and monster.code like 'artificial-%-dummy';

insert into public.hunt_ground_monsters (
  hunt_ground_id, monster_template_id, spawn_min_level, spawn_max_level, spawn_weight, sort_order, is_enabled
)
select 'wooden-doll', monster.id, spawn.relative_level, spawn.relative_level, 3, spawn.sort_order, true
from (values
  ('artificial-strike-wooden-doll'::text, 0, 20),
  ('artificial-might-wooden-doll', 0, 21),
  ('artificial-bolt-wooden-doll', 0, 22),
  ('artificial-knowledge-wooden-doll', 0, 23),
  ('artificial-armor-wooden-doll', 0, 24),
  ('artificial-guard-wooden-doll', 0, 25),
  ('artificial-life-wooden-doll', 0, 26),
  ('artificial-focus-wooden-doll', 0, 27),
  ('artificial-critical-wooden-doll', 0, 28),
  ('artificial-pierce-wooden-doll', 0, 29)
) as spawn(monster_code, relative_level, sort_order)
join public.monster_templates monster on monster.code = spawn.monster_code
where not exists (
  select 1
  from public.hunt_ground_monsters existing
  where existing.hunt_ground_id = 'wooden-doll'
    and existing.monster_template_id = monster.id
);

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'where template.monster_template_id = monster_template.id;' in definition) = 0 then
    raise exception 'hunt_training_dummy_essence_lookup_definition_changed';
  end if;

  definition := replace(
    definition,
    E'where template.monster_template_id = monster_template.id;',
    E'where template.monster_template_id = monster_template.id\n     or (monster_template.code like ''artificial-%-wooden-doll''\n       and template.code = regexp_replace(monster_template.code, ''-wooden-doll$'', ''''));'
  );

  execute definition;
end;
$$;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.roll_hunt_victory_rewards(uuid,uuid,integer,integer)'::regprocedure) into definition;

  if position(E'where monster_template_id = defeated_monster_template_id;' in definition) = 0 then
    raise exception 'roll_hunt_victory_rewards_essence_lookup_definition_changed';
  end if;

  definition := replace(
    definition,
    E'where monster_template_id = defeated_monster_template_id;',
    E'where monster_template_id = defeated_monster_template_id\n  or code = (\n    select regexp_replace(monster.code, ''-wooden-doll$'', '''')\n    from public.monster_templates monster\n    where monster.id = defeated_monster_template_id\n      and monster.code like ''artificial-%-wooden-doll''\n  );'
  );

  execute definition;
end;
$$;
