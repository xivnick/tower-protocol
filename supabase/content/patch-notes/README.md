# Patch Note Content Scripts

Patch note rows are release content, not schema history.

Use one SQL file per version to create an unpublished draft. Scripts must be idempotent and must not overwrite existing notes.

Recommended flow:

1. Codex creates the draft script for the target version.
2. Run the script against the target DB.
3. Edit the note in Supabase Studio.
4. Publish by setting `is_published = true`.

Do not place patch-note-only inserts in `supabase/migrations`.
