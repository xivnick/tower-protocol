insert into public.patch_notes (version, release_date, title, is_published)
values ('0.2.8', '2026-06-19', '스탯 배분', true);

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '캐릭터 탭에서 스탯 포인트를 배분할 수 있습니다.'),
    (2, '전투 스탯 변화가 적용 전 미리보기로 표시됩니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.2.8';
