#!/usr/bin/env bash
S="$(cd "$(dirname "$0")/../plugins/devteam/scripts" && pwd)"
P=$(mktemp -d); mkdir -p $P/.claude
pass=0; fail=0
expect() { # name expected_code actual_code
  if [ "$2" = "$3" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL[$B] $1: expected $2 got $3"; fi; }
for B in jq python3 node; do
export DEVTEAM_JSON_BACKEND=$B CLAUDE_PROJECT_DIR=$P
# --- guard
g() { printf '{"tool_input":{"command":%s}}' "$(printf '%s' "$1" | jq -Rs .)" | $S/guard-bash.sh 2>/dev/null; echo $?; }
for c in "git push --force origin main" "git push -f" "git push origin +main" "git reset --hard HEAD~1" "git clean -fd" "git checkout -- ." "git restore ." "git stash" "git stash push -m x" "rm -rf /" "rm -rf ~" "rm -rf \$HOME" "rm -rf ../" "rm -rf *" "rm -fr /" "supabase db push" "supabase db reset --linked" "psql -c 'DROP DATABASE app'" "psql -c 'drop schema public cascade'" "npx prisma migrate reset" "docker volume rm x" "docker system prune -a -f" "docker compose down -v" "ssh root@1.2.3.4" "npm publish" "bun publish" "pnpm publish" "git branch -D feat" "fastlane deliver" "eas submit -p ios" "xcrun altool --upload-app -f a.ipa"; do
  expect "block: $c" 2 $(g "$c"); done
for c in "git push origin feature" "git status" "git stash list" "git checkout -b feat" "git checkout main" "rm -rf node_modules" "rm -rf ./dist" "supabase db reset" "supabase migration new x" "docker compose up -d" "docker compose down" "npm test" "ssh-keygen -t ed25519" "git branch -d merged" "echo drop table" "pnpm install" "fastlane test" "xcodebuild test -scheme App"; do
  expect "allow: $c" 0 $(g "$c"); done
# guard disabled via config
echo '{"guard": false}' > $P/.claude/devteam.json
expect "guard off" 0 $(g "git reset --hard")
rm $P/.claude/devteam.json
# --- task-created
tc() { printf '%s' "$1" | $S/task-created.sh 2>/dev/null; echo $?; }
expect "created no team" 0 $(tc '{"task_subject":"Add x","task_description":"nothing"}')
expect "created missing" 2 $(tc '{"team_name":"t","task_subject":"Add x","task_description":"do it"}')
expect "created ok" 0 $(tc '{"team_name":"t","task_subject":"Add x","task_description":"Owner: backend\nFiles: src/**\nAcceptance: works"}')
expect "created review only owner" 0 $(tc '{"team_name":"t","task_subject":"Review auth","task_description":"Owner: security"}')
expect "created review no owner" 2 $(tc '{"team_name":"t","task_subject":"Review auth","task_description":"look"}')
expect "created reviewer word not skipped" 2 $(tc '{"team_name":"t","task_subject":"Reviewers dashboard","task_description":"Owner: frontend"}')
# --- task-completed
tk() { printf '%s' "$1" | $S/task-completed.sh 2>/tmp/tk.err; echo $?; }
OK='{"team_name":"t","task_subject":"Implement billing","task_description":"Owner: backend"}'
expect "completed no config" 0 $(tk "$OK")
echo '{"checks":[{"name":"ok","run":"true"},{"name":"bad","run":"echo boom; exit 3"}]}' > $P/.claude/devteam.json
expect "completed failing" 2 $(tk "$OK"); grep -q "boom" /tmp/tk.err || { fail=$((fail+1)); echo "FAIL[$B] no output in report"; }
expect "completed skip review" 0 $(tk '{"team_name":"t","task_subject":"Review billing","task_description":"Owner: qa"}')
expect "completed non-team" 0 $(tk '{"task_subject":"Implement billing","task_description":"x"}')
expect "completed owner-format w/o team" 2 $(tk '{"task_subject":"Implement billing","task_description":"Owner: backend"}')
echo '{"checks":[{"name":"ok","run":"true"}]}' > $P/.claude/devteam.json
expect "completed passing" 0 $(tk "$OK")
echo '{"gateTasks":false,"checks":[{"run":"false"}]}' > $P/.claude/devteam.json
expect "completed gate off" 0 $(tk "$OK")
echo '{"checkTimeoutSeconds":1,"checks":[{"name":"slow","run":"sleep 3"}]}' > $P/.claude/devteam.json
expect "completed timeout" 2 $(tk "$OK"); grep -q "timed out" /tmp/tk.err || { fail=$((fail+1)); echo "FAIL[$B] timeout msg"; }
rm -f $P/.claude/devteam.json
done
echo "pass=$pass fail=$fail"; [ $fail -eq 0 ]
