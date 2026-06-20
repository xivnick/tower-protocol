insert into public.patch_notes (version, release_date, title, is_published)
values ('0.3.0', '2026-06-20', '사냥터', true);

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    (1, '사냥 탭에 허수아비 훈련소가 추가되었습니다.'),
    (2, '전투 기록과 체력 변화가 시간에 맞춰 재생됩니다.'),
    (3, '전투 승리 시 레벨에 맞는 경험치를 획득합니다.'),
    (4, '허수아비의 전투 스탯과 성장 정보를 확인할 수 있습니다.'),
    (5, '전투 중 도망치기로 보상 없이 전투를 종료할 수 있습니다.')
) as seed(sort_order, content)
join public.patch_notes on patch_notes.version = '0.3.0';
