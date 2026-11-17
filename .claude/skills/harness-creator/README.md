# harness-creator (Hybrid: Harness Engineering + `ai-memory`)

A compact skill for building and auditing non-overlapping harnesses around AI coding agents by combining **Harness Engineering** (in-repo scope & verification gates) with **[`akitaonrails/ai-memory`](https://github.com/akitaonrails/ai-memory)** (automated lifecycle memory & cross-agent handoffs) and a portable cross-PC `active_context` checkpoint inside `feature_list.json`.

## Setup (2 Steps or 1 Copy-Paste Prompt)

### Option A: Copy-Paste Prompt for Your AI Agent (New PC or New Repo)

Paste this prompt into Claude Code, Codex, Cursor, or Antigravity:

```text
Setup Hybrid Harness + ai-memory on this repository and machine:
1. Check if `ai-memory` is installed and running (`ai-memory status`). If not installed, install it (`brew install akitaonrails/tap/ai-memory` on macOS/Linux or `curl -fsSL https://github.com/akitaonrails/ai-memory/releases/latest/download/install.sh | sh`) and run `ai-memory setup --yes`.
2. Link the local `ai-memory` wiki directory (`~/Library/Application Support/ai-memory/wiki` on macOS or `~/.local/share/ai-memory/wiki` on Linux) to `git@github.com:randykaskuser/ai-memory-wiki.git` if not yet linked, pull `origin/main`, and run `ai-memory reindex`.
3. Install the hybrid `harness-creator` skill into `.claude/skills/harness-creator` from `https://github.com/randykaskuser/learn-harness-engineering` (`skills/harness-creator`).
4. If this repository does not have `AGENTS.md`, `feature_list.json`, and `init.sh` yet, run `node .claude/skills/harness-creator/scripts/create-harness.mjs --target .` and tailor `AGENTS.md` and `feature_list.json` to this repository's real stack and test commands.
5. Run `./init.sh` and `node .claude/skills/harness-creator/scripts/validate-harness.mjs --target .` to confirm 100/100 score and active `ai-memory` sync.
```

### Option B: Manual CLI Setup

#### 1. Install the `harness-creator` skill

```bash
npx skills add randykaskuser/learn-harness-engineering --skill harness-creator
```

Or copy `skills/harness-creator/` into your skill path.

#### 2. Install `ai-memory` & Sync Wiki (or run `./init.sh --setup-ai-memory`)

In any repository that already has `init.sh`, simply run:

```bash
./init.sh --setup-ai-memory
```

Or manually follow the standard [`akitaonrails/ai-memory`](https://github.com/akitaonrails/ai-memory) installation:

```bash
# macOS / Linux (Homebrew)
brew install akitaonrails/tap/ai-memory
ai-memory setup
```

## Use in Any Project Repository

```bash
node skills/harness-creator/scripts/create-harness.mjs --target /path/to/project
node skills/harness-creator/scripts/validate-harness.mjs --target /path/to/project
node skills/harness-creator/scripts/run-benchmark.mjs --target /path/to/project --html /path/to/report.html
```

The scripts use only Node.js built-in modules. They can be run after copying the skill directory into another repository.

## What It Creates (Zero Repo Noise, 100% Cross-PC Portable)

- `AGENTS.md` or `CLAUDE.md` — Startup workflow, scope boundaries, verification rules, and `ai-memory` + `active_context` routing
- `feature_list.json` — Contains:
  - `active_context` (`current_feature_id`, `last_updated`, `summary`, `blockers`, `next_step`) for portable cross-PC git handoffs
  - `features` array for structured backlog, dependencies, status, and verification `evidence`
- `init.sh` — Executable fail-fast verification entrypoint (also checks `ai-memory` daemon status)

> **Why no `progress.md` or `session-handoff.md`?**
> - **Same-machine / cross-agent continuity**: Detailed session observations, architectural decisions, failed approaches, and claim-once handoffs are captured automatically by `ai-memory` lifecycle hooks and MCP tools outside the repository's git tree.
> - **Cross-PC continuity**: `feature_list.json#active_context` stores the lightweight git-tracked checkpoint right inside `feature_list.json`, so `git pull` on a second PC preserves your exact objective, blockers, and next step without cluttering the repository with extra markdown logs.

## What It Checks

`validate-harness.mjs` scores the five harness subsystems:

1. **Instructions** (`AGENTS.md` / `CLAUDE.md`)
2. **State** (`feature_list.json` with valid `active_context` & `features` + `ai-memory` delegation, ensuring no overlapping `progress.md`)
3. **Verification** (`init.sh` fail-fast checks & recorded evidence)
4. **Scope** (one-feature-at-a-time policy & dependencies)
5. **Lifecycle** (`ai-memory` cross-agent handoff routing & clean restart path, ensuring no overlapping `session-handoff.md`)

## Files

```text
harness-creator/
├── SKILL.md
├── metadata.json
├── agents/openai.yaml
├── scripts/
│   ├── create-harness.mjs
│   ├── validate-harness.mjs
│   ├── render-assessment-html.mjs
│   ├── run-benchmark.mjs
│   └── lib/harness-utils.mjs
├── templates/
│   ├── agents.md
│   ├── feature-list.json
│   ├── feature-list.schema.json
│   └── init.sh
├── references/
└── evals/evals.json
```
