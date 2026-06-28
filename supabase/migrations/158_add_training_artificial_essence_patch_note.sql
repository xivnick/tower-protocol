insert into public.patch_notes (version, release_date, title, is_published)
values ('0.6.0', '2026-06-28', '훈련장 인공 정수', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '훈련장에 인공 정수 10종을 추가했습니다.'),
    (2, '정수 허수아비와 정수 목각인형을 처치하면 해당 인공 정수를 확정 획득합니다.'),
    (3, '훈련장 정수 몬스터 등장 비율을 기본 몬스터와 50:50으로 조정했습니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.6.0'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
