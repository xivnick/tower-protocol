alter table public.character_credit_vaults
add column charges smallint not null default 10,
add column charge_updated_at timestamptz not null default now(),
add constraint character_credit_vaults_charges_check check (charges between 0 and 10);

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
  elapsed_charges integer;
  refreshed_charges integer;
  next_charge_at timestamptz;
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

  if found and target_vault.charges < 10 then
    elapsed_charges := floor(extract(epoch from (now() - target_vault.charge_updated_at)) / 30)::integer;

    if elapsed_charges > 0 then
      refreshed_charges := least(10, target_vault.charges + elapsed_charges);

      update public.character_credit_vaults
      set charges = refreshed_charges,
          charge_updated_at = case
            when refreshed_charges = 10 then now()
            else target_vault.charge_updated_at + elapsed_charges * interval '30 seconds'
          end
      where character_id = target_character.id
      returning * into target_vault;
    end if;
  end if;

  if found and target_vault.completed_at is null then
    next_charge_at := case when target_vault.charges < 10 then target_vault.charge_updated_at + interval '30 seconds' else null end;

    return jsonb_build_object(
      'ok', true,
      'initial_mask', target_vault.initial_mask,
      'charges', target_vault.charges,
      'next_charge_at', next_charge_at,
      'message', ''
    );
  end if;

  if found and target_vault.charges = 0 then
    return jsonb_build_object(
      'ok', false,
      'initial_mask', null,
      'charges', 0,
      'next_charge_at', target_vault.charge_updated_at + interval '30 seconds',
      'message', '충전이 필요합니다.'
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

  if found then
    update public.character_credit_vaults
    set initial_mask = puzzle_mask,
        created_at = now(),
        completed_at = null,
        charges = target_vault.charges - 1,
        charge_updated_at = case when target_vault.charges = 10 then now() else target_vault.charge_updated_at end
    where character_id = target_character.id
    returning * into target_vault;
  else
    insert into public.character_credit_vaults (character_id, initial_mask, charges, charge_updated_at)
    values (target_character.id, puzzle_mask, 9, now())
    returning * into target_vault;
  end if;

  next_charge_at := target_vault.charge_updated_at + interval '30 seconds';

  return jsonb_build_object(
    'ok', true,
    'initial_mask', puzzle_mask,
    'charges', target_vault.charges,
    'next_charge_at', next_charge_at,
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
    return jsonb_build_object('ok', false, 'character', null, 'message', '해제할 금고가 없습니다.');
  end if;

  if p_moves is null or cardinality(p_moves) = 0 or cardinality(p_moves) > 64 then
    return jsonb_build_object('ok', false, 'character', null, 'message', '룬 조작 기록을 확인해주세요.');
  end if;

  puzzle_mask := target_vault.initial_mask;

  foreach cell_index in array p_moves loop
    if cell_index < 0 or cell_index > 8 then
      return jsonb_build_object('ok', false, 'character', null, 'message', '룬 조작 기록을 확인해주세요.');
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
    return jsonb_build_object('ok', false, 'character', null, 'message', '룬 회로가 아직 불안정합니다.');
  end if;

  update public.characters
  set credits = credits + 20
  where id = target_character.id
  returning * into target_character;

  update public.character_credit_vaults
  set completed_at = now()
  where character_id = target_character.id;

  return jsonb_build_object(
    'ok', true,
    'character', to_jsonb(target_character),
    'message', '+20 CR'
  );
end;
$$;
