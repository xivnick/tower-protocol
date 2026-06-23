insert into public.patch_notes (version, release_date, title, is_published)
values ('0.4.3', '2026-06-23', '전투 스탯 개선', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '캐릭터 탭 전투 스탯에 장착 무기 효과를 반영했습니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.4.3'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
