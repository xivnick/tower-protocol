update public.hunt_grounds
set recommended_min_level = 1,
    recommended_max_level = 20
where id in ('training-dummy', 'wooden-doll');

do $$
declare
  definition text;
  target_snippet text := E'  if ground_level_mode = ''scaling'' then\n    monster_level := greatest(1, target_character.level + selected_spawn_level);\n  else\n    if selected_spawn_level < 1 then raise exception ''invalid_fixed_hunt_spawn_level''; end if;\n    monster_level := selected_spawn_level;\n  end if;';
begin
  select pg_get_functiondef('public.encounter_hunt_monster()'::regprocedure) into definition;

  if position(target_snippet in definition) = 0 then
    raise exception 'training_ground_level_cap_definition_changed';
  end if;

  definition := replace(
    definition,
    target_snippet,
    E'  if ground_level_mode = ''scaling'' then\n    monster_level := greatest(1, target_character.level + selected_spawn_level);\n    if hunt_state.selected_hunt_ground_id in (''training-dummy'', ''wooden-doll'') then\n      monster_level := least(20, monster_level);\n    end if;\n  else\n    if selected_spawn_level < 1 then raise exception ''invalid_fixed_hunt_spawn_level''; end if;\n    monster_level := selected_spawn_level;\n  end if;'
  );

  execute definition;
end;
$$;
