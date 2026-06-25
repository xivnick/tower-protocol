insert into public.patch_notes (version, release_date, title, is_published)
values ('0.5.0', '2026-06-25', '장비 비교', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '장비 상세에 현재 장비 대비 변화를 표시합니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.5.0'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
