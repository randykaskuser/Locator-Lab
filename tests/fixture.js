// Renders the shop for tests/parity.mjs and exposes the lab engine.
import { renderShop, shopCss } from '../public/js/shop.js';
import { parse, runChain } from '../public/js/engine.js';

const refactors = new URLSearchParams(location.search).get('r')?.split(',').filter(Boolean) ?? [];
const style = document.createElement('style');
style.textContent = shopCss(refactors);
document.head.append(style);
const root = document.getElementById('root');
renderShop(root, { refactors });

// Index of each matched element among #root's descendants (root itself = -1).
const indexOf = (el) => [...root.querySelectorAll('*')].indexOf(el);
window.labRun = (source) => {
  const result = runChain(parse(source), root);
  if (!result.ok) return { error: String(result.error) };
  return { indexes: result.elements.map(indexOf) };
};
window.ready = true;
