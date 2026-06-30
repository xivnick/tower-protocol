create or replace function public.admin_grant_character_credits(
  target_character_id uuid,
  credit_amount integer,
  reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  before_data jsonb;
  after_data jsonb;
begin
  perform public.admin_require_admin();

  if credit_amount <= 0 then
    raise exception 'admin_invalid_amount';
  end if;

  if btrim(coalesce(reason, '')) = '' then
    raise exception 'admin_reason_required';
  end if;

  select * into target_character
  from public.characters
  where id = target_character_id
  for update;

  if not found then
    raise exception 'character_not_found';
  end if;

  before_data := jsonb_build_object(
    'character_id', target_character.id,
    'credits', target_character.credits
  );

  update public.characters
  set credits = credits + credit_amount
  where id = target_character_id
  returning * into target_character;

  after_data := jsonb_build_object(
    'character_id', target_character.id,
    'credits', target_character.credits,
    'granted_credits', credit_amount
  );

  perform public.admin_record_audit(
    'grant_credits',
    'character',
    target_character_id::text,
    reason,
    before_data,
    after_data
  );

  return after_data;
end;
$$;

create or replace function public.admin_grant_character_experience(
  target_character_id uuid,
  experience_amount integer,
  reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_character public.characters%rowtype;
  before_data jsonb;
  after_data jsonb;
  remaining_experience integer;
  required_experience integer;
  level_ups integer := 0;
begin
  perform public.admin_require_admin();

  if experience_amount <= 0 then
    raise exception 'admin_invalid_amount';
  end if;

  if btrim(coalesce(reason, '')) = '' then
    raise exception 'admin_reason_required';
  end if;

  select * into target_character
  from public.characters
  where id = target_character_id
  for update;

  if not found then
    raise exception 'character_not_found';
  end if;

  before_data := jsonb_build_object(
    'character_id', target_character.id,
    'level', target_character.level,
    'experience', target_character.experience,
    'stat_points', target_character.stat_points
  );

  if target_character.level >= 100 then
    remaining_experience := 0;
  else
    remaining_experience := target_character.experience + experience_amount;

    while target_character.level < 100 loop
      required_experience := public.required_experience_for_level(target_character.level + 1);
      exit when required_experience is null or remaining_experience < required_experience;

      remaining_experience := remaining_experience - required_experience;
      target_character.level := target_character.level + 1;
      level_ups := level_ups + 1;
    end loop;

    if target_character.level >= 100 then
      target_character.level := 100;
      remaining_experience := 0;
    end if;
  end if;

  update public.characters
  set level = target_character.level,
    experience = remaining_experience,
    stat_points = stat_points + (level_ups * 5)
  where id = target_character_id
  returning * into target_character;

  after_data := jsonb_build_object(
    'character_id', target_character.id,
    'level', target_character.level,
    'experience', target_character.experience,
    'stat_points', target_character.stat_points,
    'granted_experience', experience_amount,
    'level_ups', level_ups
  );

  perform public.admin_record_audit(
    'grant_experience',
    'character',
    target_character_id::text,
    reason,
    before_data,
    after_data
  );

  return after_data;
end;
$$;

revoke all on function public.admin_grant_character_credits(uuid, integer, text) from public;
revoke all on function public.admin_grant_character_experience(uuid, integer, text) from public;

grant execute on function public.admin_grant_character_credits(uuid, integer, text) to authenticated;
grant execute on function public.admin_grant_character_experience(uuid, integer, text) to authenticated;
