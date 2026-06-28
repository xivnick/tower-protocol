insert into public.hunt_grounds (id, name, recommended_min_level, recommended_max_level, sort_order, level_mode)
values
  ('hunt02', '초록 숲길 후반', 16, 21, 20, 'fixed'),
  ('hunt03', '그늘 동굴 전반', 22, 27, 30, 'fixed'),
  ('hunt04', '그늘 동굴 후반', 28, 33, 40, 'fixed')
on conflict (id) do update
set name = excluded.name,
    recommended_min_level = excluded.recommended_min_level,
    recommended_max_level = excluded.recommended_max_level,
    sort_order = excluded.sort_order,
    level_mode = excluded.level_mode,
    is_enabled = true;

insert into public.monster_templates (
  code, name, growth_strength, growth_agility, growth_dexterity, growth_vitality,
  growth_endurance, growth_intelligence, growth_wisdom, basic_attack_enabled, experience_multiplier
)
values
  ('forest-warden-stag', '숲지기 큰사슴', 3, 2, 1, 2, 1, 0, 1, true, 1.05),
  ('green-viper', '초록 독사', 2, 3, 2, 0, 0, 3, 2, true, 1.05),
  ('vine-hunter', '덩굴 사냥꾼', 0, 1, 2, 2, 1, 4, 1, true, 1.05),
  ('moss-slime', '이끼 슬라임', 0, 0, 0, 4, 4, 1, 1, true, 1.05),
  ('leafshade-panther', '잎그늘 표범', 3, 5, 3, 1, 0, 0, 0, true, 1.10),
  ('redthorn-beast', '붉은가시 맹수', 4, 1, 1, 3, 2, 0, 0, true, 1.10),
  ('blackneedle-bat', '검은침 박쥐', 3, 4, 3, 1, 0, 0, 1, true, 1.10),
  ('bigeye-bat', '큰눈 박쥐', 1, 4, 5, 1, 0, 1, 1, true, 1.10),
  ('blade-beetle', '칼날 딱정벌레', 4, 2, 3, 2, 1, 0, 0, true, 1.15),
  ('crystal-lizard', '수정 도마뱀', 1, 2, 2, 2, 1, 4, 3, true, 1.15),
  ('crystaljaw-centipede', '수정턱 지네', 5, 2, 2, 2, 1, 0, 0, true, 1.15),
  ('cave-vampire-bat', '흡혈 동굴박쥐', 4, 4, 2, 2, 0, 0, 1, true, 1.15)
on conflict (code) do update
set name = excluded.name,
    growth_strength = excluded.growth_strength,
    growth_agility = excluded.growth_agility,
    growth_dexterity = excluded.growth_dexterity,
    growth_vitality = excluded.growth_vitality,
    growth_endurance = excluded.growth_endurance,
    growth_intelligence = excluded.growth_intelligence,
    growth_wisdom = excluded.growth_wisdom,
    basic_attack_enabled = excluded.basic_attack_enabled,
    experience_multiplier = excluded.experience_multiplier;

insert into public.hunt_ground_monsters (
  hunt_ground_id, monster_template_id, spawn_min_level, spawn_max_level, spawn_weight, sort_order, is_enabled
)
select spawn.hunt_ground_id, monster.id, spawn.min_level, spawn.max_level, 25, spawn.sort_order, true
from (values
  ('hunt02'::text, 'forest-warden-stag'::text, 16, 21, 1),
  ('hunt02', 'green-viper', 16, 21, 2),
  ('hunt02', 'vine-hunter', 16, 21, 3),
  ('hunt02', 'moss-slime', 16, 21, 4),
  ('hunt03', 'leafshade-panther', 22, 27, 1),
  ('hunt03', 'redthorn-beast', 22, 27, 2),
  ('hunt03', 'blackneedle-bat', 22, 27, 3),
  ('hunt03', 'bigeye-bat', 22, 27, 4),
  ('hunt04', 'blade-beetle', 28, 33, 1),
  ('hunt04', 'crystal-lizard', 28, 33, 2),
  ('hunt04', 'crystaljaw-centipede', 28, 33, 3),
  ('hunt04', 'cave-vampire-bat', 28, 33, 4)
) as spawn(hunt_ground_id, monster_code, min_level, max_level, sort_order)
join public.monster_templates monster on monster.code = spawn.monster_code
where not exists (
  select 1 from public.hunt_ground_monsters existing
  where existing.hunt_ground_id = spawn.hunt_ground_id and existing.monster_template_id = monster.id
);

insert into public.essence_templates (code, name, monster_template_id)
select essence.code, essence.name, monster.id
from (values
  ('forest-warden-stag-charge'::text, '숲지기 큰사슴의 돌진', 'forest-warden-stag'::text),
  ('green-viper-fang', '초록 독사의 독니', 'green-viper'),
  ('vine-hunter-bind', '덩굴 사냥꾼의 속박', 'vine-hunter'),
  ('moss-slime-regeneration', '이끼 슬라임의 재생', 'moss-slime'),
  ('leafshade-panther-counter', '잎그늘 표범의 그림자 반격', 'leafshade-panther'),
  ('redthorn-beast-spines', '붉은가시 맹수의 역린', 'redthorn-beast'),
  ('blackneedle-bat-leech', '검은침 박쥐의 흡혈', 'blackneedle-bat'),
  ('bigeye-bat-night-sight', '큰눈 박쥐의 야간시야', 'bigeye-bat'),
  ('blade-beetle-edge', '칼날 딱정벌레의 날붙이', 'blade-beetle'),
  ('crystal-lizard-refraction', '수정 도마뱀의 굴절비늘', 'crystal-lizard'),
  ('crystaljaw-centipede-crush', '수정턱 지네의 파쇄턱', 'crystaljaw-centipede'),
  ('cave-vampire-bat-bloodcry', '흡혈 동굴박쥐의 피울음', 'cave-vampire-bat')
) as essence(code, name, monster_code)
join public.monster_templates monster on monster.code = essence.monster_code
on conflict (code) do update
set name = excluded.name,
    monster_template_id = excluded.monster_template_id;
