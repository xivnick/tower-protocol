do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.monster_stats_at_level(public.monster_templates, integer)'::regprocedure) into definition;

  if position(E'begin\n  for index in 1..array_length(weights, 1) loop' in definition) = 0 then
    raise exception 'monster_stats_at_level_definition_changed';
  end if;

  definition := replace(
    definition,
    E'begin\n  for index in 1..array_length(weights, 1) loop',
    E'begin\n  if template_row.code = any (array[\n    ''angry-boar'', ''forest-wolf'', ''firefly-spirit'', ''stone-beetle'',\n    ''forest-warden-stag'', ''green-viper'', ''vine-hunter'', ''moss-slime'',\n    ''leafshade-panther'', ''redthorn-beast'', ''blackneedle-bat'', ''bigeye-bat'',\n    ''blade-beetle'', ''crystal-lizard'', ''crystaljaw-centipede'', ''cave-vampire-bat''\n  ]) then\n    values[1] := values[1] + 15;\n  end if;\n  for index in 1..array_length(weights, 1) loop'
  );

  execute definition;
end;
$$;
