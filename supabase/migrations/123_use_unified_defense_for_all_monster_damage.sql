do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position('monster_magic_defense' in definition) = 0 then
    raise exception 'hunt_unified_defense_definition_changed';
  end if;

  definition := replace(definition, E'  monster_magic_defense numeric;\n', '');
  definition := replace(definition, E'  monster_magic_defense := (monster_stats ->> ''magic_defense'')::numeric;\n', '');
  definition := replace(definition, '100 + monster_magic_defense', '100 + monster_defense');

  execute definition;
end;
$$;
