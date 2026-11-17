#!/usr/bin/env bash
# Startup + full verification. Must exit 0 before new work starts.
set -euo pipefail

if [ "${1:-}" = "--setup-ai-memory" ] || [ "${AUTO_SETUP_AI_MEMORY:-0}" = "1" ]; then
  if ! command -v ai-memory >/dev/null 2>&1; then
    command -v brew >/dev/null 2>&1 && brew install akitaonrails/tap/ai-memory || (curl -fsSL https://github.com/akitaonrails/ai-memory/releases/latest/download/install.sh | sh)
    export PATH="$HOME/.local/bin:$PATH"
  fi
  ai-memory setup --yes || ai-memory setup
fi

if [ -z "${CI:-}" ]; then
  if command -v ai-memory >/dev/null 2>&1; then
    ai-memory status >/dev/null 2>&1 && echo "==> ai-memory: active" || echo "!!  WARNING: ai-memory daemon not active (run ./init.sh --setup-ai-memory)"
    WIKI_SYNC="${AI_MEMORY_DATA_DIR:-$HOME/Library/Application Support/ai-memory}/wiki-sync.sh"
    [ ! -x "$WIKI_SYNC" ] && WIKI_SYNC="${XDG_DATA_HOME:-$HOME/.local/share}/ai-memory/wiki-sync.sh"
    [ -x "$WIKI_SYNC" ] && "$WIKI_SYNC" && echo "==> ai-memory wiki: synced"
  else
    echo "!!  WARNING: 'ai-memory' belum terinstal di PC ini! Jalankan: ./init.sh --setup-ai-memory"
  fi
  if command -v graphify >/dev/null 2>&1; then
    [ ! -f "graphify-out/graph.json" ] && GRAPHIFY_BACKEND=none graphify extract . --code-only --global --as "locator" >/dev/null 2>&1 || true
    graphify update . >/dev/null 2>&1 || true
    graphify global add "graphify-out/graph.json" --as "locator" >/dev/null 2>&1 || true
    echo "==> graphify: updated local & global graph (locator)"
  fi
fi

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
