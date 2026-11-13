// Behaviour for every page: menu, clips, tiles, prompt panel, search, board. No framework.
import { assemble, CHAT } from '../lib/prompt.mjs';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData === true;
const touch = matchMedia('(hover: none)').matches;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- sheets (All groups, search): one open at a time; Escape or a click outside closes and gives focus back; Tab stays inside
const sheets = $$('[data-sheet]');
const focusables = (d) => $$('summary, a[href], button:not([disabled]), input', d).filter((e) => e.getClientRects().length);
sheets.forEach((d) => d.addEventListener('toggle', () => { if (!d.open) return; sheets.forEach((o) => { if (o !== d) o.open = false; }); $('input', d)?.focus(); }));
document.addEventListener('keydown', (e) => {
  const d = sheets.find((s) => s.open); if (!d) return;
  if (e.key === 'Escape') { d.open = false; $('summary', d).focus(); return; }
  if (e.key !== 'Tab') return;
  const f = focusables(d); const i = f.indexOf(document.activeElement);
  if (e.shiftKey && i <= 0) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
});
document.addEventListener('click', (e) => sheets.forEach((d) => { if (d.open && !d.contains(e.target)) d.open = false; }));

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
  if (!tile.dataset.clip) return;
  let v = $('video', tile);
  if (!v) { v = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, src: tile.dataset.clip }); v.setAttribute('aria-hidden', 'true'); $('img', tile)?.after(v); }
  v.play().catch(() => {});
};
const stopIn = (tile) => $('video', tile)?.remove();
const watch = touch && !calm && 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => (e.intersectionRatio >= 0.6 ? playIn(e.target) : stopIn(e.target))), { threshold: [0, 0.6] }) : null;
function tiles() {
  if (calm) return;
  for (const t of $$('.tile[data-clip]')) {
    if (t.dataset.wired) continue; t.dataset.wired = '1';
    if (watch) { watch.observe(t); continue; }
    t.addEventListener('pointerenter', () => playIn(t)); t.addEventListener('focus', () => playIn(t));
    t.addEventListener('pointerleave', () => stopIn(t)); t.addEventListener('blur', () => stopIn(t));
  }
}
tiles();

