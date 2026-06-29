-- Copy this file to supabase/content/patch-notes/<version>.sql.
-- This script creates an unpublished draft only. It will not overwrite an existing note.

with draft_note as (
  insert into public.patch_notes (version, release_date, title, is_published)
  values ('0.0.0', current_date, '패치노트 초안', false)
  on conflict (version) do nothing
  returning id
),
target_note as (
  select id from draft_note
  union all
  select id
  from public.patch_notes
  where version = '0.0.0'
    and is_published = false
    and not exists (select 1 from draft_note)
),
seed_items(sort_order, content) as (
  values
    (1, '첫 번째 변경사항을 입력하세요.'),
    (2, '두 번째 변경사항을 입력하세요.')
)
insert into public.patch_note_items (patch_note_id, sort_order, content)
select target_note.id, seed_items.sort_order, seed_items.content
from target_note
cross join seed_items
on conflict (patch_note_id, sort_order) do nothing;
