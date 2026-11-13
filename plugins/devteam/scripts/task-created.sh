#!/usr/bin/env bash
# TaskCreated hook: enforce the DevTeam task format so every task has an owner and owned files.
. "$(dirname "$0")/lib.sh"

[ "$DEVTEAM_JSON" = "none" ] && exit 0
[ -n "$(input_get team_name)" ] || exit 0                       # only inside an agent team
[ "$(config_get requireTaskOwnership true)" = "true" ] || exit 0

subject="$(input_get task_subject)"
desc="$(input_get task_description)"
problems=()

printf '%s' "$desc" | grep -qiE '(^|[[:space:]])owner:' || problems+=("missing 'Owner: <teammate name>'")
if ! subject_is_skipped; then
  printf '%s' "$desc" | grep -qiE '(^|[[:space:]])files:' || problems+=("missing 'Files: <paths or globs this task owns>'")
  printf '%s' "$desc" | grep -qiE '(^|[[:space:]])acceptance:' || problems+=("missing 'Acceptance: <criteria>'")
fi

if [ ${#problems[@]} -gt 0 ]; then
  {
    echo "DevTeam: task \"$subject\" rejected — ${problems[*]}."
    echo "Every task description needs lines like:"
    echo "  Owner: backend"
    echo "  Files: apps/api/src/billing/**"
    echo "  Acceptance: POST /invoices returns 201 with ...; tests in apps/api/test/billing pass"
    echo "No two tasks may own the same files. Review/plan/research tasks only need 'Owner:'."
  } >&2
  exit 2
fi
exit 0
