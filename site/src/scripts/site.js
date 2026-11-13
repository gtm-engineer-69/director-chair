// Behaviour for every page: menu, monitor, card clips in view, prompt window, search, board. No framework.
import { assemble, CHAT } from '../lib/prompt.mjs';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData === true;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- menu on small screens
const bar = $('[data-menubar]'); const toggle = $('[data-menu-toggle]');
toggle?.addEventListener('click', () => { const open = bar.classList.toggle('is-open'); toggle.setAttribute('aria-expanded', String(open)); });

// ---- monitor: play chip, timecode, tuning to another channel
const screen = $('[data-screen]');
let tune = () => {};
if (screen) {
  const video = $('video', screen); const still = $('[data-still]', screen);
  const osd = (k) => $(`[data-osd="${k}"]`, screen);
  const home = { ch: screen.dataset.ch, name: screen.dataset.name, src: null };
  const tc = () => { const s = Math.floor(video?.currentTime || 0); return `0:00:${String(s).padStart(2, '0')}`; };
  const idle = () => !screen.classList.contains('is-still') && !screen.classList.contains('is-tuned');
  const show = (c) => {
    osd('ch').textContent = `CH ${c.ch}`; osd('name').textContent = c.name;
    screen.classList.toggle('is-still', !!c.src); screen.classList.toggle('is-tuned', c.src !== null);
    screen.classList.toggle('is-card', c.src === '' || (c.src === null && !video));
    if (c.src) still.src = c.src;
    osd('tc').textContent = c.src ? 'Still' : c.src === '' || !video ? 'No signal' : tc();
  };
  tune = (c) => show(c || home); // the channel-change effect hooks in here with the approved design
  if (video) {
    const play = osd('play'); const state = osd('state');
    const sync = () => { state.textContent = video.paused ? 'Play' : 'Pause'; play.setAttribute('aria-label', video.paused ? 'Play the clip' : 'Pause the clip'); };
    play.addEventListener('click', () => (video.paused ? video.play() : video.pause()));
    video.addEventListener('play', sync); video.addEventListener('pause', sync);
    video.addEventListener('timeupdate', () => { if (idle()) osd('tc').textContent = tc(); });
    if (video.hasAttribute('data-autoplay') && !calm) video.play().catch(() => {});
    sync();
  }
  let back = 0;
  const wire = (card) => {
    if (card.dataset.wired) return; card.dataset.wired = '1';
    const on = () => { clearTimeout(back); tune({ ch: card.dataset.ch, name: card.dataset.name, src: card.dataset.src }); };
    const off = () => { clearTimeout(back); back = setTimeout(() => tune(null), 220); };
    card.addEventListener('mouseenter', on); card.addEventListener('focus', on); card.addEventListener('mouseleave', off); card.addEventListener('blur', off);
  };
  $$('.card[data-ch]').forEach(wire);
  document.addEventListener('dc:cards', () => $$('.card[data-ch]').forEach(wire));
}

// ---- card clips play muted only while in view
const watch = 'IntersectionObserver' in window && !calm ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    const card = e.target; let v = $('video', card);
    if (e.intersectionRatio >= 0.6) {
      if (!v) { v = Object.assign(document.createElement('video'), { muted: true, loop: true, playsInline: true, src: card.dataset.clip }); v.setAttribute('aria-hidden', 'true'); v.width = 480; v.height = 270; card.insertBefore(v, card.children[1] || null); }
      v.play().catch(() => {});
    } else if (v) v.remove();
  }
}, { threshold: [0, 0.6] }) : null;
const clips = () => watch && $$('.card[data-clip]').forEach((c) => { if (c.dataset.clip && !c.dataset.seen) { c.dataset.seen = '1'; watch.observe(c); } });
clips();

// ---- prompt window
const pretty = (s) => esc(s).replace(/^([A-Z][A-Za-z0-9 ]{2,28}(?: \([^)\n]*\))?:)/gm, '<b>$1</b>').replace(/ (Camera|Pace|Keep|Ends|Cut):/g, ' <b>$1:</b>');
function promptWindow(root) {
  const data = JSON.parse($('[data-json]', root).textContent);
  const out = $('[data-out]', root); const note = $('[data-note]', root); const more = $('[data-more]', root); const sheet = $('[data-sheet]', root);
  const copy = $('[data-copy]', root); const stamp = $('[data-stamp]', root); const status = $('[data-status]', root);
  const tabs = $$('[role="tab"]', root);
  const st = { model: tabs[0].dataset.model, items: data.items, raw: out.textContent };
  const fields = () => Object.fromEntries($$('[data-field]', root).map((f) => [f.dataset.field, f.value.trim()]));
  function render() {
    const list = st.model === 'more';
    if (more) more.hidden = !list;
    out.hidden = list; note.hidden = list; sheet.classList.toggle('is-term', list);
    copy.disabled = list || !st.items.length;
    if (list) return;
    note.textContent = data.notes[st.model] || '';
    st.raw = st.items.length ? assemble(st.items, st.model, fields(), data.models) : '';
    out.innerHTML = st.raw ? pretty(st.raw) : 'Pick at least one card on the board.';
  }
  const select = (tab, model) => { tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab))); st.model = model; render(); root.dispatchEvent(new CustomEvent('dc:model', { bubbles: true, detail: model })); };
  tabs.forEach((tab, n) => {
    tab.addEventListener('click', () => select(tab, tab.dataset.model));
    tab.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { const next = tabs[(n + d + tabs.length) % tabs.length]; next.focus(); next.click(); } });
  });
  if (more) $$('button[data-model]', more).forEach((b) => b.addEventListener('click', () => { st.model = b.dataset.model; render(); root.dispatchEvent(new CustomEvent('dc:model', { bubbles: true, detail: st.model })); }));
  $$('[data-field]', root).forEach((f) => f.addEventListener('input', () => { render(); root.dispatchEvent(new CustomEvent('dc:fields', { bubbles: true })); }));
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(st.raw); } catch { const r = document.createRange(); r.selectNodeContents(out); getSelection().removeAllRanges(); getSelection().addRange(r); document.execCommand('copy'); }
    stamp.classList.add('is-on'); status.textContent = 'Prompt copied'; setTimeout(() => { stamp.classList.remove('is-on'); status.textContent = ''; }, 1300);
  });
  return { st, render, fields, setModel(id) { const tab = tabs.find((t) => t.dataset.model === id); if (tab) select(tab, id); else if (data.models.some((m) => m.id === id) || id === CHAT.id) { st.model = id; render(); } } };
}
const pw = $('[data-prompt]') && promptWindow($('[data-prompt]'));

