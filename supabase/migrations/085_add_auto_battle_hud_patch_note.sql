insert into public.patch_notes (version, release_date, title, is_published)
values ('0.4.5', '2026-06-24', '자동 전투 HUD', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '우측 하단에 자동 전투 HUD를 추가했습니다.'),
    (2, '전투 상태와 대상을 어디서나 확인할 수 있습니다.'),
    (3, '전투 게이지로 플레이어와 상대의 체력 비중을 표시합니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.4.5'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
