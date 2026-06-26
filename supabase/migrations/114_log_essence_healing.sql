do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'          player_hp := player_hp + greatest(0, healed_amount);\n          if player_essence_codes[index] = ''green-viper-fang'' then' in definition) = 0
    or position(E'        monster_hp := monster_hp + greatest(0, healed_amount);\n        if enemy_essence_code = ''green-viper-fang'' then' in definition) = 0 then
    raise exception 'hunt_essence_heal_log_definition_changed';
  end if;

  definition := replace(
    definition,
    E'          player_hp := player_hp + greatest(0, healed_amount);\n          if player_essence_codes[index] = ''green-viper-fang'' then',
    E'          player_hp := player_hp + greatest(0, healed_amount);\n          if healed_amount > 0 then logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_heal'', ''amount'', healed_amount, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index])); end if;\n          if player_essence_codes[index] = ''green-viper-fang'' then'
  );
  definition := replace(
    definition,
    E'        monster_hp := monster_hp + greatest(0, healed_amount);\n        if enemy_essence_code = ''green-viper-fang'' then',
    E'        monster_hp := monster_hp + greatest(0, healed_amount);\n        if healed_amount > 0 then logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_heal'', ''amount'', healed_amount, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade)); end if;\n        if enemy_essence_code = ''green-viper-fang'' then'
  );

  execute definition;
end;
$$;
