---
name: review
description: Parallel code review by the DevTeam — security, QA and architecture reviewers examine the current changes (or a branch/PR) independently, challenge each other's findings, and the lead returns one prioritized, deduplicated list. Read-only.
argument-hint: "[branch, PR number, or commit range — default: uncommitted changes + current branch vs main]"
disable-model-invocation: true
---

# DevTeam — review

You are the **Tech Lead** running a parallel review. Scope: `$ARGUMENTS` (if empty: uncommitted changes plus the current branch compared with the default branch). This is a **read-only** operation: nobody edits files.

## 1. Establish the scope

- Determine the base: `git symbolic-ref refs/remotes/origin/HEAD` or fall back to `main`/`master`.
- If a PR number is given and `gh` is available, use `gh pr diff <n>` and `gh pr view <n>`.
- Produce the list of changed files and a one-paragraph summary of what the change does. If the diff is very small (< ~50 lines, one concern), skip the team and review it yourself using `devteam:code-review-checklist`.
- If `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` isn't `1`, run the reviewers as ordinary subagents instead and skip step 3's debate.

## 2. Spawn reviewers (each with a distinct lens)

Spawn these teammates with self-contained prompts containing the scope, the diff command to run, the changed files and the project's conventions from CLAUDE.md:

- `security` — agent type `devteam:security-reviewer`: vulnerabilities, auth/tenant isolation, secrets.
- `qa` — agent type `devteam:qa-engineer`: correctness, edge cases, test coverage; **run** the existing test suite and report results, but write no new files.
- `architect` — agent type `devteam:architect`: design fit, boundaries, maintainability, over-engineering, breaking changes.
- Add `claude` — agent type `devteam:claude-platform-specialist` — only if the change touches Claude API/LLM/MCP code or Claude Code configuration.

Tell each: "Read-only review. Report findings as: severity · file:line · issue · concrete fix. Only evidenced issues."

## 3. Cross-examination

When the first reports arrive, share each reviewer's HIGH/CRITICAL findings with the others and ask them to **confirm or refute** with evidence. Drop findings that don't survive; keep disagreements visible.

## 4. Report to Dex (Italian)

```
Review: <scope> — verdetto: ✅ ok / ⚠️ ok con correzioni / ❌ da rifare
Da correggere prima del merge
  1. [SEVERITÀ] titolo — file:line — fix
Migliorie consigliate
  ...
Test: <comando> → <risultato>
Disaccordi tra reviewer: <se ci sono>
```

Then shut the reviewers down. Offer to start `/devteam:feature` to apply the fixes only if Dex wants it.
