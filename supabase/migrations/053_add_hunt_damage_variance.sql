do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;
  if position(E'  damage integer;\n  raw_damage numeric;' in definition) = 0 then raise exception 'hunt_training_dummy_definition_changed'; end if;
  definition := replace(definition, E'  damage integer;\n  raw_damage numeric;', E'  damage integer;\n  damage_variance integer;\n  raw_damage numeric;');
  definition := replace(definition,
    E'      damage := greatest(1, floor(raw_damage * (100 / (100 + monster_defense)))::integer);',
    E'      damage_variance := floor(random() * 11)::integer - 5;\n      damage := greatest(1, floor(raw_damage * (100 / (100 + monster_defense)) * (100 + damage_variance) / 100)::integer);');
  definition := replace(definition,
    E'        damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)))::integer);',
    E'        damage_variance := floor(random() * 11)::integer - 5;\n        damage := greatest(1, floor(raw_damage * (100 / (100 + player_defense)) * (100 + damage_variance) / 100)::integer);');
  execute definition;
end;
$$;
