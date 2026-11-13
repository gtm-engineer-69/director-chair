import { items, tileOf, catOf } from '../../lib/data.mjs';
// the slim index the search box reads: what a tile shows, plus the words to match on
export const GET = () => new Response(JSON.stringify(items.map((i: any) => ({ ...tileOf(i), words: [i.name, catOf(i.category).label, i.group, i.effect, i.use_when, ...(i.site_names || []), ...i.licensed.flatMap((l: any) => [l.name, l.family, ...(Array.isArray(l.aliases) ? l.aliases : [l.aliases])])].filter(Boolean).join(' ').toLowerCase() }))), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
