update public.monster_templates
set growth_vitality = 2,
    growth_endurance = 2,
    growth_intelligence = 0,
    growth_wisdom = 1
where code = 'moss-slime';

update public.monster_templates
set growth_dexterity = 6,
    growth_intelligence = 0
where code = 'bigeye-bat';
