// The sample app ("Toko Kopi") that every locator runs against.
// It is built from options so the "Break the UI" refactors can change the
// DOM while the page looks and behaves the same for a user.

export const REFACTORS = ['hashed', 'ids', 'reorder', 'wrappers', 'translate', 'link'];

const TEXT = {
  en: {
    nav: ['Menu', 'About'], cart: 'Cart', items: '2 items in cart', signIn: 'Sign in', email: 'Email',
    password: 'Password', remember: 'Remember me', beans: 'Coffee beans',
    search: 'Search coffee', add: 'Add to cart', beansAlt: 'beans',
  },
  id: {
    nav: ['Menu', 'Tentang'], cart: 'Keranjang', items: '2 barang di keranjang', signIn: 'Masuk', email: 'Email',
    password: 'Kata sandi', remember: 'Ingat saya', beans: 'Biji kopi',
    search: 'Cari kopi', add: 'Tambah ke keranjang', beansAlt: 'biji kopi',
  },
};

const PRODUCTS = [
  { key: 'gayo', name: 'Arabica Gayo', price: 'Rp 85.000', color: '#6b3f22' },
  { key: 'dampit', name: 'Robusta Dampit', price: 'Rp 60.000', color: '#3f2a1d' },
  { key: 'kalosi', name: 'Toraja Kalosi', price: 'Rp 95.000', color: '#8a5a2b' },
];

const CLASS_NAMES = [
  'shop', 'topbar', 'logo', 'nav', 'icon-btn', 'badge', 'layout', 'panel',
  'form', 'field', 'check', 'btn', 'btn-primary', 'products', 'card', 'price',
  'add', 'search', 'wrap',
];

// Deterministic "CSS modules" style hash so screenshots and tests are stable.
function hashName(name) {
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return `_${(h >>> 0).toString(36).slice(0, 5)}`;
}

