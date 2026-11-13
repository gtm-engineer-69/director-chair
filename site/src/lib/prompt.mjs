// The prompt engine. Pure: no DOM, no fs. Used by the pages, the board, the check script and the skill zip.
// assemble(items, modelId, fields, models) -> the complete prompt, in the order that model's guide prescribes.

export const SITE = 'https://directorchair.ai';
export const CHAT = { id: 'chat', name: 'Any chat model', maker: 'Claude, ChatGPT, Gemini', medium: 'text' };

// which block of a prompt an item's phrase belongs to
const ROLE = { shot: 'framing', angle: 'framing', composition: 'framing', ratio: 'framing', move: 'camera', rig: 'camera', lens: 'optics', focus: 'optics',
  light: 'light', time: 'light', look: 'look', texture: 'look', style: 'look', character: 'cast', expression: 'performance', setting: 'place',
  motion: 'action', transition: 'cut', hook: 'opening', sound: 'sound' };

// words, not pictures: these get a prompt for a chat model
const WRITE = { hook: 'three opening hooks, each one the first line a viewer hears or reads', script: 'a script outline, beat by beat, with the seconds per beat',
  cta: 'three closing calls to action', format: 'a shot-by-shot outline in this format' };
const PLAN = { publish: 'a step-by-step plan I can follow this week', effect: 'an edit brief: where it goes on the timeline, the exact settings, and what to check before export',
  sound: 'a sound brief: what to record or pick, where it sits on the timeline, the levels, and what to check before export',
  preset: 'a production plan: the shots or scenes in order, what each one needs, and the edit settings', guide: 'a filled-in prompt that follows this guide, plus the one thing to check in the result' };

const usable = (m) => !/^(unknown|announced)/.test(m.prompt_style);
const isTextHook = (i) => i.category === 'hook' && /^(Textual|The rule)/.test(i.group || '');
export const kindOf = (item, models) =>
  item.category === 'guide' && models.some((m) => m.guide === item.slug) ? 'skeleton'
    : WRITE[item.category] && (item.category !== 'hook' || isTextHook(item)) ? 'write'
      : PLAN[item.category] ? 'plan' : 'shot';

