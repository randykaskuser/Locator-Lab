// A small model of Playwright's locator engine, for teaching.
//
// It parses a locator expression (never eval) and resolves it against a DOM
// subtree. The rules follow Playwright's documented behaviour; tests/parity.mjs
// checks every example on the site against real Playwright.
//
// parse() is DOM-free so Node can import it; run() needs a browser DOM.

const LOCATOR_METHODS = {
  getByRole: { min: 1, max: 2 },
  getByText: { min: 1, max: 2 },
  getByLabel: { min: 1, max: 2 },
  getByPlaceholder: { min: 1, max: 2 },
  getByAltText: { min: 1, max: 2 },
  getByTitle: { min: 1, max: 2 },
  getByTestId: { min: 1, max: 1 },
  locator: { min: 1, max: 2 },
  filter: { min: 1, max: 1 },
  and: { min: 1, max: 1 },
  or: { min: 1, max: 1 },
  first: { min: 0, max: 0 },
  last: { min: 0, max: 0 },
  nth: { min: 1, max: 1 },
};

// Accepted at the end of a chain so pasted test code works; never executed.
const ACTIONS = new Set([
  'click', 'dblclick', 'fill', 'type', 'press', 'pressSequentially', 'check', 'uncheck',
  'hover', 'focus', 'blur', 'selectOption', 'setInputFiles', 'textContent', 'innerText',
  'inputValue', 'isVisible', 'isEnabled', 'isChecked', 'getAttribute', 'count', 'all',
  'waitFor', 'scrollIntoViewIfNeeded', 'tap', 'clear', 'highlight', 'evaluate',
]);

const OPTION_KEYS = {
  getByRole: ['name', 'exact', 'level', 'checked', 'includeHidden', 'disabled'],
  getByText: ['exact'], getByLabel: ['exact'], getByPlaceholder: ['exact'],
  getByAltText: ['exact'], getByTitle: ['exact'],
  locator: ['hasText', 'hasNotText', 'has', 'hasNot'],
  filter: ['hasText', 'hasNotText', 'has', 'hasNot', 'visible'],
};

export class LocatorError extends Error {
  constructor(code, detail, pos) {
    super(`${code}${detail ? `: ${detail}` : ''}`);
    this.code = code;
    this.detail = detail;
    this.pos = pos;
  }
}

// ---------------------------------------------------------------------------
// Tokenizer + parser

function tokenize(src) {
  const tokens = [];
  let i = 0;
  const regexAllowedAfter = new Set(['(', ',', ':', '{', '[']);
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[\w$]/.test(src[j])) j++;
      tokens.push({ t: 'id', v: src.slice(i, j), p: i });
      i = j;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '-' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ t: 'num', v: Number(src.slice(i, j)), p: i });
      i = j;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      let out = '';
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\') {
          const next = src[j + 1];
          out += { n: '\n', t: '\t' }[next] ?? next;
          j += 2;
          continue;
        }
        if (ch === '`' && src[j] === '$' && src[j + 1] === '{') throw new LocatorError('template', null, j);
        out += src[j++];
      }
      if (j >= src.length) throw new LocatorError('unterminatedString', null, i);
      tokens.push({ t: 'str', v: out, p: i });
      i = j + 1;
      continue;
    }
    const prev = tokens.at(-1);
    if (ch === '/' && (!prev || (prev.t === 'punct' && regexAllowedAfter.has(prev.v)))) {
      let j = i + 1;
      let inClass = false;
      while (j < src.length && (src[j] !== '/' || inClass)) {
        if (src[j] === '\\') j++;
        else if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        j++;
      }
      if (j >= src.length) throw new LocatorError('unterminatedRegex', null, i);
      const body = src.slice(i + 1, j);
      let k = j + 1;
      while (k < src.length && /[a-z]/.test(src[k])) k++;
      const flags = src.slice(j + 1, k);
      let re;
      try { re = new RegExp(body, flags); } catch { throw new LocatorError('badRegex', `/${body}/${flags}`, i); }
      tokens.push({ t: 'regex', v: re, p: i });
      i = k;
      continue;
    }
    if ('.(){},:;[]'.includes(ch)) { tokens.push({ t: 'punct', v: ch, p: i }); i++; continue; }
    throw new LocatorError('unexpectedChar', ch, i);
  }
  return tokens;
}

