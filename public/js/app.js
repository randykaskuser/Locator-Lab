import { parse, runChain, review, describe } from './engine.js';
import { REFACTORS, renderShop, shopCss } from './shop.js';
import { BREAK_DEFAULTS, EXAMPLES, LADDER, QUIZ } from './content.js';
import { translator } from './i18n.js';

const PLAYWRIGHT_VERSION = '1.63';
const $ = (sel) => document.querySelector(sel);

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: keep in memory only */ }
  },
};

const state = {
  lang: store.get('lab-lang', navigator.language?.toLowerCase().startsWith('id') ? 'id' : 'en'),
  refactors: [],
  locator: '',
  saved: store.get('lab-saved', BREAK_DEFAULTS),
  quiz: { round: 0, picked: null, results: [] },
};
let t = translator(state.lang);

const els = {
  input: $('#locator-input'),
  result: $('#result'),
  shop: $('#shop-root'),
  baseline: $('#shop-baseline'),
  overlay: $('#overlay'),
  style: document.head.appendChild(document.createElement('style')),
};

let shopKeys = new Map();
let baselineKeys = new Map();

// ---------------------------------------------------------------------------
// Shop rendering

function renderShops() {
  els.style.textContent = shopCss(state.refactors);
  shopKeys = renderShop(els.shop, { refactors: state.refactors });
  baselineKeys = renderShop(els.baseline, { refactors: [] });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** One-line preview of an element, like Playwright's error output. */
function preview(el) {
  const attrs = ['type', 'id', 'class', 'aria-label', 'data-testid', 'placeholder', 'alt', 'href']
    .filter((a) => el.hasAttribute(a))
    .map((a) => {
      let v = el.getAttribute(a);
      if (a === 'href' && v.length > 20) v = '…';
      return `${a}="${v}"`;
    });
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  const open = `<${el.localName}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`;
  if (el.localName === 'input' || el.localName === 'img') return open;
  return `${open}${text.length > 28 ? `${text.slice(0, 28)}…` : text}</${el.localName}>`;
}

// ---------------------------------------------------------------------------
// Playground

function evaluate(source) {
  let chain;
  try { chain = parse(source); } catch (error) { return { ok: false, error }; }
  return runChain(chain, els.shop);
}

function errorMessage(error) {
  if (error && error.code) return t(`err.${error.code}`, { detail: error.detail ?? '' });
  return String(error);
}

function matchesLabel(n) {
  return n === 0 ? t('pg.matches.0') : n === 1 ? t('pg.matches.1') : t('pg.matches.n', { n });
}

function drawHits(elements) {
  els.overlay.replaceChildren();
  const base = els.overlay.getBoundingClientRect();
  elements.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    const box = document.createElement('div');
    box.className = 'hit';
    if (r.top - base.top < 20) box.classList.add('compact');
    Object.assign(box.style, {
      left: `${r.left - base.left - 3}px`, top: `${r.top - base.top - 3}px`,
      width: `${r.width + 6}px`, height: `${r.height + 6}px`,
    });
    const tag = document.createElement('span');
    tag.className = 'hit-tag';
    tag.textContent = elements.length > 1 ? `${i + 1}/${elements.length}` : el.localName;
    box.append(tag);
    els.overlay.append(box);
  });
}

let lastElements = [];

function updatePlayground() {
  const source = state.locator.trim();
  const out = [];
  lastElements = [];
  if (!source) {
    out.push(`<p class="action-note">${escapeHtml(t('err.empty'))}</p>`);
  } else {
    const result = evaluate(source);
    if (!result.ok) {
      const pos = result.error?.pos;
      const caret = Number.isInteger(pos) ? `\n${' '.repeat(Math.min(pos, 200))}<span class="caret">^</span>` : '';
      out.push(`<div class="error-box"><pre>${escapeHtml(source)}${caret}</pre><p>${escapeHtml(errorMessage(result.error))}</p></div>`);
    } else {
      const { elements, chain } = result;
      lastElements = elements;
      const pillClass = elements.length === 1 ? 'pill-good' : elements.length === 0 ? 'pill-bad' : 'pill-warn';
      out.push(`<div class="count-line"><span class="pill ${pillClass}">${escapeHtml(matchesLabel(elements.length))}</span></div>`);
      if (elements.length > 1) {
        const list = elements.map((el, i) => `  ${i + 1}) ${preview(el)}`).join('\n');
        out.push(`<div class="strict-box"><strong>${escapeHtml(t('pg.strict.title'))}</strong><pre>${escapeHtml(`Error: strict mode violation: ${describe(chain)} resolved to ${elements.length} elements:\n${list}`)}</pre></div>`);
      }
      if (chain.action) out.push(`<p class="action-note">${escapeHtml(t('pg.action', { action: chain.action.method }))}</p>`);
      const notes = review(chain, elements);
      if (notes.length) {
        out.push(`<ul class="notes" aria-label="${escapeHtml(t('pg.review'))}">${notes
          .map((n) => `<li class="${n.level}">${escapeHtml(t(`note.${n.code}`, { detail: n.detail ?? '' }))}</li>`)
          .join('')}</ul>`);
      }
    }
  }
  els.result.innerHTML = out.join('');
  drawHits(lastElements);
}

