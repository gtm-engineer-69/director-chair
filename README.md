# Director Chair

The free, open library of video craft for AI video: https://directorchair.ai

399 cards (shot sizes, angles, camera moves, lenses, light, colour looks, transitions, effects, sound, expressions, hooks, scripts, formats, presets, which model for what). Every card has prompt instructions: pick a model, get the complete prompt, paste it.

No account, no paywall, no tracking.

## Use the data

| What | Where |
|---|---|
| The whole library | https://directorchair.ai/api/library.json |
| One card, with its prompt per model | https://directorchair.ai/api/move/dolly-in.json |
| A card page as markdown | https://directorchair.ai/move/dolly-in.md |
| Index for language models | https://directorchair.ai/llms.txt |
| Skill for Claude or ChatGPT | https://directorchair.ai/director-chair-skill.zip |

The same data sits in this repository as `site/data/library.json`.

## Build it

Node 22 or newer.

```bash
cd site
npm install
npm run build
npm run check
```

`npm run build` writes the static site to `site/dist`. `npm run check` assembles every prompt for every card and model, then checks the build for dead links, missing media and private paths.

The reference clips are not in the repository: they belong to their makers and ship with the deploy only. A local build therefore shows the cards without their clips, and the media line of `npm run check` fails until `site/public/media` is filled.

How it fits together:

- `site/data/library.json`: the one data file. The site reads nothing else.
- `site/src/lib/prompt.mjs`: the prompt engine, a pure module. `assemble(items, modelId, fields, models)` returns the prompt in the order that model's guide prescribes. The pages, the board, the check script and the skill all use it.
- `site/src/pages`: the pages and the agent outputs (JSON, markdown twins, llms.txt, the skill zip, the sitemap).
- `site/scripts/build-data.mjs`: for maintainers. It builds the data file from the source library and refuses to write anything that still holds a private path.

## Contribute a card

Cards are written in a source library and the data file is generated from it, so a change to `site/data/library.json` by hand would be overwritten. Open an issue instead, with:

- name and category (see `categories` in the data file)
- effect: what the viewer feels or understands, in one sentence
- use_when: the job it is right for
- phrase: the words to paste into a prompt, plain and physical
- pitfalls: what goes wrong, each with its evidence (measured, vendor, practitioner or film-craft) and where it comes from
- your own example, if you have one, and the model that made it

Corrections are just as welcome: say which card, what is wrong and how you know.

Fixes to the site itself (code, accessibility, the prompt engine) are normal pull requests.

## Licence

Code: MIT (`LICENSE`). Texts and data: CC BY 4.0 (`LICENSE-CONTENT`). Reference clips and the makers' own card texts stay with their makers.

Made by the people behind [Not A Video](https://notavideo.ai).
