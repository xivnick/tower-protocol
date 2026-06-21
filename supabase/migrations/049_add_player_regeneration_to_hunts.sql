do $$
declare
  function_definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into function_definition;
  if position(E'  player_defense numeric;\n  monster_regeneration_per_second numeric;' in function_definition) = 0 then
    raise exception 'hunt_training_dummy_definition_changed';
  end if;

  function_definition := replace(function_definition,
    E'  player_defense numeric;\n  monster_regeneration_per_second numeric;',
    E'  player_defense numeric;\n  player_regeneration_per_second numeric;\n  monster_regeneration_per_second numeric;');
  function_definition := replace(function_definition,
    E'  player_defense := target_character.endurance + target_character.wisdom;\n  monster_regeneration_per_second :=',
    E'  player_defense := target_character.endurance + target_character.wisdom;\n  player_regeneration_per_second := player_max_hp * (target_character.endurance::numeric / 10000);\n  monster_regeneration_per_second :=');
  function_definition := replace(function_definition,
    E'    if mod(duration_ticks, 10) = 0 and monster_hp < monster_max_hp then',
    E'    if mod(duration_ticks, 10) = 0 and player_hp < player_max_hp then\n      healed_amount := least(player_regeneration_per_second, player_max_hp - player_hp);\n      player_hp := player_hp + healed_amount;\n      logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''player_regeneration'', ''amount'', healed_amount, ''target_hp'', player_hp, ''target'', ''player''));\n    end if;\n    if mod(duration_ticks, 10) = 0 and monster_hp < monster_max_hp then');
  execute function_definition;
end;
$$;