function setLocator(source, { focus = false, scroll = false } = {}) {
  state.locator = source;
  els.input.value = source;
  updatePlayground();
  updateHash();
  if (scroll) $('#playground').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  if (focus) els.input.focus({ preventScroll: true });
}

function updateHash() {
  const url = new URL(location.href);
  url.hash = state.locator ? `q=${encodeURIComponent(state.locator)}` : '';
  try { history.replaceState(null, '', url); } catch { /* sandboxed frame */ }
}

function renderExamples() {
  const box = $('#examples');
  box.replaceChildren(...EXAMPLES.map((ex) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = ex.replace(/^page\./, '');
    b.title = ex;
    b.addEventListener('click', () => setLocator(ex, { focus: true }));
    return b;
  }));
}

// ---------------------------------------------------------------------------
// Refactors + break table

function renderRefactorChips() {
  // The bench has the main set; the break section repeats it for small screens.
  document.querySelectorAll('[data-refactor-chips]').forEach((box) => {
    box.replaceChildren(...REFACTORS.map((name) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = t(`refactor.${name}`);
      b.setAttribute('aria-pressed', String(state.refactors.includes(name)));
      b.addEventListener('click', () => toggleRefactor(name));
      return b;
    }));
  });
}

let lastToggled = null;

function toggleRefactor(name) {
  const on = state.refactors.includes(name);
  state.refactors = on ? state.refactors.filter((r) => r !== name) : [...state.refactors, name];
  lastToggled = on ? null : name;
  refreshShopViews();
}

function refreshShopViews() {
  renderShops();
  renderRefactorChips();
  $('#refactor-hint').textContent = lastToggled ? t(`refactor.${lastToggled}.hint`) : '';
  updatePlayground();
  renderBreakTable();
}

function keysOf(elements, keys) {
  return elements.map((el) => keys.get(el) ?? `?${el.localName}`);
}

function verdictFor(source) {
  let chain;
  try { chain = parse(source); } catch (error) { return { error }; }
  const before = runChain(chain, els.baseline);
  const after = runChain(chain, els.shop);
  if (!before.ok || !after.ok) return { error: before.error || after.error };
  const b = keysOf(before.elements, baselineKeys);
  const a = keysOf(after.elements, shopKeys);
  let verdict;
  if (b.length === 0) verdict = 'never';
  else if (a.length === 0) verdict = 'broke';
  else if (a.join() === b.join()) verdict = 'survives';
  else if (a.length > b.length && b.every((k) => a.includes(k))) verdict = 'ambiguous';
  else verdict = 'wrong';
  return { before: b.length, after: a.length, verdict };
}

const VERDICT_STYLE = {
  survives: 'pill-good', broke: 'pill-bad', wrong: 'pill-bad', ambiguous: 'pill-warn', never: 'pill-muted',
};

