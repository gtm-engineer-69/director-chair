// The markdown twin of an item page, for agents. Same facts as the page, plus one prompt per model.
import { assemble, modelsFor, SITE } from './prompt.mjs';
export function twin(item, lib) {
  const cat = lib.categories.find((c) => c.id === item.category);
  const out = [`# ${item.name}`, '', `${cat.group} / ${cat.label}${item.group ? ' / ' + item.group : ''}. Checked ${item.checked}.`, '', item.effect, '',
    `- Use when: ${item.use_when}`, `- Phrase: ${item.phrase}`, `- Page: ${SITE}/${item.category}/${item.slug}`, `- JSON: ${SITE}/api/${item.category}/${item.slug}.json`];
  if (item.pitfalls.length) out.push('', '## Watch out', '', ...item.pitfalls.map((p) => `- ${p.text} (${p.evidence}; ${p.source})`));
  if (item.body) out.push('', item.body);
  for (const l of item.licensed) out.push('', `## Reference: ${l.name}${l.intensity ? ` (${l.intensity})` : ''}`, '', `> ${l.text}`, '', `Credit: ${l.credit}. Source: ${l.source_url}`, ...(l.media ? [`Clip: ${SITE}${l.media.video}`, `Poster: ${SITE}${l.media.poster}`] : []));
  out.push('', '## Prompts');
  for (const m of modelsFor(item, lib.models)) out.push('', `### ${m.name}`, '', '```', assemble([item], m.id, {}, lib.models), '```');
  if (item.external_refs.length) out.push('', '## Look further', '', ...item.external_refs.map((r) => `- ${r.url} : ${r.what}`));
  if (item.related.length) out.push('', '## Goes well with', '', ...item.related.map((s) => { const r = lib.items.find((i) => i.slug === s); return `- ${r.name}: ${SITE}/${r.category}/${r.slug}`; }));
  out.push('', '## Source', '', `${item.source.note || 'Own words.'}${item.source.url ? ' ' + item.source.url : ''}`, '', 'Text CC BY 4.0, Director Chair (directorchair.ai). Reference clips and their card texts belong to their makers.', '');
  return out.join('\n');
}
