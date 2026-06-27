create or replace function public.annotate_hunt_log_links(source_logs jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  result jsonb := '[]'::jsonb;
  entry jsonb;
  entry_kind text;
  entry_source text;
  entry_time integer;
  log_sequence integer := 0;
  parent_sequence integer;
  current_log_time integer := null;
  latest_player_sequence integer := null;
  latest_enemy_sequence integer := null;
begin
  for entry in select value from jsonb_array_elements(coalesce(source_logs, '[]'::jsonb)) loop
    log_sequence := log_sequence + 1;
    entry_kind := entry ->> 'kind';
    entry_source := entry ->> 'source';
    entry_time := (entry ->> 'time_tenths')::integer;
    parent_sequence := null;

    if current_log_time is distinct from entry_time then
      current_log_time := entry_time;
      latest_player_sequence := null;
      latest_enemy_sequence := null;
    end if;

    if entry_kind in ('essence_damage', 'essence_dot', 'essence_heal', 'essence_shield', 'essence_extra_hit', 'essence_reflect', 'reflect', 'shield_absorb') then
      if entry_source = 'enemy' then
        parent_sequence := latest_enemy_sequence;
      elsif entry_source = 'player' then
        parent_sequence := latest_player_sequence;
      end if;
    end if;

    entry := entry || jsonb_build_object('sequence', log_sequence);
    if parent_sequence is not null then
      entry := entry || jsonb_build_object('parent_sequence', parent_sequence);
    end if;

    result := result || jsonb_build_array(entry);

    if parent_sequence is null and entry_kind in ('attack', 'critical', 'miss', 'essence_cast') then
      latest_player_sequence := log_sequence;
    elsif parent_sequence is null and entry_kind in ('enemy_attack', 'enemy_critical', 'enemy_miss') then
      latest_enemy_sequence := log_sequence;
    end if;
  end loop;

  return result;
end;
$$;
