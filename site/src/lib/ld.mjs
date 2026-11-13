// Structured data (schema.org JSON-LD) for every page, built from the same data the pages use.
import { lib, SITE, urlOf, clipOf, shortName } from './data.mjs';

const CC_BY = 'https://creativecommons.org/licenses/by/4.0/';
const REPO = 'https://github.com/gtm-engineer-69/director-chair';
const abs = (p) => SITE + p;
const collection = { '@type': 'Collection', name: lib.name, url: abs('/') };
// 15 -> PT15S, 7.04 -> PT7.04S
const isoDuration = (s) => `PT${+(+s).toFixed(2)}S`;

// crumbs: [[name, path], ...] after Home, the same path the page shows (its shelf pill, then its name)
export const breadcrumbs = (crumbs = []) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: [['Home', '/'], ...crumbs].map(([name, p], n) => ({ '@type': 'ListItem', position: n + 1, name, item: abs(p) })),
});

export const home = () => [
  { '@context': 'https://schema.org', '@type': 'WebSite', name: lib.name, url: abs('/'),
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: abs('/?q={search_term_string}') }, 'query-input': 'required name=search_term_string' } },
  { '@context': 'https://schema.org', '@type': 'Organization', name: lib.name, url: abs('/'), logo: abs('/logo-120.png'), sameAs: [REPO] },
];

export function card(item) {
  const url = abs(urlOf(item));
  const out = [{ '@context': 'https://schema.org', '@type': 'CreativeWork', name: item.name, description: item.effect, url, license: CC_BY, isPartOf: collection, dateModified: item.checked, inLanguage: 'en' }];
  const own = clipOf(item);   // a card that only borrows a related card's clip gets no VideoObject
  if (own) {
    const site = lib.external_sites.find((s) => s.id === own.site);
    out.push({ '@context': 'https://schema.org', '@type': 'VideoObject', name: `${shortName(item.name)}, reference clip`, description: item.effect,
      thumbnailUrl: abs(own.media.poster), contentUrl: abs(own.media.video), uploadDate: item.checked, duration: isoDuration(own.media.duration),
      width: own.media.width, height: own.media.height, creditText: own.credit, isFamilyFriendly: true,
      ...(site && { creator: { '@type': 'Organization', name: site.name, url: site.url } }) });
  }
  return out;
}

// for the video sitemap: one entry per card with its own clip
export const videoOf = (item) => {
  const own = clipOf(item);
  return own && { title: `${shortName(item.name)}, reference clip`, description: item.effect, thumbnail: abs(own.media.poster), content: abs(own.media.video), duration: Math.round(own.media.duration), date: item.checked };
};
