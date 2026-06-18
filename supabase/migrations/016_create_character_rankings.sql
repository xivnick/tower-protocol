create or replace function public.get_character_rankings(limit_count integer default 50)
returns table (
  rank bigint,
  character_id uuid,
  name text,
  level integer,
  experience integer
)
language sql
security definer
set search_path = public
as $$
  select
    ranked.rank,
    ranked.id as character_id,
    ranked.name,
    ranked.level,
    ranked.experience
  from (
    select
      characters.id,
      characters.name,
      characters.level,
      characters.experience,
      row_number() over (
        order by
          characters.level desc,
          characters.experience desc,
          characters.created_at asc,
          characters.name asc
      ) as rank
    from public.characters
  ) as ranked
  order by ranked.rank asc
  limit greatest(1, least(coalesce(limit_count, 50), 100));
$$;

grant execute on function public.get_character_rankings(integer) to anon, authenticated;
