do $$
declare
  definition text;
  stale_reference_count integer;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  stale_reference_count := (
    length(definition) - length(replace(definition, 'monster_magic_defense', ''))
  ) / length('monster_magic_defense');

  if stale_reference_count <> 1 then
    raise exception 'hunt_training_dummy_unified_defense_reference_unexpected';
  end if;

  definition := replace(definition, 'monster_magic_defense', 'monster_defense');
  execute definition;
end;
$$;
