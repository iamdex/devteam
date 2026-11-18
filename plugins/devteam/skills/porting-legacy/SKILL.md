---
name: porting-legacy
description: DevTeam playbook for porting a legacy application to a modern stack — inventory before code, strangler-fig cutover, characterization tests as the parity oracle, and the specific traps of ASP.NET WebForms/VB.NET front ends with business logic living in T-SQL stored procedures, moving to ASP.NET Core and Next.js. Use when planning, executing or reviewing a migration of an existing system.
---

# Porting a legacy application

A port is not a feature. The success criterion is **observable parity**: the new system produces the same results as the old one for the same inputs, including the behaviour nobody documented. Everything else — nicer architecture, cleaner names, new UX — is a separate decision that happens *after* parity, or is explicitly approved as part of the scope.

## Non-negotiables

- **No opportunistic refactoring during a port.** Porting and improving at the same time means that when output differs you cannot tell which change caused it. Port faithfully, record the improvement as a follow-up task.
- **Parity is proven, not asserted.** Before porting a behaviour, capture what the legacy system actually does (characterization tests / golden master). A port with no oracle is a rewrite with extra steps.
- **Bug-for-bug by default.** A legacy quirk other code depends on is a feature until the lead confirms with Dex that it can change. Keep a `PORTING-DECISIONS.md` with every deliberate divergence.
- **Never work against the live legacy system.** Analysis, scaffolding and data profiling run on a **restored copy**. Touching production belongs to the lead and Dex.
- **Ship in slices.** A big-bang cutover with no rollback path is rejected by default; the system must be releasable at every step.

## Phase 0 — Inventory before any code

Produce a written inventory first; the architect's task breakdown depends on it.

- **Surface area:** pages/screens, endpoints, scheduled jobs, reports, exports, integrations, and who actually uses them. Usage data beats opinion — include access logs when they exist.
- **Database as the real application.** When most of the code is T-SQL, the inventory *is* the port plan:
  - list modules: `SELECT o.type_desc, s.name, o.name, m.definition FROM sys.sql_modules m JOIN sys.objects o ON o.object_id = m.object_id JOIN sys.schemas s ON s.schema_id = o.schema_id;`
  - what actually runs: `sys.dm_exec_procedure_stats` / Query Store (execution counts, last execution, total worker time) — on a copy with representative stats, or captured from production by the lead.
  - dependencies: `sys.dm_sql_referenced_entities` / `sys.sql_expression_dependencies`, plus triggers, views, functions, SQL Agent jobs, linked servers, and `xp_`/`sp_OA` calls.
  - flag the dangerous ones: dynamic SQL, cursors, `SELECT *`, business rules embedded in triggers, `GETDATE()` in the middle of logic (untestable), email/file side effects from inside the database.
- **Dead code is the cheapest win.** Anything with zero executions in a full business cycle is a candidate for "do not port" — list it, let Dex confirm, and record the decision rather than quietly dropping it.
- **Data profile:** row counts, growth, nullability in practice vs schema, duplicate/orphan rows, encodings and collations. The legacy schema is the schema you inherit; see `devteam:stack-sqlserver`.

## Decide, per stored procedure, where logic will live

This is the central decision of this port, and it is per-object, not global:

| Verdict | When | Target |
|---|---|---|
| **Keep in T-SQL** | Set-based work over large volumes, batch/report jobs, logic that would be slow or chatty in C# | Stays a procedure, called through an explicit repository method |
| **Wrap, then port later** | Complex, well-tested, called from one place; port is risky now | Called from C# behind an interface; scheduled as a follow-up |
| **Port to C#** | Business rules, validation, orchestration, anything needing unit tests, branching on application state | Domain/application layer with EF Core for access |
| **Delete** | Unused, duplicated, or superseded | Not ported — recorded in `PORTING-DECISIONS.md` |

Rules: a procedure doing both set-based work **and** business rules gets split, not copied. Nothing moves to C# without characterization tests covering it first. Keeping a procedure is a legitimate engineering answer — rewriting 80% T-SQL into LINQ "because it's cleaner" is how ports fail on performance.

## VB.NET → C#

