import { items, cardOf, catOf } from '../../lib/data.mjs';
// the slim index the search box reads: what a card shows, plus the words to match on
export const GET = () => new Response(JSON.stringify(items.map((i: any) => ({ ...cardOf(i), words: [i.name, catOf(i.category).label, i.group, i.effect, i.use_when, ...(i.site_names || [])].join(' ').toLowerCase() }))), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
