drop policy if exists "characters_delete_own" on public.characters;

create policy "characters_delete_own"
on public.characters
for delete
to authenticated
using (auth.uid() = user_id);
