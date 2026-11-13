// Reads the private library (DC_LIBRARY), sanitizes it and writes the one public file data/library.json.
// Without DC_LIBRARY it only re-checks the committed file, so the public repo builds on its own.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(SITE, 'data/library.json');
const LIB = process.env.DC_LIBRARY;

// The gate. These patterns are generic folder shapes; the names of people and clients that must never appear
// live in private-rules.mjs, which is not in the repository (the maintainer's machine has it).
const EM_DASH = String.fromCharCode(0x2014);
const PRIVATE = await import('./private-rules.mjs').catch(() => null);
const BANNED = [/Skills\//, /Resources\//, /Projects\//i, new RegExp('notion-' + 'export'), /\.md\b/, new RegExp(EM_DASH), ...(PRIVATE ? PRIVATE.NAMES : [])];
export const leaks = (text) => BANNED.filter((re) => re.test(text)).map(String);

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct && !LIB) {
  const found = leaks(fs.readFileSync(OUT, 'utf8'));
  if (found.length) { console.error('FAIL data/library.json contains', found.join(' ')); process.exit(1); }
  console.log('build-data: DC_LIBRARY not set, using the committed data/library.json (checked clean)');
  process.exit(0);
}

if (direct) await run();

async function run() {
if (!PRIVATE) { console.error('FAIL build-data: scripts/private-rules.mjs is missing; it holds the rewrite rules for private sources'); process.exit(1); }
const { parseFrontmatter } = await import(pathToFileURL(path.join(LIB, '_scripts/yaml.mjs')).href);
const lib = JSON.parse(fs.readFileSync(path.join(LIB, 'library.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(SITE, 'public/media/manifest.json'), 'utf8'));

const { publicSource, OVERRIDE_NOTE } = PRIVATE;

const stripBody = (src) => src.replace(/^---[\s\S]*?\n---\s*/, '').trim();
const files = fs.readdirSync(path.join(LIB, 'items')).filter((f) => f.endsWith('.md')).sort();
let dropped = 0; const missingMedia = [];
const all = files.map((f) => {
  const src = fs.readFileSync(path.join(LIB, 'items', f), 'utf8');
  return { fm: parseFrontmatter(src), body: stripBody(src) };
});
const published = all.filter(({ fm }) => { if (fm.tier === 'workflow') { dropped++; return false; } return true; });
const slugs = new Set(published.map(({ fm }) => fm.slug));
const catIds = new Set(lib.categories.map((c) => c.id));

const items = published.map(({ fm, body }) => {
  if (!catIds.has(fm.category)) throw new Error(`${fm.slug}: unknown category ${fm.category}`);
  const licensed = (fm.licensed || []).map((l) => {
    const m = manifest[l.file];
    if (!m) missingMedia.push(`${fm.slug}: ${l.file}`);
    return { site: l.site, name: l.name, text: l.text, credit: l.credit, source_url: l.clip, group: l.group ?? null, intensity: l.intensity ?? null, cue: l.cue ?? null,
      media: m ? { video: m.video, card: m.card, poster: m.poster, card_poster: m.card_poster, width: m.width, height: m.height, duration: m.duration } : null };
  });
  return {
    slug: fm.slug, name: fm.name, category: fm.category, group: fm.group ?? null, media: fm.media, checked: fm.checked,
    effect: fm.effect, use_when: fm.use_when, phrase: fm.phrase,
    pitfalls: (fm.pitfalls || []).map((p) => ({ text: p.text, evidence: p.evidence, source: publicSource(p.source) })),
    per_model: (fm.per_model || []).map((p) => ({ model: p.model, phrase: p.phrase, evidence: p.evidence, checked: p.checked })),
    external_refs: (fm.external_refs || []).map((r) => ({ site: r.site, url: r.url, what: r.what })),
    licensed, site_names: fm.site_names || [], related: (fm.related || []).filter((s) => slugs.has(s)),
    rights: fm.rights, evidence: fm.evidence,
    source: { url: fm.source?.url ?? null, note: OVERRIDE_NOTE[fm.slug] || publicSource(fm.source?.note ?? null) },
    body,
  };
});

// A card without its own clip may show the clip of the first related card that has one, credited as such.
const bySlug = new Map(items.map((i) => [i.slug, i]));
for (const i of items) {
  const own = i.licensed.some((l) => l.media);
  const r = own ? null : i.related.map((s) => bySlug.get(s)).find((x) => x && x.licensed.some((l) => l.media));
  const l = r && r.licensed.find((x) => x.media);
  i.shown_with = r ? { slug: r.slug, name: r.name, category: r.category, label: `Shown with: ${r.name}`, site: l.site, credit: l.credit, source_url: l.source_url, media: l.media } : null;
}

const out = {
  name: 'Director Chair', url: 'https://directorchair.ai', generated: new Date().toISOString().slice(0, 10),
  licence: { code: 'MIT', text: 'CC BY 4.0', third_party: 'Clips and card texts inside a "licensed" block belong to their makers and are shown with permission and credit.' },
  categories: lib.categories.map((c) => ({ id: c.id, label: c.label, group: c.group, count: items.filter((i) => i.category === c.id).length })),
  models: lib.models.map(({ source, ...m }) => ({ ...m, source: publicSource(source) })),
  external_sites: lib.external_sites.map((s) => ({ id: s.id, name: s.name, url: s.url, policy: s.policy, credit: s.credit ?? null })),
  items,
};

// The deadpan spec ad is our parody of a real brand: no brand or person name may sit in it.
const spec = JSON.stringify(items.find((i) => i.slug === 'edit-deadpan-spec-ad') || {});
const text = JSON.stringify(out, null, 1);
const found = leaks(text);
const problems = [
  ...found.map((f) => `banned pattern ${f}`),
  ...missingMedia.map((m) => `no web media for ${m}`),
  ...(items.some((i) => i.tier) || /"tier"/.test(text) ? ['a tier field leaked'] : []),
  ...(PRIVATE.SPEC_AD.test(spec) ? ['brand or person name in edit-deadpan-spec-ad'] : []),
];
if (found.length) for (const i of items) { const l = leaks(JSON.stringify(i)); if (l.length) console.error('  ', i.slug, l.join(' ')); }
if (problems.length) { console.error('FAIL build-data\n - ' + problems.join('\n - ')); process.exit(1); }

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text + '\n');
const withMedia = items.filter((i) => i.licensed.some((l) => l.media)).length;
  const borrowed = items.filter((i) => i.shown_with).length;
console.log(`build-data PASS: read ${all.length}, dropped ${dropped} workflow, published ${items.length} items in ${out.categories.filter((c) => c.count).length} categories, ${withMedia} with clips (${items.reduce((a, i) => a + i.licensed.length, 0)} clips), ${borrowed} shown with a related card's clip, ${out.models.length} models, ${(text.length / 1024).toFixed(0)} KB`);
}
