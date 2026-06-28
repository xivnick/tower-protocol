update public.monster_templates
set basic_attack_enabled = false
where name like '%허수아비%'
  and basic_attack_enabled is true;
