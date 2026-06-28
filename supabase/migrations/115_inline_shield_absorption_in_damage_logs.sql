do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  damage_result jsonb;\n  player_used_essence_action boolean := false;' in definition) = 0
    or position(E'''kind'', ''shield_absorb''' in definition) = 0
    or position(E'''amount'', damage, ''target_hp''' in definition) = 0 then
    raise exception 'hunt_inline_shield_log_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  damage_result jsonb;\n  player_used_essence_action boolean := false;',
    E'  damage_result jsonb;\n  shield_absorbed numeric := 0;\n  player_used_essence_action boolean := false;'
  );
  definition := replace(
    definition,
    E'healed_amount := (damage_result ->> ''absorbed'')::numeric;',
    E'shield_absorbed := (damage_result ->> ''absorbed'')::numeric;\n        healed_amount := shield_absorbed;'
  );
  definition := replace(
    definition,
    E'''amount'', damage, ''target_hp'',',
    E'''amount'', damage, ''shield_absorbed'', shield_absorbed, ''target_hp'', '
  );
  definition := regexp_replace(
    definition,
    E'[[:space:]]*if healed_amount > 0 then logs := logs \\|\\| jsonb_build_array\\(jsonb_build_object\\([^;]*''kind'', ''shield_absorb''[^;]*\\)\\); end if;',
    '',
    'g'
  );

  if position(E'''kind'', ''shield_absorb''' in definition) > 0 then
    raise exception 'hunt_shield_absorb_log_cleanup_failed';
  end if;

  execute definition;
end;
$$;
