import { lib, items, cats, models } from '../lib/data.mjs';
import { zip } from '../lib/zip.mjs';
import engine from '../lib/prompt.mjs?raw';
const skill = `---
name: director-chair
description: The Director Chair library of video craft for AI video (${items.length} cards: shots, angles, camera moves, lenses, light, looks, transitions, effects, sound, expressions, hooks, scripts, formats, presets, which model for what). Use it when someone wants a prompt for an AI image or video model, a hook or a script for a short video, or asks which model fits a shot.
---

# Director Chair

The library is in library.json next to this file. It is the same data as https://directorchair.ai/api/library.json (generated ${lib.generated}); fetch that address when you want the latest.

## What is in library.json

- categories: ${cats.length} shelves in ${new Set(cats.map((c: any) => c.group)).size} groups (${cats.map((c: any) => c.id).join(', ')}).
- models: ${models.length} image and video models with best_for, not_for, prompt_style and the date checked.
- items: one card each. The fields that matter: name, category, effect (what the viewer feels), use_when, phrase (the words for a prompt), per_model (wording one model needs instead), pitfalls (what goes wrong, with evidence and source), body (longer notes such as a move card or a recipe), licensed (a maker's own card text and reference clip, with credit), related.

## How to answer

1. Find the cards. Match the request to items by name, effect and use_when. For a full shot, pick at most one card per category.
2. Pick the model with the models list (best_for, not_for) or the cards which-model-for-video and which-model-for-stills. Ask when the choice changes the result.
3. Write the prompt in the order that model reads, from its guide card (guide-seedance-2-5, guide-veo-3-1, guide-kling-3, guide-nano-banana-pro, guide-gpt-image):
   - Seedance: labelled blocks, the look first, each shot on its own timecode, optics and camera, light, sound last.
   - Veo: camera first, then the action in order, the sound in its own sentence, what stays, the look.
   - Kling: the subject, what it visibly does, the scene, one camera move, light and mood.
   - Nano Banana: one paragraph of full sentences, the register first, then a capture line.
   - GPT Image: what the image is for, the visible details, people, exact text in quotes, short exclusions.
4. Use the card's phrase (or its per_model wording) as it is, then fit the subject and the setting around it. Do not paste pitfalls into an image or video prompt; they are advice for you.
5. When a card has a reference clip, give its address (https://directorchair.ai plus licensed[].media.video) and the maker's credit.
6. Hooks, scripts, calls to action and formats are words, not pictures: write them for the user's product and audience, following the card.

prompt.mjs is the engine the site uses: assemble(items, modelId, fields, models) returns the prompt. Run it when you can run JavaScript; otherwise follow the steps above.

## Licence

Our texts and data: CC BY 4.0, credit "Director Chair (directorchair.ai)". Code: MIT. Reference clips and the texts inside a licensed block belong to their makers (${lib.external_sites.filter((s: any) => s.policy === 'licensed').map((s: any) => s.name).join(', ')}) and are shown with permission: credit them when you pass them on.
`;
export const GET = () => new Response(zip({ 'director-chair/SKILL.md': skill, 'director-chair/library.json': JSON.stringify(lib), 'director-chair/prompt.mjs': engine }), { headers: { 'Content-Type': 'application/zip' } });
