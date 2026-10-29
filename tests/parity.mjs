// Parity test: every locator the site shows must find exactly the same
// elements in the lab engine as in real Playwright, on every refactor variant.
//
//   node tests/parity.mjs
import { chromium } from 'playwright';
import { parse } from '../public/js/engine.js';
import { REFACTORS } from '../public/js/shop.js';
import { BREAK_DEFAULTS, EXAMPLES, LADDER, QUIZ } from '../public/js/content.js';
import { serve } from './serve.mjs';

// Extra cases that exercise engine rules the content does not cover.
const EXTRA = [
  "page.getByRole('heading', { level: 2 })",
  "page.getByRole('heading', { name: 'Sign in' })",
  "page.getByRole('heading', { name: /coffee|kopi/i })",
  "page.getByRole('textbox')",
  "page.getByRole('searchbox')",
  "page.getByRole('link')",
  "page.getByRole('link', { name: 'Add to cart' })",
  "page.getByRole('navigation', { name: 'Main' }).getByRole('link')",
  "page.getByRole('region', { name: 'Sign in' }).getByRole('button')",
  "page.getByRole('region')",
  "page.getByRole('banner')",
  "page.getByRole('main')",
  "page.getByRole('list')",
  "page.getByRole('img')",
  "page.getByRole('img', { name: 'Arabica' })",
  "page.getByRole('checkbox', { checked: false })",
  "page.getByRole('button', { name: 'cart' })",
  "page.getByRole('button', { name: 'Add to cart', exact: true })",
  "page.getByRole('button', { name: 'add to cart', exact: true })",
  "page.getByRole('paragraph')",
  "page.getByText('Arabica')",
  "page.getByText('Arabica Gayo', { exact: true })",
  "page.getByText('arabica gayo', { exact: true })",
  "page.getByText(/Rp \\d+/)",
  "page.getByText('Remember')",
  "page.getByText('2')",
  "page.getByText('Toko Kopi')",
  "page.getByLabel('Cart')",
  "page.getByLabel('Email')",
  "page.getByLabel('Remember me')",
  "page.getByLabel('Sign in')",
  "page.getByLabel(/pass|sandi/i)",
  "page.getByPlaceholder('you@')",
  "page.getByAltText(/beans|biji/)",
  "page.getByTitle('items')",
  "page.getByTestId('product-gayo')",
  "page.getByTestId(/product-/)",
  "page.getByTestId('Product-gayo')",
  "page.locator('li')",
  "page.locator('li button')",
  "page.locator('li > button')",
  "page.locator('[data-testid^=product]').locator('h3')",
  "page.locator('xpath=//h3')",
  "page.locator('li').locator('//button')",
  "page.locator('li').locator('xpath=/button')",
  "page.locator('li', { hasText: 'Robusta' })",
  "page.locator('li', { has: page.getByRole('heading', { name: 'Toraja Kalosi' }) })",
  "page.getByRole('listitem').filter({ hasNotText: 'Robusta' })",
  "page.getByRole('listitem').filter({ hasNot: page.getByText('Rp 60.000') })",
  "page.getByRole('listitem').filter({ hasText: /^Arabica/ })",
  "page.getByRole('button').filter({ hasText: 'Add' }).last()",
  "page.getByRole('button').nth(-1)",
  "page.getByRole('button').nth(10)",
  "page.getByRole('button').and(page.getByText('Sign in'))",
  "page.getByRole('heading').or(page.getByRole('checkbox'))",
  "page.getByTestId('product-dampit').getByRole('img')",
];

function collectLocators() {
  const all = new Set([...EXAMPLES, ...BREAK_DEFAULTS, ...EXTRA]);
  for (const rung of LADDER) { all.add(rung.good); all.add(rung.bad); }
  for (const round of QUIZ) round.options.forEach((o) => all.add(o));
  return [...all];
}

// Turn a parsed chain into a real Playwright locator.
function toPlaywright(chain, page) {
  let loc = page;
  const opts = (o) => {
    if (!o) return o;
    const out = { ...o };
    for (const key of ['has', 'hasNot']) if (out[key]) out[key] = toPlaywright(out[key], page);
    return out;
  };
  for (const step of chain.steps) {
    const [a, b] = step.args;
    switch (step.method) {
      case 'first': loc = loc.first(); break;
      case 'last': loc = loc.last(); break;
      case 'nth': loc = loc.nth(a); break;
      case 'filter': loc = loc.filter(opts(a)); break;
      case 'and': loc = loc.and(toPlaywright(a, page)); break;
      case 'or': loc = loc.or(toPlaywright(a, page)); break;
      default: loc = loc[step.method](a, opts(b));
    }
  }
  return loc;
}

const variants = [[], ...REFACTORS.map((r) => [r]), [...REFACTORS]];
const locators = collectLocators();
const { server, url } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage();
let failures = 0;
let checks = 0;

try {
  for (const refactors of variants) {
    await page.goto(`${url}/tests/fixture.html?r=${refactors.join(',')}`);
    await page.waitForFunction(() => window.ready === true);
    for (const source of locators) {
      checks++;
      const real = await toPlaywright(parse(source), page).evaluateAll((els) => {
        const all = [...document.querySelectorAll('#root *')];
        return els.map((e) => all.indexOf(e));
      });
      const lab = await page.evaluate((s) => window.labRun(s), source);
      const same = !lab.error && JSON.stringify(real) === JSON.stringify(lab.indexes);
      if (!same) {
        failures++;
        console.log(`FAIL [${refactors.join(',') || 'original'}] ${source}\n  playwright: ${JSON.stringify(real)}\n  lab:        ${lab.error || JSON.stringify(lab.indexes)}`);
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`parity: ${checks - failures}/${checks} checks match real Playwright (${locators.length} locators x ${variants.length} variants)`);
process.exit(failures ? 1 : 0);
