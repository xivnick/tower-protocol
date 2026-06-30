create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  reason text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

revoke all on table public.admin_audit_logs from anon, authenticated;

create or replace function public.admin_require_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_required';
  end if;
end;
$$;

create or replace function public.admin_record_audit(
  action text,
  target_type text,
  target_id text default null,
  reason text default null,
  before_data jsonb default null,
  after_data jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_id uuid;
begin
  perform public.admin_require_admin();

  insert into public.admin_audit_logs (
    actor_user_id, action, target_type, target_id, reason, before_data, after_data
  )
  values (
    auth.uid(), action, target_type, target_id, reason, before_data, after_data
  )
  returning id into audit_id;

  return audit_id;
end;
$$;

create or replace function public.admin_get_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.admin_require_admin();

  return jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'profiles_total', (select count(*) from public.profiles),
    'characters_total', (select count(*) from public.characters),
    'admins_total', (select count(*) from public.admin_users),
    'published_patch_notes', (select count(*) from public.patch_notes where is_published),
    'draft_patch_notes', (select count(*) from public.patch_notes where not is_published),
    'active_hunts', (
      select count(*)
      from public.character_hunt_states
      where last_battle ->> 'status' = 'in_progress'
    ),
    'highest_character', coalesce((
      select jsonb_build_object(
        'id', c.id,
        'user_id', c.user_id,
        'name', c.name,
        'level', c.level,
        'experience', c.experience,
        'nickname', p.nickname
      )
      from public.characters c
      left join public.profiles p on p.user_id = c.user_id
      order by c.level desc, c.experience desc, c.created_at asc
      limit 1
    ), '{}'::jsonb),
    'recent_characters', coalesce((
      select jsonb_agg(row_data order by row_created_at desc)
      from (
        select
          c.created_at as row_created_at,
          jsonb_build_object(
            'id', c.id,
            'user_id', c.user_id,
            'name', c.name,
            'level', c.level,
            'nickname', p.nickname,
            'created_at', c.created_at
          ) as row_data
        from public.characters c
        left join public.profiles p on p.user_id = c.user_id
        order by c.created_at desc
        limit 5
      ) recent
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_search_players(
  search_text text default '',
  limit_count integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  query text := btrim(coalesce(search_text, ''));
  capped_limit integer := greatest(1, least(coalesce(limit_count, 20), 50));
begin
  perform public.admin_require_admin();

  return coalesce((
    select jsonb_agg(row_data order by sort_created_at desc)
    from (
      select
        coalesce(c.created_at, p.created_at, u.created_at) as sort_created_at,
        jsonb_build_object(
          'user_id', u.id,
          'email', u.email,
          'nickname', p.nickname,
          'character_id', c.id,
          'character_name', c.name,
          'level', c.level,
          'experience', c.experience,
          'credits', c.credits,
          'created_at', u.created_at,
          'character_updated_at', c.updated_at
        ) as row_data
      from auth.users u
      left join public.profiles p on p.user_id = u.id
      left join public.characters c on c.user_id = u.id
      where query = ''
        or u.email ilike '%' || query || '%'
        or p.nickname ilike '%' || query || '%'
        or c.name ilike '%' || query || '%'
        or u.id::text = query
        or c.id::text = query
      order by coalesce(c.updated_at, p.updated_at, u.created_at) desc
      limit capped_limit
    ) result
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_player_detail(target_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.admin_require_admin();

  select jsonb_build_object(
    'user', jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'created_at', u.created_at,
      'last_sign_in_at', u.last_sign_in_at
    ),
    'profile', case when p.user_id is null then null else jsonb_build_object(
      'nickname', p.nickname,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ) end,
    'character', case when c.id is null then null else jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'level', c.level,
      'experience', c.experience,
      'credits', c.credits,
      'stat_points', c.stat_points,
      'hunt_available_at', c.hunt_available_at,
      'created_at', c.created_at,
      'updated_at', c.updated_at
    ) end,
    'hunt_state', case when h.character_id is null then null else jsonb_build_object(
      'selected_hunt_ground_id', h.selected_hunt_ground_id,
      'available_at', h.available_at,
      'last_battle_status', h.last_battle ->> 'status',
      'updated_at', h.updated_at
    ) end,
    'inventory', jsonb_build_object(
      'weapons', case when c.id is null then 0 else (select count(*) from public.character_weapons where character_id = c.id) end,
      'armors', case when c.id is null then 0 else (select count(*) from public.character_armors where character_id = c.id) end,
      'essences', case when c.id is null then 0 else (select coalesce(sum(quantity), 0) from public.character_essences where character_id = c.id) end
    )
  )
  into result
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join public.characters c on c.user_id = u.id
  left join public.character_hunt_states h on h.character_id = c.id
  where u.id = target_user_id;

  if result is null then
    raise exception 'admin_player_not_found';
  end if;

  return result;
end;
$$;

create or replace function public.admin_reset_player_hunt_state(
  target_character_id uuid,
  reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  before_state jsonb;
  after_state jsonb;
begin
  perform public.admin_require_admin();

  if btrim(coalesce(reason, '')) = '' then
    raise exception 'admin_reason_required';
  end if;

  select jsonb_build_object(
    'character_id', c.id,
    'hunt_available_at', c.hunt_available_at,
    'hunt_state', case when h.character_id is null then null else to_jsonb(h) end
  )
  into before_state
  from public.characters c
  left join public.character_hunt_states h on h.character_id = c.id
  where c.id = target_character_id
  for update of c;

  if before_state is null then
    raise exception 'character_not_found';
  end if;

  update public.characters
  set hunt_available_at = null
  where id = target_character_id;

  insert into public.character_hunt_states (character_id, available_at, last_battle)
  values (target_character_id, null, null)
  on conflict (character_id)
  do update set available_at = null, last_battle = null;

  select jsonb_build_object(
    'character_id', c.id,
    'hunt_available_at', c.hunt_available_at,
    'hunt_state', to_jsonb(h)
  )
  into after_state
  from public.characters c
  left join public.character_hunt_states h on h.character_id = c.id
  where c.id = target_character_id;

  perform public.admin_record_audit(
    'reset_hunt_state',
    'character',
    target_character_id::text,
    reason,
    before_state,
    after_state
  );

  return after_state;
end;
$$;

create or replace function public.admin_get_balance_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.admin_require_admin();

  return jsonb_build_object(
    'hunt_grounds', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'recommended_min_level', recommended_min_level,
        'recommended_max_level', recommended_max_level,
        'sort_order', sort_order,
        'is_enabled', is_enabled
      ) order by sort_order, id)
      from public.hunt_grounds
    ), '[]'::jsonb),
    'monsters', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'code', code,
        'name', name,
        'base_level', base_level,
        'stat_points_per_level', stat_points_per_level,
        'experience_multiplier', experience_multiplier,
        'basic_attack_enabled', basic_attack_enabled
      ) order by code)
      from public.monster_templates
    ), '[]'::jsonb),
    'essences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'code', e.code,
        'name', e.name,
        'monster_code', m.code,
        'monster_name', m.name
      ) order by e.code)
      from public.essence_templates e
      left join public.monster_templates m on m.id = e.monster_template_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_get_content_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.admin_require_admin();

  return jsonb_build_object(
    'patch_notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'version', version,
        'title', title,
        'release_date', release_date,
        'is_published', is_published,
        'updated_at', updated_at
      ) order by release_date desc, version desc)
      from public.patch_notes
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_get_audit_logs(limit_count integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  capped_limit integer := greatest(1, least(coalesce(limit_count, 50), 100));
begin
  perform public.admin_require_admin();

  return coalesce((
    select jsonb_agg(row_data order by created_at desc)
    from (
      select
        log.created_at,
        jsonb_build_object(
          'id', log.id,
          'actor_user_id', log.actor_user_id,
          'actor_email', actor.email,
          'action', log.action,
          'target_type', log.target_type,
          'target_id', log.target_id,
          'reason', log.reason,
          'created_at', log.created_at
        ) as row_data
      from public.admin_audit_logs log
      left join auth.users actor on actor.id = log.actor_user_id
      order by log.created_at desc
      limit capped_limit
    ) logs
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_require_admin() from public;
revoke all on function public.admin_record_audit(text, text, text, text, jsonb, jsonb) from public;
revoke all on function public.admin_get_overview() from public;
revoke all on function public.admin_search_players(text, integer) from public;
revoke all on function public.admin_get_player_detail(uuid) from public;
revoke all on function public.admin_reset_player_hunt_state(uuid, text) from public;
revoke all on function public.admin_get_balance_catalog() from public;
revoke all on function public.admin_get_content_status() from public;
revoke all on function public.admin_get_audit_logs(integer) from public;

grant execute on function public.admin_get_overview() to authenticated;
grant execute on function public.admin_search_players(text, integer) to authenticated;
grant execute on function public.admin_get_player_detail(uuid) to authenticated;
grant execute on function public.admin_reset_player_hunt_state(uuid, text) to authenticated;
grant execute on function public.admin_get_balance_catalog() to authenticated;
grant execute on function public.admin_get_content_status() to authenticated;
grant execute on function public.admin_get_audit_logs(integer) to authenticated;
