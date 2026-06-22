insert into public.patch_notes (version, release_date, title, is_published)
values
  ('0.4.0', '2026-06-22', '무기고 개방', true),
  ('0.4.1', '2026-06-22', '가속 규칙 개편', true)
on conflict (version) do update
set release_date = excluded.release_date,
    title = excluded.title,
    is_published = excluded.is_published;

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    ('0.4.0', 1, '장비 탭과 무기 상자를 추가했습니다.'),
    ('0.4.0', 2, '무기를 장착할 수 있습니다.'),
    ('0.4.1', 1, '민첩과 지혜가 각각 공격속도와 정수 재사용 속도를 더 빠르게 높입니다.')
) as seed(version, sort_order, content)
join public.patch_notes on patch_notes.version = seed.version
on conflict (patch_note_id, sort_order) do update
set content = excluded.content;
