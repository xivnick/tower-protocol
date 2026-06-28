update public.hunt_grounds
set recommended_min_level = case id
    when 'hunt01' then 11
    when 'hunt02' then 16
    when 'hunt03' then 21
    when 'hunt04' then 26
    else recommended_min_level
  end,
  recommended_max_level = case id
    when 'hunt01' then 15
    when 'hunt02' then 20
    when 'hunt03' then 25
    when 'hunt04' then 30
    else recommended_max_level
  end
where id in ('hunt01', 'hunt02', 'hunt03', 'hunt04');

update public.hunt_ground_monsters
set spawn_min_level = case hunt_ground_id
    when 'hunt01' then 10
    when 'hunt02' then 15
    when 'hunt03' then 20
    when 'hunt04' then 25
    else spawn_min_level
  end,
  spawn_max_level = case hunt_ground_id
    when 'hunt01' then 14
    when 'hunt02' then 19
    when 'hunt03' then 24
    when 'hunt04' then 29
    else spawn_max_level
  end
where hunt_ground_id in ('hunt01', 'hunt02', 'hunt03', 'hunt04');
