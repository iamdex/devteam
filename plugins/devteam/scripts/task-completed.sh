#!/usr/bin/env bash
# TaskCompleted hook: quality gate. Runs the project's checks from .claude/devteam.json
# before an implementation task can be marked completed. Exit 2 keeps the task open.
. "$(dirname "$0")/lib.sh"

[ "$DEVTEAM_JSON" = "none" ] && { echo "DevTeam gate skipped: install jq or python3 to enable it." >&2; exit 0; }
is_team_task || exit 0
[ "$(config_get gateTasks true)" = "true" ] || exit 0
subject_is_skipped && exit 0

checks="$(config_checks)"
[ -n "$checks" ] || exit 0

timeout_s="$(config_get checkTimeoutSeconds 600)"
subject="$(input_get task_subject)"
cd "$DEVTEAM_PROJECT_DIR" || exit 0

failed=0
report=""
while IFS=$'\t' read -r name cmd; do
  [ -z "$cmd" ] && continue
  out="$(run_with_timeout "$timeout_s" "$cmd" 2>&1)"
  code=$?
  if [ $code -ne 0 ]; then
    failed=1
    [ $code -eq 124 ] && reason="timed out after ${timeout_s}s" || reason="exit code $code"
    report+=$'\n'"✗ ${name} (\`${cmd}\`) — ${reason}"$'\n'"$(printf '%s\n' "$out" | tail -n 40)"$'\n'
  fi
done <<< "$checks"

if [ $failed -ne 0 ]; then
  {
    echo "DevTeam quality gate: task \"$subject\" cannot be completed yet — project checks fail."
    printf '%s\n' "$report"
    echo "Fix the failures in files you own, then mark the task completed again."
    echo "If a failure is in files owned by another teammate, message that owner with the evidence (and tell the lead) instead of editing their files."
  } >&2
  exit 2
fi
exit 0
