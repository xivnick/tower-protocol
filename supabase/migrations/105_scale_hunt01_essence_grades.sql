create or replace function public.essence_cooldown_tenths(essence_code text, essence_grade integer)
returns integer
language sql
immutable
as $$
  select case essence_code
    when 'angry-boar-might' then case when essence_grade >= 5 then 32 when essence_grade >= 4 then 35 when essence_grade >= 2 then 45 else 80 end
    when 'forest-wolf-flurry' then case when essence_grade >= 4 then 40 when essence_grade >= 2 then 50 else 90 end
    when 'firefly-spirit-ember' then case when essence_grade >= 4 then 20 when essence_grade >= 2 then 25 else 50 end
    when 'stone-beetle-stonehide' then case when essence_grade >= 4 then 40 when essence_grade >= 2 then 50 else 90 end
    else 100
  end;
$$;

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.hunt_training_dummy()'::regprocedure) into definition;

  if position(E'player_empower_pct := case when player_essence_grades[index] >= 2 then 90 else 60 end;' in definition) = 0
    or position(E'player_flurry_pct := case when player_essence_grades[index] >= 2 then 40 else 30 end;' in definition) = 0
    or position(E'case when player_essence_grades[index] >= 2 then 80 else 60 end' in definition) = 0
    or position(E'case when player_essence_grades[index] >= 2 then 10 else 8 end' in definition) = 0 then
    raise exception 'hunt01_essence_grade_definition_changed';
  end if;

  definition := replace(definition,
    E'player_empower_pct := case when player_essence_grades[index] >= 2 then 90 else 60 end;',
    E'player_empower_pct := case when player_essence_grades[index] >= 5 then 260 when player_essence_grades[index] >= 4 then 220 when player_essence_grades[index] >= 3 then 180 when player_essence_grades[index] >= 2 then 90 else 60 end;');
  definition := replace(definition,
    E'player_flurry_pct := case when player_essence_grades[index] >= 2 then 40 else 30 end;',
    E'player_flurry_pct := case when player_essence_grades[index] >= 5 then 110 when player_essence_grades[index] >= 4 then 95 when player_essence_grades[index] >= 3 then 80 when player_essence_grades[index] >= 2 then 40 else 30 end;');
  definition := replace(definition,
    E'player_flurry_until := duration_ticks + 40;',
    E'player_flurry_until := duration_ticks + case when player_essence_grades[index] >= 5 then 50 else 40 end;');
  definition := replace(definition,
    E'case when player_essence_grades[index] >= 2 then 80 else 60 end',
    E'case when player_essence_grades[index] >= 5 then 220 when player_essence_grades[index] >= 4 then 180 when player_essence_grades[index] >= 3 then 160 when player_essence_grades[index] >= 2 then 80 else 60 end');
  definition := replace(definition,
    E'case when player_essence_grades[index] >= 2 then 10 else 8 end',
    E'case when player_essence_grades[index] >= 5 then 28 when player_essence_grades[index] >= 4 then 24 when player_essence_grades[index] >= 3 then 20 when player_essence_grades[index] >= 2 then 10 else 8 end');
  execute definition;
end;
$$;
