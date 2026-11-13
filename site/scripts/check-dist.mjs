// After a build: counts, leaks, dead links, media on disk, the skill zip. PASS or FAIL per line, exit 1 on any FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { leaks } from './build-data.mjs';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(SITE, 'dist');
const lib = JSON.parse(fs.readFileSync(path.join(SITE, 'data/library.json'), 'utf8'));
let failed = 0;
const line = (ok, what, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? '  ' + detail : ''}`); };
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const files = walk(DIST);
const rel = (f) => '/' + path.relative(DIST, f);
const TEXT = /\.(html|json|md|txt|xml|js|css|svg)$/;

// 1. counts
const itemPages = lib.items.filter((i) => fs.existsSync(path.join(DIST, i.category, `${i.slug}.html`))).length;
const twins = lib.items.filter((i) => fs.existsSync(path.join(DIST, i.category, `${i.slug}.md`))).length;
const jsons = lib.items.filter((i) => fs.existsSync(path.join(DIST, 'api', i.category, `${i.slug}.json`))).length;
line(itemPages === lib.items.length && twins === itemPages && jsons === itemPages, 'item pages equal items published', `${itemPages} pages, ${twins} markdown twins, ${jsons} json of ${lib.items.length} items`);
line(lib.categories.filter((c) => c.count).every((c) => fs.existsSync(path.join(DIST, `${c.id}.html`))), 'a page per category', `${lib.categories.filter((c) => c.count).length}`);

// 2. leaks. The public markdown twins, SKILL and README names are the only .md allowed.
const allowMd = (t) => t.replace(/\/[a-z]+\/[a-z0-9-]+\.md\b/g, '').replace(/\b(SKILL|README)\.md\b/g, '').replace(/add \.md to its address/g, '');
const scan = (list, read) => { let hits = 0; const where = []; for (const f of list) { const l = leaks(allowMd(read(f))); if (l.length) { hits++; if (where.length < 5) where.push(`${f}: ${l.join(' ')}`); } } return [hits, where]; };
const [dh, dw] = scan(files.filter((f) => TEXT.test(f) && !f.endsWith('.md')), (f) => fs.readFileSync(f, 'utf8'));
const [mh, mw] = scan(files.filter((f) => f.endsWith('.md')), (f) => fs.readFileSync(f, 'utf8'));
line(dh + mh === 0, 'no vault path, client name or em dash in dist', `${files.filter((f) => TEXT.test(f)).length} text files scanned, ${dh + mh} with hits ${[...dw, ...mw].join(' | ')}`);
const ROOT = path.resolve(SITE, '..');
try {
  const tracked = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter((f) => f && /\.(mjs|js|ts|astro|json|md|txt|css|svg|html)$|LICENSE|\.gitignore$/.test(f) && !f.endsWith('package-lock.json'));
  // source code builds the twin addresses, so the .md rule holds for the data file only
  const [gh, gw] = scan(tracked, (f) => { const t = fs.readFileSync(path.join(ROOT, f), 'utf8'); return f.includes('/data/') ? t : t.replace(/\.md\b/g, ''); });
  line(gh === 0, 'no vault path or client name in files git would take', `${tracked.length} files scanned, ${gh} with hits ${gw.join(' | ')}`);
  const media = execFileSync('git', ['ls-files', '-co', '--exclude-standard', 'site/public/media'], { cwd: ROOT, encoding: 'utf8' }).trim();
  line(!media, 'media folder is ignored by git');
} catch (e) { line(false, 'git scan', 'not a git repo yet: ' + e.message.split('\n')[0]); }

// 3. links and media
const has = (p) => { const f = path.join(DIST, decodeURI(p)); return fs.existsSync(f) && fs.statSync(f).isFile() ? true : fs.existsSync(f + '.html') || fs.existsSync(path.join(f, 'index.html')); };
const dead = new Set(); let links = 0; let mediaRefs = 0;
for (const f of files.filter((f) => f.endsWith('.html'))) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/(?:href|src|poster|data-src|data-clip)="(\/[^"#?]*)[^"]*"/g)) {
    if (m[1].startsWith('//')) continue;
    links++; if (m[1].startsWith('/media/')) mediaRefs++;
    if (m[1] !== '/' && !has(m[1])) dead.add(`${m[1]} (in ${rel(f)})`);
  }
}
line(dead.size === 0, 'no dead internal links', `${links} links in ${files.filter((f) => f.endsWith('.html')).length} pages, ${dead.size} dead ${[...dead].slice(0, 5).join(' | ')}`);
const dataMedia = lib.items.flatMap((i) => i.licensed.flatMap((l) => (l.media ? [l.media.video, l.media.card, l.media.poster, l.media.card_poster] : [])));
const gone = dataMedia.filter((u) => !fs.existsSync(path.join(DIST, u)));
line(gone.length === 0, 'every media file named in the data is in dist', `${dataMedia.length} files, ${mediaRefs} references in pages, ${gone.length} missing ${gone.slice(0, 3).join(' ')}`);

// 4. agent outputs
for (const f of ['api/library.json', 'api/search.json', 'llms.txt', 'sitemap.xml', 'robots.txt', '404.html', 'board.html', 'models.html', 'about.html']) line(fs.existsSync(path.join(DIST, f)), `/${f} exists`);
try { const list = execFileSync('unzip', ['-l', path.join(DIST, 'director-chair-skill.zip')], { encoding: 'utf8' }); execFileSync('unzip', ['-tq', path.join(DIST, 'director-chair-skill.zip')]); line(/SKILL\.md/.test(list) && /library\.json/.test(list) && /prompt\.mjs/.test(list), 'skill zip opens and holds SKILL, library and engine'); } catch (e) { line(false, 'skill zip opens', e.message.split('\n')[0]); }
const noTitle = files.filter((f) => f.endsWith('.html')).filter((f) => { const h = fs.readFileSync(f, 'utf8'); return !/<title>[^<]{10,}<\/title>/.test(h) || !/<meta name="description" content="[^"]{30,}"/.test(h) || !/<link rel="canonical" href="https:\/\/directorchair\.ai\//.test(h); });
line(noTitle.length === 0, 'title, description and canonical on every page', `${noTitle.length} pages without ${noTitle.slice(0, 3).map(rel).join(' ')}`);
console.log(failed ? `\ncheck-dist: ${failed} FAIL` : '\ncheck-dist: all PASS');
process.exit(failed ? 1 : 0);
