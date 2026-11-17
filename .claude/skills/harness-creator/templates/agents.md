# {{AGENT_FILE_NAME}}

{{PROJECT_PURPOSE}}

## Startup Workflow

Before writing code:

1. **Confirm working directory** with `pwd`
2. **Read this file** completely
3. **Check `ai-memory` context & handoffs**: Review the injected `ai-memory` startup brief, claim any pending cross-agent handoff, or search `ai-memory` MCP tools for prior architectural decisions, failed approaches, and open questions
4. **Orient with `graphify` knowledge graph (when present)**: Query `graphify query "<question>"`, `graphify explain "<symbol>"`, or `graphify path "A" "B"` (add `--graph ~/.graphify/global-graph.json` for cross-repo queries) before broad file grepping
5. **Read `feature_list.json`** (`active_context` + `features`) to see the portable cross-machine checkpoint (`current_feature_id`, `summary`, `blockers`, `next_step`) and feature verification statuses
6. **Read project docs if present** (`docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, README, or equivalent)
7. **Run `./init.sh`** to verify environment and baseline checks are healthy
8. **Review recent commits** with `git log --oneline -5`

If baseline verification (`./init.sh`) is failing, repair that first before adding new scope.

## Working Rules

- **One feature at a time**: Pick the active feature in `feature_list.json` (`active_context.current_feature_id` or the next unfinished feature)
- **Verification required**: Don't claim done without running verification commands (`./init.sh`)
- **Update feature state & `active_context`**: Before ending session, update `feature_list.json` (`features` status/evidence AND `active_context` summary/blockers/next_step so git-pulling on another PC preserves handoff state)
- **Memory & handoff via `ai-memory`**: Do NOT create separate `progress.md`, `claude-progress.md`, or `session-handoff.md` files in the repository; detailed session observations are captured automatically by `ai-memory` lifecycle hooks, while `feature_list.json#active_context` carries the lightweight git-tracked checkpoint across machines
- **Stay in scope**: Don't modify files unrelated to the current feature
- **Leave clean state**: Next session must be able to run `./init.sh` immediately

## Required Artifacts

- `feature_list.json` — Feature backlog (`features`) + portable cross-machine checkpoint (`active_context`) + verification evidence tracker (repo source of truth)
- `init.sh` — Standard startup, verification, `ai-memory` sync, and `graphify` update entrypoint
- `ai-memory` — Persistent git-backed markdown wiki memory & claim-once cross-agent handoff engine (managed via lifecycle hooks + MCP)
- `graphify-out/graph.json` & `~/.graphify/global-graph.json` — Local AST & cross-repo knowledge graph for token-efficient code navigation

## Definition of Done

A feature is done only when ALL of the following are true:

- [ ] Target behavior is implemented within scope
- [ ] Required verification actually ran (tests / lint / type-check / build via `./init.sh`)
- [ ] Verification Evidence (command and output summary) is recorded in `feature_list.json`
- [ ] `active_context` in `feature_list.json` is updated with the next feature/step
- [ ] Repository remains clean and restartable from standard startup path

## End of Session

Before ending a session:

1. Run `./init.sh` (or verification commands) to confirm the repository is in a healthy state
2. Update `feature_list.json`:
   - Update `features` with the new feature status and verification `evidence`
   - Update `active_context` (`current_feature_id`, `last_updated`, `summary`, `blockers`, `next_step`) for cross-PC git portability
3. If work is incomplete or handing off to another agent on the same machine/server, also publish a typed handoff in `ai-memory`
4. Commit code and `feature_list.json` with a descriptive message once work is in a safe, restartable state

## Verification Commands

```bash
# Full verification (recommended)
{{PRIMARY_VERIFICATION_COMMAND}}
```

Required checks:
{{VERIFICATION_COMMANDS}}

## Escalation

If you encounter:
- **Architecture decisions**: Search `ai-memory` and project architecture docs first; otherwise ask user
- **Unclear requirements**: Check product/requirements docs and `ai-memory` context first; otherwise ask user
- **Repeated test failures**: Record failed approaches in `ai-memory` and `feature_list.json#active_context.blockers`, then flag for human review
- **Scope ambiguity**: Re-read `feature_list.json` for definition of done
