insert into public.patch_notes (version, release_date, title, is_published)
values ('0.3.6', '2026-06-21', '자동 전투', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '자동 전투를 추가했습니다.'),
    (2, '10회 연속 전투가 가능합니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.3.6'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
