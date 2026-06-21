insert into public.patch_notes (version, release_date, title, is_published)
values ('0.3.8', '2026-06-21', '크레딧과 단기 알바', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '크레딧이 추가되었습니다.'),
    (2, '단기 알바를 통해 크레딧을 얻을 수 있습니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.3.8'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
