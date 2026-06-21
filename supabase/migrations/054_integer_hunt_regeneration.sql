create or replace function public.hunt_player_hp(recovery_start_hp numeric, recovery_max_hp numeric, recovery_started_at timestamptz, recovery_ends_at timestamptz, fallback_max_hp numeric, at_time timestamptz default clock_timestamp())
returns numeric language sql stable as $$
  select case
    when recovery_started_at is null or recovery_ends_at is null or recovery_max_hp is null then fallback_max_hp
    when at_time >= recovery_ends_at then recovery_max_hp
    when at_time <= recovery_started_at then coalesce(recovery_start_hp, fallback_max_hp)
    when extract(epoch from recovery_ends_at - recovery_started_at) >= 10 then least(recovery_max_hp, floor(coalesce(recovery_start_hp, fallback_max_hp) + (recovery_max_hp - coalesce(recovery_start_hp, fallback_max_hp)) * floor(extract(epoch from at_time - recovery_started_at)) / extract(epoch from recovery_ends_at - recovery_started_at)))
    else least(recovery_max_hp, floor(coalesce(recovery_start_hp, fallback_max_hp) + recovery_max_hp * 0.2 * floor(extract(epoch from at_time - recovery_started_at))))
  end;
$$;

do $$
declare definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;
  if position(E'  player_regeneration_per_second numeric;\n  monster_regeneration_per_second numeric;' in definition) = 0 then raise exception 'hunt_training_dummy_definition_changed'; end if;
  definition := replace(definition, E'  player_regeneration_per_second numeric;\n  monster_regeneration_per_second numeric;', E'  player_regeneration_per_second numeric;\n  player_regeneration_carry numeric := 0;\n  monster_regeneration_per_second numeric;\n  monster_regeneration_carry numeric := 0;');
  definition := replace(definition,
    E'      healed_amount := least(player_regeneration_per_second, player_max_hp - player_hp);\n      player_hp := player_hp + healed_amount;',
    E'      player_regeneration_carry := player_regeneration_carry + player_regeneration_per_second;\n      healed_amount := least(floor(player_regeneration_carry), player_max_hp - player_hp);\n      player_regeneration_carry := player_regeneration_carry - healed_amount;\n      player_hp := player_hp + healed_amount;');
  definition := replace(definition,
    E'      healed_amount := least(monster_regeneration_per_second, monster_max_hp - monster_hp);\n      monster_hp := monster_hp + healed_amount;',
    E'      monster_regeneration_carry := monster_regeneration_carry + monster_regeneration_per_second;\n      healed_amount := least(floor(monster_regeneration_carry), monster_max_hp - monster_hp);\n      monster_regeneration_carry := monster_regeneration_carry - healed_amount;\n      monster_hp := monster_hp + healed_amount;');
  execute definition;
end;
$$;
