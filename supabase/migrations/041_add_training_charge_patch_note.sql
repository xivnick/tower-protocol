insert into public.patch_notes (version, release_date, title, is_published)
values ('0.3.3', '2026-06-21', '기초 훈련 충전', true);

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '기초 훈련은 최대 10회까지 보관되며, 6초마다 1회 충전됩니다.'),
    (2, '훈련 버튼에 남은 훈련 수와 다음 훈련까지 남은 시간이 표시됩니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.3.3';
