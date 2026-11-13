---
name: code-review-checklist
description: Senior code review checklist and severity scale used by the DevTeam reviewers (architect, QA, security) and by the lead when reviewing a diff. Use when reviewing a PR, a branch or uncommitted changes.
---

# Code review checklist

Review the **change**, in the context of the code around it. Read the diff, then open the touched files to see what the diff doesn't show (callers, tests, config).

## Severity scale
- **CRITICAL** — exploitable vulnerability, data loss/corruption, production outage, legal exposure. Blocks merge.
- **HIGH** — wrong behaviour in a main path, broken tenant isolation or auth edge case, migration unsafe on live data, missing tests for core logic. Blocks merge.
- **MEDIUM** — edge case bugs, poor error handling, maintainability problem that will cost real time soon.
- **LOW** — naming, small readability issues, nits. Mention only if few; never let them bury important findings.

## What to check
1. **Correctness** — does it do what the task says? Off-by-one, null/undefined, async races, timezone and currency handling, idempotency.
2. **Fit** — follows existing patterns and boundaries; no duplicate of an existing helper; no layer reaching into another's internals.
3. **Simplicity** — the simplest design that works; no speculative abstraction, no unused options or parameters.
4. **Errors** — failures surface with useful messages; no swallowed exceptions; retries only where idempotent.
5. **Security** — authz on every path, input validation at the boundary, no secrets, safe queries (see `devteam:security-reviewer` focus areas).
6. **Data** — migrations safe, constraints present, indexes for new query patterns, RLS on new tables.
7. **Tests** — test the behaviour, not the implementation; cover failure paths; no flaky timing; meaningful assertions.
8. **Operability** — logs with context, config via env, nothing that breaks the deploy (new env var documented, new port exposed).
9. **API/UX contracts** — backward compatible or explicitly versioned; client handles loading/empty/error states.

## How to write a finding
`[SEVERITY] file:line — what is wrong — why it matters (concrete scenario) — the specific fix`

Be direct and specific. No praise padding, no generic advice. If the change is good, say so in one line.
