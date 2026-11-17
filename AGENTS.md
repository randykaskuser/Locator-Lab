# Agent entrypoint

Static teaching site for Playwright locators (`locator.ranmaul.com`).
Read `README.md` for structure and commands.

## Startup

1. `git log --oneline -5`
2. `./init.sh` must exit 0 before new work starts. If it fails, fix that first.

## Rules

- Keep it static: no framework, no bundler, no runtime dependency. The only
  dev dependency is `playwright`, for tests.
- Every locator shown on the site must pass `tests/parity.mjs`. If the engine
  disagrees with real Playwright, fix the engine or remove the example. Never
  weaken or skip a check to get a pass.
- Teaching claims about Playwright behaviour must be verified against real
  Playwright before they ship (write a probe, run it).
- Every UI string goes in `public/js/i18n.js` in both `en` and `id`. Code and
  Playwright API names stay English.
- Colours are tokens in `public/css/site.css`, defined for light and both dark
  paths (`prefers-color-scheme` and `[data-theme="dark"]`).
- No inline scripts or inline `style=""` attributes: the CSP in
  `public/_headers` blocks them.
- UI changes: run `npm run test:visual` and look at the screenshots.
- Never merge to `main` without the owner asking.

## Where things go

- Design specs and plans: `docs/planning/`
- Site files: `public/`
- Tests and the local server: `tests/`

## Hybrid Harness Contract (ai-memory + graphify + feature_list.json)

### Startup Workflow

Before writing code:

1. **Confirm working directory** with `pwd`
2. **Check `ai-memory` context & handoffs**: Review the injected `ai-memory` startup brief, claim any pending cross-agent handoff, or search `ai-memory` MCP tools (`notes/legacy-progress-history.md` holds pre-migration history)
3. **Orient with `graphify` knowledge graph**: Use `graphify query "<question>"`, `graphify explain "<symbol>"`, or `graphify path "A" "B"` (add `--graph ~/.graphify/global-graph.json` for cross-repo queries)
4. **Read `feature_list.json`** (`active_context` + `features`) for the portable cross-PC checkpoint and feature backlog
5. **Run `./init.sh`** to verify baseline health, `ai-memory` sync, and `graphify` update
6. **Review recent commits** with `git log --oneline -5`

### Working Rules

- **One feature at a time**: Pick one unfinished feature from `feature_list.json` (`active_context.current_feature_id`)
- **Stay in scope**: Do not modify files unrelated to the active feature
- **Verification required**: Never claim done without running `./init.sh` / verification commands
- **Memory & handoff via `ai-memory` + `feature_list.json#active_context`**: Do NOT create manual `claude-progress.md`, `progress.md`, or `session-handoff.md` files in the repository; session observations are captured automatically by `ai-memory` lifecycle hooks, and `feature_list.json#active_context` carries the lightweight git-tracked checkpoint across PCs

### Definition of Done

A feature is done only when ALL of the following are true:

- [ ] Target behavior is implemented within scope
- [ ] Required verification actually ran (`./init.sh` / tests / lint / build)
- [ ] Verification Evidence is recorded in `feature_list.json` (and `active_context` is updated)
- [ ] Repository remains clean and restartable from standard startup path

### End of Session

Before ending a session:

1. Run `./init.sh` to confirm baseline verification passes
2. Update `feature_list.json` (`features` status/evidence AND `active_context`: `current_feature_id`, `last_updated`, `summary`, `blockers`, `next_step`)
3. If work spans sessions/agents, publish a typed handoff in `ai-memory`
4. Commit with a descriptive message once the repository is in a clean, restartable state

### Verification Commands

```bash
# Full verification (recommended)
./init.sh
```
