---
name: onboard
description: Onboard the DevTeam onto the current repository — analyze stack, structure and commands, then write a "## DevTeam" section in CLAUDE.md (stack, commands, conventions, file ownership map) and a .claude/devteam.json with the quality-gate checks.
disable-model-invocation: true
---

# DevTeam — onboard this repository

Goal: give every teammate the project context they can't get from the conversation. Teammates load `CLAUDE.md` automatically, and the plugin's quality-gate hooks read `.claude/devteam.json`.

Talk to Dex in Italian; write the files in English.

## 1. Analyze (read-only)

Explore efficiently (use the Explore subagent for large repos):

- **Stack & versions:** package manifests (`package.json`, lockfile type, `*.csproj`, `app.json`/`app.config.*`, `supabase/config.toml`, `Dockerfile`, `docker-compose*.yml`, `.github/workflows/*`).
- **Monorepo layout:** workspaces, apps, packages, shared types.
- **Commands that actually exist:** install, dev, typecheck, lint, test (unit/e2e), build, DB (migrate, generate types). Prefer the scripts already defined; don't invent any.
- **Conventions:** folder structure, naming, error handling, validation library, state management, styling, test framework, commit style (`git log --oneline -30`).
- **Environments:** `.env.example`, required env vars (names only — never read or print secret values), deploy target.
- **Sensitive areas:** auth, payments, tenant isolation, migrations, LLM prompts.

Then run the typecheck/lint/test commands you found once, so you know which ones work and how long they take.

## 2. Propose

Show Dex a draft of both files and ask for confirmation before writing. Ask only about things you could not determine.

### `## DevTeam` section for CLAUDE.md

Use `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.devteam.md` as the template. Keep it **short and factual** (under ~80 lines): it is loaded into every teammate's context. The ownership map assigns directories/globs to roles (architect, backend, data, frontend, devops, qa); every source directory should have exactly one owner.

If `CLAUDE.md` exists, add or replace only the `## DevTeam` section and keep everything else untouched. If it doesn't exist, create it with a one-line project description followed by the section.

### `.claude/devteam.json`

Use `${CLAUDE_PLUGIN_ROOT}/templates/devteam.json` as the template. `checks` lists the commands the TaskCompleted gate runs before an implementation task can be marked complete — only fast, reliable ones (typecheck, lint, unit tests). Leave slow e2e suites out of the gate; QA runs them.

## 3. Write and verify

- Write the files after Dex confirms.
- Run each command in `checks` once more and report which pass. If the project is currently red, tell Dex: the gate will block every task until it's green (he can set `"gateTasks": false` temporarily).
- Suggest committing both files so the team has the same context on every machine.
