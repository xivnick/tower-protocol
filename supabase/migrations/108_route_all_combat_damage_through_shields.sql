-- Resolve every damage source through the same HP/shield boundary. Callers keep
-- ownership of effect-specific follow-up logic, while this function owns shield
-- absorption and the final HP damage.
create or replace function public.apply_hunt_damage(
  target_hp numeric,
  target_shield numeric,
  target_shield_until integer,
  current_tick integer,
  incoming_damage integer
)
returns jsonb
language plpgsql
immutable
as $$
declare
  absorbed numeric := 0;
  remaining_damage integer := greatest(0, incoming_damage);
  remaining_shield numeric := greatest(0, target_shield);
begin
  if target_shield_until >= current_tick and remaining_shield > 0 and remaining_damage > 0 then
    absorbed := least(remaining_shield, remaining_damage);
    remaining_shield := remaining_shield - absorbed;
    remaining_damage := remaining_damage - absorbed;
  end if;

  return jsonb_build_object(
    'hp', greatest(0, target_hp - remaining_damage),
    'shield', remaining_shield,
    'absorbed', absorbed,
    'health_damage', remaining_damage,
    'shield_broken', target_shield_until >= current_tick and target_shield > 0 and remaining_shield = 0 and absorbed > 0
  );
end;
$$;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'  player_bleed_damage numeric := 0;\n  player_used_essence_action boolean := false;' in definition) = 0
    or position(E'        monster_hp := greatest(0, monster_hp - damage);' in definition) = 0
    or position(E'          player_hp := greatest(0, player_hp - damage);' in definition) = 0 then
    raise exception 'hunt_damage_routing_definition_changed';
  end if;

  definition := replace(
    definition,
    E'  player_bleed_damage numeric := 0;\n  player_used_essence_action boolean := false;',
    E'  player_bleed_damage numeric := 0;\n  damage_result jsonb;\n  player_used_essence_action boolean := false;'
  );

  definition := replace(
    definition,
    E'monster_hp := greatest(0, monster_hp - damage);',
    E'damage_result := public.apply_hunt_damage(monster_hp, enemy_shield, enemy_shield_until, duration_ticks, damage);\n        monster_hp := (damage_result ->> ''hp'')::numeric;\n        enemy_shield := (damage_result ->> ''shield'')::numeric;\n        healed_amount := (damage_result ->> ''absorbed'')::numeric;\n        damage := (damage_result ->> ''health_damage'')::integer;\n        if healed_amount > 0 then logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''shield_absorb'', ''amount'', healed_amount, ''target_hp'', monster_hp, ''target'', ''enemy'', ''source'', ''enemy'')); end if;'
  );

  definition := replace(
    definition,
    E'player_hp := greatest(0, player_hp - damage);',
    E'damage_result := public.apply_hunt_damage(player_hp, player_shield, player_shield_until, duration_ticks, damage);\n        player_hp := (damage_result ->> ''hp'')::numeric;\n        player_shield := (damage_result ->> ''shield'')::numeric;\n        healed_amount := (damage_result ->> ''absorbed'')::numeric;\n        damage := (damage_result ->> ''health_damage'')::integer;\n        if healed_amount > 0 then logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''shield_absorb'', ''amount'', healed_amount, ''target_hp'', player_hp, ''target'', ''player'', ''source'', ''player'')); end if;'
  );

  execute definition;
end;
$$;
