-- Damage now reaches apply_hunt_damage below each damage calculation. Disable
-- the old inline shield subtraction so it cannot consume a shield before the
-- common route records the absorption and applies the remaining HP damage.
do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'if enemy_shield_until >= duration_ticks and enemy_shield > 0 then' in definition) = 0
    or position(E'if player_shield_until >= duration_ticks and player_shield > 0 then' in definition) = 0
    or position(E'public.apply_hunt_damage(player_hp, player_shield, player_shield_until, duration_ticks, damage)' in definition) = 0 then
    raise exception 'hunt_legacy_shield_definition_changed';
  end if;

  definition := replace(
    definition,
    E'if enemy_shield_until >= duration_ticks and enemy_shield > 0 then',
    E'if false then -- handled by apply_hunt_damage'
  );
  definition := replace(
    definition,
    E'if player_shield_until >= duration_ticks and player_shield > 0 then',
    E'if false then -- handled by apply_hunt_damage'
  );

  execute definition;
end;
$$;