// ---- search on the home page
const form = $('[data-search]');
if (form) {
  const q = $('input', form); const win = $('[data-results-win]'); const grid = $('[data-results]'); const meta = $('[data-results-meta]'); const none = $('[data-noresults]');
  let index = null;
  const card = (c) => (c.still
    ? `<a class="card" href="${esc(c.href)}" data-ch="${esc(c.ch)}" data-name="${esc(c.name)}" data-src="${esc(c.poster)}" data-clip="${esc(c.clip)}"><img src="${esc(c.still)}" alt="${esc(c.name)}" width="480" height="270" loading="lazy"><span class="osd osd-tl">CH ${esc(c.ch)}</span><span class="osd osd-bl">${esc(c.name)}</span></a>`
    : `<a class="card card-type ${esc(c.on)} ${esc(c.size)}" style="--tint:${esc(c.tint)}" href="${esc(c.href)}" data-ch="${esc(c.ch)}" data-name="${esc(c.name)}" data-src=""><span class="osd osd-tl">${esc(c.label)}</span><b>${esc(c.name)}</b></a>`);
  async function run() {
    const terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    history.replaceState(null, '', terms.length ? `?q=${encodeURIComponent(q.value)}` : location.pathname);
    if (!terms.length) { win.hidden = true; return; }
    index ||= await fetch('/api/search.json').then((r) => r.json());
    const hits = index.filter((c) => terms.every((t) => c.words.includes(t))).sort((a, b) => Number(b.name.toLowerCase().includes(terms[0])) - Number(a.name.toLowerCase().includes(terms[0]))).slice(0, 48);
    win.hidden = false; none.hidden = hits.length > 0; meta.textContent = `${hits.length} ${hits.length === 1 ? 'card' : 'cards'}`;
    grid.innerHTML = hits.map(card).join('');
    document.dispatchEvent(new Event('dc:cards')); clips();
  }
  let t = 0;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 120); });
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  document.addEventListener('keydown', (e) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); } });
  const start = new URLSearchParams(location.search).get('q');
  if (start) { q.value = start; run(); }
  if (location.hash === '#q') q.focus();
}

// ---- board: the picks live in the address, so a board can be shared
const board = $('[data-board]');
if (board && pw) {
  const slots = $$('[data-slot]', board); let lib = null;
  const params = new URLSearchParams(location.search);
  slots.forEach((s) => { if (params.get(s.name)) s.value = params.get(s.name); });
  $$('[data-field]', board).forEach((f) => { f.value = params.get(f.dataset.field === 'subject' ? 's' : 'p') || ''; });
  async function update(changed) {
    const picks = slots.filter((s) => s.value);
    if (picks.length) lib ||= await fetch('/api/library.json').then((r) => r.json());
    pw.st.items = picks.map((s) => lib.items.find((i) => i.slug === s.value)).filter(Boolean);
    pw.render();
    const next = new URLSearchParams(picks.map((s) => [s.name, s.value]));
    const f = pw.fields(); if (f.subject) next.set('s', f.subject); if (f.setting) next.set('p', f.setting);
    if (pw.st.model !== 'more') next.set('m', pw.st.model);
    history.replaceState(null, '', picks.length || f.subject || f.setting ? `?${next}` : location.pathname);
    const o = changed?.selectedOptions?.[0];
    if (changed) tune(o && o.value ? { ch: o.dataset.ch, name: o.dataset.name, src: o.dataset.src } : null);
  }
  slots.forEach((s) => s.addEventListener('change', () => update(s)));
  $('[data-slots]', board).addEventListener('reset', () => setTimeout(() => update(), 0));
  board.addEventListener('dc:model', () => update()); board.addEventListener('dc:fields', () => update());
  if (params.get('m')) pw.setModel(params.get('m'));
  update();
}
