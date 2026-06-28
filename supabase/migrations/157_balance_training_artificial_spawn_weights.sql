delete from public.hunt_ground_monsters hgm
using public.monster_templates monster
where hgm.monster_template_id = monster.id
  and (
    (hgm.hunt_ground_id = 'training-dummy' and monster.code = 'training-dummy' and hgm.sort_order <> 0)
    or (hgm.hunt_ground_id = 'wooden-doll' and monster.code = 'wooden-doll' and hgm.sort_order <> 0)
  );

update public.hunt_ground_monsters hgm
set spawn_weight = 50,
    sort_order = 0,
    is_enabled = true
from public.monster_templates monster
where hgm.monster_template_id = monster.id
  and (
    (hgm.hunt_ground_id = 'training-dummy' and monster.code = 'training-dummy')
    or (hgm.hunt_ground_id = 'wooden-doll' and monster.code = 'wooden-doll')
  );

update public.hunt_ground_monsters hgm
set spawn_weight = 5,
    is_enabled = true
from public.monster_templates monster
where hgm.monster_template_id = monster.id
  and (
    (hgm.hunt_ground_id = 'training-dummy' and monster.code like 'artificial-%-dummy')
    or (hgm.hunt_ground_id = 'wooden-doll' and monster.code like 'artificial-%-wooden-doll')
  );
