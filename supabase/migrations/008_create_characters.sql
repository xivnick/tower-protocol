create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint characters_user_unique unique (user_id),
  constraint characters_name_format_check
    check (
      name = btrim(name)
      and char_length(name) between 2 and 16
      and name ~ '^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_]+$'
    )
);

alter table public.characters enable row level security;

drop trigger if exists characters_set_updated_at on public.characters;

create trigger characters_set_updated_at
before update on public.characters
for each row
execute function public.set_updated_at();

drop policy if exists "characters_select_own" on public.characters;
drop policy if exists "characters_insert_own" on public.characters;
drop policy if exists "characters_update_own" on public.characters;

create policy "characters_select_own"
on public.characters
for select
to authenticated
using (auth.uid() = user_id);

create policy "characters_insert_own"
on public.characters
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "characters_update_own"
on public.characters
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
