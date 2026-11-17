# Memory and Persistence Pattern (Hybrid: `feature_list.json` + `ai-memory`)

## Problem

Without persistent memory, an agent loses user preferences, architectural decisions, failed approaches, and behavioral feedback the moment a session ends or when switching between coding agents (e.g., Claude Code → Codex → Cursor → Antigravity). However, forcing the agent to manually maintain markdown progress logs (`progress.md`, `session-handoff.md`) inside the project repository creates git commit noise, merge conflicts, and duplicate state.

## Golden Rules

### 1. Separate structured repo state from narrative session memory

| Layer | Storage Location | Owner | Purpose |
|---|---|---|---|
| **Instruction memory** | `AGENTS.md` / `CLAUDE.md` (in repo) | Human-curated, version-controlled | Startup workflow, working rules, definition of done |
| **Structured feature state** | `feature_list.json` (in repo) | Agent-updated on verification | Active feature ID, dependencies, completion status, test evidence |
| **Narrative & episodic memory** | `ai-memory` git-backed markdown wiki (outside repo) | `ai-memory` lifecycle hooks & daemon | Session observations, architectural decisions, failed approaches |
| **Cross-agent handoff** | `ai-memory` typed handoff protocol | `ai-memory` MCP / CLI (`ai-memory run`) | Claim-once baton pass across agents, sessions, and machines |

### 2. Zero-LLM capture by default

`ai-memory` records prompts, tool calls, and session boundaries silently through lifecycle hooks, sanitizes them at a typed privacy boundary, and consolidates them into a git-backed markdown wiki with **zero LLM API calls** by default.

### 3. Local overrides win — always

When the same topic is addressed at multiple scopes, the most-local instruction takes priority:

```
Cross-project profile (ai-memory) → Organization-wide → Project AGENTS.md → Local override
```

### 4. Bounded startup brief + on-demand search

- **Startup brief**: Bounded context packet injected automatically at session start (including active handoffs)
- **Full wiki & index**: Searched on demand via `ai-memory` MCP tools (fusing full-text search, entities, graph links, and optional local vectors)

## Implementation Pattern

1. **Install & wire `ai-memory` once per machine**:
   ```bash
   brew install akitaonrails/tap/ai-memory
   ai-memory setup
   ```
2. **Keep only structural artifacts in the repository**:
   - `AGENTS.md` or `CLAUDE.md`
   - `feature_list.json`
   - `init.sh`
3. **Remove overlapping repo files**:
   - Do **not** commit `progress.md`, `claude-progress.md`, or `session-handoff.md` in repositories managed by this hybrid harness.
4. **Record test proof in `feature_list.json`, handoffs in `ai-memory`**:
   - When a feature passes `./init.sh`, write the verification command and result summary into the feature's `evidence` field in `feature_list.json`.
   - When pausing mid-feature or switching agents, publish a typed handoff in `ai-memory` with current objective, blockers, and next step.
