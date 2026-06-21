insert into public.patch_notes (version, release_date, title, is_published)
values ('0.3.4', '2026-06-21', '사냥터 전투 확장', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '사냥터를 변경할 수 있습니다.'),
    (2, '전투 로그를 개선했습니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.3.4'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
