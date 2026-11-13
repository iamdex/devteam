---
name: definition-of-done
description: The DevTeam's definition of done — the checklist every engineer applies before reporting a task complete or marking it completed in the shared task list. Use before saying "done", before a handoff, and when judging someone else's work.
---

# Definition of Done

A task is done only when **all** of these are true. "Should work" is not evidence.

## Scope
- [ ] Every acceptance criterion of the task is met — map each one to the evidence that proves it.
- [ ] Only files you own were changed (`git diff --stat` to check). Anything else was requested from its owner.
- [ ] No scope creep: unrelated refactors, renames or "while I was there" changes are left out (propose them as follow-ups).

## Quality
- [ ] Type check passes.
- [ ] Linter/formatter passes with no new warnings.
- [ ] Tests for the new behaviour exist and pass; the existing suite still passes. Run them — the commands are in the `## DevTeam` section of CLAUDE.md.
- [ ] Error paths are handled: invalid input, third-party failure/timeout, empty data, unauthorized caller.
- [ ] No debug leftovers: `console.log`/`Debug.WriteLine` noise, commented-out code, TODOs without an owner, temporary flags.

## Safety
- [ ] No secrets, tokens or personal data in code, logs, test fixtures or error messages.
- [ ] Authorization and tenant scoping applied server-side where data is read or written.
- [ ] Migrations are safe on existing data and have a rollback/forward-fix plan.
- [ ] No new dependency without a stated reason; lockfile updated consistently.

## Communication
- [ ] Contracts you changed were sent to their consumers (`[CONTRACT]`).
- [ ] Final report contains: **files changed**, **commands run with results**, **known limitations / follow-ups**, **anything Dex must do manually** (env vars, migrations on prod, deploy steps).
- [ ] Task status updated in the shared task list (if you have the Task tools).

If something can't be satisfied, don't hide it: report the task as done-with-exceptions and list them, or as blocked.
