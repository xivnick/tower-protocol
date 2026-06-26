update public.monster_templates
set stat_points_per_level = 7
where code = any (array[
  'angry-boar', 'forest-wolf', 'firefly-spirit', 'stone-beetle',
  'forest-warden-stag', 'green-viper', 'vine-hunter', 'moss-slime',
  'leafshade-panther', 'redthorn-beast', 'blackneedle-bat', 'bigeye-bat',
  'blade-beetle', 'crystal-lizard', 'crystaljaw-centipede', 'cave-vampire-bat'
]);
