// Visual + behaviour smoke test.
//   node tests/visual.mjs            -> screenshots in screenshots/
// Fails on console errors, page errors, horizontal overflow, or broken flows.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { serve } from './serve.mjs';

const OUT = new URL('../screenshots/', import.meta.url).pathname;
await mkdir(OUT, { recursive: true });

const { server, url } = await serve();
const browser = await chromium.launch();
const problems = [];
const check = (ok, message) => { if (!ok) problems.push(message); };

async function open(viewport, { lang = 'en', theme = 'light' } = {}) {
  const context = await browser.newContext({ viewport, colorScheme: theme, locale: lang === 'id' ? 'id-ID' : 'en-US' });
  // Web fonts are external; the test must not depend on the network.
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`[${viewport.width}] page error: ${e.message}`));
  page.on('console', (m) => {
    // Only the deliberately blocked font requests are allowed to log errors.
    const blockedFont = /fonts\.(googleapis|gstatic)\.com/.test(m.location()?.url || '') || /net::ERR_FAILED/.test(m.text());
    if (m.type() === 'error' && !blockedFont) {
      problems.push(`[${viewport.width}] console error: ${m.text()}`);
    }
  });
  await page.goto(`${url}/public/`);
  await page.getByRole('heading', { level: 1 }).waitFor();
  return { context, page };
}

async function noOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `${label}: horizontal overflow of ${overflow}px`);
}

try {
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    const { context, page } = await open({ width, height });
    const label = `${width}px`;

    // Playground: default example finds exactly one element and draws one box.
    await check((await page.locator('#result .pill').first().textContent()) === '1 match', `${label}: default locator should be "1 match"`);
    check((await page.locator('.hit').count()) === 1, `${label}: expected one highlight box`);
    await page.screenshot({ path: `${OUT}${width}-top.png` });
    await page.screenshot({ path: `${OUT}${width}-full.png`, fullPage: true });

    // Strict mode example.
    await page.getByRole('button', { name: "getByRole('button', { name: 'Cart' })", exact: true }).click();
    check((await page.locator('.strict-box').count()) === 1, `${label}: Cart example should show strict-mode box`);
    check((await page.locator('.hit').count()) === 4, `${label}: Cart example should highlight 4 elements`);
    await page.locator('#playground').screenshot({ path: `${OUT}${width}-strict.png` });

    // Parse error.
    await page.locator('#locator-input').fill("page.getByRole('button'");
    await page.waitForTimeout(250);
    check((await page.locator('.error-box').count()) === 1, `${label}: syntax error should show error box`);

    // Break the UI: re-sort the list.
    await page.locator(width < 1000 ? '.refactors-inline' : '#refactors').getByRole('button', { name: 'Re-sorted list' }).click();
    const summary = await page.locator('#break-summary').textContent();
    check(/of 6 survive/.test(summary), `${label}: break summary missing, got "${summary}"`);
    check((await page.locator('#break-rows').getByText('Wrong element').count()) === 3, `${label}: re-sort should give 3 "Wrong element" rows`);
    await page.locator('#break').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}${width}-break.png` });

    // Quiz: answer round 1.
    await page.locator('#quiz-card .option').nth(1).click();
    check((await page.locator('#quiz-card .feedback').textContent()).startsWith('Correct.'), `${label}: quiz round 1 answer B should be correct`);
    await page.locator('#quiz').screenshot({ path: `${OUT}${width}-quiz.png` });

    await noOverflow(page, label);
    await context.close();
  }

  // Indonesian + dark mode.
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    const { context, page } = await open({ width, height }, { theme: 'dark' });
    await page.locator('[data-lang="id"]').click();
    check((await page.locator('html').getAttribute('lang')) === 'id', 'lang toggle should set <html lang="id">');
    check((await page.getByRole('heading', { level: 1 }).textContent()).startsWith('Locator yang bagus'), 'ID heading text');
    await page.screenshot({ path: `${OUT}${width}-id-dark.png` });
    await noOverflow(page, `${width}px id dark`);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (problems.length) {
  console.log(`visual: ${problems.length} problem(s)\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`visual: OK (screenshots in ${OUT})`);
