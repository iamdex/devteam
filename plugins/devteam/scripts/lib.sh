#!/usr/bin/env bash
# Shared helpers for DevTeam hook scripts.
# Hooks receive a JSON object on stdin. Exit 0 = allow, exit 2 = block (stderr is fed back to Claude).

DEVTEAM_INPUT="$(cat)"

# _json_backend: pick the first available JSON tool.
_json_backend() {
  if [ -n "${DEVTEAM_JSON_BACKEND:-}" ]; then echo "$DEVTEAM_JSON_BACKEND"
  elif command -v jq >/dev/null 2>&1; then echo jq
  elif command -v python3 >/dev/null 2>&1; then echo python3
  elif command -v node >/dev/null 2>&1; then echo node
  else echo none
  fi
}
DEVTEAM_JSON="$(_json_backend)"

# jget <json-string> <dot.path>  → prints the value as a string ("" if missing/null).
jget() {
  local json="$1" path="$2"
  case "$DEVTEAM_JSON" in
    jq) printf '%s' "$json" | jq -r "(.${path}) | if . == null then empty elif type == \"string\" then . else tojson end" 2>/dev/null ;;
    python3) printf '%s' "$json" | python3 -c '
import json, sys
path = sys.argv[1].split(".")
try:
    v = json.load(sys.stdin)
    for k in path:
        v = v.get(k) if isinstance(v, dict) else None
except Exception:
    v = None
if v is None: print("", end="")
elif isinstance(v, str): print(v, end="")
else: print(json.dumps(v), end="")
' "$path" ;;
    node) printf '%s' "$json" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let v;try{v=JSON.parse(s);for(const k of process.argv[1].split("."))v=(v&&typeof v==="object")?v[k]:undefined}catch{v=undefined}
if(v===undefined||v===null)process.stdout.write("");else process.stdout.write(typeof v==="string"?v:JSON.stringify(v))})' "$path" ;;
    *) printf '' ;;
  esac
}

# Input field shortcut.
input_get() { jget "$DEVTEAM_INPUT" "$1"; }

DEVTEAM_CWD="$(input_get cwd)"
DEVTEAM_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${DEVTEAM_CWD:-$PWD}}"
DEVTEAM_CONFIG_FILE="$DEVTEAM_PROJECT_DIR/.claude/devteam.json"
if [ -f "$DEVTEAM_CONFIG_FILE" ]; then
  DEVTEAM_CONFIG="$(cat "$DEVTEAM_CONFIG_FILE")"
else
  DEVTEAM_CONFIG="{}"
fi

# config_get <key> <default>
config_get() {
  local v
  v="$(jget "$DEVTEAM_CONFIG" "$1")"
  if [ -z "$v" ]; then printf '%s' "$2"; else printf '%s' "$v"; fi
}

# config_checks → one line per check: "<name>\t<command>"
config_checks() {
  case "$DEVTEAM_JSON" in
    jq) printf '%s' "$DEVTEAM_CONFIG" | jq -r '.checks[]? | select(.run) | [(.name // .run), .run] | @tsv' 2>/dev/null ;;
    python3) printf '%s' "$DEVTEAM_CONFIG" | python3 -c '
import json, sys
try: c = json.load(sys.stdin)
except Exception: c = {}
for ch in c.get("checks") or []:
    if isinstance(ch, dict) and ch.get("run"):
        print(str(ch.get("name") or ch["run"]) + "\t" + str(ch["run"]))
' ;;
    node) printf '%s' "$DEVTEAM_CONFIG" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let c={};try{c=JSON.parse(s)}catch{}
for(const ch of c.checks||[]){if(ch&&ch.run)console.log(`${ch.name||ch.run}\t${ch.run}`)}})' ;;
  esac
}

# run_with_timeout <seconds> <command string>
run_with_timeout() {
  local secs="$1"; shift
  if command -v timeout >/dev/null 2>&1; then timeout "$secs" bash -c "$1"
  elif command -v gtimeout >/dev/null 2>&1; then gtimeout "$secs" bash -c "$1"
  else bash -c "$1"
  fi
}

# Is this task part of a DevTeam agent team? (team_name present, or the task follows the DevTeam format)
is_team_task() {
  [ -n "$(input_get team_name)" ] && return 0
  printf '%s' "$(input_get task_description)" | grep -qiE '^[[:space:]]*owner:' && return 0
  return 1
}

# Case-insensitive match of the task subject against skipGatePattern.
subject_is_skipped() {
  local pattern subject
  pattern="$(config_get skipGatePattern '^(review|plan|design|research|investigate|analy[sz]e|verify|document|explore)\b')"
  subject="$(input_get task_subject)"
  printf '%s' "$subject" | grep -qiE "$(printf '%s' "$pattern" | sed 's/\\b/([^[:alnum:]_]|$)/g')"
}
