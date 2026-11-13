// Behaviour for every page: menu, clips, tiles, prompt panel, search, board. No framework.
import { assemble, CHAT } from '../lib/prompt.mjs';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData === true;
const touch = matchMedia('(hover: none)').matches;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- All groups sheet: closes on Escape and on a click outside
const menu = $('[data-menu]');
if (menu) {
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.open) { menu.open = false; $('summary', menu).focus(); } });
  document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
}

// ---- clips that play on their own (the first frame of the constellation) stay on their poster under reduced motion
if (!calm) $$('video[data-autoplay]').forEach((v) => v.play().catch(() => {}));

// ---- the large clip of a card page, with its play and pause control
const main = $('[data-clip-main]');
if (main) {
  const v = $('video', main); const b = $('[data-toggle]', main);
  const sync = () => { main.classList.toggle('is-playing', !v.paused); b.setAttribute('aria-label', v.paused ? 'Play the clip' : 'Pause the clip'); };
  b.addEventListener('click', () => (v.paused ? v.play() : v.pause()));
  v.addEventListener('play', sync); v.addEventListener('pause', sync);
  if (!calm) v.play().catch(() => {});
}

// ---- tiles: the clip plays quietly on hover or focus; on touch screens, while the tile is in view
const playIn = (tile) => {
  let v = $('video', tile);
  if (!v) { v = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, src: tile.dataset.clip }); v.setAttribute('aria-hidden', 'true'); tile.insertBefore(v, tile.children[1] || null); }
  v.play().catch(() => {});
};
const stopIn = (tile) => $('video', tile)?.remove();
const watch = touch && !calm && 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => (e.intersectionRatio >= 0.6 ? playIn(e.target) : stopIn(e.target))), { threshold: [0, 0.6] }) : null;
function tiles() {
  if (calm) return;
  for (const t of $$('.tile[data-clip]')) {
    if (t.dataset.wired) continue; t.dataset.wired = '1';
    if (watch) { watch.observe(t); continue; }
    t.addEventListener('mouseenter', () => playIn(t)); t.addEventListener('focus', () => playIn(t));
    t.addEventListener('mouseleave', () => stopIn(t)); t.addEventListener('blur', () => stopIn(t));
  }
}
tiles();

// ---- prompt panel
const pretty = (s) => esc(s).replace(/^([A-Z][A-Za-z0-9 ]{2,28}(?: \([^)\n]*\))?:)/gm, '<b>$1</b>').replace(/ (Camera|Pace|Keep|Ends|Cut):/g, ' <b>$1:</b>');
function promptPanel(root) {
  const data = JSON.parse($('[data-json]', root).textContent);
  const out = $('[data-out]', root); const note = $('[data-note]', root); const more = $('[data-more]', root); const moreToggle = $('[data-more-toggle]', root);
  const copy = $('[data-copy]', root); const copyLabel = $('[data-copy-label]', root); const status = $('[data-status]', root);
  const tabs = $$('[role="tab"]', root);
  const st = { model: tabs[0].dataset.model, items: data.items, raw: '' };
  const fields = () => Object.fromEntries($$('[data-field]', root).map((f) => [f.dataset.field, f.value.trim()]));
  function render() {
    note.textContent = data.notes[st.model] || '';
    st.raw = st.items.length ? assemble(st.items, st.model, fields(), data.models) : '';
    out.innerHTML = st.raw ? pretty(st.raw) : 'Pick at least one card.';
    copy.disabled = !st.raw;
  }
  function select(id) {
    if (!tabs.some((t) => t.dataset.model === id)) return;
    st.model = id;
    tabs.forEach((t) => { const on = t.dataset.model === id; t.setAttribute('aria-selected', String(on)); t.classList.toggle('plain', !on); t.tabIndex = on ? 0 : -1; });
    const hidden = more && tabs.find((t) => t.dataset.model === id).closest('[data-more]');
    if (hidden && more.hidden) { more.hidden = false; moreToggle.setAttribute('aria-expanded', 'true'); }
    render(); root.dispatchEvent(new CustomEvent('dc:change', { bubbles: true }));
  }
  tabs.forEach((tab, n) => {
    tab.addEventListener('click', () => select(tab.dataset.model));
    tab.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { const next = tabs[(n + d + tabs.length) % tabs.length]; select(next.dataset.model); next.focus(); } });
  });
  moreToggle?.addEventListener('click', () => { more.hidden = !more.hidden; moreToggle.setAttribute('aria-expanded', String(!more.hidden)); });
  $$('[data-field]', root).forEach((f) => f.addEventListener('input', () => { render(); root.dispatchEvent(new CustomEvent('dc:change', { bubbles: true })); }));
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(st.raw); } catch { const r = document.createRange(); r.selectNodeContents(out); getSelection().removeAllRanges(); getSelection().addRange(r); document.execCommand('copy'); }
    copy.classList.add('is-done'); copyLabel.textContent = 'Copied'; status.textContent = 'Prompt copied';
    setTimeout(() => { copy.classList.remove('is-done'); copyLabel.textContent = 'Copy prompt'; status.textContent = ''; }, 1600);
  });
  if (st.items.length) { st.raw = assemble(st.items, st.model, fields(), data.models); out.innerHTML = pretty(st.raw); } else copy.disabled = true;
  return { st, render, fields, select };
}
const pw = $('[data-prompt]') && promptPanel($('[data-prompt]'));

