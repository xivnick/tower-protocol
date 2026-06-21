alter table public.character_hunt_states
  add column if not exists auto_hunt_enabled boolean not null default false,
  add column if not exists auto_hunt_remaining integer not null default 0 check (auto_hunt_remaining between 0 and 10);

create or replace function public.configure_auto_hunt(enabled boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare target_character public.characters%rowtype;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;
  insert into public.character_hunt_states (character_id) values (target_character.id) on conflict do nothing;
  update public.character_hunt_states set auto_hunt_enabled = enabled, auto_hunt_remaining = case when enabled then 10 else 0 end where character_id = target_character.id;
  return public.get_my_hunt_state();
end;
$$;

create or replace function public.consume_auto_hunt_encounter()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.last_battle ->> 'status' = 'encountered' and coalesce(old.last_battle ->> 'status', '') <> 'encountered' and old.auto_hunt_enabled and old.auto_hunt_remaining > 0 then
    new.auto_hunt_remaining := old.auto_hunt_remaining - 1;
  end if;
  return new;
end;
$$;

drop trigger if exists character_hunt_states_consume_auto_hunt on public.character_hunt_states;
create trigger character_hunt_states_consume_auto_hunt before update on public.character_hunt_states for each row execute function public.consume_auto_hunt_encounter();

do $$
declare definition text;
begin
  select pg_get_functiondef('public.get_my_hunt_state()'::regprocedure) into definition;
  definition := replace(definition, E'''is_defeat_recovery'', hunt_state.is_defeat_recovery', E'''is_defeat_recovery'', hunt_state.is_defeat_recovery, ''auto_hunt_enabled'', hunt_state.auto_hunt_enabled, ''auto_hunt_remaining'', hunt_state.auto_hunt_remaining');
  execute definition;
end;
$$;

grant execute on function public.configure_auto_hunt(boolean) to authenticated;