/**
 * Parse a locator expression into { steps, action }.
 * A step is { method, args, pos }. Nested locators (inside has/and/or)
 * are { type: 'chain', steps }.
 */
export function parse(src) {
  const tokens = tokenize(src);
  let k = 0;
  const peek = () => tokens[k];
  const isPunct = (v) => peek()?.t === 'punct' && peek().v === v;
  const expectPunct = (v) => {
    if (!isPunct(v)) throw new LocatorError('expected', v, peek()?.p ?? src.length);
    k++;
  };

  function parseChain(nested) {
    const start = peek();
    if (!start) throw new LocatorError('empty', null, 0);
    if (start.t === 'id' && start.v === 'page') {
      k++;
      expectPunct('.');
    } else if (nested) {
      throw new LocatorError('nestedPage', null, start.p);
    }
    const steps = [];
    let action = null;
    for (;;) {
      const name = peek();
      if (!name || name.t !== 'id') throw new LocatorError('expectedMethod', null, name?.p ?? src.length);
      k++;
      expectPunct('(');
      const args = [];
      while (!isPunct(')')) {
        args.push(parseValue());
        if (!isPunct(')')) expectPunct(',');
      }
      expectPunct(')');
      if (ACTIONS.has(name.v)) {
        if (nested) throw new LocatorError('actionInside', name.v, name.p);
        action = { method: name.v, args };
        if (isPunct('.')) throw new LocatorError('afterAction', name.v, peek().p);
        break;
      }
      const spec = LOCATOR_METHODS[name.v];
      if (!spec) throw new LocatorError('unknownMethod', name.v, name.p);
      if (args.length < spec.min || args.length > spec.max) throw new LocatorError('argCount', name.v, name.p);
      validateArgs(name.v, args, name.p);
      steps.push({ method: name.v, args, pos: name.p });
      if (!isPunct('.')) break;
      k++;
    }
    return { type: 'chain', steps, action };
  }

  function parseValue() {
    const tok = peek();
    if (!tok) throw new LocatorError('unexpectedEnd', null, src.length);
    if (tok.t === 'str' || tok.t === 'num' || tok.t === 'regex') { k++; return tok.v; }
    if (tok.t === 'id' && (tok.v === 'true' || tok.v === 'false')) { k++; return tok.v === 'true'; }
    if (tok.t === 'id' && tok.v === 'page') return parseChain(true);
    if (isPunct('{')) {
      k++;
      const obj = {};
      while (!isPunct('}')) {
        const key = peek();
        if (!key || (key.t !== 'id' && key.t !== 'str')) throw new LocatorError('expectedKey', null, key?.p ?? src.length);
        k++;
        expectPunct(':');
        obj[key.v] = parseValue();
        if (!isPunct('}')) expectPunct(',');
      }
      k++;
      return obj;
    }
    throw new LocatorError('unexpectedToken', String(tok.v), tok.p);
  }

  let p = peek();
  if (p?.t === 'id' && p.v === 'await') k++;
  p = peek();
  // Allow `expect(locator).toBeVisible()`-free pasting of `const x = page...`
  if (p?.t === 'id' && (p.v === 'const' || p.v === 'let')) {
    k += 2;
    expectPunct('=') ;
    if (peek()?.t === 'id' && peek().v === 'await') k++;
  }
  const chain = parseChain(false);
  if (isPunct(';')) k++;
  if (k < tokens.length) throw new LocatorError('trailing', String(peek().v), peek().p);
  if (!chain.steps.length) throw new LocatorError('noLocator', null, 0);
  return chain;
}

function validateArgs(method, args, pos) {
  const [first, second] = args;
  const isText = (v) => typeof v === 'string' || v instanceof RegExp;
  const isChain = (v) => v && v.type === 'chain';
  if (['getByText', 'getByLabel', 'getByPlaceholder', 'getByAltText', 'getByTitle', 'getByTestId'].includes(method) && !isText(first)) {
    throw new LocatorError('needText', method, pos);
  }
  if (method === 'getByRole' && typeof first !== 'string') throw new LocatorError('needRole', null, pos);
  if (method === 'locator' && typeof first !== 'string') throw new LocatorError('needSelector', null, pos);
  if ((method === 'and' || method === 'or') && !isChain(first)) throw new LocatorError('needLocator', method, pos);
  if (method === 'nth' && !Number.isInteger(first)) throw new LocatorError('needIndex', null, pos);
  const opts = method === 'filter' ? first : second;
  if (opts !== undefined) {
    if (typeof opts !== 'object' || opts instanceof RegExp || isChain(opts)) throw new LocatorError('needOptions', method, pos);
    for (const key of Object.keys(opts)) {
      if (!(OPTION_KEYS[method] || []).includes(key)) throw new LocatorError('unknownOption', `${method}: ${key}`, pos);
      if ((key === 'has' || key === 'hasNot') && !isChain(opts[key])) throw new LocatorError('needLocator', key, pos);
    }
  }
}

