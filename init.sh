#!/usr/bin/env bash
# Startup + full verification. Must exit 0 before new work starts.
set -euo pipefail
cd "$(dirname "$0")"

node -e 'const [major] = process.versions.node.split(".").map(Number); if (major < 20) { console.error("Node >= 20 required"); process.exit(1); }'

if [ ! -d node_modules/playwright ]; then
  npm install
fi

echo "--- syntax check"
for f in public/js/*.js tests/*.mjs tests/*.js; do node --check "$f"; done

echo "--- parity: lab engine vs real Playwright"
node tests/parity.mjs

echo "--- visual + behaviour"
node tests/visual.mjs

echo "init.sh: OK"
