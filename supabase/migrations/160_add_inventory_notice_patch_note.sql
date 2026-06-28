insert into public.patch_notes (version, release_date, title, is_published)
values ('0.6.1', '2026-06-28', '정수와 새 항목 표시', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '전투 패널에서 장착 정수와 효과를 확인할 수 있습니다.'),
    (2, '정수 발동 시 해당 정수 이름이 잠깐 빛납니다.'),
    (3, '새로 얻은 장비와 정수에 알림 점이 표시됩니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.6.1'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
