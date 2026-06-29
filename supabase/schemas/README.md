# Declarative Schemas

This directory is the source for current database definitions when adopting Supabase declarative schema workflow.

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
