delete from public.patch_note_items
where patch_note_id in (
  select id from public.patch_notes where version = '0.5.0'
);

delete from public.patch_notes
where version = '0.5.0';
