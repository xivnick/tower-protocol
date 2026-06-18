insert into public.patch_notes (version, release_date, title, is_published)
values ('0.2.7', '2026-06-18', '랭킹 연결', true);

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '캐릭터 기준 랭킹 탭이 추가되었습니다.'),
    (2, '대시보드에서 상위 랭킹을 간략하게 확인할 수 있습니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.2.7';
