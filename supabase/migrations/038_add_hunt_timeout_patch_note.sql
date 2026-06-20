insert into public.patch_notes (version, release_date, title, is_published)
values ('0.3.2', '2026-06-21', '시간 초과 전투 결과', true);

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '60초 제한에 도달하면 시간 초과 · 전투 종료 로그가 표시됩니다.'),
    (2, '시간 초과 전투에서도 마지막 전투 로그와 허수아비 체력을 확인할 수 있습니다.'),
    (3, '시간 초과 전투는 경험치 없이 종료되며, 결과 확인 후 다시 전투할 수 있습니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.3.2';
