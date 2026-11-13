// Every published item x every model offered for it: the prompt is non-empty and clean. Exit 1 on any failure or at zero checks.
import fs from 'node:fs';
import { assemble, modelsFor, kindOf, CHAT, twoPeople } from '../src/lib/prompt.mjs';
const d = JSON.parse(fs.readFileSync(new URL('../data/library.json', import.meta.url), 'utf8'));
const bad = []; let n = 0; const kinds = {}; const noModel = [];
const clean = (s) => s.replace(/\[your (subject|setting|product|audience)\]/g, '');
for (const item of d.items) {
  const ms = modelsFor(item, d.models);
  const k = kindOf(item, d.models); kinds[k] = (kinds[k] || 0) + 1;
  if (!ms.length) noModel.push(item.slug);
  for (const m of ms) for (const fields of [{}, { subject: 'a ceramic mug', setting: 'a sunlit kitchen' }]) {
    n++;
    let p; try { p = assemble([item], m.id, fields, d.models); } catch (e) { bad.push(`${item.slug} x ${m.id}: threw ${e.message}`); continue; }
    const why = !p.trim() ? 'empty' : /undefined|null|NaN|\[object/.test(p) ? 'undefined or null in text' : p.includes(String.fromCharCode(0x2014)) ? 'em dash'
      : /[{}]|\$\{|<[a-z_]+>/.test(clean(p)) || /\[your /.test(clean(p)) ? 'unfilled template token' : fields.subject && /\[your /.test(p) ? 'placeholder left after filling'
        : /\.\.|;\s*[.;]|^(?!What we learned)[^\n]*:[ \t]*$/m.test(p) ? 'broken punctuation' : null;
    if (why) bad.push(`${item.slug} x ${m.id}: ${why}`);
  }
}
// pronouns follow the visitor's subject; nothing doubled; every reference clip line points at a file that ships
const FEM = /\b(she|her|hers|herself)\b/i, MAL = /\b(he|him|his|himself)\b/i;
const sources = (i) => [i.phrase, ...(i.per_model || []).map((r) => r.phrase), i.body, ...(i.licensed || []).map((l) => l.text)].filter(Boolean);
let pron = 0;
for (const item of d.items) {
  if (kindOf(item, d.models) !== 'shot' || sources(item).some(twoPeople)) continue;
  for (const m of modelsFor(item, d.models)) for (const [subject, wrong] of [['an old man in a grey coat', FEM], ['a woman in a red coat', MAL], ['a ceramic mug', /\b(she|her|hers|herself|he|him|his|himself)\b/i], ['', /\b(she|her|hers|herself|he|him|his|himself)\b/i]]) {
    pron++;
    const p = assemble([item], m.id, { subject, setting: 'on a rainy platform' }, d.models);
    const body = p.split('\n').filter((l) => !l.startsWith('Reference clip')).join('\n');
    const why = wrong.test(body) ? `pronoun does not follow "${subject || 'empty subject'}": ${body.match(new RegExp('.{0,40}' + wrong.source + '.{0,20}', 'i'))[0]}`
      : /\b(\w+) \1\b/i.test(body) ? `doubled word "${body.match(/\b(\w+) \1\b/i)[0]}"` : /subject's's|\bin on a rainy/.test(body) ? 'broken subject or setting' : null;
    if (why) bad.push(`${item.slug} x ${m.id}: ${why}`);
    for (const u of p.matchAll(/^Reference clip \([^)]+\): https:\/\/directorchair\.ai(\/media\/\S+)$/gm)) if (!fs.existsSync(new URL('../public' + u[1], import.meta.url))) bad.push(`${item.slug}: reference clip missing ${u[1]}`);
  }
}

// a board prompt: one of each, every usable model
const pick = (c) => d.items.find((i) => i.category === c);
const board = ['shot', 'angle', 'move', 'lens', 'light', 'look', 'expression', 'transition'].map(pick);
for (const m of d.models.filter((m) => modelsFor(pick('light'), d.models).includes(m) || modelsFor(pick('move'), d.models).includes(m))) {
  n++; const p = assemble(board, m.id, {}, d.models); if (!p.trim() || /undefined/.test(p)) bad.push(`board x ${m.id}`);
}
console.log(`check-prompts: ${d.items.length} items, ${n} prompts assembled, ${pron} checked for pronouns, doubled words and reference files (kinds ${JSON.stringify(kinds)}), ${noModel.length} items without a model, ${bad.length} failures`);
if (noModel.length) console.log('  no model: ' + noModel.join(', '));
if (bad.length) console.log(bad.slice(0, 30).map((b) => '  ' + b).join('\n'));
if (process.argv[2] === 'board') for (const id of ['nano-banana-pro', 'gpt-image', 'seedance-2.5', 'kling-3', 'veo-3.1']) console.log(`\n--- board ${id}\n` + assemble(board, id, {}, d.models));
else if (process.argv[2]) for (const m of modelsFor(d.items.find((i) => i.slug === process.argv[2]), d.models)) console.log(`\n--- ${m.id}\n` + assemble([d.items.find((i) => i.slug === process.argv[2])], m.id, {}, d.models));
process.exit(bad.length || noModel.length || !n ? 1 : 0);
