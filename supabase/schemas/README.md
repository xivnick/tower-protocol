# Declarative Schemas

This directory is the source for current database definitions when adopting Supabase declarative schema workflow.

The existing project is being moved into this workflow incrementally. Do not run a whole-project diff from a partial schema set. Add or update schema files for the DB objects owned by the current change, then review the generated migration carefully.

Use it for schema objects:

- tables
- indexes
- RLS policies
- triggers
- SQL functions

Generate reviewed migrations with:

```sh
supabase db diff -f <migration_name>
```

Content rows such as patch notes do not belong here. Use `supabase/content` for draft content upsert scripts.
