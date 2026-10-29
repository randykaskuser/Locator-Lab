# Locator Lab — design

Status: approved by owner on 2026-10-29 (chat). Hosted at `locator.ranmaul.com`.

## Goal

Help QA engineers understand Playwright locators, and tell a robust locator
from a fragile one, by trying them against a small sample app and then
breaking that app.

Core idea: **a good locator survives UI changes; a bad one breaks.**

## Audience and language

QA engineers (junior to mid), many Indonesian. UI text switches EN/ID.
Code and Playwright API stay English. Default language follows
`navigator.language`, choice is kept in `localStorage`.

## Stack

Static HTML + CSS + vanilla ES modules in `public/`. No build step, no runtime
dependency. Cloudflare Pages serves `public/` as is; `public/_headers` sets a
strict CSP (no inline scripts or style attributes).

Dev-only dependency: `playwright`, for the parity test and screenshots.

## Parts

1. **Sample app ("Toko Kopi")** — header with icon-only cart button, sign-in
   form, product list with three "Add to cart" buttons, search box.
   Rendered by `public/js/shop.js` from options, so it can be refactored on demand.
2. **Playground** — user types a locator; the lab parses it (never `eval`),
   runs it against the shop, outlines matches, shows count, the strict-mode
   message when count > 1, and short notes on robustness.
3. **Break the UI** — refactor toggles: hashed CSS classes, generated IDs, reorder products,
   extra wrapper divs, shop text in Indonesian, "Add to cart" becomes a link.
   A table compares each saved locator on the original app vs the refactored
   one: survives / broke / wrong element / now ambiguous.
4. **Locator ladder** — Playwright's recommended priority, each rung with a
   good and a bad example and when to use it. Examples load into the playground.
5. **Quiz** — 8 rounds: element markup + 3 locators, pick the most robust,
   explanation after the answer. Score kept in `localStorage` only.

## Locator engine (`public/js/engine.js`)

Supported: `getByRole` (name, exact, level, checked), `getByText`, `getByLabel`,
`getByPlaceholder`, `getByAltText`, `getByTitle`, `getByTestId`,
`locator(css | xpath)`, chaining, `filter({ hasText, hasNotText, has, hasNot })`,
`and`, `or`, `first`, `last`, `nth`. String or regex arguments. Trailing
actions (`click()`, `fill()`, …) are accepted and not executed.

It is a teaching model, not Playwright. The page says so.

## Verification

- `tests/parity.mjs`: every locator used on the site (ladder, quiz, break
  defaults, extra edge cases) runs in **real Playwright** and in the lab engine
  on the same shop DOM, for every refactor variant. Matched elements must be
  identical. This is the evidence that the engine teaches correct behaviour.
- `tests/visual.mjs`: screenshots at 1440px and 390px (light/dark, EN/ID),
  fails on console errors, CSP violations, horizontal overflow at 390px, or a
  broken flow. The test server applies `public/_headers`.
- `init.sh` runs both.

## Out of scope (v1)

Accounts, analytics, user-pasted HTML, shadow DOM, iframes, `frameLocator`,
Playwright selector engines (`text=`, `role=`, `:has-text`).

## Decisions made during the build

- Palette changed from warm cream + orange to a cool inspector grey with
  Playwright's own highlight blue: the first was a generic "AI" look, and the
  owner asked for the opposite. The sample shop keeps a warm coffee brand so
  the lab and the app under test read as different things.
- Quiz match counts show one match as neutral, not green: finding one element
  is necessary, not proof of a robust locator.
- Verified in real Playwright before writing content: `getByRole('button',
  { name: 'Cart' })` also matches "Add to cart" (substring by default);
  password inputs have role `textbox`; `toBeChecked()` on a `<label>` follows
  it to its checkbox (the first draft of quiz round 8 claimed it fails; fixed).
