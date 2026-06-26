do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'''name'', ''초록 독사의 독니'', ''grade'', 1' in definition) = 0
    or position(E'''name'', ''초록 독사의 독니'', ''grade'', enemy_essence_grade' in definition) = 0 then
    raise exception 'hunt_poison_log_definition_changed';
  end if;

  definition := regexp_replace(
    definition,
    E'(''kind'', )''essence_damage''([^;]*''name'', ''초록 독사의 독니'')',
    E'\\1''essence_dot''\\2',
    'g'
  );

  if position(E'''kind'', ''essence_dot''' in definition) = 0 then
    raise exception 'hunt_poison_log_update_failed';
  end if;

  execute definition;
end;
$$;
