create or replace function public.weapon_stats(weapon_type text, weapon_level integer)
returns jsonb
language plpgsql
stable
as $$
declare
  power integer := 3 + floor(weapon_level * 1.5)::integer;
begin
  if weapon_type = 'longsword' then
    return jsonb_build_object('physical_attack_flat', power);
  elsif weapon_type = 'greatsword' then
    return jsonb_build_object('physical_attack_pct', 2 + floor(weapon_level * 0.1)::integer);
  elsif weapon_type = 'dagger' then
    return jsonb_build_object(
      'accuracy_penalty', 2 + floor(weapon_level * 0.05)::integer,
      'on_hit_physical_attack_pct', 6 + weapon_level * 0.12
    );
  elsif weapon_type = 'bow' then
    return jsonb_build_object(
      'accuracy_penalty', 1 + floor(weapon_level * 0.03)::integer,
      'on_hit_fixed_damage', 2 + floor(weapon_level * 1.1)::integer
    );
  elsif weapon_type = 'wand' then
    return jsonb_build_object('magic_attack_flat', power);
  elsif weapon_type = 'staff' then
    return jsonb_build_object('magic_attack_pct', 2 + floor(weapon_level * 0.1)::integer);
  end if;

  raise exception 'invalid_weapon_type';
end;
$$;
