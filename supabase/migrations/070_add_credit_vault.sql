create table public.character_credit_vaults (
  character_id uuid primary key references public.characters(id) on delete cascade,
  initial_mask integer not null check (initial_mask between 0 and 511),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  available_at timestamptz not null default now()
);

alter table public.character_credit_vaults enable row level security;

create or replace function public.open_credit_vault()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  target_vault public.character_credit_vaults%rowtype;
  puzzle_mask integer := 511;
  toggle_mask integer;
  cell_index integer;
begin
  select * into target_character
  from public.characters
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'character_not_found';
  end if;

  select * into target_vault
  from public.character_credit_vaults
  where character_id = target_character.id
  for update;

  if found and target_vault.completed_at is null then
    return jsonb_build_object(
      'ok', true,
      'initial_mask', target_vault.initial_mask,
      'available_at', target_vault.available_at,
      'message', ''
    );
  end if;

  if found and target_vault.available_at > now() then
    return jsonb_build_object(
      'ok', false,
      'initial_mask', null,
      'available_at', target_vault.available_at,
      'message', '다음 금고를 준비 중입니다.'
    );
  end if;

  for move_number in 1..5 loop
    cell_index := floor(random() * 9)::integer;
    toggle_mask := 1 << cell_index;

    if cell_index >= 3 then
      toggle_mask := toggle_mask | (1 << (cell_index - 3));
    end if;
    if cell_index < 6 then
      toggle_mask := toggle_mask | (1 << (cell_index + 3));
    end if;
    if cell_index % 3 <> 0 then
      toggle_mask := toggle_mask | (1 << (cell_index - 1));
    end if;
    if cell_index % 3 <> 2 then
      toggle_mask := toggle_mask | (1 << (cell_index + 1));
    end if;

    puzzle_mask := puzzle_mask # toggle_mask;
  end loop;

  if puzzle_mask = 511 then
    puzzle_mask := puzzle_mask # 11;
  end if;

  insert into public.character_credit_vaults (character_id, initial_mask, created_at, completed_at, available_at)
  values (target_character.id, puzzle_mask, now(), null, now())
  on conflict (character_id) do update
  set initial_mask = excluded.initial_mask,
      created_at = excluded.created_at,
      completed_at = null;

  return jsonb_build_object(
    'ok', true,
    'initial_mask', puzzle_mask,
    'available_at', now(),
    'message', ''
  );
end;
$$;

create or replace function public.resolve_credit_vault(p_moves integer[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  target_vault public.character_credit_vaults%rowtype;
  puzzle_mask integer;
  toggle_mask integer;
  cell_index integer;
  next_available_at timestamptz;
begin
  select * into target_character
  from public.characters
  where user_id = auth.uid()
  for update;

  if not found then
    raise exception 'character_not_found';
  end if;

  select * into target_vault
  from public.character_credit_vaults
  where character_id = target_character.id
  for update;

  if not found or target_vault.completed_at is not null then
    return jsonb_build_object('ok', false, 'character', null, 'available_at', null, 'message', '해제할 금고가 없습니다.');
  end if;

  if p_moves is null or cardinality(p_moves) = 0 or cardinality(p_moves) > 64 then
    return jsonb_build_object('ok', false, 'character', null, 'available_at', null, 'message', '룬 조작 기록을 확인해주세요.');
  end if;

  puzzle_mask := target_vault.initial_mask;

  foreach cell_index in array p_moves loop
    if cell_index < 0 or cell_index > 8 then
      return jsonb_build_object('ok', false, 'character', null, 'available_at', null, 'message', '룬 조작 기록을 확인해주세요.');
    end if;

    toggle_mask := 1 << cell_index;

    if cell_index >= 3 then
      toggle_mask := toggle_mask | (1 << (cell_index - 3));
    end if;
    if cell_index < 6 then
      toggle_mask := toggle_mask | (1 << (cell_index + 3));
    end if;
    if cell_index % 3 <> 0 then
      toggle_mask := toggle_mask | (1 << (cell_index - 1));
    end if;
    if cell_index % 3 <> 2 then
      toggle_mask := toggle_mask | (1 << (cell_index + 1));
    end if;

    puzzle_mask := puzzle_mask # toggle_mask;
  end loop;

  if puzzle_mask <> 511 then
    return jsonb_build_object('ok', false, 'character', null, 'available_at', null, 'message', '룬 회로가 아직 불안정합니다.');
  end if;

  next_available_at := now() + interval '30 seconds';

  update public.characters
  set credits = credits + 20
  where id = target_character.id
  returning * into target_character;

  update public.character_credit_vaults
  set completed_at = now(),
      available_at = next_available_at
  where character_id = target_character.id;

  return jsonb_build_object(
    'ok', true,
    'character', to_jsonb(target_character),
    'available_at', next_available_at,
    'message', '금고 해제 — 20 CR 확보'
  );
end;
$$;

grant execute on function public.open_credit_vault() to authenticated;
grant execute on function public.resolve_credit_vault(integer[]) to authenticated;
