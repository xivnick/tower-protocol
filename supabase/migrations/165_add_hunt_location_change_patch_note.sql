insert into public.patch_notes (version, release_date, title, is_published)
values ('0.6.3', '2026-06-29', '사냥터 이동 정리', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '몬스터와 조우한 상태에서 사냥터를 바꾸면 자동으로 후퇴합니다.'),
    (2, '전투 중 사냥터를 바꾸면 진행 중인 전투가 유지됩니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.6.3'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