// the models a visitor can pick for this item
export function modelsFor(item, models) {
  const kind = kindOf(item, models);
  if (kind === 'write' || kind === 'plan') return [CHAT];
  if (kind === 'skeleton') return models.filter((m) => m.guide === item.slug && usable(m));
  return models.filter((m) => usable(m) && item.media.includes(m.medium));
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const sent = (s) => { const t = s.trim(); return t ? cap(t) + (/[.!?]$/.test(t) ? '' : '.') : ''; };
const first = (s) => (s.match(/^.*?[.!?](?=\s|$)/) || [s])[0];

// "## Move card" bullets -> "Camera: ... Pace: ... Keep: ... Ends: ..."
function moveCard(item) {
  const m = (item.body || '').match(/## Move card\n+([\s\S]*?)(?:\n## |$)/);
  if (!m) return '';
  return m[1].split('\n').map((l) => l.match(/^- \*\*(.+?):\*\* (.+)$/)).filter(Boolean).map((b) => `${b[1]}: ${b[2].trim()}.`).join(' ');
}

function phraseFor(item, model, models) {
  const family = models.filter((m) => m.guide && m.guide === model.guide).map((m) => m.id);
  const row = (item.per_model || []).find((p) => p.model === model.id) || (item.per_model || []).find((p) => family.includes(p.model));
  let p = row ? row.phrase : item.phrase;
  if (model.medium === 'video') {
    const card = moveCard(item);
    const lic = (item.licensed || [])[0];
    // the maker's own card text stands in where we have no move card of our own; the emotion texts were written for Seedance
    if (card) p = `${sent(p)} ${card}`;
    else if (lic && (lic.site !== 'emotion-direction' || model.id.startsWith('seedance'))) p = `${sent(p)} ${sent(lic.text)}`;
  }
  return p;
}

// Pitfalls are advice to the person writing the prompt, so they go into chat prompts and onto the card, never into an image or video prompt.
const refLines = (items) => items.flatMap((i) => (i.licensed || []).filter((l) => l.media).slice(0, 1)
  .map((l) => `Reference clip, ${l.name}, by ${l.credit}: ${SITE}${l.media.video}`));

function parts(items, model, models) {
  const by = {};
  for (const i of items) {
    if (!i.media.includes(model.medium)) continue;
    const role = ROLE[i.category] || 'approach';
    (by[role] ||= []).push(phraseFor(i, model, models));
  }
  const get = (...roles) => roles.flatMap((r) => by[r] || []);
  return { get, s: (...roles) => get(...roles).map(sent).join(' '), l: (...roles) => get(...roles).map((x) => x.replace(/\.$/, '')).join('; ') };
}

const line = (label, text) => (text ? `${label}: ${text}` : null);

const LAYOUT = {
  // one paragraph of full sentences, register first, then a capture line
  paragraph(p, S, P) {
    const para = [p.s('look', 'approach'), `${cap(S)} in ${P}.`, p.s('opening', 'cast', 'performance', 'action', 'place'), p.s('framing', 'camera'), p.s('light')].filter(Boolean).join(' ');
    return [para, line('Capture', p.l('optics'))];
  },
  // what the image is for, the visible details, people, exclusions short and grouped
  gpt(p, S, P) {
    return [`A photograph of ${S} in ${P}.`, line('Details', p.l('look', 'light', 'optics', 'place', 'approach')), line('People and framing', p.l('framing', 'camera', 'cast', 'performance', 'action', 'opening')),
      'Exclusions: no extra text, no watermark, no logo.'];
  },
  // labelled blocks; Seedance 2.5 puts every shot on its own timecode
  seedance(p, S, P, model) {
    const shot = model.id === 'seedance-2.5' ? 'Shot 1 (0:00 to 0:05)' : 'Shot 1';
    return [line('Global look', p.l('look')), line('Approach', p.l('approach')), `Scene: ${S} in ${P}.${p.get('opening').length ? ' ' + p.s('opening') : ''}`, p.get('cast').length ? `Cast: ${[S, ...p.get('cast')].join('; ')}` : null,
      p.get('place').length ? `Place: ${[P, ...p.get('place')].join('; ')}` : null, line('First frame', p.l('framing')),
      `${shot}: ${[...p.get('action', 'performance')].join('; ') || 'one continuous shot'}${p.get('cut').length ? '. Cut: ' + p.l('cut') : ''}`,
      line('Optics and camera', p.s('optics', 'camera')), line('Light', p.l('light')), line('Sound', p.l('sound'))];
  },
  // subject, visible action, scene, one camera move, light and mood, in simple sentences
  kling(p, S, P) {
    return [[sent([S, ...p.get('cast')].join(', ')), p.s('action', 'performance', 'opening'), sent([`The scene is ${P}`, ...p.get('place')].join(', ')),
      p.s('camera', 'framing', 'optics', 'cut'), p.s('light', 'look', 'approach')].filter(Boolean).join(' ')];
  },
  // camera first, then the action, the sound in its own sentence, what stays, the look
  veo(p, S, P) {
    return [[p.s('camera', 'framing', 'optics'), `${cap(S)} in ${P}.`, p.s('opening', 'action', 'performance', 'cast', 'place', 'cut'), p.get('sound').length ? `Sound: ${p.s('sound')}` : '',
      'Framing and subject stay as in the start image.', p.s('look', 'light', 'approach')].filter(Boolean).join(' ')];
  },
};
const LAYOUT_OF = { 'nano-banana-pro': 'paragraph', 'nano-banana-2': 'paragraph', 'seedream-5': 'paragraph', 'gpt-image': 'gpt',
  'seedance-2.5': 'seedance', 'seedance-2.0': 'seedance', 'kling-3': 'kling', 'veo-3.1': 'veo' };

function chatPrompt(item, fields, kind) {
  const product = fields.subject || '[your product]';
  const audience = fields.setting || '[your audience]';
  const notes = (item.pitfalls || []).filter((p) => p.evidence !== 'unverified').slice(0, 3).map((p) => `- ${first(p.text)}`);
  const what = kind === 'write' ? WRITE[item.category] : PLAN[item.category];
  return [
    kind === 'write' ? `You are a short-form video copywriter. Write ${what}, for ${product}, aimed at ${audience}.` : `You are my video producer. Give me ${what}, for a short video about ${product}, aimed at ${audience}.`,
    `Technique: ${item.name}. ${sent(item.effect)}`, `How it works: ${sent(item.phrase)}`, `Right for: ${sent(item.use_when)}`,
    notes.length ? `What we learned from tested runs:\n${notes.join('\n')}` : null,
    kind === 'write' ? 'Plain spoken language, no hashtags, no emoji. Say which option you would post first and why, in one line.' : 'Be concrete: numbers, seconds and settings, no theory. Ask me one question first if something you need is missing.',
  ].filter(Boolean).join('\n');
}

export function assemble(items, modelId, fields = {}, models = []) {
  const list = (Array.isArray(items) ? items : [items]).filter(Boolean);
  const model = modelId === CHAT.id ? CHAT : models.find((m) => m.id === modelId);
  if (!model) throw new Error(`unknown model ${modelId}`);
  if (model.medium === 'text') {
    if (list.length !== 1) throw new Error('a chat prompt takes one item');
    return chatPrompt(list[0], fields, kindOf(list[0], models) === 'write' ? 'write' : 'plan');
  }
  const layout = LAYOUT[LAYOUT_OF[model.id]];
  if (!layout) throw new Error(`no prompt layout for ${model.id}`);
  const S = fields.subject || '[your subject]';
  const P = fields.setting || '[your setting]';
  // a model's own guide card gives that model's skeleton, so the guide item itself adds no phrase
  const shotItems = list.filter((i) => kindOf(i, models) === 'shot');
  return [...layout(parts(shotItems, model, models), S, P, model), ...refLines(shotItems.filter((i) => i.media.includes(model.medium)))]
    .filter(Boolean).join('\n');
}
