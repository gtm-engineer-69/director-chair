#!/usr/bin/env node
// media.mjs - transcodes the licensed clips in library/examples/licensed for the web.
// Per clip: <name>.mp4 (720p, about 1 Mbps), <name>-card.mp4 (480 wide, muted, for grids),
// <name>.jpg (poster 1280) and <name>-card.jpg (640). Writes public/media/manifest.json.
// Idempotent: skips outputs newer than their source. Needs ffmpeg and ffprobe on PATH.
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// the licensed sources are 370 MB and stay in the vault; pass DC_LICENSED to point at them
const SRC = process.env.DC_LICENSED || path.join(SITE, '..', 'library', 'examples', 'licensed');
const OUT = path.join(SITE, 'public', 'media');
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
const probe = (f) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', f]).toString());
const fresh = (out, src) => existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs && statSync(out).size > 0;
const x264 = ['-c:v', 'libx264', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart'];

const manifest = {};
let made = 0;
for (const site of readdirSync(SRC).filter(d => statSync(path.join(SRC, d)).isDirectory())) {
  mkdirSync(path.join(OUT, site), { recursive: true });
  for (const f of readdirSync(path.join(SRC, site)).filter(f => f.endsWith('.mp4')).sort()) {
    const src = path.join(SRC, site, f), base = f.replace(/\.mp4$/, '');
    const o = (suffix) => path.join(OUT, site, base + suffix);
    if (!fresh(o('.mp4'), src)) { ff(['-i', src, ...x264, '-vf', "scale='min(1280,iw)':-2", '-crf', '26', '-maxrate', '1100k', '-bufsize', '2200k', '-c:a', 'aac', '-b:a', '96k', o('.mp4')]); made++; }
    if (!fresh(o('-card.mp4'), src)) { ff(['-i', src, ...x264, '-vf', 'scale=480:-2', '-crf', '29', '-maxrate', '380k', '-bufsize', '760k', '-an', o('-card.mp4')]); made++; }
    // poster: the maker's own jpg when it exists, else a frame one second in
    const jpg = path.join(SRC, site, base + '.jpg'), from = existsSync(jpg) ? ['-i', jpg] : ['-ss', '1', '-i', src, '-frames:v', '1'];
    const psrc = existsSync(jpg) ? jpg : src;
    if (!fresh(o('.jpg'), psrc)) { ff([...from, '-vf', "scale='min(1280,iw)':-2", '-q:v', '4', o('.jpg')]); made++; }
    if (!fresh(o('-card.jpg'), psrc)) { ff([...from, '-vf', 'scale=640:-2', '-q:v', '5', o('-card.jpg')]); made++; }
    const p = probe(o('.mp4')), s = p.streams[0];
    manifest[`examples/licensed/${site}/${f}`] = {
      video: `/media/${site}/${base}.mp4`, card: `/media/${site}/${base}-card.mp4`,
      poster: `/media/${site}/${base}.jpg`, card_poster: `/media/${site}/${base}-card.jpg`,
      width: s.width, height: s.height, duration: +(+p.format.duration).toFixed(2),
      bytes: statSync(o('.mp4')).size, card_bytes: statSync(o('-card.mp4')).size,
    };
  }
}
const n = Object.keys(manifest).length;
if (!n) { console.error('FAIL: no clips found in ' + SRC); process.exit(1); }
const big = Object.entries(manifest).filter(([, m]) => m.bytes > 2.6e6).map(([k]) => k);
writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
const tot = (k) => (Object.values(manifest).reduce((a, m) => a + m[k], 0) / 1e6).toFixed(1);
console.log(`${n} clips, ${made} files written; full ${tot('bytes')} MB, cards ${tot('card_bytes')} MB; over 2.6 MB: ${big.length}`);
if (big.length) { console.error('FAIL over budget: ' + big.join(', ')); process.exit(1); }
