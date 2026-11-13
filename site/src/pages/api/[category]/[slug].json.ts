import { items, lib, urlOf, SITE } from '../../../lib/data.mjs';
import { assemble, modelsFor } from '../../../lib/prompt.mjs';
export const getStaticPaths = () => items.map((item) => ({ params: { category: item.category, slug: item.slug }, props: { item } }));
// one card, plus where it lives and its prompt per model (placeholders left in brackets)
export const GET = ({ props }: any) => {
  const { item } = props;
  const prompts = Object.fromEntries(modelsFor(item, lib.models).map((m: any) => [m.id, assemble([item], m.id, {}, lib.models)]));
  return new Response(JSON.stringify({ ...item, url: SITE + urlOf(item), markdown: `${SITE}${urlOf(item)}.md`, prompts, licence: lib.licence }, null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
