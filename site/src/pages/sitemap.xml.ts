import { items, cats, SITE, urlOf } from '../lib/data.mjs';
export const GET = () => {
  const urls = ['/', '/board', '/models', '/about', ...cats.map((c: any) => `/${c.id}`), ...items.map(urlOf)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${SITE}${u === '/' ? '/' : u}</loc></url>`).join('\n')}\n</urlset>\n`, { headers: { 'Content-Type': 'application/xml' } });
};
