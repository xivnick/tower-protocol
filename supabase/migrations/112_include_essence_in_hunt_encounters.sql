do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.encounter_hunt_monster()'::regprocedure) into definition;

  if position(E'''enemy'', jsonb_build_object(''name'', monster_template.name, ''level'', monster_level, ''max_hp'', (monster_stats ->> ''max_hp'')::numeric, ''combat_stats'', monster_stats),' in definition) = 0 then
    raise exception 'encounter_essence_definition_changed';
  end if;

  definition := replace(
    definition,
    E'''enemy'', jsonb_build_object(''name'', monster_template.name, ''level'', monster_level, ''max_hp'', (monster_stats ->> ''max_hp'')::numeric, ''combat_stats'', monster_stats),',
    E'''enemy'', jsonb_build_object(''name'', monster_template.name, ''level'', monster_level, ''max_hp'', (monster_stats ->> ''max_hp'')::numeric, ''combat_stats'', monster_stats, ''essence'', (select jsonb_build_object(''code'', template.code, ''name'', template.name, ''grade'', 2) from public.essence_templates template where template.monster_template_id = monster_template.id)), '
  );

  execute definition;
end;
$$;
