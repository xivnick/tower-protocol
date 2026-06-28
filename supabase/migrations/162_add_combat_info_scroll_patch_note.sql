insert into public.patch_notes (version, release_date, title, is_published)
values ('0.6.2', '2026-06-29', '전투 정보 표시 안정화', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '전투 정보 카드를 여닫을 때 전투 로그가 더 안정적으로 표시됩니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.6.2'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
