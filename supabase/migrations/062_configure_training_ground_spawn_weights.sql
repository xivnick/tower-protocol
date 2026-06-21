update public.hunt_ground_monsters
set spawn_min_level = 0, spawn_max_level = 0, spawn_weight = 50
where hunt_ground_id in ('training-dummy', 'wooden-doll');

insert into public.hunt_ground_monsters (hunt_ground_id, monster_template_id, spawn_min_level, spawn_max_level, spawn_weight, sort_order)
select ground.id, monster.id, spawn.relative_level, spawn.relative_level, spawn.weight, spawn.sort_order
from (
  values
    ('training-dummy'::text, 'training-dummy'::text),
    ('wooden-doll'::text, 'wooden-doll'::text)
) as ground(id, monster_code)
join public.monster_templates monster on monster.code = ground.monster_code
cross join (
  values
    (-1, 20, 2),
    (1, 20, 3),
    (5, 10, 4)
) as spawn(relative_level, weight, sort_order);
