import { items, lib } from '../../lib/data.mjs';
import { twin } from '../../lib/twin.mjs';
export const getStaticPaths = () => items.map((item) => ({ params: { category: item.category, slug: item.slug }, props: { item } }));
export const GET = ({ props }: any) => new Response(twin(props.item, lib), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
