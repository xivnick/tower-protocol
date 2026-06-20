insert into public.patch_notes (version, release_date, title, is_published)
values ('0.3.1', '2026-06-20', '사냥 전투 흐름 개선', true);

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '마지막 전투 결과에 도망침이 표시됩니다.'),
    (2, '사냥 탭 밖에서도 전투 종료 시 정산이 진행됩니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.3.1';
