do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'            enemy_shield := enemy_shield - healed_amount;\n            damage := damage - healed_amount;' in definition) = 0
    or position(E'          player_shield := player_shield - healed_amount;\n          damage := damage - healed_amount;' in definition) = 0 then
    raise exception 'hunt_training_dummy_shield_absorb_definition_changed';
  end if;

  definition := replace(
    definition,
    E'            enemy_shield := enemy_shield - healed_amount;\n            damage := damage - healed_amount;',
    E'            enemy_shield := enemy_shield - healed_amount;\n            damage := damage - healed_amount;\n            logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''shield_absorb'', ''amount'', healed_amount, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy''));'
  );

  definition := replace(
    definition,
    E'          enemy_shield := enemy_shield - healed_amount;\n          damage := damage - healed_amount;',
    E'          enemy_shield := enemy_shield - healed_amount;\n          damage := damage - healed_amount;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''shield_absorb'', ''amount'', healed_amount, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy''));'
  );

  definition := replace(
    definition,
    E'              enemy_shield := enemy_shield - healed_amount;\n              damage := damage - healed_amount;',
    E'              enemy_shield := enemy_shield - healed_amount;\n              damage := damage - healed_amount;\n              logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''shield_absorb'', ''amount'', healed_amount, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy''));'
  );

  definition := replace(
    definition,
    E'          player_shield := player_shield - healed_amount;\n          damage := damage - healed_amount;',
    E'          player_shield := player_shield - healed_amount;\n          damage := damage - healed_amount;\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''shield_absorb'', ''amount'', healed_amount, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player''));'
  );

  definition := replace(
    definition,
    E'            player_shield := player_shield - healed_amount;\n            damage := damage - healed_amount;',
    E'            player_shield := player_shield - healed_amount;\n            damage := damage - healed_amount;\n            logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''shield_absorb'', ''amount'', healed_amount, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player''));'
  );

  definition := replace(
    definition,
    E'              player_shield := player_shield - healed_amount;\n              damage := damage - healed_amount;',
    E'              player_shield := player_shield - healed_amount;\n              damage := damage - healed_amount;\n              logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''shield_absorb'', ''amount'', healed_amount, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player''));'
  );

  execute definition;
end;
$$;
