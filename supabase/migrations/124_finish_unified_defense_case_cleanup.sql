do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position('monster_magic_defense' in definition) = 0 then
    raise exception 'hunt_unified_defense_case_already_cleaned';
  end if;

  definition := replace(
    definition,
    E'case when player_essence_codes[index] = ''vine-hunter-bind'' then monster_magic_defense else monster_defense end',
    'monster_defense'
  );

  execute definition;
end;
$$;