// ---- prompt panel
const pretty = (s) => esc(s).replace(/^([A-Z][A-Za-z0-9 ]{2,28}(?: \([^)\n]*\))?:)/gm, '<b>$1</b>').replace(/ (Camera|Pace|Keep|Ends|Cut):/g, ' <b>$1:</b>').replace(/\[your [a-z]+\]/g, '<span class="tok">$&</span>');
const engine = (id) => (id.startsWith('chat') ? CHAT.id : id); // Claude, ChatGPT and Gemini share one chat prompt
function promptPanel(root) {
  const data = JSON.parse($('[data-json]', root).textContent);
  const out = $('[data-out]', root); const note = $('[data-note]', root); const more = $('[data-more]', root); const moreToggle = $('[data-more-toggle]', root);
  const copy = $('[data-copy]', root); const copyLabel = $('[data-copy-label]', root); const status = $('[data-status]', root);
  const tabs = $$('[role="tab"]', root);
  const st = { model: tabs[0].dataset.model, items: data.items, raw: '' };
  tabs.forEach((t, n) => { t.tabIndex = n ? -1 : 0; }); // one tab stop for the model pills; arrow keys move between them
  const fields = () => Object.fromEntries($$('[data-field]', root).map((f) => [f.dataset.field, f.value.trim()]));
  function render() {
    note.textContent = data.notes[st.model] || '';
    st.raw = st.items.length ? assemble(st.items, engine(st.model), fields(), data.models) : '';
    out.innerHTML = st.raw ? pretty(st.raw) : 'Pick a card to start your prompt.'; out.classList.toggle('soft', !st.raw);
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
  if (st.items.length) { st.raw = assemble(st.items, engine(st.model), fields(), data.models); out.innerHTML = pretty(st.raw); } else copy.disabled = true;
  return { st, render, fields, select };
}
const pw = $('[data-prompt]') && promptPanel($('[data-prompt]'));

// ---- search: one index, read on the first search; a name that starts with the words ranks first
let index = null;
async function find(text) {
  const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  index ||= await fetch('/api/search.json').then((r) => r.json());
  const q = terms.join(' ');
  const rank = (c) => { const n = c.name.toLowerCase(); return n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : terms.some((t) => n.includes(t)) ? 3 : 4; };
  return index.filter((c) => terms.every((t) => (' ' + c.words).includes(' ' + t))).map((c) => [rank(c), c]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
}
const NONE = 'No card by that name. Try a move, a light or a hook.';

// ---- on home, results take the place of the constellation
const form = $('[data-search]');
if (form) {
  const q = $('input', form); const hero = $('[data-hero]'); const wrap = $('[data-results-wrap]'); const grid = $('[data-results]'); const meta = $('[data-results-meta]'); const none = $('[data-noresults]'); const library = $('[data-library]');
  let index = null;
  const words = (t) => t.split(' ').map((w, n) => `<span class="w" style="--i:${n}">${esc(w)}</span>`).join(' ');
  const tile = (c) => `<a class="tile${c.say ? ' say' : ''}" href="${esc(c.href)}"${c.clip ? ` data-clip="${esc(c.clip)}"` : ''}><span class="name">${esc(c.name)}</span>${c.still ? `<img src="${esc(c.still)}" alt="" width="480" height="270" loading="lazy"><span class="line">${esc(c.line)}</span>` : c.dg || `<p>${c.say ? words(c.text) : esc(c.text)}</p>`}</a>`;
  async function run() {
    const terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    history.replaceState(null, '', terms.length ? `?q=${encodeURIComponent(q.value)}` : location.pathname);
    hero.classList.toggle('is-searching', terms.length > 0); wrap.hidden = !terms.length; library.hidden = false;
    if (!terms.length) return;
    const hits = (await find(q.value)).slice(0, 60);
    none.hidden = hits.length > 0; library.hidden = hits.length > 0; meta.textContent = hits.length ? `${hits.length} ${hits.length === 1 ? 'card' : 'cards'}` : '';
    grid.innerHTML = hits.map(tile).join('');
    tiles();
  }
  let t = 0;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 120); });
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  document.addEventListener('keydown', (e) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); } });
  const start = new URLSearchParams(location.search).get('q');
  if (start) { q.value = start; run(); }
  if (location.hash === '#search') q.focus({ preventScroll: true });
}

// ---- the search sheet in the header, on every page: name, shelf, one line, the poster when the card has a clip
const finder = $('[data-find]');
if (finder) {
  const fq = $('input', finder); const list = $('[data-hits]', finder); const note = $('[data-hits-note]', finder);
  const row = (c) => `<li><a href="${esc(c.href)}">${c.still ? `<img src="${esc(c.still)}" alt="" width="96" height="54" decoding="async">` : `<span class="ph">${c.dg || ''}</span>`}<span><span class="nm">${esc(c.name)} <span class="soft">· ${esc(c.group)}</span></span><small>${esc(c.line)}</small></span></a></li>`;
  let t = 0;
  fq.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      const v = fq.value.trim(); const hits = await find(v);
      if (v !== fq.value.trim()) return;
      list.innerHTML = hits.slice(0, 6).map(row).join('');
      note.innerHTML = !v ? '' : !hits.length ? NONE : hits.length > 6 ? `<a href="/?q=${encodeURIComponent(v)}">See all ${hits.length} cards</a>` : '';
    }, 120);
  });
  // arrow keys walk from the field through the results
  finder.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const f = [fq, ...$$('[data-hits] a, [data-hits-note] a', finder)]; const i = f.indexOf(document.activeElement);
    if (i < 0) return; e.preventDefault(); f[Math.max(0, Math.min(f.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
  });
  // on home the field in the first screen is the search
  if (form) $('summary', finder).addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' }); $('input', form).focus({ preventScroll: true }); });
}