function beanImage(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#efe6d8"/><ellipse cx="32" cy="32" rx="16" ry="22" fill="${color}" transform="rotate(25 32 32)"/><path d="M24 14 C38 26 26 38 40 50" stroke="#efe6d8" stroke-width="3" fill="none" transform="rotate(25 32 32)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Render the shop into `root`.
 * Returns a Map element -> logical key, used to tell whether a locator still
 * points at the "same" thing after a refactor.
 */
export function renderShop(root, options = {}) {
  const on = new Set(options.refactors || []);
  const t = TEXT[on.has('translate') ? 'id' : 'en'];
  const keys = new Map();
  const cls = (...names) => names.map((n) => (on.has('hashed') ? hashName(n) : n)).join(' ');
  const id = (name) => (on.has('ids') ? `r${hashName(name).slice(1, 4)}` : name);

  function h(key, tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) {
      if (value === true) el.setAttribute(name, '');
      else if (value !== false && value != null) el.setAttribute(name, value);
    }
    for (const child of children.flat()) {
      if (child == null) continue;
      el.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    if (key) keys.set(el, key);
    return el;
  }
  const wrap = (key, child) => (on.has('wrappers') ? h(key, 'div', { class: cls('wrap') }, child) : child);

  const cartIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  cartIcon.setAttribute('viewBox', '0 0 24 24');
  cartIcon.setAttribute('aria-hidden', 'true');
  cartIcon.innerHTML = '<path d="M3 4h2l2.4 11h11l2-8H6.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>';
  keys.set(cartIcon, 'cart-icon');

  const header = h('header', 'header', { class: cls('topbar') },
    wrap('wrap-header', h(null, 'div', {},
      h('logo', 'a', { href: '#', class: cls('logo') }, 'Toko Kopi'),
      h('nav', 'nav', { class: cls('nav'), 'aria-label': 'Main' },
        h('nav-menu', 'a', { href: '#' }, t.nav[0]),
        h('nav-about', 'a', { href: '#' }, t.nav[1])),
    )),
    h('cart', 'button', { class: cls('icon-btn'), 'aria-label': t.cart, 'data-testid': 'cart-button' },
      cartIcon, h('cart-badge', 'span', { class: cls('badge'), title: t.items }, '2')),
  );

  const field = (key, label, input) => wrap(`wrap-${key}`,
    h(`field-${key}`, 'div', { class: cls('field') }, label, input));

  const signIn = h('signin', 'section', { class: cls('panel'), 'aria-labelledby': id('signin-title') },
    h('signin-title', 'h2', { id: id('signin-title') }, t.signIn),
    h('form', 'form', { class: cls('form') },
      field('email',
        h('email-label', 'label', { for: id('email') }, t.email),
        h('email', 'input', { id: id('email'), type: 'email', placeholder: 'you@example.com', 'data-testid': 'email-input' })),
      field('password',
        h('password-label', 'label', { for: id('password') }, t.password),
        h('password', 'input', { id: id('password'), type: 'password' })),
      h('remember-label', 'label', { class: cls('check') },
        h('remember', 'input', { type: 'checkbox' }), ` ${t.remember}`),
      wrap('wrap-submit', h('submit', 'button', { type: 'submit', class: cls('btn', 'btn-primary') }, t.signIn)),
    ),
  );

  const products = on.has('reorder') ? [...PRODUCTS].reverse() : PRODUCTS;
  const cards = products.map((p) => {
    const addAttrs = { class: cls('btn', 'add') };
    const add = on.has('link')
      ? h(`add-${p.key}`, 'a', { href: '#', ...addAttrs }, t.add)
      : h(`add-${p.key}`, 'button', { type: 'button', ...addAttrs }, t.add);
    const body = [
      h(`img-${p.key}`, 'img', { src: beanImage(p.color), alt: `${p.name} ${t.beansAlt}`, width: 64, height: 64 }),
      h(`name-${p.key}`, 'h3', {}, p.name),
      h(`price-${p.key}`, 'p', { class: cls('price') }, p.price),
      wrap(`wrap-add-${p.key}`, add),
    ];
    return h(`card-${p.key}`, 'li', { class: cls('card'), 'data-testid': `product-${p.key}` },
      on.has('wrappers') ? h(`wrap-card-${p.key}`, 'div', { class: cls('wrap') }, body) : body);
  });

  const catalog = h('catalog', 'section', { class: cls('panel'), 'aria-labelledby': id('beans-title') },
    h('beans-title', 'h2', { id: id('beans-title') }, t.beans),
    h('search', 'input', { type: 'search', class: cls('search'), placeholder: t.search }),
    h('products', 'ul', { class: cls('products') }, cards),
  );

  const shop = h('shop', 'div', { class: cls('shop') },
    header, h('main', 'main', { class: cls('layout') }, signIn, catalog));

  shop.addEventListener('submit', (e) => e.preventDefault());
  shop.addEventListener('click', (e) => { if (e.target.closest('a[href="#"]')) e.preventDefault(); });
  root.replaceChildren(shop);
  return keys;
}

/**
 * CSS for the shop, written against the same (possibly hashed) class names.
 * Every rule is scoped to [data-shop] so it never leaks into the site UI.
 */
export function shopCss(refactors = []) {
  const hashed = refactors.includes('hashed');
  const c = (n) => `.${hashed ? hashName(n) : n}`;
  return scope(`
${c('shop')}{font:14px/1.45 "IBM Plex Sans",system-ui,sans-serif;color:#2a211a;background:#fbf7f0}
${c('topbar')}{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-bottom:1px solid #e3d8c7;background:#fff}
${c('wrap')}{display:contents}
${c('topbar')} div{display:flex;align-items:center;gap:16px}
${c('logo')}{font-weight:700;color:#2a211a;text-decoration:none;letter-spacing:-.01em}
${c('nav')}{display:flex;gap:12px}
${c('nav')} a{color:#6d5c4b;text-decoration:none}
${c('icon-btn')}{position:relative;display:grid;place-items:center;width:34px;height:34px;border:1px solid #e3d8c7;border-radius:8px;background:#fff;color:#2a211a;cursor:pointer}
${c('icon-btn')} svg{width:18px;height:18px;fill:currentColor}
${c('badge')}{position:absolute;top:-6px;right:-6px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:#b4532a;color:#fff;font-size:10px;line-height:16px;text-align:center}
${c('layout')}{display:grid;gap:14px;padding:14px}
${c('panel')}{background:#fff;border:1px solid #e3d8c7;border-radius:10px;padding:12px 14px}
${c('panel')} h2{margin:0 0 10px;font-size:15px}
${c('form')}{display:grid;gap:8px}
${c('field')}{display:grid;gap:3px}
${c('field')} label{font-size:12px;color:#6d5c4b}
${c('field')} input,${c('search')}{font:inherit;padding:6px 8px;border:1px solid #d6c8b3;border-radius:6px;background:#fffdf9;width:100%;box-sizing:border-box}
${c('check')}{display:flex;align-items:center;gap:6px;font-size:13px}
${c('btn')}{display:inline-block;font:inherit;font-weight:600;padding:6px 12px;border-radius:6px;border:1px solid #2a211a;background:#fff;color:#2a211a;cursor:pointer;text-decoration:none;text-align:center}
${c('btn-primary')}{background:#2a211a;color:#fbf7f0}
${c('search')}{margin-bottom:10px}
${c('products')}{list-style:none;margin:0;padding:0;display:grid;gap:8px}
${c('card')}{display:grid;grid-template-columns:44px 1fr auto;column-gap:10px;align-items:center;padding:8px;border:1px solid #efe6d8;border-radius:8px}
${c('card')} img{grid-row:span 2;width:44px;height:44px;border-radius:6px}
${c('card')} h3{margin:0;font-size:14px}
${c('price')}{margin:0;color:#6d5c4b;font-size:12px;grid-column:2}
${c('card')} ${c('btn')}{grid-column:3;grid-row:1 / span 2}
`);
}

function scope(css) {
  return css.trim().split('\n').map((rule) => {
    const brace = rule.indexOf('{');
    const selectors = rule.slice(0, brace).split(',').map((sel) => `[data-shop] ${sel.trim()}`);
    return selectors.join(',') + rule.slice(brace);
  }).join('\n');
}
