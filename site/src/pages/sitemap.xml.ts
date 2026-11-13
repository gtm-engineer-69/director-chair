import { items, cats, SITE, urlOf } from '../lib/data.mjs';
import { videoOf } from '../lib/ld.mjs';
const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// a card with its own clip carries a video entry (Google video sitemap extension)
const video = (i: any) => {
  const v = videoOf(i);
  return v ? `<video:video><video:thumbnail_loc>${x(v.thumbnail)}</video:thumbnail_loc><video:title>${x(v.title)}</video:title><video:description>${x(v.description)}</video:description><video:content_loc>${x(v.content)}</video:content_loc><video:duration>${v.duration}</video:duration><video:publication_date>${v.date}</video:publication_date><video:family_friendly>yes</video:family_friendly></video:video>` : '';
};
export const GET = () => {
  const urls: [string, string][] = [...['/', '/board', '/models', '/about', ...cats.map((c: any) => `/${c.id}`)].map((u): [string, string] => [u, '']), ...items.map((i: any): [string, string] => [urlOf(i), video(i)])];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${urls.map(([u, v]) => `<url><loc>${SITE}${u === '/' ? '/' : u}</loc>${v}</url>`).join('\n')}\n</urlset>\n`, { headers: { 'Content-Type': 'application/xml' } });
};
