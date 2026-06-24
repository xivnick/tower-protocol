create or replace function public.armor_stats(armor_type text, armor_variant text, armor_level integer)
returns jsonb
language plpgsql
immutable
as $$
declare
  flat integer := 2 + floor(armor_level * 1.2)::integer;
  percent_bonus numeric := floor((5 + armor_level * 0.2) * 10) / 10;
  cooldown_flat integer := 1 + floor(armor_level * 0.35)::integer;
begin
  if armor_type = 'plate' and armor_variant = 'plate_reflect' then
    return jsonb_build_object('physical_defense_pct', percent_bonus, 'reflect_damage_flat', 2 + floor(armor_level * 0.7)::integer);
  elsif armor_type = 'plate' and armor_variant = 'plate_damage_reduction' then
    return jsonb_build_object('physical_defense_pct', percent_bonus, 'damage_taken_reduction_pct', floor((3 + armor_level * 0.08) * 10) / 10);
  elsif armor_type = 'leather' and armor_variant = 'leather_evasion_flat' then
    return jsonb_build_object('physical_defense_flat', flat, 'evasion_flat', flat);
  elsif armor_type = 'leather' and armor_variant = 'leather_evasion_pct' then
    return jsonb_build_object('physical_defense_flat', flat, 'evasion_pct', percent_bonus);
  elsif armor_type = 'robe' and armor_variant = 'robe_magic_defense_flat_cooldown_flat' then
    return jsonb_build_object('magic_defense_flat', flat, 'cooldown_flat', cooldown_flat);
  elsif armor_type = 'robe' and armor_variant = 'robe_magic_defense_flat_cooldown_pct' then
    return jsonb_build_object('magic_defense_flat', flat, 'cooldown_pct', percent_bonus);
  elsif armor_type = 'robe' and armor_variant = 'robe_magic_defense_pct_cooldown_flat' then
    return jsonb_build_object('magic_defense_pct', percent_bonus, 'cooldown_flat', cooldown_flat);
  elsif armor_type = 'robe' and armor_variant = 'robe_magic_defense_pct_cooldown_pct' then
    return jsonb_build_object('magic_defense_pct', percent_bonus, 'cooldown_pct', percent_bonus);
  end if;
  raise exception 'invalid_armor_variant';
end;
$$;
