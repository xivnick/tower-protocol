do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'''kind'', ''shield_absorb'', ''amount'', healed_amount, ''target_hp'', monster_hp' in definition) = 0
    or position(E'''kind'', ''shield_absorb'', ''amount'', healed_amount, ''target_hp'', player_hp' in definition) = 0 then
    raise exception 'hunt_shield_log_definition_changed';
  end if;

  definition := replace(
    definition,
    E'''kind'', ''shield_absorb'', ''amount'', healed_amount, ''target_hp'', monster_hp',
    E'''kind'', ''shield_absorb'', ''amount'', healed_amount, ''shield_remaining'', enemy_shield, ''target_hp'', monster_hp'
  );
  definition := replace(
    definition,
    E'''kind'', ''shield_absorb'', ''amount'', healed_amount, ''target_hp'', player_hp',
    E'''kind'', ''shield_absorb'', ''amount'', healed_amount, ''shield_remaining'', player_shield, ''target_hp'', player_hp'
  );

  execute definition;
end;
$$;
