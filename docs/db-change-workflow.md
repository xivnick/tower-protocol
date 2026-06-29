# DB Change Workflow

Supabase is still the server-authoritative backend. The goal is to keep remote edits convenient without turning every small content or balance edit into a permanent hand-written migration.

## Change Classes

Use three classes before changing DB-backed behavior.

| Class | Examples | Owner flow |
| --- | --- | --- |
| `schema` | tables, columns, indexes, RLS, triggers, SQL functions | Update `supabase/schemas`, generate a reviewed migration with `supabase db diff -f <name>` |
| `reference data` | essence templates, monster templates, equipment rules, drop rules | Prefer table rows with constraints; use controlled upsert scripts or data migrations when the app requires reproducible rollout |
| `content data` | patch notes, notices, release text | Use content upsert scripts; edit and publish remotely in Supabase Studio |

## Declarative Schema Flow

`supabase/schemas` is the intended source for the current database definition. `supabase/migrations` is deployment history.

For schema work:

1. Update or add the relevant schema source under `supabase/schemas`.
2. Generate a migration with `supabase db diff -f <migration_name>`.
3. Review the generated SQL before applying it.
4. Apply and verify locally first.
5. Push the reviewed migration to the remote DB only when the change is compatible and safe under the project rules.

Do not search old migrations to discover the current implementation when a schema source exists. Use the schema source as the current-state file and migrations as historical evidence.

## Patch Notes

Patch note table structure is schema. Patch note rows are content.

Codex may create the first draft with a script in `supabase/content/patch-notes`. The script must be safe to run more than once and must not overwrite an existing note, including unpublished notes the user may already be editing. After the draft is inserted, the user edits the copy remotely and publishes it by setting `is_published = true`.

Patch-note-only migrations are release work and should not be created during implementation.

## RPC Boundaries

RPC is kept for server-authoritative commands: row locking, permission checks, reward grants, combat settlement, and final state writes.

Avoid large public RPC functions that also own every calculation and response detail. Prefer this shape:

- public RPC: command endpoint and transaction boundary
- private SQL helpers: focused calculations or validation
- tables: balance and content data that should be editable remotely
- frontend API: typed client wrappers and response mapping

Frontend code should not call `supabase.rpc(...)` directly in new API work. Use a local API wrapper so RPC names, params, error translation, and response typing are centralized.
