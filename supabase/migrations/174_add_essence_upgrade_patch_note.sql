insert into public.patch_notes (version, release_date, title, is_published)
values ('0.6.4', '2026-07-31', '정수 강화 개방', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '같은 정수 3개와 크레딧을 사용해 다음 등급으로 강화할 수 있습니다.'),
    (2, '제련 패널에서 강화 재료, 비용, 결과를 미리 확인할 수 있습니다.'),
    (3, '장착 중인 정수를 강화하면 강화된 정수가 해당 슬롯을 이어받습니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.6.4'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
