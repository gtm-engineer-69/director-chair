import { items, cats, groups, models, SITE, urlOf } from '../lib/data.mjs';
export const GET = () => {
  const out = ['# Director Chair', '', `> A free, open library of ${items.length} cards of video craft for AI video: shots, angles, camera moves, lenses, light, looks, transitions, effects, sound, expressions, hooks, scripts, formats, presets and which model for what. Every card carries a prompt per model, ready to paste.`, '',
    'Every card page has a markdown twin (add .md to its address) and a JSON twin under /api/. Text is CC BY 4.0; reference clips and their card texts belong to their makers and are shown with permission.', '',
    '## Data', '', `- [The whole library as JSON](${SITE}/api/library.json): every card, category and model`, `- [One card as JSON](${SITE}/api/move/dolly-in.json): the pattern is /api/category/card.json, with a prompt per model`,
    `- [Agent skill](${SITE}/director-chair-skill.zip): a skill file, the library and the prompt engine in one zip`, `- [Which model for what](${SITE}/models): ${models.length} image and video models`, `- [Director's board](${SITE}/board): combine cards into one prompt`, ''];
  for (const g of groups) for (const c of g.cats) {
    out.push(`## ${g.name}: ${c.label}`, '');
    for (const i of items.filter((x: any) => x.category === c.id)) out.push(`- [${i.name}](${SITE}${urlOf(i)}.md): ${i.effect}`);
    out.push('');
  }
  return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
