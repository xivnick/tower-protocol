insert into public.patch_notes (version, release_date, title, is_published)
values ('0.6.5', '2026-07-31', '훈련장 전투 안정화', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '인공 마법 정수가 발동할 때 훈련장 전투가 중단되던 문제를 수정했습니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.6.5'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