- There is **no VB path on ASP.NET Core**: VB.NET runs on modern .NET for libraries and desktop, but web projects are C#. WebForms itself does not exist on .NET Core, so there is no lift-and-shift — the UI is rebuilt (here: Next.js) and the server becomes an API.
- Traps that change behaviour silently when translated:
  - `On Error Resume Next` / `On Error GoTo` — every one of them hides a decision. Make the error handling explicit; never translate into a swallowed `catch`.
  - `Option Strict Off` late binding and implicit conversions (`"1" + 1`), VB's permissive `CType`/`CDate` parsing, and culture-dependent conversions. Pin the culture explicitly — a legacy app often relies on the server's Italian locale for dates and decimal separators.
  - `Nothing` is not `null`: for value types `Nothing` is the default value, and `Nothing = Nothing` comparisons behave differently. `DBNull.Value` vs `null` must be handled at every data boundary.
  - `=` is comparison *and* assignment; string comparison in VB may be case-insensitive by project setting, while C# and some SQL Server collations differ — verify, don't assume.
  - Default-lower-bound arrays (`Dim a(10)` has 11 elements), `Mid`/`Left`/`Right` are 1-based. `Microsoft.VisualBasic` is available on modern .NET for a faithful first pass; treat it as a transition crutch, not a destination.
- Translate module by module with the characterization tests green at each step; do not reorganize namespaces during translation.

## WebForms → Next.js

- **The postback model has no equivalent.** ViewState, `IsPostBack`, server controls, `UpdatePanel` and the page lifecycle collapse into: an HTTP API (ASP.NET Core) plus client state (see `devteam:stack-react-web`). Map each page to the data it reads and the commands it issues — that mapping *is* the API contract, published by `backend-engineer`.
- Mechanical equivalents: master pages → layouts; `GridView`/`Repeater` → a table with server-side pagination (keyset, not `OFFSET` over big tables); server-side validators → one validation schema shared by client and server, enforced server-side regardless; `Session`/`Application` state → explicit tokens/claims and server state, never implicit per-user memory on a multi-instance deployment.
- `FormsAuthentication` cookies → the new auth scheme; plan the transition for already-logged-in users and for password hashes that may use a legacy algorithm (migrate on next successful login, never invent a conversion).
- Legacy client JavaScript is usually inline and jQuery-era: port the *rules*, not the code. Inline `onclick` handlers, client-only validation and generated control ids do not survive; any rule that only existed client-side must be re-implemented server-side as well — treat it as a security finding if it was ever the only check (`security-reviewer`).
- Culture and formatting: dates, decimal separators, currency and sort order must match what users see today. Lock the locale in tests.

## Parity oracle — characterization tests

- For each unit being ported, capture real inputs and real outputs from the restored copy **before** writing new code: procedure results (result sets, output parameters, affected rows), page outputs, report figures, exported file bytes.
- Golden-master comparison: run legacy and new side by side on the same anonymized data set and diff. Differences are either a bug in the port or a recorded, approved decision — never "probably fine".
- Pin non-determinism: inject clock and GUID generation, freeze `GETDATE()`-derived values, sort before comparing, normalize floating point and trailing whitespace.
- Reports and financial totals get exact comparison on a full period, not a sample.

## Cutover — strangler fig

- Route by feature, not by big bang: a reverse proxy/router sends ported paths to the new app and everything else to the legacy one. Both run against **one** database for as long as both exist — two writable copies is a data-loss design.
- Order slices by (low risk × high usage) first, to build confidence and exercise the new plumbing early. Keep a per-slice rollback: flip the route back.
- Schema changes during the transition stay compatible with both systems (expand → migrate → contract, `data-engineer` owns the migrations, `devops-engineer` the deploy step).
- Shadow-run the risky slices where feasible: new path executes read-only alongside the legacy one and differences are logged, before it serves users.
- Decommission only after a full business cycle (month-end, year-end, the annual report nobody mentioned) has run green on the new path. Keep the legacy system readable, not runnable, after that.

## Reporting a ported slice

Done means: characterization tests committed and green, parity diffs empty or explained in `PORTING-DECISIONS.md`, performance compared against the legacy path on realistic volumes (a port that is correct and 10× slower is not done), rollback verified, and the slice behind its route flag. Then apply `devteam:definition-of-done`.
