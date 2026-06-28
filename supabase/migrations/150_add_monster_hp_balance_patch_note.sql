insert into public.patch_notes (version, release_date, title, is_published)
values ('0.5.1', '2026-06-28', '몬스터 체력 조정', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '몬스터 최대 체력 보정을 제거했습니다.'),
    (2, '사냥 전투 흐름이 조금 더 가벼워졌습니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.5.1'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
