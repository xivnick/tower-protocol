create or replace function public.weapon_stats(weapon_type text, weapon_level integer)
returns jsonb
language plpgsql
stable
as $$
declare
  power integer := 3 + floor(weapon_level * 1.5)::integer;
  percent_bonus numeric := floor((20 + weapon_level * 0.5) * 10) / 10;
begin
  if weapon_type = 'longsword' then
    return jsonb_build_object('physical_attack_flat', power);
  elsif weapon_type = 'greatsword' then
    return jsonb_build_object('physical_attack_pct', percent_bonus);
  elsif weapon_type = 'dagger' then
    return jsonb_build_object(
      'accuracy_penalty_pct', least(23, 15 + floor((weapon_level - 1) / 12)::integer),
      'attack_speed_pct', 20 + floor(weapon_level * 0.2)::integer
    );
  elsif weapon_type = 'bow' then
    return jsonb_build_object(
      'accuracy_penalty_pct', least(18, 10 + floor((weapon_level - 1) / 12)::integer),
      'on_hit_fixed_damage', 2 + floor(weapon_level * 1.1)::integer
    );
  elsif weapon_type = 'wand' then
    return jsonb_build_object('magic_attack_flat', power);
  elsif weapon_type = 'staff' then
    return jsonb_build_object('magic_attack_pct', percent_bonus);
  end if;

  raise exception 'invalid_weapon_type';
end;
$$;
