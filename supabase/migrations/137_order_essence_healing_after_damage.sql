do $$
declare
  definition text;
  player_early_heal text := E'\n          if healed_amount > 0 then logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_heal'', ''amount'', healed_amount, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index])); end if;';
  enemy_early_heal text := E'\n        if healed_amount > 0 then logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_heal'', ''amount'', healed_amount, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade)); end if;';
  player_damage_log_tail text := E'''name'', player_essence_names[index], ''grade'', player_essence_grades[index]));\n        elsif player_essence_codes[index] = ''redthorn-beast-spines'' then';
  enemy_damage_log_tail text := E'''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n      elsif enemy_essence_code = ''redthorn-beast-spines'' then';
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(player_early_heal in definition) = 0
    or position(enemy_early_heal in definition) = 0
    or position(player_damage_log_tail in definition) = 0
    or position(enemy_damage_log_tail in definition) = 0 then
    raise exception 'essence_heal_order_definition_changed';
  end if;

  definition := replace(definition, player_early_heal, '');
  definition := replace(definition, enemy_early_heal, '');

  definition := replace(
    definition,
    player_damage_log_tail,
    E'''name'', player_essence_names[index], ''grade'', player_essence_grades[index]));\n          if healed_amount > 0 then logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_heal'', ''amount'', healed_amount, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'', ''name'', player_essence_names[index], ''grade'', player_essence_grades[index])); end if;\n        elsif player_essence_codes[index] = ''redthorn-beast-spines'' then'
  );

  definition := replace(
    definition,
    enemy_damage_log_tail,
    E'''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n        if healed_amount > 0 then logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_heal'', ''amount'', healed_amount, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade)); end if;\n      elsif enemy_essence_code = ''redthorn-beast-spines'' then'
  );

  execute definition;
end;
$$;
