create table public.patch_notes (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  release_date date not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patch_note_items (
  id uuid primary key default gen_random_uuid(),
  patch_note_id uuid not null references public.patch_notes(id) on delete cascade,
  sort_order integer not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patch_note_id, sort_order)
);

alter table public.patch_notes enable row level security;
alter table public.patch_note_items enable row level security;

create policy "Published patch notes are readable"
on public.patch_notes
for select
to anon, authenticated
using (is_published = true);

create policy "Published patch note items are readable"
on public.patch_note_items
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.patch_notes
    where patch_notes.id = patch_note_items.patch_note_id
      and patch_notes.is_published = true
  )
);

create or replace function public.touch_patch_note_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_patch_notes_updated_at
before update on public.patch_notes
for each row
execute function public.touch_patch_note_updated_at();

create trigger touch_patch_note_items_updated_at
before update on public.patch_note_items
for each row
execute function public.touch_patch_note_updated_at();

insert into public.patch_notes (version, release_date, title, is_published)
values
  ('0.2.6', '2026-06-18', '훈련 결과 표시', true),
  ('0.2.5', '2026-06-18', '훈련 보상 조정', true),
  ('0.2.4', '2026-06-18', '기초 훈련', true),
  ('0.2.3', '2026-06-17', '성장 슬롯', true),
  ('0.2.2', '2026-06-17', '이름 점유 규칙', true),
  ('0.2.1', '2026-06-17', '캐릭터 관리', true),
  ('0.2.0', '2026-06-17', '캐릭터 생성', true),
  ('0.1.2', '2026-06-17', '모바일 접속 화면 정비', true),
  ('0.1.1', '2026-06-16', '패치노트 터미널', true),
  ('0.1.0', '2026-06-16', '접속 프로토콜 초기화', true);

insert into public.patch_note_items (patch_note_id, sort_order, content)
select patch_notes.id, seed.sort_order, seed.content
from (
  values
    ('0.2.6', 1, '기초 훈련에서 낮은 확률로 더 큰 경험치를 얻을 수 있습니다.'),
    ('0.2.6', 2, '훈련 결과 알림에 획득한 경험치가 표시됩니다.'),
    ('0.2.5', 1, '기초 훈련 보상이 고정 경험치에서 랜덤 경험치로 변경되었습니다.'),
    ('0.2.5', 2, '알림 메시지가 여러 개 쌓여 표시됩니다.'),
    ('0.2.4', 1, '캐릭터 탭에서 기초 훈련을 실행할 수 있습니다.'),
    ('0.2.4', 2, '훈련으로 경험치를 얻고 레벨업을 확인할 수 있습니다.'),
    ('0.2.3', 1, '캐릭터에 레벨과 경험치 정보가 추가되었습니다.'),
    ('0.2.3', 2, '캐릭터 정보와 대시보드에서 성장 상태를 확인할 수 있습니다.'),
    ('0.2.2', 1, '닉네임과 캐릭터 이름이 같은 이름 공간을 사용합니다.'),
    ('0.2.2', 2, '내 닉네임은 캐릭터 이름으로 사용할 수 있습니다.'),
    ('0.2.1', 1, '캐릭터 탭에서 캐릭터를 삭제할 수 있습니다.'),
    ('0.2.1', 2, '삭제 전 캐릭터 이름 확인 단계를 추가했습니다.'),
    ('0.2.0', 1, '대시보드에 캐릭터 생성 안내가 추가되었습니다.'),
    ('0.2.0', 2, '캐릭터 탭에서 계정에 연결할 캐릭터를 생성할 수 있습니다.'),
    ('0.1.2', 1, '모바일 화면의 계정 메뉴와 이동 메뉴를 정리했습니다.'),
    ('0.1.2', 2, '화면 전환과 메뉴 동작이 조금 더 부드러워졌습니다.'),
    ('0.1.1', 1, '패치노트 터미널이 연결되었습니다.'),
    ('0.1.1', 2, '프로토콜 변경사항을 확인할 수 있습니다.'),
    ('0.1.0', 1, 'tower:// 접속 프로토콜이 초기화되었습니다.'),
    ('0.1.0', 2, '이제 tower:// 프로토콜에 접속이 가능합니다.')
) as seed(version, sort_order, content)
join public.patch_notes on patch_notes.version = seed.version;
