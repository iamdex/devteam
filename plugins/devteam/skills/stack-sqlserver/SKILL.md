---
name: stack-sqlserver
description: DevTeam conventions for SQL Server with EF Core — DbContext and model configuration, migrations on live data, scaffolding an existing legacy database, indexes and execution plans, multi-tenancy, raw SQL safety, connection strings and testing. Use when designing schema, writing migrations or queries, or reviewing data access in a SQL Server / .NET project.
---

# SQL Server / EF Core conventions

Match the EF Core and SQL Server versions already in the project (`.csproj`, `docker-compose`, target server edition); check `dotnet ef --help` for the installed tool version. Project conventions in CLAUDE.md win.

## Ownership boundary
- The data engineer owns the **schema**: entity configurations, migrations, indexes, seed/backfill scripts, database projects.
- The backend engineer owns **queries and business logic** against that schema (`DbSet` usage, LINQ, DTO projections, repositories/handlers).
- The `DbContext` class sits on the boundary: data engineer defines the model (`OnModelCreating` / `IEntityTypeConfiguration<T>`), backend adds nothing to it without a `[QUESTION]`.

## Model configuration
- One `IEntityTypeConfiguration<T>` per entity in `Infrastructure/Persistence/Configurations/`; `ApplyConfigurationsFromAssembly` in `OnModelCreating`. No attribute/fluent mix for the same concern.
- Types: `datetime2` (never `datetime`), `decimal(18,2)` or integer minor units for money — never `float`; `nvarchar(n)` with an explicit length (`nvarchar(max)` only when genuinely unbounded); `bit` for booleans.
- Keys: `int`/`bigint` IDENTITY, or `uniqueidentifier` with **sequential** GUIDs (`NEWSEQUENTIALID()` / `Guid.CreateVersion7()`) — a random GUID clustered key fragments the index.
- Concurrency: `rowversion` (`IsRowVersion()`) on entities that can be edited concurrently; handle `DbUpdateConcurrencyException` explicitly.
- Collation and case sensitivity: inherit the database default, state it in CLAUDE.md. Do not rely on SQL Server's case-insensitive comparison in code that must also run on Postgres.
- Deletes: `DeleteBehavior` set explicitly on every relationship — SQL Server rejects multiple cascade paths, so prefer `Restrict`/`NoAction` plus explicit cleanup.

## Migrations
- `dotnet ef migrations add <Name> -p <Infrastructure> -s <Api>`; **read the generated SQL** (`dotnet ef migrations script --idempotent`) before applying. One concern per migration. Never edit an applied migration — fix forward.
- Apply locally with `dotnet ef database update`. Applying to a shared or production database is a **production action**: produce the idempotent script, explain impact and rollback, escalate to the lead. Never `EnsureDeleted`/`EnsureCreated` outside tests.
- Safe on live data: add columns nullable (or with a default) first, backfill in batches, then tighten; expand → migrate → contract across releases for renames and drops.
- `ONLINE = ON` for index creation when the edition supports it (Enterprise/Azure SQL); otherwise schedule the lock window. `WITH (ONLINE = ON)` goes in a raw `migrationBuilder.Sql(...)` — EF does not emit it.
- Backfills as explicit idempotent batched SQL (`UPDATE TOP (5000) … WHERE <not yet done>` in a loop), not a single statement over millions of rows.

## Porting from an existing database
- Scaffold first, by hand second: `dotnet ef dbcontext scaffold "<conn>" Microsoft.EntityFrameworkCore.SqlServer --use-database-names --no-onconfiguring -o <out>` against a **restored copy**, never the live system.
- Treat scaffolded output as a starting point: rename to the project's conventions, split into configurations, and keep a mapping table (legacy name → new name) in the design doc.
- Legacy schemas usually carry what EF cannot express: triggers, computed columns, views, stored procedures. Map views as keyless entities (`HasNoKey().ToView(...)`), computed columns with `ValueGeneratedOnAddOrUpdate()`, and keep procedures behind an explicit repository method.
- Decide per table: migrate the data, or keep reading it in place during the transition. Write that decision down — it drives the cutover plan.
- The first migration against an existing database is a **baseline**: generate it, then mark it applied (`dotnet ef migrations add Initial` + script the `__EFMigrationsHistory` insert, or `--idempotent`) instead of recreating tables.

## Queries and performance
- `AsNoTracking()` for read-only queries; project to DTOs with `Select` — never return entities over the wire.
- No N+1: check the generated SQL for hot paths (`.ToQueryString()`, EF logging at `Information`). `Include` only what you project; prefer split queries (`AsSplitQuery()`) when a join explodes rows.
- No client-side evaluation on a hot path; keep `Where` translatable. Paginate with keyset pagination (`WHERE (sortKey, id) > (@k, @id)`) rather than large `OFFSET`.
- Index for the queries that exist: read the actual execution plan (SSMS/Azure Data Studio, or `SET STATISTICS IO, TIME ON`) before and after. Covering indexes with `INCLUDE` for frequent read paths; one clustered index chosen deliberately.
- Beware parameter sniffing on skewed data: `OPTIMIZE FOR UNKNOWN` or `RECOMPILE` as a documented, measured exception.
- Long transactions hold locks: keep them short, set an explicit isolation level when the default matters, and consider `READ_COMMITTED_SNAPSHOT` for read-heavy workloads (database-wide decision — escalate it).

## Security
- SQL Server has no Supabase-style RLS by default: **every query is scoped to the tenant in application code**, and a missing tenant filter is a security bug. Enforce it structurally — a global query filter (`HasQueryFilter`) plus a tenant accessor — and test that tenant A cannot read tenant B. Native Row-Level Security policies are an option for defence in depth; only with the lead's agreement.
- Raw SQL only with parameters: `FromSql`/`ExecuteSql` interpolated forms or `FromSqlRaw(sql, params)`. String-concatenated SQL is a release blocker. Never interpolate an identifier from user input.
- Connection strings live in configuration/secrets (user-secrets locally, env/Key Vault deployed), never in source or logs. The application login is **not** `sa` and has only the permissions it needs (`db_datareader`/`db_datawriter` + explicit EXECUTE), with a separate migration login.
- `Encrypt=True` in connection strings; `TrustServerCertificate=True` only for local development.
- No PII in logs or in migration scripts committed to the repo.

## Testing
- Integration tests against a **real SQL Server** via Testcontainers (`mssql/server` image) — not the in-memory provider, which hides translation and constraint behaviour.
- Each test gets a clean database state (respawn/truncate or a fresh container per class); run migrations as part of test setup so migrations are tested too.
- Verify the generated SQL for queries that matter (`ToQueryString()`), and that destructive migrations behave on a copy of realistic data before the release.
