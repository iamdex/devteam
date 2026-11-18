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

- **Stack & versions:** package manifests (`package.json`, lockfile type, `*.csproj`, `*.xcodeproj`/`Package.swift`, `app.json`/`app.config.*`, `eas.json`, `supabase/config.toml`, `Dockerfile`, `docker-compose*.yml`, `.github/workflows/*`).
- **Monorepo layout:** workspaces, apps, packages, shared types.
- **Commands that actually exist:** install, dev, typecheck, lint, test (unit/e2e), build, DB (migrate, generate types). Prefer the scripts already defined; don't invent any. **Never copy the template's example commands into a project that doesn't have them** — a gate running a command that doesn't exist blocks every task.
- **Package manager — read it from the repo, don't assume:** `bun.lock`/`bun.lockb` → bun, `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `package-lock.json` → npm. The lockfile wins even if Dex prefers otherwise; switching a project's package manager is a separate decision, not part of onboarding. Only when there is no lockfile at all (new project) default to **bun**. Never mix two in the same repo.
- **.NET repos:** find the solution/projects (`*.sln`, `*.slnx`, `*.csproj`) and the target framework. Typical commands: `dotnet build -warnaserror`, `dotnet test`, `dotnet format --verify-no-changes` (lint), `dotnet ef migrations add/script` (data). There is no separate typecheck step — the build *is* the type check, so don't invent one. Note the test runner (xUnit/NUnit) and whether integration tests need Docker (Testcontainers), because that changes how long the gate takes.
- **Mixed stacks (e.g. ASP.NET Core API + Next.js front end):** these have two command sets and two lockfile/manifest worlds. Record both in the Commands table with their working directory, and put both in the gate only if each is fast; otherwise gate the one the team touches most and let QA run the rest.
- **Conventions:** folder structure, naming, error handling, validation library, state management, styling, test framework, commit style (`git log --oneline -30`).
- **Environments:** `.env.example`, required env vars (names only — never read or print secret values), deploy target.
- **Sensitive areas:** auth, payments, tenant isolation, migrations, LLM prompts.

Then run the typecheck/lint/test commands you found once, so you know which ones work and how long they take.

## 2. Propose

Show Dex a draft of both files and ask for confirmation before writing. Ask only about things you could not determine.

### `## DevTeam` section for CLAUDE.md

Use `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.devteam.md` as the template. Keep it **short and factual** (under ~80 lines): it is loaded into every teammate's context. The ownership map assigns directories/globs to roles (product, architect, backend, data, frontend, mobile, ios, devops, store, growth, qa); every source directory should have exactly one owner.

If `CLAUDE.md` exists, add or replace only the `## DevTeam` section and keep everything else untouched. If it doesn't exist, create it with a one-line project description followed by the section.

### `.claude/devteam.json`

Use `${CLAUDE_PLUGIN_ROOT}/templates/devteam.json` as the template — its `checks` are a **placeholder to replace**, not a default to keep. `checks` lists the commands the TaskCompleted gate runs before an implementation task can be marked complete — only fast, reliable ones (typecheck, lint, unit tests), each one you ran successfully in step 1, with the package manager this repo actually uses. Leave slow e2e suites out of the gate; QA runs them. Drop the `_note` key when you write the file.

Examples of a filled-in `checks`, by stack:

```jsonc
// Node + bun                          // Node + pnpm (lockfile says so)
"bun run typecheck" / "bun run lint"   "pnpm typecheck" / "pnpm lint" / "pnpm test"
"bun test"

// .NET                                // ASP.NET Core API + Next.js front end
"dotnet build -warnaserror"            "dotnet build -warnaserror"
"dotnet format --verify-no-changes"    "bun run --cwd web typecheck"
"dotnet test"                          "dotnet test --filter Category!=Integration"
```

## 3. Write and verify

- Write the files after Dex confirms.
- Run each command in `checks` once more and report which pass. If the project is currently red, tell Dex: the gate will block every task until it's green (he can set `"gateTasks": false` temporarily).
- Suggest committing both files so the team has the same context on every machine.
