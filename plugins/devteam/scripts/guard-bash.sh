#!/usr/bin/env bash
# PreToolUse(Bash) guard: blocks commands that are irreversible, touch production,
# or would destroy teammates' uncommitted work. Exit 2 blocks the call; stderr goes back to Claude.
# Disable with DEVTEAM_GUARD=0 in the environment or "guard": false in .claude/devteam.json.
. "$(dirname "$0")/lib.sh"

[ "${DEVTEAM_GUARD:-1}" = "0" ] && exit 0
[ "$DEVTEAM_JSON" = "none" ] && exit 0
[ "$(config_get guard true)" = "true" ] || exit 0

cmd="$(jget "$DEVTEAM_INPUT" tool_input.command)"
[ -z "$cmd" ] && exit 0
# Normalise whitespace for matching.
c="$(printf '%s' "$cmd" | tr '\n\t' '  ' | tr -s ' ')"

block() {
  {
    echo "DevTeam guard blocked this command: $1"
    echo "  $cmd"
    echo "This needs Dex. Explain what you want to do and why, and ask him (through the lead if you are a teammate) to run it himself or approve it explicitly."
  } >&2
  exit 2
}

shopt -s nocasematch
# git: history rewrite on remotes and anything that wipes the shared working tree
[[ "$c" =~ git[[:space:]].*push.*(--force|--force-with-lease|[[:space:]]-f([[:space:]]|$)|[[:space:]]\+[^[:space:]]+) ]] && block "force push"
[[ "$c" =~ git[[:space:]]+reset[[:space:]].*--hard ]] && block "git reset --hard discards uncommitted work (including teammates')"
[[ "$c" =~ git[[:space:]]+clean[[:space:]].*-[a-z]*f ]] && block "git clean deletes untracked files (including teammates')"
[[ "$c" =~ git[[:space:]]+(checkout|restore)[[:space:]]+(--[[:space:]]+)?\.([[:space:]]|$) ]] && block "discarding all working-tree changes (including teammates')"
[[ "$c" =~ git[[:space:]]+stash([[:space:]]|$) ]] && [[ ! "$c" =~ git[[:space:]]+stash[[:space:]]+(list|show) ]] && block "git stash moves teammates' uncommitted work out of the working tree"
shopt -u nocasematch
[[ "$c" =~ git[[:space:]]+branch[[:space:]].*(-D|--delete[[:space:]].*--force) ]] && block "force-deleting a branch"
shopt -s nocasematch

# filesystem catastrophes
[[ "$c" =~ rm[[:space:]]+(-[a-z]*[[:space:]]+)*-[a-z]*r[a-z]*[[:space:]]+(-[a-z]*[[:space:]]+)*(/|/\*|~|~/|\$HOME|\$\{HOME\}|\.\./?|\*)([[:space:]]|$) ]] && block "recursive delete of a root, home, parent or wildcard path"

# databases
[[ "$c" =~ supabase[[:space:]]+db[[:space:]]+push ]] && block "pushing migrations to a remote Supabase project (production action)"
[[ "$c" =~ supabase[[:space:]]+(db[[:space:]]+reset|migration[[:space:]]+repair).*(--linked|--db-url) ]] && block "resetting/repairing a remote Supabase database"
[[ "$c" =~ drop[[:space:]]+(database|schema[[:space:]]+(if[[:space:]]+exists[[:space:]]+)?public) ]] && block "dropping a database or the public schema"
[[ "$c" =~ (prisma[[:space:]]+migrate[[:space:]]+reset|prisma[[:space:]]+db[[:space:]]+push[[:space:]].*--accept-data-loss|dotnet[[:space:]]+ef[[:space:]]+database[[:space:]]+drop) ]] && block "destructive ORM database command"

# docker / servers
[[ "$c" =~ docker[[:space:]]+(system[[:space:]]+prune.*-a|volume[[:space:]]+(rm|prune)) ]] && block "deleting Docker volumes or all images"
[[ "$c" =~ docker[[:space:]]+compose.*down.*(-v|--volumes) ]] && block "docker compose down with volumes deletes data"
[[ "$c" =~ (^|[[:space:];&|])(ssh|scp|rsync)[[:space:]] ]] && block "remote server access (ssh/scp/rsync) — production servers are Dex's"

# publishing
[[ "$c" =~ (npm|pnpm|yarn)[[:space:]]+publish|eas[[:space:]]+submit|eas[[:space:]]+update.*--branch[[:space:]]+production ]] && block "publishing a package or a production app update"

exit 0
