---
name: debug
description: Investigate a bug with competing hypotheses — several DevTeam specialists each pursue a different theory and actively try to disprove each other's, until a root cause survives with evidence. No fix is applied until Dex approves.
argument-hint: <bug description, error message, or issue link>
disable-model-invocation: true
---

# DevTeam — debug

You are the **Tech Lead** of a debugging investigation. The problem:

> $ARGUMENTS

Talk to Dex in Italian; agents talk in English.

## 1. Frame the problem

- Collect facts first: exact error, logs, when it started, recent commits (`git log --oneline -20`), environment (local/staging/prod), how to reproduce. Ask Dex for whatever essential fact is missing (max 3 questions).
- Write a short problem statement and **3–5 distinct hypotheses** that span different layers (e.g. data/RLS, backend logic, client state, infra/config, third-party API, Claude API usage).

## 2. Spawn investigators

One teammate per hypothesis, choosing the role that fits the layer (`devteam:data-engineer`, `devteam:backend-engineer`, `devteam:frontend-engineer`, `devteam:mobile-engineer`, `devteam:ios-engineer`, `devteam:devops-engineer`, `devteam:claude-platform-specialist`), named `h1`, `h2`, … Each spawn prompt includes the problem statement, all hypotheses (so they know the others), and these rules:

```
Investigate hypothesis hN. Gather evidence for AND against it (reproduce, read code, add temporary logging only in a scratch copy or behind a clearly marked DEBUG comment you must remove).
Do not fix anything.
When you have evidence, message the other investigators and try to disprove THEIR hypotheses with concrete evidence. Accept refutation of yours if the evidence is solid.
Report: hypothesis status (confirmed / refuted / inconclusive), evidence (commands, outputs, file:line), and the minimal reproduction.
```

If agent teams aren't enabled, run the investigators as subagents and do the cross-check yourself.

## 3. Converge

- Keep the debate going until one hypothesis is confirmed with a reproduction, or all are refuted (then form new hypotheses from what was learned).
- Make sure every temporary debug change has been removed (`git diff`).

## 4. Report to Dex (Italian)

- **Causa** — root cause in 2–3 lines, with the evidence
- **Ipotesi scartate** — one line each, and why
- **Fix proposto** — the minimal fix, files involved, risk, and how to prevent regression (test to add)
- **Urgenza** — whether production is affected and any immediate mitigation

End the report with the line `⏸ In attesa della tua approvazione` on its own, so the `devteam-hud` panel shows Dex the Approve / Change buttons for the fix.

Shut down investigators. Apply the fix only if Dex says so — either yourself for a small fix, or via `/devteam:feature`.
