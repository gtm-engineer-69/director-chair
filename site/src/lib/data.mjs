// The one place pages read the library from. Everything comes from data/library.json.
import raw from '../../data/library.json';
export const lib = raw;
export const items = raw.items;
export const models = raw.models;
export const cats = raw.categories.filter((c) => c.count);
export const SITE = raw.url;
export const LOGO = '/logo-120.png'; // the logo is referenced from here only (source: public/logo.png)

// The seven bars in broadcast order, one per library group; Recipes sits on paper.
const BARS = ['grey', 'yellow', 'cyan', 'green', 'magenta', 'red', 'blue'];
const ICON = { Camera: 'video', Frame: 'frame', 'Light and look': 'sun', 'People and places': 'users', Motion: 'speed-fast', Edit: 'scissors', Story: 'script', Recipes: 'clipboard-note' };
export const bar = (n) => ({ tint: `var(--bar-${BARS[n % 7]})`, on: n % 7 < 4 ? 'on-ink' : 'on-paper' });
export const groups = [...new Set(cats.map((c) => c.group))].map((name, n) => {
  const own = cats.filter((c) => c.group === name);
  return { name, icon: ICON[name], cats: own, count: own.reduce((a, c) => a + c.count, 0), href: `/${own[0].id}`, ...(n < 7 ? bar(n) : { tint: 'var(--paper-sheet)', on: '' }) };
});
export const catOf = (id) => cats.find((c) => c.id === id);
export const groupOf = (catId) => groups.find((g) => g.cats.some((c) => c.id === catId));
export const inCat = (id) => items.filter((i) => i.category === id);
export const bySlug = (slug) => items.find((i) => i.slug === slug);
export const urlOf = (i) => `/${i.category}/${i.slug}`;
export const clipOf = (i) => (i.licensed.find((l) => l.media) || null);
export const shortName = (n) => n.replace(/\s*\(.*\)$/, '').replace(/^Prompt guide: /, '');
const pad = (n) => String(n).padStart(2, '0');

// what a card needs, for the Card component and the search index alike
export function cardOf(i, tintIndex) {
  const c = clipOf(i);
  const g = groupOf(i.category);
  const t = tintIndex == null ? g : bar(tintIndex);
  const short = shortName(i.name);
  return {
    href: urlOf(i), name: short, effect: i.effect,
    ch: c ? pad((c.media.video.match(/\/(\d+)-/) || [0, inCat(i.category).indexOf(i) + 1])[1]) : pad(inCat(i.category).indexOf(i) + 1),
    poster: c ? c.media.poster : '', still: c ? c.media.card_poster : '', clip: c ? c.media.card : '',
    label: i.category === 'hook' ? (i.group || '').split(' ')[0].replace('The', 'Rule') : catOf(i.category).label,
    tint: t.tint, on: t.on || 'on-ink', size: short.length <= 13 ? '' : short.length <= 22 ? 't2' : short.length <= 38 ? 't3' : 't4',
  };
}
