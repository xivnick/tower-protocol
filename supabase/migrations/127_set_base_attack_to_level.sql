create or replace function public.combat_base_attack(target_level integer)
returns integer
language sql
immutable
as $$
  select greatest(0, target_level);
$$;

create or replace function public.weapon_stats(weapon_type text, weapon_level integer)
returns jsonb
language plpgsql
stable
as $$
declare
  power integer := 3 + floor(weapon_level * 1.5)::integer;
  percent_bonus numeric := floor((15 + weapon_level * 0.4) * 10) / 10;
  bow_accuracy_penalty integer := least(35, 12 + floor((weapon_level - 1) / 4)::integer);
  bow_required_dexterity integer := ceiling(100 / (1 - bow_accuracy_penalty::numeric / 100) - 100)::integer;
  bow_fixed_damage integer := floor(power * 0.65 + bow_required_dexterity * 0.5)::integer;
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
      'accuracy_penalty_pct', bow_accuracy_penalty,
      'on_hit_fixed_damage', bow_fixed_damage
    );
  elsif weapon_type = 'wand' then
    return jsonb_build_object('magic_attack_flat', power);
  elsif weapon_type = 'staff' then
    return jsonb_build_object('magic_attack_pct', percent_bonus);
  end if;

  raise exception 'invalid_weapon_type';
end;
$$;