// ---------------------------------------------------------------------------
// Text helpers (match Playwright's normalisation)

const normalize = (s) => s.replace(/[​­]/g, '').replace(/\s+/g, ' ').trim();

/** Playwright's text matcher: substring + case-insensitive, or exact + case-sensitive. */
function textMatcher(value, exact) {
  if (value instanceof RegExp) {
    return (text) => { value.lastIndex = 0; return value.test(text); };
  }
  const wanted = normalize(value);
  if (exact) return (text) => normalize(text) === wanted;
  const lower = wanted.toLowerCase();
  return (text) => normalize(text).toLowerCase().includes(lower);
}

const SKIP_TEXT = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);

function elementText(el, cache) {
  if (cache.has(el)) return cache.get(el);
  let text = '';
  if (el.nodeName === 'INPUT' && ['submit', 'button'].includes((el.getAttribute('type') || '').toLowerCase())) {
    text = el.value;
  } else {
    for (let child = el.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === Node.TEXT_NODE) text += child.nodeValue;
      else if (child.nodeType === Node.ELEMENT_NODE && !SKIP_TEXT.has(child.nodeName)) text += elementText(child, cache);
    }
  }
  cache.set(el, text);
  return text;
}

// ---------------------------------------------------------------------------
// Roles and accessible names (simplified WAI-ARIA / HTML-AAM)

const NAME_FROM_CONTENT = new Set([
  'button', 'cell', 'checkbox', 'columnheader', 'gridcell', 'heading', 'link', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'row', 'rowheader', 'switch',
  'tab', 'tooltip', 'treeitem',
]);

const LANDMARK_SCOPES = 'article, aside, main, nav, section';

export function getRole(el) {
  const explicit = (el.getAttribute('role') || '').trim().split(/\s+/)[0];
  if (explicit && explicit !== 'none' && explicit !== 'presentation') return explicit;
  if (explicit) return null;
  const tag = el.localName;
  switch (tag) {
    case 'a': case 'area': return el.hasAttribute('href') ? 'link' : null;
    case 'button': return 'button';
    case 'input': {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (['button', 'submit', 'reset', 'image'].includes(type)) return 'button';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'range') return 'slider';
      if (type === 'number') return 'spinbutton';
      if (type === 'hidden') return null;
      if (type === 'search') return el.hasAttribute('list') ? 'combobox' : 'searchbox';
      return el.hasAttribute('list') ? 'combobox' : 'textbox';
    }
    case 'textarea': return 'textbox';
    case 'select': return el.multiple || el.size > 1 ? 'listbox' : 'combobox';
    case 'option': return 'option';
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return 'heading';
    case 'ul': case 'ol': case 'menu': return 'list';
    case 'li': return 'listitem';
    case 'nav': return 'navigation';
    case 'main': return 'main';
    case 'aside': return 'complementary';
    case 'article': return 'article';
    case 'header': return el.parentElement?.closest(LANDMARK_SCOPES) ? null : 'banner';
    case 'footer': return el.parentElement?.closest(LANDMARK_SCOPES) ? null : 'contentinfo';
    case 'section': return accessibleName(el) ? 'region' : null;
    case 'form': return accessibleName(el) ? 'form' : null;
    case 'img': return el.getAttribute('alt') === '' && !el.hasAttribute('title') ? 'presentation' : 'img';
    case 'svg': return 'img';
    case 'p': return 'paragraph';
    case 'table': return 'table';
    case 'tr': return 'row';
    case 'td': return 'cell';
    case 'th': return 'columnheader';
    case 'dialog': return 'dialog';
    case 'fieldset': return 'group';
    case 'hr': return 'separator';
    default: return null;
  }
}

