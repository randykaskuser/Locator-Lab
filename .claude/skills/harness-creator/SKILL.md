---
name: harness-creator
description: >-
  Build, audit, and improve hybrid harnesses (Harness Engineering + ai-memory) that make AI coding
  agents reliable without repository file noise: AGENTS.md/CLAUDE.md instruction files, structured
  feature/evidence tracking (feature_list.json), verification gates (init.sh), scope boundaries,
  and automated session memory/handoffs via ai-memory. Use this whenever a coding agent is
  unreliable across sessions — forgets context, drifts out of scope, claims "done" before tests
  pass, or starts each session inconsistently — or when creating or assessing AGENTS.md, CLAUDE.md,
  feature_list.json, init.sh, or ai-memory integration. Reach for it even if the user never says
  the word "harness."
license: MIT
---

# Harness Creator (Hybrid: Harness Engineering + `ai-memory`)

Use this skill to make a repository easier for coding agents to start, stay in scope, verify work, and resume across sessions — combining **Harness Engineering** (instructions, feature scope, and fail-fast verification) with **`ai-memory`** (`akitaonrails/ai-memory`) for zero-LLM automatic session capture, git-backed markdown wiki memory, and claim-once cross-agent handoffs.

Not for model selection, prompt tuning in isolation, chat UI design, or general app architecture.

## Core Model (Zero-Overlap Architecture)

Every useful coding-agent harness has five subsystems, cleanly split between **in-repo structural files** and **`ai-memory` daemon/hooks** so there is zero overlap and zero `progress.md` / `session-handoff.md` git noise:

| Subsystem | Minimal artifact | Purpose |
|---|---|---|
| Instructions | `AGENTS.md` or `CLAUDE.md` | Startup path, working rules, `ai-memory` routing, definition of done |
| State | `feature_list.json` + `ai-memory` | Structured feature/evidence checklist in repo; narrative/episodic memory in `ai-memory` |
| Verification | `init.sh` | Fail-fast tests/checks the agent must run before claiming done |
| Scope | `feature_list.json` dependencies & criteria | One-feature-at-a-time boundary; prevents overreach and half-finished work |
| Lifecycle | `ai-memory` hooks + `init.sh` | Silent session capture, claim-once cross-agent handoff, and clean restartable repo |

## First Move

1. Inspect what already exists: instruction files, `feature_list.json`, verification commands, `ai-memory` setup (`ai-memory status`), and whether legacy `progress.md` / `session-handoff.md` files should be migrated to `ai-memory`.
2. Ask only for missing context that cannot be inferred safely: target agent, desired file name, tolerance for structure, and whether overwriting is allowed.
3. Prefer a minimal 3-file repo harness (`AGENTS.md`, `feature_list.json`, `init.sh`) paired with `ai-memory`.

## Common Tasks

### Create a harness

Use the bundled script when working on a local repository:

```bash
node skills/harness-creator/scripts/create-harness.mjs --target /path/to/project
```

Options:

- `--agent-file CLAUDE.md` for Claude-oriented projects.
- `--package-manager npm|pnpm|yarn|bun` when detection is wrong.
- `--commands "cmd one,cmd two"` for custom verification.
- `--force` only after confirming overwrites are acceptable.

Ensure `ai-memory` is installed and wired on the machine:

```bash
# macOS / Linux (Homebrew)
brew install akitaonrails/tap/ai-memory && ai-memory setup

# Or via official installer script
curl -fsSL https://github.com/akitaonrails/ai-memory/releases/latest/download/install.sh | sh
ai-memory setup
```

### Audit an existing harness

Run:

```bash
node skills/harness-creator/scripts/validate-harness.mjs --target /path/to/project
```

Report the five subsystem scores, the lowest-scoring area, and the first 2-3 changes that would improve reliability. Note that `validate-harness.mjs` also flags overlapping manual `progress.md` or `session-handoff.md` files so the repository stays free of redundant state files.

### Produce a report

Use when the user wants a shareable assessment:

```bash
node skills/harness-creator/scripts/render-assessment-html.mjs --target /path/to/project
node skills/harness-creator/scripts/run-benchmark.mjs --target /path/to/project --html /path/to/report.html
```

## When to Read References

Load only the reference needed for the user's problem:

- Memory across sessions (`ai-memory` integration): [Memory Persistence](references/memory-persistence-pattern.md)
- Reusable workflows as skills: [Skill Runtime](references/skill-runtime-pattern.md)
- Permissions, tools, concurrency: [Tool Registry & Safety](references/tool-registry-pattern.md)
- Context budget and progressive disclosure: [Context Engineering](references/context-engineering-pattern.md)
- Delegation and parallel agents: [Multi-Agent Coordination](references/multi-agent-pattern.md)
- Hooks, startup, long-running work: [Lifecycle & Bootstrap](references/lifecycle-bootstrap-pattern.md)
- Non-obvious failure modes: [Gotchas](references/gotchas.md)

## Design Rules

- Keep the root instruction file short: routing and invariants, not a full manual.
- Delegate narrative memory, failed approaches, and cross-agent handoffs to `ai-memory` instead of writing `progress.md` or `session-handoff.md` into the project repository.
- Keep `feature_list.json` in the repository as the structured feature backlog and verification evidence log.
- Make verification commands explicit and runnable via `./init.sh`.
- Require verification evidence in `feature_list.json` before marking a feature done.
- Use one active feature unless the harness has explicit multi-agent ownership boundaries.
- Never hide destructive behavior in scripts; overwrites require explicit user approval.

## Deliverable Checklist

For a usable minimal hybrid harness, leave the target project with:

- [ ] `AGENTS.md` or `CLAUDE.md` (with `ai-memory` startup & handoff routing)
- [ ] `feature_list.json` (structured backlog + `evidence` field)
- [ ] `init.sh` (executable verification entrypoint)
- [ ] No overlapping `progress.md`, `claude-progress.md`, or `session-handoff.md` files in repo
- [ ] `ai-memory` daemon active or setup instructions provided
