update public.monster_templates as monster
set growth_strength = growth.strength,
    growth_agility = growth.agility,
    growth_dexterity = growth.dexterity,
    growth_vitality = growth.vitality,
    growth_endurance = growth.endurance,
    growth_intelligence = growth.intelligence,
    growth_wisdom = growth.wisdom
from (values
  -- 1F: basic roles
  ('angry-boar', 1, 0, 0, 1, 0, 0, 0),
  ('forest-wolf', 1, 1, 0, 0, 0, 0, 0),
  ('firefly-spirit', 0, 1, 0, 1, 0, 1, 0),
  ('stone-beetle', 0, 0, 0, 1, 1, 0, 0),

  -- 2F: essence-backed roles
  ('forest-warden-stag', 1, 0, 0, 1, 0, 0, 0),
  ('green-viper', 1, 1, 0, 0, 0, 1, 0),
  ('vine-hunter', 0, 0, 0, 1, 0, 1, 0),
  ('moss-slime', 0, 0, 0, 1, 1, 0, 0),

  -- 3F: physical pressure with simpler stat lanes
  ('leafshade-panther', 1, 1, 0, 0, 0, 0, 0),
  ('redthorn-beast', 1, 0, 0, 1, 1, 0, 0),
  ('blackneedle-bat', 1, 1, 0, 1, 0, 0, 0),
  ('bigeye-bat', 1, 1, 0, 1, 0, 0, 0),

  -- 4F: late cave variants
  ('blade-beetle', 1, 0, 0, 1, 0, 0, 0),
  ('crystal-lizard', 0, 0, 0, 1, 0, 1, 1),
  ('crystaljaw-centipede', 1, 0, 0, 1, 0, 0, 0),
  ('cave-vampire-bat', 1, 1, 0, 1, 0, 0, 0)
) as growth(code, strength, agility, dexterity, vitality, endurance, intelligence, wisdom)
where monster.code = growth.code;