function renderBreakTable() {
  const rows = $('#break-rows');
  const active = state.refactors.length > 0;
  let survived = 0;
  let wrong = 0;
  rows.replaceChildren(...state.saved.map((source, index) => {
    const tr = document.createElement('tr');
    const v = verdictFor(source);
    if (v.verdict === 'survives') survived++;
    if (v.verdict === 'wrong') wrong++;
    const verdictCell = v.error
      ? `<span class="pill pill-muted">${escapeHtml(errorMessage(v.error))}</span>`
      : !active
        ? '<span class="pill pill-muted">-</span>'
        : `<span class="pill ${VERDICT_STYLE[v.verdict]}">${escapeHtml(t(`br.${v.verdict}`))}</span>`;
    tr.innerHTML = `
      <td><button type="button" class="loc-btn"><code>${escapeHtml(source)}</code></button></td>
      <td class="n" data-label="${escapeHtml(t('br.col.before'))}">${v.error ? '' : v.before}</td>
      <td class="n" data-label="${escapeHtml(t('br.col.after'))}">${v.error || !active ? '' : v.after}</td>
      <td>${verdictCell}</td>
      <td><button type="button" class="remove" aria-label="${escapeHtml(t('br.remove'))}">×</button></td>`;
    tr.querySelector('.loc-btn').addEventListener('click', () => setLocator(source, { scroll: true }));
    tr.querySelector('.remove').addEventListener('click', () => {
      state.saved = state.saved.filter((_, i) => i !== index);
      store.set('lab-saved', state.saved);
      renderBreakTable();
    });
    return tr;
  }));
  $('#break-summary').textContent = active
    ? t('br.summary', { ok: survived, n: state.saved.length })
    : t('br.none');
  $('#break-hint').textContent = active && wrong ? `${t('br.wrong')}: ${t('br.wrong.hint')}` : '';
}

function saveLocator(source) {
  const clean = source.trim();
  if (!clean || state.saved.includes(clean)) return false;
  state.saved = [...state.saved, clean];
  store.set('lab-saved', state.saved);
  renderBreakTable();
  return true;
}

// ---------------------------------------------------------------------------
// Ladder

function renderLadder() {
  const list = $('#ladder-list');
  list.replaceChildren(...LADDER.map((rung, i) => {
    const copy = rung[state.lang] || rung.en;
    const li = document.createElement('li');
    li.className = 'rung';
    li.innerHTML = `
      <span class="rung-num">${String(i + 1).padStart(2, '0')}</span>
      <div>
        <h3>${escapeHtml(rung.api)}</h3>
        <p class="rung-when"><b>${escapeHtml(t('ld.when'))}:</b> ${escapeHtml(copy.when)}</p>
        <div class="ex">
          <div class="ex-code"><span class="pill pill-good">${escapeHtml(t('ld.good'))}</span><code>${escapeHtml(rung.good)}</code></div>
          <button type="button" class="button button-quiet button-small" data-try="good">${escapeHtml(t('ld.try'))}</button>
          <p>${escapeHtml(copy.why)}</p>
        </div>
        <div class="ex">
          <div class="ex-code"><span class="pill pill-bad">${escapeHtml(t('ld.bad'))}</span><code>${escapeHtml(rung.bad)}</code></div>
          <button type="button" class="button button-quiet button-small" data-try="bad">${escapeHtml(t('ld.try'))}</button>
          <p>${escapeHtml(copy.badWhy)}</p>
        </div>
      </div>`;
    li.querySelector('[data-try="good"]').addEventListener('click', () => setLocator(rung.good, { scroll: true, focus: true }));
    li.querySelector('[data-try="bad"]').addEventListener('click', () => setLocator(rung.bad, { scroll: true, focus: true }));
    return li;
  }));
}

// ---------------------------------------------------------------------------
// Quiz (always evaluated on the original shop, so answers do not depend on refactors)

