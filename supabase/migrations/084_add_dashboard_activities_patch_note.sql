insert into public.patch_notes (version, release_date, title, is_published)
values ('0.4.4', '2026-06-24', '일일 활동 및 장비 정보 개선', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '기초 훈련과 단기 알바를 대시보드로 옮겼습니다.'),
    (2, '캐릭터와 장비 화면에서 착용 중인 장비를 확인할 수 있습니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.4.4'
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