// ---- search: results take the place of the constellation
const form = $('[data-search]');
if (form) {
  const q = $('input', form); const hero = $('[data-hero]'); const wrap = $('[data-results-wrap]'); const grid = $('[data-results]'); const meta = $('[data-results-meta]'); const none = $('[data-noresults]'); const library = $('[data-library]');
  let index = null;
  const tile = (c) => `<a class="tile" href="${esc(c.href)}"${c.clip ? ` data-clip="${esc(c.clip)}"` : ''}>${c.still ? `<img src="${esc(c.still)}" alt="" width="480" height="270" loading="lazy">` : `<p>${esc(c.text)}</p>`}<span class="name">${esc(c.name)}</span></a>`;
  async function run() {
    const terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    history.replaceState(null, '', terms.length ? `?q=${encodeURIComponent(q.value)}` : location.pathname);
    hero.classList.toggle('is-searching', terms.length > 0); wrap.hidden = !terms.length; library.hidden = terms.length > 0;
    if (!terms.length) return;
    index ||= await fetch('/api/search.json').then((r) => r.json());
    const hits = index.filter((c) => terms.every((t) => c.words.includes(t))).sort((a, b) => Number(b.name.toLowerCase().includes(terms[0])) - Number(a.name.toLowerCase().includes(terms[0]))).slice(0, 60);
    none.hidden = hits.length > 0; meta.textContent = hits.length ? `${hits.length} ${hits.length === 1 ? 'card' : 'cards'}` : '';
    grid.innerHTML = hits.map(tile).join('');
    tiles();
  }
  let t = 0;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 120); });
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  document.addEventListener('keydown', (e) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); } });
  $('[data-search-link]')?.addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' }); q.focus({ preventScroll: true }); });
  const start = new URLSearchParams(location.search).get('q');
  if (start) { q.value = start; run(); }
  if (location.hash === '#search') q.focus({ preventScroll: true });
}

// ---- board: the picks live in the address, so a board can be shared
const board = $('[data-board]');
if (board && pw) {
  const slots = $$('[data-slot]', board); let lib = null;
  const words = $('[data-board-words]', board); const still = $('[data-board-still]', board); const frame = $('[data-board-clip]', board);
  const params = new URLSearchParams(location.search);
  slots.forEach((s) => { if (params.get(s.name)) s.value = params.get(s.name); });
  $$('[data-field]', board).forEach((f) => { f.value = params.get(f.dataset.field === 'subject' ? 's' : 'p') || ''; });
  async function update() {
    const picks = slots.filter((s) => s.value);
    if (picks.length) lib ||= await fetch('/api/library.json').then((r) => r.json());
    pw.st.items = picks.map((s) => lib.items.find((i) => i.slug === s.value)).filter(Boolean);
    pw.render();
    const next = new URLSearchParams(picks.map((s) => [s.name, s.value]));
    const f = pw.fields(); if (f.subject) next.set('s', f.subject); if (f.setting) next.set('p', f.setting);
    if (picks.length) next.set('m', pw.st.model);
    history.replaceState(null, '', [...next].length ? `?${next}` : location.pathname);
    // the frame shows the picture of the last pick that has one, else the names picked
    const pic = picks.map((s) => s.selectedOptions[0].dataset.src).filter(Boolean).pop();
    still.hidden = !pic; words.hidden = !!pic; frame.classList.toggle('type', !pic);
    if (pic) still.src = pic; else words.textContent = picks.length ? picks.map((s) => s.selectedOptions[0].dataset.name).join(', ') + '.' : 'Pick one of each.';
  }
  slots.forEach((s) => s.addEventListener('change', update));
  $('[data-slots]', board).addEventListener('reset', () => setTimeout(update, 0));
  board.addEventListener('dc:change', update);
  if (params.get('m')) pw.select(params.get('m')); else update();
}
