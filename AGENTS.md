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
