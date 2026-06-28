insert into public.patch_notes (version, release_date, title, is_published)
values ('0.5.0', '2026-06-28', '실제 사냥터와 정수 전투', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '실제 사냥터와 몬스터 정수가 추가되었습니다.'),
    (2, '정수 슬롯, 장착 패널, 전투 로그가 개선되었습니다.'),
    (3, '사냥터 레벨 구간과 전투 밸런스가 조정되었습니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.5.0'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
