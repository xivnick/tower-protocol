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
