do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;
  if position(E'''enemy'', jsonb_build_object(''name'', monster_template.name, ''level'', level_before, ''max_hp'', monster_max_hp),' in definition) = 0 then
    raise exception 'hunt_training_dummy_definition_changed';
  end if;
  definition := replace(definition,
    E'''enemy'', jsonb_build_object(''name'', monster_template.name, ''level'', level_before, ''max_hp'', monster_max_hp),',
    E'''enemy'', jsonb_build_object(''name'', monster_template.name, ''level'', level_before, ''max_hp'', monster_max_hp, ''combat_stats'', monster_stats),');
  execute definition;
end;
$$;
