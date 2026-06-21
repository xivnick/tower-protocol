drop function if exists public.open_credit_vault();
drop function if exists public.resolve_credit_vault(integer[]);
drop table if exists public.character_credit_vaults;

create table public.character_part_time_job_states (
  character_id uuid primary key references public.characters(id) on delete cascade,
  charges integer not null default 10 check (charges between 0 and 10),
  last_recharged_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.character_part_time_job_states enable row level security;

create trigger character_part_time_job_states_set_updated_at
before update on public.character_part_time_job_states
for each row
execute function public.set_updated_at();

create or replace function public.get_my_part_time_job_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character_id uuid;
  job_state public.character_part_time_job_states%rowtype;
  observed_at timestamptz := clock_timestamp();
  elapsed_charges integer;
  calculated_charges integer;
  next_recharge_at timestamptz;
begin
  select id into target_character_id from public.characters where user_id = auth.uid();
  if not found then raise exception 'character_not_found'; end if;

  insert into public.character_part_time_job_states (character_id)
  values (target_character_id)
  on conflict (character_id) do nothing;

  select * into job_state from public.character_part_time_job_states where character_id = target_character_id;
  elapsed_charges := greatest(0, floor(extract(epoch from (observed_at - job_state.last_recharged_at)) / 6)::integer);
  calculated_charges := least(10, job_state.charges + elapsed_charges);
  if calculated_charges < 10 then
    next_recharge_at := job_state.last_recharged_at + ((elapsed_charges + 1) * interval '6 seconds');
  end if;

  return jsonb_build_object('charges', calculated_charges, 'max_charges', 10, 'next_recharge_at', next_recharge_at);
end;
$$;

create or replace function public.work_part_time()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  job_state public.character_part_time_job_states%rowtype;
  observed_at timestamptz := clock_timestamp();
  elapsed_charges integer;
  calculated_charges integer;
  recharged_at timestamptz;
  next_recharge_at timestamptz;
  gained_credits integer;
begin
  select * into target_character from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'character_not_found'; end if;

  insert into public.character_part_time_job_states (character_id)
  values (target_character.id)
  on conflict (character_id) do nothing;
  select * into job_state from public.character_part_time_job_states where character_id = target_character.id for update;

  elapsed_charges := greatest(0, floor(extract(epoch from (observed_at - job_state.last_recharged_at)) / 6)::integer);
  calculated_charges := least(10, job_state.charges + elapsed_charges);
  recharged_at := job_state.last_recharged_at + (elapsed_charges * interval '6 seconds');
  if calculated_charges = 10 then recharged_at := observed_at; end if;

  if calculated_charges < 1 then raise exception 'part_time_job_charges_empty'; end if;

  calculated_charges := calculated_charges - 1;
  if calculated_charges < 10 then next_recharge_at := recharged_at + interval '6 seconds'; end if;
  update public.character_part_time_job_states
  set charges = calculated_charges, last_recharged_at = recharged_at
  where character_id = target_character.id;

  gained_credits := floor(random() * 21)::integer + 5;

  update public.characters
  set credits = credits + gained_credits
  where id = target_character.id
  returning * into target_character;

  return jsonb_build_object(
    'character', to_jsonb(target_character),
    'gained_credits', gained_credits,
    'job_state', jsonb_build_object('charges', calculated_charges, 'max_charges', 10, 'next_recharge_at', next_recharge_at)
  );
end;
$$;

grant execute on function public.get_my_part_time_job_state() to authenticated;
grant execute on function public.work_part_time() to authenticated;
