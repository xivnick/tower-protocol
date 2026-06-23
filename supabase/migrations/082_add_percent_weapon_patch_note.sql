insert into public.patch_notes (version, release_date, title, is_published)
values ('0.4.2', '2026-06-23', '무기 조정', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '대검과 지팡이의 공격력 증가율을 조정했습니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.4.2'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
