# Locator Lab

Interactive guide to Playwright locators for QA engineers. Live at
**https://locator.ranmaul.com**.

Type a locator, see what it matches on a sample shop, then refactor the shop
(hashed classes, generated IDs, re-sorted list, wrapper divs, translated text,
button → link) and see which locators survive, break, or silently point at the
wrong element. Includes Playwright's locator ladder and an 8-round quiz. UI in
English and Indonesian.

## How it works

- **Static site, no build step.** Everything the browser loads is in `public/`:
  HTML, CSS, and plain ES modules. No runtime dependencies.
- **`public/js/engine.js`** parses a locator expression (it never uses `eval`)
  and resolves it against the shop DOM: roles, accessible names, Playwright's
  text matching, `filter`, `and`/`or`, `nth`, CSS and XPath.
- **`public/js/shop.js`** renders the sample app from a list of refactors, and
  returns a logical key per element, so the break test can tell "same element"
  from "different element".
- **`public/js/content.js`** holds the ladder, quiz and break-test locators.
  **`public/js/i18n.js`** holds the UI strings (EN/ID).

The engine is a teaching model, not Playwright. `tests/parity.mjs` keeps it
honest: every locator shown on the site runs in **real Playwright** and in the
engine, on the original shop and on every refactor, and the matched elements
must be identical.

## Commands

| Task | Command |
|---|---|
| Install dev dependency (Playwright) | `npm install && npx playwright install chromium` |
| Full check | `./init.sh` |
| Parity test (engine vs real Playwright) | `npm run test:parity` |
| Visual + behaviour test (1440px, 390px, light/dark, EN/ID) | `npm run test:visual` |
| Local preview | `npm run dev` then open the printed URL |

`test:visual` writes screenshots to `screenshots/` (git-ignored) and fails on
console errors, CSP violations, horizontal overflow at 390px, or a broken flow.
The test server applies `public/_headers`, so tests run under the production
Content-Security-Policy.

## Deploy (Cloudflare Pages)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git →
   select this repo.
2. Framework preset: **None**. Build command: leave empty. Build output
   directory: **`public`**.
3. After the first deploy: the project → Custom domains → add
   `locator.ranmaul.com`. If `ranmaul.com` uses Cloudflare DNS, the CNAME is
   created for you.

`public/_headers` sets the CSP and other security headers.

## Adding content

Add a locator to `public/js/content.js`, then run `npm run test:parity`. If the
engine disagrees with Playwright, fix the engine (or drop the example). Never
change the test to pass.
