// The one place pages read the library from. Everything comes from data/library.json.
import raw from '../../data/library.json';
export const lib = raw;
export const items = raw.items;
export const models = raw.models;
// row titles and pills read better in the plural; the data keeps the singular label
const PLURAL = { 'Shot size': 'Shot sizes', Angle: 'Angles', 'Camera move': 'Camera moves', Rig: 'Rigs', Lens: 'Lenses', 'Aspect ratio': 'Aspect ratios', 'Colour look': 'Colour looks', 'Art style': 'Art styles',
  Character: 'Characters', Expression: 'Expressions', Setting: 'Settings', Transition: 'Transitions', 'Edit effect': 'Edit effects', Hook: 'Hooks', 'Script arc': 'Script arcs', 'Video format': 'Video formats',
  'Call to action': 'Calls to action', Preset: 'Presets', 'Prompt guide': 'Prompt guides' };
export const cats = raw.categories.filter((c) => c.count).map((c) => ({ ...c, plural: PLURAL[c.label] || c.label }));
export const SITE = raw.url;
export const MARK = null;                 // the slot for a logo mark: a path under public/, or null while the logo is not final
export const ICON = '/logo-120.png';      // browser tab icon, the only place the provisional mark is used

const GROUP_ICON = { Camera: 'video', Frame: 'frame', 'Light and look': 'sun', 'People and places': 'users', Motion: 'gauge', Edit: 'scissors', Story: 'scroll-text', Recipes: 'clipboard-list' };
export const groups = [...new Set(cats.map((c) => c.group))].map((name) => {
  const own = cats.filter((c) => c.group === name);
  return { name, icon: GROUP_ICON[name], cats: own, count: own.reduce((a, c) => a + c.count, 0), href: `/${own[0].id}` };
});
export const catOf = (id) => cats.find((c) => c.id === id);
export const groupOf = (catId) => groups.find((g) => g.cats.some((c) => c.id === catId));
export const inCat = (id) => items.filter((i) => i.category === id);
export const bySlug = (slug) => items.find((i) => i.slug === slug);
export const urlOf = (i) => `/${i.category}/${i.slug}`;
export const clipOf = (i) => i.licensed.find((l) => l.media) || null;          // the card's own clip
export const viewOf = (i) => clipOf(i) || i.shown_with || null;                // what the page shows: own clip, else a related card's
export const shortName = (n) => n.replace(/\s*\(.*\)$/, '').replace(/^Prompt guide: /, '');
export const sentence = (s) => s.charAt(0).toUpperCase() + s.slice(1) + (/[.!?]$/.test(s) ? '' : '.');
export const clipsFirst = (list) => [...list].sort((a, b) => (clipOf(b) ? 2 : viewOf(b) ? 1 : 0) - (clipOf(a) ? 2 : viewOf(a) ? 1 : 0));

// what a tile needs, for the Tile component and the search index alike
// In one row or grid a borrowed clip shows once; later cards that would borrow it again show their words.
export function unique(list) {
  const seen = new Set();
  return list.map((item) => { const v = !clipOf(item) && item.shown_with; const again = v && seen.has(v.media.card); if (v) seen.add(v.media.card); return { item, words: !!again }; });
}
export function tileOf(i, words = false) {
  const v = words ? null : viewOf(i);
  return { href: urlOf(i), name: shortName(i.name), still: v ? v.media.card_poster : '', clip: v ? v.media.card : '', text: v ? '' : sentence(i.phrase) };
}