// ---- board: pick one card per part; the picks live in the address, so a board can be shared
const board = $('[data-board]');
if (board && pw) {
  const slots = $$('[data-slot]', board); let lib = null; let open = null;
  const picks = new Map();
  const params = new URLSearchParams(location.search);
  $$('[data-field]', board).forEach((f) => { f.value = params.get(f.dataset.field === 'subject' ? 's' : 'p') || ''; });
  const picker = (id) => $(`[data-picker="${id}"]`, board);
  const empty = $('.tile.empty', board).innerHTML;
  function draw() {
    for (const slot of slots) {
      const id = slot.dataset.slot; const b = $('.tile', slot); const card = picks.get(id) && $(`[data-pick="${picks.get(id)}"]`, picker(id));
      slot.classList.toggle('sel', open === id); b.classList.toggle('empty', !card);
      b.innerHTML = !card ? empty : card.dataset.still ? `<img src="${esc(card.dataset.still)}" alt=""><span class="name">${esc(card.dataset.name)}</span>` : $('.dg', card) ? `${$('.dg', card).outerHTML}<span class="name">${esc(card.dataset.name)}</span>` : `<p>${esc(card.dataset.name)}</p>`;
      if (card?.dataset.clip) b.dataset.clip = card.dataset.clip; else delete b.dataset.clip;
      b.setAttribute('aria-label', card ? `${slot.firstElementChild.textContent}: ${card.dataset.name}. Change it` : `Pick ${/^[aeiou]/i.test(slot.firstElementChild.textContent) ? "an" : "a"} ${slot.firstElementChild.textContent.toLowerCase()}`);
      b.setAttribute('aria-expanded', String(open === id));
      $$('[data-pick]', picker(id)).forEach((t) => { const on = t === card; t.classList.toggle('is-on', on); t.setAttribute('aria-pressed', String(on)); });
      picker(id).hidden = open !== id;
    }
  }
  async function update() {
    draw(); tiles();
    if (picks.size) lib ||= await fetch('/api/library.json').then((r) => r.json());
    pw.st.items = slots.map((s) => picks.get(s.dataset.slot)).filter(Boolean).map((slug) => lib.items.find((i) => i.slug === slug)).filter(Boolean);
    pw.render();
    const next = new URLSearchParams(slots.filter((s) => picks.has(s.dataset.slot)).map((s) => [s.dataset.slot, picks.get(s.dataset.slot)]));
    const f = pw.fields(); if (f.subject) next.set('s', f.subject); if (f.setting) next.set('p', f.setting);
    if (picks.size) next.set('m', pw.st.model);
    history.replaceState(null, '', [...next].length ? `?${next}` : location.pathname);
  }
  const nextEmpty = (after) => { const ids = slots.map((s) => s.dataset.slot); const from = ids.indexOf(after); return [...ids.slice(from + 1), ...ids.slice(0, from)].find((id) => !picks.has(id)) || null; };
  slots.forEach((slot) => { const id = slot.dataset.slot; if (params.get(id) && $(`[data-pick="${CSS.escape(params.get(id))}"]`, picker(id))) picks.set(id, params.get(id)); $('.tile', slot).addEventListener('click', () => { open = open === id ? null : id; draw(); tiles(); }); });
  $$('[data-pick]', board).forEach((t) => t.addEventListener('click', () => { const id = t.closest('[data-picker]').dataset.picker; picks.set(id, t.dataset.pick); open = nextEmpty(id); update(); }));
  $$('[data-clear]', board).forEach((b) => b.addEventListener('click', () => { picks.delete(b.dataset.clear); update(); }));
  $('[data-reset]', board).addEventListener('click', () => { picks.clear(); open = slots[0].dataset.slot; update(); });
  board.addEventListener('dc:change', update);
  open = nextEmpty(slots[slots.length - 1].dataset.slot);
  if (params.get('m')) pw.select(params.get('m')); else update();
}