function renderQuiz() {
  const card = $('#quiz-card');
  const { round, picked, results } = state.quiz;
  const progress = `<div class="quiz-progress" aria-hidden="true">${QUIZ.map((_, i) => {
    const cls = i < results.length ? (results[i] ? 'right' : 'wrong') : '';
    return `<i class="${cls}"></i>`;
  }).join('')}</div>`;

  if (round >= QUIZ.length) {
    const score = results.filter(Boolean).length;
    const best = Math.max(score, store.get('lab-quiz-best', 0));
    store.set('lab-quiz-best', best);
    card.innerHTML = `
      ${progress}
      <p class="score">${score} / ${QUIZ.length}</p>
      <p>${escapeHtml(t('qz.score', { s: score, n: QUIZ.length }))}</p>
      <p class="action-note">${escapeHtml(t('qz.best', { b: best, n: QUIZ.length }))}</p>
      <div class="quiz-actions"><button type="button" class="button" id="quiz-again">${escapeHtml(t('qz.again'))}</button></div>`;
    $('#quiz-again').addEventListener('click', () => {
      state.quiz = { round: 0, picked: null, results: [] };
      renderQuiz();
    });
    return;
  }

  const q = QUIZ[round];
  const answered = picked !== null;
  const options = q.options.map((source, i) => {
    let cls = '';
    if (answered && i === q.answer) cls = 'right';
    else if (answered && i === picked) cls = 'wrong';
    let meta = '';
    if (answered) {
      const r = runChain(parse(source), els.baseline);
      const n = r.ok ? r.elements.length : 0;
      // One match is necessary, not sufficient: keep it neutral so a fragile locator never looks "green".
      const pill = n === 1 ? 'pill-muted' : n === 0 ? 'pill-bad' : 'pill-warn';
      meta = `<span class="meta"><span class="pill ${pill}">${escapeHtml(matchesLabel(n))}</span></span>`;
    }
    return `<button type="button" class="option ${cls}" data-i="${i}" ${answered ? 'disabled' : ''}>
      <span class="key">${'ABC'[i]}</span><code>${escapeHtml(source)}</code>${meta}</button>`;
  }).join('');

  card.innerHTML = `
    <div class="quiz-top"><span>${escapeHtml(t('qz.round', { i: round + 1, n: QUIZ.length }))}</span><span>${results.filter(Boolean).length} ✓</span></div>
    ${progress}
    <h3><span class="target-label">${escapeHtml(t('qz.target'))}:</span>${escapeHtml(q.target[state.lang] || q.target.en)}</h3>
    <pre>${escapeHtml(q.markup)}</pre>
    <div class="options">${options}</div>
    ${answered ? `
      <p class="feedback" role="status"><strong>${escapeHtml(picked === q.answer ? t('qz.correct') : t('qz.wrong'))}</strong>${escapeHtml(q[state.lang] || q.en)}</p>
      <div class="quiz-actions">
        <button type="button" class="button" id="quiz-next">${escapeHtml(round + 1 < QUIZ.length ? t('qz.next') : t('qz.finish'))}</button>
        <button type="button" class="button button-quiet" id="quiz-open">${escapeHtml(t('qz.open'))}</button>
      </div>` : ''}`;

  card.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.i);
    state.quiz.picked = i;
    state.quiz.results = [...results, i === q.answer];
    renderQuiz();
    $('#quiz-next')?.focus();
  }));
  $('#quiz-next')?.addEventListener('click', () => {
    state.quiz = { ...state.quiz, round: round + 1, picked: null };
    renderQuiz();
    card.querySelector('.option')?.focus();
  });
  $('#quiz-open')?.addEventListener('click', () => setLocator(q.options[picked], { scroll: true, focus: true }));
}

// ---------------------------------------------------------------------------
// Language + theme

function applyLanguage() {
  t = translator(state.lang);
  document.documentElement.lang = state.lang;
  document.title = t('meta.title');
  document.querySelector('meta[name="description"]').content = t('meta.description');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
  els.input.placeholder = t('pg.placeholder');
  $('#foot-note').textContent = t('ft.note', { v: PLAYWRIGHT_VERSION });
  renderRefactorChips();
  $('#refactor-hint').textContent = lastToggled ? t(`refactor.${lastToggled}.hint`) : '';
  renderLadder();
  renderQuiz();
  renderBreakTable();
  updatePlayground();
}

function currentTheme() {
  const set = document.documentElement.dataset.theme;
  if (set) return set;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ---------------------------------------------------------------------------
// Wiring

function flash(button, key) {
  const original = button.textContent;
  button.textContent = t(key);
  setTimeout(() => { button.textContent = original; }, 1400);
}

function init() {
  renderShops();
  renderExamples();

  let timer;
  els.input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.locator = els.input.value; updatePlayground(); updateHash(); }, 120);
  });
  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) e.preventDefault();
  });

  $('#save-locator').addEventListener('click', (e) => {
    if (saveLocator(state.locator)) flash(e.currentTarget, 'pg.saved');
  });
  $('#share-locator').addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(location.href); flash(e.currentTarget, 'pg.copied'); } catch { /* clipboard blocked */ }
  });
  $('#break-add').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#break-input');
    if (saveLocator(input.value)) input.value = '';
  });
  $('#reset-refactors').addEventListener('click', () => {
    state.refactors = [];
    lastToggled = null;
    refreshShopViews();
  });
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    state.lang = b.dataset.lang;
    store.set('lab-lang', state.lang);
    applyLanguage();
  }));
  $('#theme-toggle').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('lab-theme', next); } catch { /* ignore */ }
  });

  new ResizeObserver(() => drawHits(lastElements)).observe(els.shop);
  window.addEventListener('resize', () => drawHits(lastElements));

  const fromHash = new URLSearchParams(location.hash.slice(1)).get('q');
  state.locator = fromHash || EXAMPLES[0];
  els.input.value = state.locator;
  applyLanguage();
  document.fonts?.ready.then(() => drawHits(lastElements));
}

init();
