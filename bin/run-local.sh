#!/usr/bin/env bash
#
# The whole site on this machine, with sample data: `make run`.
#
#   API      http://localhost:8787  in-memory, seeded with 6 charities on the map,
#                                   2 pending applications, sponsors, and two logins
#   website  http://localhost:5180  the public map (proxies /api, /media, /data to the API)
#   admin    http://localhost:5181  the admin portal
#
# Ports 5180/5181, not Vite's 5173/5174, so it runs beside the other HA Group
# sites' dev servers. Override with WEB_PORT=... ADMIN_PORT=... make run.
#
# Nothing touches AWS: data lives in memory and is reset on every start, and
# e-mails (set-password links included) are printed here instead of sent.
# Ctrl-C stops all three.

set -euo pipefail
cd "$(dirname "$0")/.."

for dir in services/api services/frontend/website services/frontend/admin; do
  [ -d "$dir/node_modules" ] || { echo "Dependencies missing in $dir: run 'make install' first." >&2; exit 1; }
done

WEB_PORT="${WEB_PORT:-5180}"
ADMIN_PORT="${ADMIN_PORT:-5181}"
for port in 8787 "$WEB_PORT" "$ADMIN_PORT"; do
  if lsof -ti "tcp:$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use. Stop that server, or pick others: WEB_PORT=5190 ADMIN_PORT=5191 make run" >&2
    exit 1
  fi
done

pids=()
# Each server runs a few processes deep (subshell, npm, node), so stop the
# whole tree, children first.
kill_tree() {
  local child
  for child in $(pgrep -P "$1" 2>/dev/null); do kill_tree "$child"; done
  kill "$1" 2>/dev/null || true
}
stop() {
  trap - INT TERM EXIT
  for pid in "${pids[@]}"; do kill_tree "$pid"; done
  wait 2>/dev/null || true
}
trap stop INT TERM EXIT

(cd services/api && PUBLIC_ORIGIN="http://localhost:$WEB_PORT" ADMIN_ORIGIN="http://localhost:$ADMIN_PORT" npm run dev --silent 2>&1 | sed 's/^/[api]     /') & pids+=($!)
(cd services/frontend/website && npm run dev --silent -- --port "$WEB_PORT" --strictPort 2>&1 | sed 's/^/[website] /') & pids+=($!)
(cd services/frontend/admin && npm run dev --silent -- --port "$ADMIN_PORT" --strictPort 2>&1 | sed 's/^/[admin]   /') & pids+=($!)

cat <<MSG

  Dodar prieku, local, with sample data
    map      http://localhost:$WEB_PORT
    admin    http://localhost:$ADMIN_PORT   admin@example.com / dev-password-123
    charity  http://localhost:$WEB_PORT/konts   charity@example.com / dev-password-123
  Ctrl-C stops everything.

MSG

# macOS ships bash 3.2, which has no `wait -n`: poll until one exits.
while :; do
  for pid in "${pids[@]}"; do kill -0 "$pid" 2>/dev/null || break 2; done
  sleep 1
done
echo "One of the servers stopped (see above); stopping the others." >&2
