// After a build: every page's JSON-LD parses, has the fields its type needs, points at https://directorchair.ai,
// and every contentUrl and thumbnailUrl is a file in dist. Prints the count per type. Exit 1 on any FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(SITE, 'dist');
const ORIGIN = 'https://directorchair.ai';
const lib = JSON.parse(fs.readFileSync(path.join(SITE, 'data/library.json'), 'utf8'));
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const pages = walk(DIST).filter((f) => f.endsWith('.html'));

const NEED = {
  BreadcrumbList: ['itemListElement'],
  WebSite: ['name', 'url', 'potentialAction'],
  Organization: ['name', 'url', 'logo', 'sameAs'],
  CreativeWork: ['name', 'description', 'url', 'license', 'isPartOf', 'dateModified'],
  VideoObject: ['name', 'description', 'thumbnailUrl', 'contentUrl', 'uploadDate', 'duration', 'creditText', 'isFamilyFriendly'],
};
const counts = {}, errors = [];
const err = (f, m) => errors.push(`${path.relative(DIST, f)}: ${m}`);
// every string that looks like a URL, at any depth (the search template keeps its placeholder)
const urls = (o) => (typeof o === 'string' ? (/^[a-z]+:\/\//i.test(o) ? [o] : []) : o && typeof o === 'object' ? Object.values(o).flatMap(urls) : []);
const OUTSIDE = new Set(['https://schema.org', lib.licence && 'https://creativecommons.org/licenses/by/4.0/', 'https://github.com/gtm-engineer-69/director-chair', ...lib.external_sites.map((s) => s.url)]);
const onDisk = (u) => fs.existsSync(path.join(DIST, decodeURI(new URL(u).pathname)));

let video = 0, crumbPages = 0;
for (const f of pages) {
  const html = fs.readFileSync(f, 'utf8');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let crumbs = 0;
  for (const b of blocks) {
    let o;
    try { o = JSON.parse(b); } catch (e) { err(f, 'invalid JSON: ' + e.message); continue; }
    const t = o['@type'];
    counts[t] = (counts[t] || 0) + 1;
    if (o['@context'] !== 'https://schema.org') err(f, `${t} without the schema.org context`);
    for (const k of NEED[t] || ['?']) if (o[k] === undefined || o[k] === '') err(f, `${t} misses ${k}`);
    for (const u of urls(o)) if (!u.startsWith(ORIGIN + '/') && !OUTSIDE.has(u)) err(f, `${t} url not absolute on ${ORIGIN}: ${u}`);
    if (t === 'BreadcrumbList') {
      crumbs++;
      o.itemListElement.forEach((e, n) => { if (e.position !== n + 1 || !e.name || !e.item) err(f, 'breadcrumb item ' + (n + 1) + ' incomplete'); });
    }
    if (t === 'VideoObject') {
      video++;
      for (const k of ['contentUrl', 'thumbnailUrl']) if (o[k] && !onDisk(o[k])) err(f, `${k} not in dist: ${o[k]}`);
      if (!/^PT\d+(\.\d+)?S$/.test(o.duration)) err(f, 'duration not ISO 8601: ' + o.duration);
      if (!/^\d{4}-\d{2}-\d{2}/.test(o.uploadDate)) err(f, 'uploadDate not ISO: ' + o.uploadDate);
    }
    if (t === 'CreativeWork' && !/^\d{4}-\d{2}-\d{2}/.test(o.dateModified)) err(f, 'dateModified not ISO: ' + o.dateModified);
  }
  if (crumbs === 1) crumbPages++; else err(f, `${crumbs} BreadcrumbList blocks`);
}
// a card with its own clip has a VideoObject; a card that borrows one has none
const own = lib.items.filter((i) => i.licensed.some((l) => l.media)).length;
if (video !== own) errors.push(`VideoObject on ${video} pages, cards with their own clip: ${own}`);
if (counts.CreativeWork !== lib.items.length) errors.push(`CreativeWork on ${counts.CreativeWork} pages, items: ${lib.items.length}`);
if (counts.WebSite !== 1 || counts.Organization !== 1) errors.push('WebSite and Organization belong on the home page only, once');

console.log(`${errors.length ? 'FAIL' : 'PASS'}  JSON-LD on ${pages.length} pages (${crumbPages} with one breadcrumb): ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
for (const e of errors.slice(0, 10)) console.log('      ' + e);
if (errors.length) process.exit(1);