function isHiddenForAria(el, root) {
  for (let node = el; node && node !== root.parentElement; node = node.parentElement) {
    if (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden')) return true;
    const style = getComputedStyle(node);
    if (style.display === 'none') return true;
    if (node === el && style.visibility !== 'visible') return true;
  }
  return false;
}

function isEmbeddedControl(el) {
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.nodeName);
}

function textFromContent(el, visiting) {
  let out = '';
  for (let child = el.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === Node.TEXT_NODE) { out += child.nodeValue; continue; }
    if (child.nodeType !== Node.ELEMENT_NODE || SKIP_TEXT.has(child.nodeName)) continue;
    if (child.getAttribute('aria-hidden') === 'true' || getComputedStyle(child).display === 'none') continue;
    if (isEmbeddedControl(child)) {
      const type = (child.getAttribute('type') || '').toLowerCase();
      if (child.nodeName === 'TEXTAREA' || ['', 'text', 'email', 'search', 'tel', 'url'].includes(type)) out += ` ${child.value} `;
      continue;
    }
    out += ` ${nameOf(child, visiting, true)} `;
  }
  return out;
}

function nameOf(el, visiting, inContent) {
  if (visiting.has(el)) return '';
  visiting.add(el);
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy && !inContent) {
    const parts = labelledBy.split(/\s+/).map((id) => el.ownerDocument.getElementById(id)).filter(Boolean);
    if (parts.length) return normalize(parts.map((p) => textFromContent(p, visiting)).join(' '));
  }
  const ariaLabel = normalize(el.getAttribute('aria-label') || '');
  if (ariaLabel) return ariaLabel;
  const tag = el.nodeName;
  if (isEmbeddedControl(el)) {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (tag === 'INPUT' && ['button', 'submit', 'reset'].includes(type)) {
      return normalize(el.value || { submit: 'Submit', reset: 'Reset' }[type] || '');
    }
    if (tag === 'INPUT' && type === 'image') return normalize(el.getAttribute('alt') || el.getAttribute('title') || 'Submit');
    const labels = [...(el.labels || [])];
    if (labels.length) return normalize(labels.map((l) => textFromContent(l, visiting)).join(' '));
    return normalize(el.getAttribute('title') || el.getAttribute('placeholder') || '');
  }
  if (tag === 'IMG' || tag === 'AREA') {
    if (el.hasAttribute('alt')) return normalize(el.getAttribute('alt'));
    return normalize(el.getAttribute('title') || '');
  }
  // section/form take their role from their name, so never name them from content.
  const role = tag === 'SECTION' || tag === 'FORM' ? null : getRole(el);
  const fromContent = NAME_FROM_CONTENT.has(role) || (inContent && tag !== 'SECTION' && tag !== 'FORM');
  if (fromContent) {
    const text = normalize(textFromContent(el, visiting));
    if (text) return text;
  }
  return normalize(el.getAttribute('title') || '');
}

export function accessibleName(el) {
  return nameOf(el, new Set(), false);
}

function labelTexts(el, cache) {
  const texts = [];
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/)) {
      const ref = el.ownerDocument.getElementById(id);
      if (ref) texts.push(elementText(ref, cache));
    }
  }
  if (el.hasAttribute('aria-label')) texts.push(el.getAttribute('aria-label'));
  for (const label of el.labels || []) texts.push(elementText(label, cache));
  return texts;
}

// ---------------------------------------------------------------------------
// Resolution

function sortInDocumentOrder(elements) {
  const unique = [...new Set(elements)];
  return unique.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
}

function candidates(scope, ctx) {
  const all = [...scope.querySelectorAll('*')];
  return scope === ctx.root ? [scope, ...all] : all;
}

function isXPath(selector) {
  return selector.startsWith('xpath=') || selector.startsWith('//') || selector.startsWith('..');
}

