do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'        if enemy_reflect_pct > 0 and enemy_shield_until >= duration_ticks and enemy_shield > 0 then\n          damage := greatest(1, floor(monster_defense * enemy_reflect_pct / 100)::integer);\n          player_hp := greatest(0, player_hp - damage);\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_reflect'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n        end if;' in definition) = 0
    or position(E'          if coalesce((armor_stats ->> ''reflect_damage_flat'')::integer, 0) > 0 then\n            damage := (armor_stats ->> ''reflect_damage_flat'')::integer;\n            monster_hp := greatest(0, monster_hp - damage);\n            logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''reflect'', ''amount'', damage, ''target_hp'', monster_hp, ''target'', ''enemy''));\n          end if;' in definition) = 0 then
    raise exception 'hunt_training_dummy_reflect_definition_changed';
  end if;

  definition := replace(
    definition,
    E'        if enemy_reflect_pct > 0 and enemy_shield_until >= duration_ticks and enemy_shield > 0 then\n          damage := greatest(1, floor(monster_defense * enemy_reflect_pct / 100)::integer);\n          player_hp := greatest(0, player_hp - damage);\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_reflect'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n        end if;',
    E'        if enemy_reflect_pct > 0 and enemy_shield_until >= duration_ticks and enemy_shield > 0 then\n          damage := greatest(1, floor(monster_defense * enemy_reflect_pct / 100)::integer);\n          if player_shield_until >= duration_ticks and player_shield > 0 then\n            healed_amount := least(player_shield, damage);\n            player_shield := player_shield - healed_amount;\n            damage := damage - healed_amount;\n          end if;\n          player_hp := greatest(0, player_hp - damage);\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''essence_reflect'', ''amount'', damage, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''enemy'', ''name'', enemy_essence_name, ''grade'', enemy_essence_grade));\n        end if;'
  );

  definition := replace(
    definition,
    E'          if coalesce((armor_stats ->> ''reflect_damage_flat'')::integer, 0) > 0 then\n            damage := (armor_stats ->> ''reflect_damage_flat'')::integer;\n            monster_hp := greatest(0, monster_hp - damage);\n            logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''reflect'', ''amount'', damage, ''target_hp'', monster_hp, ''target'', ''enemy''));\n          end if;',
    E'          if coalesce((armor_stats ->> ''reflect_damage_flat'')::integer, 0) > 0 then\n            damage := (armor_stats ->> ''reflect_damage_flat'')::integer;\n            if enemy_shield_until >= duration_ticks and enemy_shield > 0 then\n              healed_amount := least(enemy_shield, damage);\n              enemy_shield := enemy_shield - healed_amount;\n              damage := damage - healed_amount;\n            end if;\n            monster_hp := greatest(0, monster_hp - damage);\n            logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''reflect'', ''amount'', damage, ''target_hp'', monster_hp, ''target'', ''enemy''));\n          end if;'
  );

  execute definition;
end;
$$;
