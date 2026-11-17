#!/bin/bash
set -e

echo "=== Harness Initialization ==="

WIKI_REMOTE_DEFAULT="${AI_MEMORY_WIKI_REMOTE:-git@github.com:randykaskuser/ai-memory-wiki.git}"

setup_wiki_autosync() {
  local AI_MEM_WIKI="$1"
  [ ! -d "$AI_MEM_WIKI/.git" ] && return 0

  if ! git -C "$AI_MEM_WIKI" remote get-url origin >/dev/null 2>&1; then
    git -C "$AI_MEM_WIKI" remote add origin "$WIKI_REMOTE_DEFAULT"
    echo "ai-memory wiki: linked remote origin -> $WIKI_REMOTE_DEFAULT"
  fi

  local SYNC_SCRIPT="$(dirname "$AI_MEM_WIKI")/wiki-sync.sh"
  cat > "$SYNC_SCRIPT" << 'EOS'
#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:/usr/bin:/bin:$PATH"
WIKI_DIR="${AI_MEMORY_DATA_DIR:-$HOME/Library/Application Support/ai-memory}/wiki"
[ ! -d "$WIKI_DIR" ] && WIKI_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/ai-memory/wiki"
[ ! -d "$WIKI_DIR/.git" ] && exit 0
git -C "$WIKI_DIR" remote get-url origin >/dev/null 2>&1 || exit 0

BEFORE_HEAD="$(git -C "$WIKI_DIR" rev-parse HEAD 2>/dev/null || true)"
if git -C "$WIKI_DIR" fetch -q origin main 2>/dev/null; then
  if ! git -C "$WIKI_DIR" merge-base --is-ancestor FETCH_HEAD HEAD 2>/dev/null; then
    git -C "$WIKI_DIR" merge --ff-only FETCH_HEAD >/dev/null 2>&1 || \
      git -C "$WIKI_DIR" merge --no-edit --allow-unrelated-histories -X theirs FETCH_HEAD >/dev/null 2>&1 || true
  fi
fi
AFTER_HEAD="$(git -C "$WIKI_DIR" rev-parse HEAD 2>/dev/null || true)"
if [ -n "$BEFORE_HEAD" ] && [ "$BEFORE_HEAD" != "$AFTER_HEAD" ]; then
  ai-memory reindex >/dev/null 2>&1 || true
fi

AHEAD="$(git -C "$WIKI_DIR" rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
[ "${AHEAD:-0}" -gt 0 ] && git -C "$WIKI_DIR" push -q origin main 2>/dev/null || true
EOS
  chmod +x "$SYNC_SCRIPT"

  if [ "$(uname -s)" = "Darwin" ]; then
    local PLIST_PATH="$HOME/Library/LaunchAgents/com.github.randykaskuser.ai-memory-wiki-sync.plist"
    if [ ! -f "$PLIST_PATH" ]; then
      mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs/ai-memory"
      cat > "$PLIST_PATH" << EOP
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.github.randykaskuser.ai-memory-wiki-sync</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$SYNC_SCRIPT</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>120</integer>
  <key>WatchPaths</key>
  <array>
    <string>$AI_MEM_WIKI/.git/refs/heads/main</string>
  </array>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/ai-memory/wiki-sync.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/ai-memory/wiki-sync.log</string>
</dict>
</plist>
EOP
      launchctl unload "$PLIST_PATH" 2>/dev/null || true
      launchctl load "$PLIST_PATH" 2>/dev/null || true
      echo "ai-memory wiki: installed background LaunchAgent auto-sync"
    fi
  elif command -v crontab >/dev/null 2>&1; then
    if ! crontab -l 2>/dev/null | grep -Fq "$SYNC_SCRIPT"; then
      (crontab -l 2>/dev/null; echo "*/2 * * * * \"$SYNC_SCRIPT\" >/dev/null 2>&1") | crontab - 2>/dev/null || true
      echo "ai-memory wiki: installed background cron auto-sync (every 2m)"
    fi
  fi

  "$SYNC_SCRIPT"
  echo "ai-memory wiki: synced with remote origin"
}

if [ "${1:-}" = "--setup-ai-memory" ] || [ "${AUTO_SETUP_AI_MEMORY:-0}" = "1" ]; then
  echo "=== Auto-Setting up ai-memory & Cross-PC Wiki Sync ==="
  if ! command -v ai-memory >/dev/null 2>&1; then
    if command -v brew >/dev/null 2>&1; then
      brew install akitaonrails/tap/ai-memory
    else
      curl -fsSL https://github.com/akitaonrails/ai-memory/releases/latest/download/install.sh | sh
      export PATH="$HOME/.local/bin:$PATH"
    fi
  fi
  ai-memory setup --yes || ai-memory setup
