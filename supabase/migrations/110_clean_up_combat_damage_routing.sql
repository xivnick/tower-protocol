create or replace function public.apply_hunt_damage(
  target_hp numeric,
  target_shield numeric,
  target_shield_until integer,
  current_tick integer,
  incoming_damage integer
)
returns jsonb
language plpgsql
stable
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
    'incoming_damage', greatest(0, incoming_damage),
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

  if position(E'if false then -- handled by apply_hunt_damage' in definition) = 0
    or position(E'if not is_hit then\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''miss''' in definition) = 0
    or position(E'  enemy_counter_empower_pct numeric := 0;' in definition) = 0 then
    raise exception 'hunt_damage_cleanup_definition_changed';
  end if;

  definition := regexp_replace(
    definition,
    E'[[:space:]]*if false then -- handled by apply_hunt_damage[[:space:]]+healed_amount := least\\((enemy|player)_shield, damage\\);[[:space:]]+\\1_shield := \\1_shield - healed_amount;[[:space:]]+damage := damage - healed_amount;[[:space:]]+logs := logs \\|\\| jsonb_build_array\\(jsonb_build_object\\([^;]*\\);[[:space:]]+end if;',
    '',
    'g'
  );

  if position(E'if false then -- handled by apply_hunt_damage' in definition) > 0 then
    raise exception 'hunt_legacy_shield_cleanup_failed';
  end if;

  definition := replace(
    definition,
    E'      if not is_hit then\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''miss'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy''));',
    E'      if not is_hit then\n        if enemy_counter_empower_pct > 0 then enemy_empower_pct := enemy_counter_empower_pct; end if;\n        logs := logs || jsonb_build_array(jsonb_build_object(''time_tenths'', duration_ticks, ''kind'', ''miss'', ''amount'', 0, ''target_hp'', monster_hp, ''target'', ''enemy''));'
  );

  execute definition;
end;
$$;
