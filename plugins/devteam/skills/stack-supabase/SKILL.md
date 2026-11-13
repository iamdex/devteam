---
name: stack-supabase
description: DevTeam conventions for Supabase and PostgreSQL — migrations with the Supabase CLI, row-level security, auth, storage, Edge Functions, generated types and pgvector similarity search. Use when designing schema, writing migrations or queries, or reviewing data access in a Supabase project.
---

# Supabase / Postgres conventions

Verify CLI flags against `supabase --help` for the installed version; project conventions in CLAUDE.md win.

## Migrations
- Create with `supabase migration new <name>`; write plain SQL; apply locally with `supabase db reset` (local only!) or `supabase migration up`.
- Never edit a migration that has been applied anywhere else. Fix forward with a new migration.
- Pushing to a linked remote project (`supabase db push`) is a **production action**: prepare it, never run it without Dex.
- After schema changes regenerate types (e.g. `supabase gen types typescript --local > <types path>`) and commit them.

## Row-level security
- `alter table ... enable row level security;` on every table in exposed schemas, in the same migration that creates the table.
- Separate policies per operation (`select`, `insert`, `update`, `delete`) and per role; `using` for row visibility, `with check` for writes.
- Multi-tenant pattern: a `tenant_id` column, membership table, and policies that check membership via a `security definer` helper with a fixed `search_path`. Index the columns policies filter on.
- Wrap `auth.uid()` as `(select auth.uid())` in policies so it's evaluated once per statement.
- The `service_role` key bypasses RLS: only on the server, never in clients or logs.
- Test policies: as user A you cannot read/write tenant B's rows.

## Functions & triggers
- `security definer` functions always `set search_path = ''` (or a fixed schema) and fully qualify objects.
- Keep business logic in the backend unless there's a clear reason (atomicity, RLS helper, trigger-maintained columns).

## pgvector
- `create extension if not exists vector;` (in the schema the project uses for extensions).
- Column `vector(<dim>)` with dim = the embedding model's output dimension.
- Index: HNSW (`using hnsw (embedding vector_cosine_ops)`) as default for good recall without training; IVFFlat only for very large, mostly static tables.
- Match operator to the opclass: `<=>` cosine, `<#>` negative inner product (normalized embeddings), `<->` L2.
- Search through an RPC function that applies the **tenant filter** and a `limit`; tune `hnsw.ef_search` when recall is low. Store model name/version next to embeddings so you can re-embed.

## Storage & auth
- Storage buckets private by default with RLS policies on `storage.objects`; signed URLs for temporary access.
- Never trust `user_metadata` for authorization (it's user-editable); use `app_metadata` or tables.