function queryStep(step, scope, ctx) {
  const [first, opts = {}] = step.args;
  switch (step.method) {
    case 'getByRole': {
      const match = opts.name === undefined ? null : textMatcher(opts.name, opts.exact);
      return candidates(scope, ctx).filter((el) => {
        if (getRole(el) !== first) return false;
        if (!opts.includeHidden && isHiddenForAria(el, ctx.root)) return false;
        if (opts.level !== undefined && Number(el.localName.slice(1)) !== opts.level && Number(el.getAttribute('aria-level')) !== opts.level) return false;
        if (opts.checked !== undefined && !!el.checked !== opts.checked && (el.getAttribute('aria-checked') === 'true') !== opts.checked) return false;
        if (opts.disabled !== undefined && (el.disabled === true || el.getAttribute('aria-disabled') === 'true') !== opts.disabled) return false;
        return !match || match(accessibleName(el));
      });
    }
    case 'getByText': {
      const match = textMatcher(first, opts.exact);
      return candidates(scope, ctx).filter((el) => {
        if (SKIP_TEXT.has(el.nodeName)) return false;
        if (!match(elementText(el, ctx.textCache))) return false;
        for (let child = el.firstElementChild; child; child = child.nextElementSibling) {
          if (!SKIP_TEXT.has(child.nodeName) && match(elementText(child, ctx.textCache))) return false;
        }
        return true;
      });
    }
    case 'getByLabel': {
      const match = textMatcher(first, opts.exact);
      return candidates(scope, ctx).filter((el) => labelTexts(el, ctx.textCache).some(match));
    }
    case 'getByPlaceholder': case 'getByAltText': case 'getByTitle': {
      const attr = { getByPlaceholder: 'placeholder', getByAltText: 'alt', getByTitle: 'title' }[step.method];
      const match = textMatcher(first, opts.exact);
      return candidates(scope, ctx).filter((el) => el.hasAttribute(attr) && match(el.getAttribute(attr)));
    }
    case 'getByTestId': {
      const match = first instanceof RegExp ? textMatcher(first) : (v) => v === first;
      return candidates(scope, ctx).filter((el) => el.hasAttribute('data-testid') && match(el.getAttribute('data-testid')));
    }
    case 'locator': {
      let found;
      if (isXPath(first)) {
        let expr = first.startsWith('xpath=') ? first.slice(6) : first;
        const context = scope === ctx.root ? scope.ownerDocument : scope;
        if (expr.startsWith('/') && context !== scope.ownerDocument) expr = `.${expr}`;
        let result;
        try {
          result = scope.ownerDocument.evaluate(expr, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        } catch { throw new LocatorError('badXPath', expr, step.pos); }
        found = [];
        for (let i = 0; i < result.snapshotLength; i++) {
          const node = result.snapshotItem(i);
          if (node.nodeType === Node.ELEMENT_NODE) found.push(node);
        }
      } else {
        if (/(^|[\s,>+~])(text|role|id|data-testid|internal:\w+)=|:has-text\(|:text\(|>>/.test(first)) {
          throw new LocatorError('engineSelector', first, step.pos);
        }
        try {
          found = scope === ctx.root ? [...scope.ownerDocument.querySelectorAll(first)] : [...scope.querySelectorAll(first)];
        } catch { throw new LocatorError('badCss', first, step.pos); }
      }
      if (scope === ctx.root) found = found.filter((el) => ctx.root.contains(el));
      return applyFilter(found, opts, ctx);
    }
    default:
      return [];
  }
}

function applyFilter(elements, opts, ctx) {
  let out = elements;
  if (opts.hasText !== undefined) {
    const match = textMatcher(opts.hasText, false);
    out = out.filter((el) => match(elementText(el, ctx.textCache)));
  }
  if (opts.hasNotText !== undefined) {
    const match = textMatcher(opts.hasNotText, false);
    out = out.filter((el) => !match(elementText(el, ctx.textCache)));
  }
  if (opts.has) out = out.filter((el) => resolveChain(opts.has, [el], ctx).length > 0);
  if (opts.hasNot) out = out.filter((el) => resolveChain(opts.hasNot, [el], ctx).length === 0);
  if (opts.visible !== undefined) out = out.filter((el) => isVisible(el) === opts.visible);
  return out;
}

function isVisible(el) {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility === 'visible';
}

function resolveChain(chain, scopes, ctx) {
  let current = scopes;
  for (const step of chain.steps) {
    switch (step.method) {
      case 'filter': current = applyFilter(current, step.args[0], ctx); break;
      case 'first': current = current.slice(0, 1); break;
      case 'last': current = current.slice(-1); break;
      case 'nth': {
        const n = step.args[0];
        const el = n < 0 ? current.at(n) : current[n];
        current = el ? [el] : [];
        break;
      }
      case 'and': {
        const other = new Set(resolveChain(step.args[0], [ctx.root], ctx));
        current = current.filter((el) => other.has(el));
        break;
      }
      case 'or': current = sortInDocumentOrder([...current, ...resolveChain(step.args[0], [ctx.root], ctx)]); break;
      default:
        current = sortInDocumentOrder(current.flatMap((scope) => queryStep(step, scope, ctx)));
    }
  }
  return current;
}

/**
 * Parse and resolve `source` inside `root`.
 * Returns { ok, chain, elements } or { ok: false, error }.
 */
export function run(source, root) {
  let chain;
  try {
    chain = parse(source);
  } catch (error) {
    return { ok: false, error };
  }
  return runChain(chain, root);
}

export function runChain(chain, root) {
  const ctx = { root, textCache: new Map() };
  try {
    return { ok: true, chain, elements: resolveChain(chain, [root], ctx) };
  } catch (error) {
    return { ok: false, error };
  }
}

// ---------------------------------------------------------------------------
// Robustness notes: what a reviewer would say about this locator.

export function review(chain, elements) {
  const notes = [];
  const add = (level, code, detail) => notes.push({ level, code, detail });
  const walk = (steps) => {
    for (const step of steps) {
      const [first, opts = {}] = step.args;
      switch (step.method) {
        case 'getByRole':
          if (opts.name === undefined) add('warn', 'roleNoName', first);
          else add('good', 'role');
          if (opts.name !== undefined && typeof opts.name === 'string' && !opts.exact) add('info', 'substring');
          break;
        case 'getByLabel': add('good', 'label'); break;
        case 'getByPlaceholder': add('ok', 'placeholder'); break;
        case 'getByText':
          if (elements.some((el) => ['button', 'link', 'checkbox', 'textbox'].includes(getRole(el)))) add('warn', 'textOnControl');
          else add('ok', 'text');
          break;
        case 'getByAltText': add('ok', 'alt'); break;
        case 'getByTitle': add('ok', 'title'); break;
        case 'getByTestId': add('ok', 'testid'); break;
        case 'locator':
          if (isXPath(first)) add('bad', 'xpath');
          else {
            if (/\.[\w-]+/.test(first)) add('bad', 'cssClass');
            if (/#[\w-]+/.test(first)) add('warn', 'cssId');
            if (/:nth-|>|\s/.test(first.trim())) add('bad', 'cssStructure');
            if (!/[.#:>\s]/.test(first) && !/\[/.test(first)) add('warn', 'cssTag');
            if (/\[data-testid/.test(first)) add('info', 'cssTestId');
          }
          if (opts.has) walk(opts.has.steps);
          break;
        case 'filter':
          add('good', 'filter');
          if (opts.has) walk(opts.has.steps);
          if (opts.hasNot) walk(opts.hasNot.steps);
          break;
        case 'first': case 'last': case 'nth': add('warn', 'position'); break;
        case 'and': case 'or': walk(step.args[0].steps); break;
        default: break;
      }
    }
  };
  walk(chain.steps);
  if (elements.length === 0) add('bad', 'none');
  if (elements.length > 1) add('bad', 'strict', elements.length);
  // Keep one note per code, worst first. Praise only a locator that finds exactly one element.
  const order = { bad: 0, warn: 1, info: 2, ok: 3, good: 4 };
  const seen = new Set();
  return notes
    .filter((n) => elements.length === 1 || n.level !== 'good')
    .filter((n) => (seen.has(n.code) ? false : seen.add(n.code)))
    .sort((a, b) => order[a.level] - order[b.level]);
}

/** Render a parsed chain back to canonical source (used in strict-mode messages). */
export function describe(chain) {
  const value = (v) => {
    if (v instanceof RegExp) return String(v);
    if (typeof v === 'string') return `'${v.replace(/'/g, "\\'")}'`;
    if (v && v.type === 'chain') return `page.${describe(v)}`;
    if (v && typeof v === 'object') return `{ ${Object.entries(v).map(([k, x]) => `${k}: ${value(x)}`).join(', ')} }`;
    return String(v);
  };
  return chain.steps.map((s) => `${s.method}(${s.args.map(value).join(', ')})`).join('.');
}
