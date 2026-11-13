---
name: setup
description: One-time setup of the DevTeam on this machine — enable Claude Code agent teams, choose the display mode, pre-approve safe commands to reduce permission prompts, and check prerequisites.
disable-model-invocation: true
---

# DevTeam — setup

Talk to Dex in Italian. Show every change to a settings file as a diff and get his confirmation before writing it.

## 1. Check prerequisites

- `claude --version` — agent teams need a recent Claude Code (2.1.32+; split-pane fixes and model-selection rules used by this plugin assume a current release). If it's old, suggest updating.
- `jq --version` (optional; the hook scripts fall back to python3 or node).
- `tmux -V` (optional, only for split-pane mode).

## 2. Enable agent teams

Agent teams are experimental and off by default. A plugin can't set environment variables, so this goes in the **user** settings file `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Merge it with the existing content (create the file if missing; preserve every other key).

Note for Dex: while agent teams are enabled, when Claude names a subagent it launches as a teammate. That's expected; if he ever wants plain subagents back for a project, he can set the variable to `"0"` in that project's `.claude/settings.local.json`.

## 3. Display mode (ask Dex)

- **in-process** (default): everything in one terminal; ↑/↓ to select a teammate, Enter to talk to it, Ctrl+T for the task list. Works everywhere, including remote sessions and code-server.
- **auto**: split panes when running inside tmux or iTerm2 with `it2`; otherwise in-process.

If he picks auto, add `"teammateMode": "auto"` to `~/.claude/settings.json`.

## 4. Reduce permission prompts (optional, ask Dex)

Teammates' permission prompts bubble up to the lead. Propose a conservative allow-list in `~/.claude/settings.json` under `permissions.allow`, limited to read-only and test commands, for example:

```json
"permissions": {
  "allow": [
    "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)",
    "Bash(npm run typecheck:*)", "Bash(npm run lint:*)", "Bash(npm test:*)",
    "Bash(pnpm typecheck:*)", "Bash(pnpm lint:*)", "Bash(pnpm test:*)",
    "Bash(dotnet build:*)", "Bash(dotnet test:*)"
  ]
}
```

Never add push, deploy, `rm`, database reset or production commands to the allow-list.

## 5. Finish

Tell Dex to **restart Claude Code**, then in each project run `/devteam:onboard` once, and use `/devteam:feature`, `/devteam:review`, `/devteam:debug`.
