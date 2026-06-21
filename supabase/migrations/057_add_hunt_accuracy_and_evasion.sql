do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;
  if position(E'  critical_chance numeric;\n  player_max_hp numeric;' in definition) = 0 then raise exception 'hunt_training_dummy_definition_changed'; end if;
  definition := replace(definition, E'  critical_chance numeric;\n  player_max_hp numeric;', E'  critical_chance numeric;\n  player_accuracy numeric;\n  monster_accuracy numeric;\n  player_evasion numeric;\n  monster_evasion numeric;\n  is_hit boolean;\n  player_max_hp numeric;');
  definition := replace(definition, E'  critical_chance := least(target_character.dexterity, 100)::numeric / 100;', E'  critical_chance := least(target_character.dexterity, 100)::numeric / 100;\n  player_accuracy := 100 + target_character.dexterity;\n  monster_accuracy := (monster_stats ->> ''accuracy'')::numeric;\n  player_evasion := target_character.agility;\n  monster_evasion := (monster_stats -> ''primary_stats'' ->> ''agility'')::numeric;');
  definition := replace(definition, E'      is_critical := random() < critical_chance;', E'      is_hit := random() >= monster_evasion / (monster_evasion + player_accuracy);\n      if not is_hit then\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''miss'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy''));\n      else\n      is_critical := random() < critical_chance;');
  definition := replace(definition, E'      end if;\n    end if;\n    if monster_template.basic_attack_enabled then', E'      end if;\n      end if;\n    end if;\n    if monster_template.basic_attack_enabled then');
  definition := replace(definition, E'        raw_damage := (monster_stats ->> ''physical_attack'')::numeric;', E'        is_hit := random() >= player_evasion / (player_evasion + monster_accuracy);\n        if not is_hit then\n          logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''enemy_miss'', ''amount'', 0, ''target_hp'', player_hp, ''target'', ''player''));\n        else\n        raw_damage := (monster_stats ->> ''physical_attack'')::numeric;');
  definition := replace(definition, E'        end if;\n      end if;\n    end if;\n    if mod(duration_ticks, 10) = 0 and player_hp < player_max_hp then', E'        end if;\n        end if;\n      end if;\n    end if;\n    if mod(duration_ticks, 10) = 0 and player_hp < player_max_hp then');
  execute definition;
end;
$$;