fi

if command -v ai-memory >/dev/null 2>&1; then
  echo "=== Checking ai-memory daemon & wiki sync ==="
  if ai-memory status >/dev/null 2>&1; then
    echo "ai-memory: active"
  else
    echo "⚠️  WARNING: ai-memory is installed but the daemon is not configured/running."
    echo "   Run: ./init.sh --setup-ai-memory   (or: ai-memory setup)"
  fi
  AI_MEM_WIKI="${AI_MEMORY_DATA_DIR:-$HOME/Library/Application Support/ai-memory}/wiki"
  [ ! -d "$AI_MEM_WIKI" ] && AI_MEM_WIKI="${XDG_DATA_HOME:-$HOME/.local/share}/ai-memory/wiki"
  setup_wiki_autosync "$AI_MEM_WIKI"
else
  echo "========================================================================"
  echo "⚠️  WARNING: 'ai-memory' belum terinstal di PC ini!"
  echo "   Progres fitur dasar tetap terbaca dari feature_list.json#active_context,"
  echo "   namun histori memori wiki & auto-handoff membutuhkan ai-memory."
  echo ""
  echo "   👉 Jalankan 1 perintah ini untuk install & sync otomatis di PC baru:"
  echo "      ./init.sh --setup-ai-memory"
  echo ""
  echo "   Atau manual:"
  echo "      brew install akitaonrails/tap/ai-memory && ai-memory setup"
  echo "========================================================================"
fi

if command -v graphify >/dev/null 2>&1; then
  REPO_TAG="$(basename "$PWD")"
  if [ -f "graphify-out/graph.json" ]; then
    graphify update . >/dev/null 2>&1 || true
    graphify global add "graphify-out/graph.json" --as "$REPO_TAG" >/dev/null 2>&1 || true
    echo "graphify: updated local & global graph ($REPO_TAG)"
  fi
fi

if [ -f package.json ]; then
  if [ -f pnpm-lock.yaml ]; then
    PM="pnpm"
  elif [ -f yarn.lock ]; then
    PM="yarn"
  elif [ -f bun.lock ] || [ -f bun.lockb ]; then
    PM="bun"
  else
    PM="npm"
  fi

  echo "=== Installing dependencies with $PM ==="
  if [ "$PM" = "npm" ]; then
    npm install
  else
    "$PM" install
  fi

  node -e "const s=require('./package.json').scripts||{}; process.exit(s.check||s.typecheck||s['type-check']?0:1)" && {
    if node -e "const s=require('./package.json').scripts||{}; process.exit(s.check?0:1)"; then
      [ "$PM" = "npm" ] && npm run check || "$PM" run check
    elif node -e "const s=require('./package.json').scripts||{}; process.exit(s.typecheck?0:1)"; then
      [ "$PM" = "npm" ] && npm run typecheck || "$PM" run typecheck
    else
      [ "$PM" = "npm" ] && npm run type-check || "$PM" run type-check
    fi
  }

  node -e "const s=require('./package.json').scripts||{}; process.exit(s.lint?0:1)" && {
    [ "$PM" = "npm" ] && npm run lint || "$PM" run lint
  }

  node -e "const s=require('./package.json').scripts||{}; process.exit(s.test?0:1)" && {
    [ "$PM" = "npm" ] && npm test || "$PM" test
  }

  node -e "const s=require('./package.json').scripts||{}; process.exit(s.build?0:1)" && {
    [ "$PM" = "npm" ] && npm run build || "$PM" run build
  }
elif [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  echo "=== Running Python verification ==="
  PY="$(command -v python3 || command -v python)"
  "$PY" -m pytest || [ $? -eq 5 ]
  "$PY" -m compileall -q -x '(^|/)(\.?venv|env|node_modules|build|dist|__pycache__)(/|$)' .
elif [ -f go.mod ]; then
  echo "=== Running Go verification ==="
  go test ./...
elif [ -f Cargo.toml ]; then
  echo "=== Running Rust verification ==="
  cargo test
elif [ -f pom.xml ]; then
  echo "=== Running Maven verification ==="
  mvn test
elif [ -f build.gradle ] || [ -f build.gradle.kts ]; then
  echo "=== Running Gradle verification ==="
  ./gradlew test
elif ls *.csproj *.sln >/dev/null 2>&1; then
  echo "=== Running .NET verification ==="
  dotnet test
else
  echo "No recognized package manifest detected."
  echo "Replace this section with the project's verification commands."
fi

echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Review ai-memory context / active handoffs and feature_list.json#active_context"
echo "2. Pick ONE unfinished feature from feature_list.json to work on"
echo "3. Implement only that feature"
echo "4. Re-run ./init.sh and update feature_list.json (evidence + active_context) before claiming done"
