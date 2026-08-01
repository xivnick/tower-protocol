alter table public.patch_notes
add column if not exists minimum_supported_version text;

create or replace function public.get_app_version()
returns jsonb
language sql
stable
set search_path = public
as $$
  with published_notes as (
    select
      version,
      minimum_supported_version,
      string_to_array(version, '.')::int[] as version_parts,
      release_date
    from public.patch_notes
    where is_published = true
  ),
  latest_note as (
    select version
    from published_notes
    order by
      version_parts[1] desc,
      version_parts[2] desc,
      version_parts[3] desc,
      release_date desc
    limit 1
  ),
  minimum_note as (
    select minimum_supported_version
    from published_notes
    where minimum_supported_version is not null
    order by
      version_parts[1] desc,
      version_parts[2] desc,
      version_parts[3] desc,
      release_date desc
    limit 1
  )
  select jsonb_build_object(
    'latest', coalesce((select version from latest_note), '0.1.0'),
    'minimum', coalesce((select minimum_supported_version from minimum_note), '0.1.0')
  );
$$;

grant execute on function public.get_app_version() to anon, authenticated;
