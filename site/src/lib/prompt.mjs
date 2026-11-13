// The prompt engine. Pure: no DOM, no fs. Used by the pages, the board, the check script and the skill zip.
// assemble(items, modelId, fields, models) -> the complete prompt, in the order that model's guide prescribes.

export const SITE = 'https://directorchair.ai';
export const CHAT = { id: 'chat', name: 'Any chat model', maker: 'Claude, ChatGPT, Gemini', medium: 'text' };

// which block of a prompt an item's phrase belongs to
const ROLE = { shot: 'framing', angle: 'framing', composition: 'framing', ratio: 'framing', move: 'camera', rig: 'camera', lens: 'optics', focus: 'optics',
  light: 'light', time: 'light', look: 'look', texture: 'look', style: 'look', character: 'cast', expression: 'performance', setting: 'place',
  motion: 'action', transition: 'cut', hook: 'opening', sound: 'sound' };

// words, not pictures: these get a prompt for a chat model
const WRITE = { hook: 1, script: 1, cta: 1, format: 1 };
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

// Library phrases were written about one person ("toward her", "beside him"). In a prompt they follow the visitor's subject:
// a woman gets she and her, a man he and him, anything else (an empty field, a product, a group) "the subject".
// A phrase that already names two people (she and he) is left as it is.
const FEM = /\b(woman|women|girl|girls|lady|she|her|mother|mom|mum|wife|daughter|sister|actress|grandmother|grandma|queen|bride|female|businesswoman)\b/i;
const MAL = /\b(man|men|boy|boys|guy|gentleman|he|him|his|father|dad|husband|son|brother|grandfather|grandpa|king|groom|male|businessman)\b/i;
export const genderOf = (s = '') => (FEM.test(s) === MAL.test(s) ? 'n' : FEM.test(s) ? 'f' : 'm');
export const twoPeople = (t = '') => /\b(she|her|hers|herself)\b/i.test(t) && /\b(he|him|his|himself)\b/i.test(t);
// "her" is an object before punctuation, a preposition or a verb ("toward her, ", "behind her stretches"), else it owns the next word ("her face")
const OBJ = /^(?:\W|$|(?:and|or|as|at|in|on|to|from|with|while|into|onto|over|under|through|across|toward|towards|past|behind|before|after|again|up|down|out|off|away|back|then|so|but|for|by|like|than|late|standing|sitting|stretches|is|was|a|an|the)\b)/i;
const PRON = { f: { s: 'she', o: 'her', p: 'her', x: 'herself' }, m: { s: 'he', o: 'him', p: 'his', x: 'himself' }, n: { s: 'the subject', o: 'the subject', p: "the subject's", x: 'itself' } };
export function pronouns(text, g) {
  if (!text || twoPeople(text)) return text;
  const w = PRON[g];
  return text.replace(/\b(she|he|hers|her|him|his|herself|himself)\b/gi, (wd, _k, off, str) => {
    const k = wd.toLowerCase();
    const role = k === 'she' || k === 'he' ? 's' : k === 'him' ? 'o' : k === 'his' || k === 'hers' ? 'p' : k.endsWith('self') ? 'x' : OBJ.test(str.slice(off + wd.length).replace(/^ /, '')) ? 'o' : 'p';
    return /^[A-Z]/.test(wd) ? cap(w[role]) : w[role];
  });
}
// the setting reads after the subject: "in a kitchen", unless the visitor wrote the preposition ("on a rainy platform")
const where = (P) => (/^(in|on|at|inside|under|by|near|beside|across|through|over|outside|behind|along|among|above|below|against|beneath|from|into|onto|within|amid|around|between|underwater)\b/i.test(P) ? P : `in ${P}`);

function phraseFor(item, model, models, g = 'n') {
  const family = models.filter((m) => m.guide && m.guide === model.guide).map((m) => m.id);
  const row = (item.per_model || []).find((p) => p.model === model.id) || (item.per_model || []).find((p) => family.includes(p.model));
  let p = pronouns(row ? row.phrase : item.phrase, g);
  if (model.medium === 'video') {
    const card = pronouns(moveCard(item), g);
    const lic = (item.licensed || [])[0];
    // the maker's own card text stands in where we have no move card of our own; the emotion texts were written for Seedance
    if (card) p = `${sent(p)} ${card}`;
    else if (lic && (lic.site !== 'emotion-direction' || model.id.startsWith('seedance'))) p = `${sent(p)} ${sent(pronouns(lic.text, g))}`;
  }
  return p;
}

// Pitfalls are advice to the person writing the prompt, so they go into chat prompts and onto the card, never into an image or video prompt.
const refLines = (items) => items.flatMap((i) => (i.licensed || []).filter((l) => l.media).slice(0, 1)
  .map((l) => `Reference clip (${l.name}): ${SITE}${l.media.video}`));

function parts(items, model, models, g) {
  const by = {};
  for (const i of items) {
    if (!i.media.includes(model.medium)) continue;
    const role = ROLE[i.category] || 'approach';
    (by[role] ||= []).push(phraseFor(i, model, models, g));
  }
  const get = (...roles) => roles.flatMap((r) => by[r] || []);
  return { get, s: (...roles) => get(...roles).map(sent).join(' '), l: (...roles) => get(...roles).map((x) => x.replace(/\.$/, '')).join('; ') };
}

const line = (label, text) => (text ? `${label}: ${text}` : null);

const LAYOUT = {
  // one paragraph of full sentences, register first, then a capture line
  paragraph(p, S, P) {
    const para = [p.s('look', 'approach'), `${cap(S)} ${where(P)}.`, p.s('opening', 'cast', 'performance', 'action', 'place'), p.s('framing', 'camera'), p.s('light')].filter(Boolean).join(' ');
    return [para, line('Capture', p.l('optics'))];
  },
  // what the image is for, the visible details, people, exclusions short and grouped
  gpt(p, S, P) {
    return [`A photograph of ${S} ${where(P)}.`, line('Details', p.l('look', 'light', 'optics', 'place', 'approach')), line('People and framing', p.l('framing', 'camera', 'cast', 'performance', 'action', 'opening')),
      'Exclusions: no extra text, no watermark, no logo.'];
  },
  // labelled blocks; Seedance 2.5 puts every shot on its own timecode
  seedance(p, S, P, model) {
    const shot = model.id === 'seedance-2.5' ? 'Shot 1 (0:00 to 0:05)' : 'Shot 1';
    return [line('Global look', p.l('look')), line('Approach', p.l('approach')), `Scene: ${S} ${where(P)}.${p.get('opening').length ? ' ' + p.s('opening') : ''}`, p.get('cast').length ? `Cast: ${[S, ...p.get('cast')].join('; ')}` : null,
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
    return [[p.s('camera', 'framing', 'optics'), `${cap(S)} ${where(P)}.`, p.s('opening', 'action', 'performance', 'cast', 'place', 'cut'), p.get('sound').length ? `Sound: ${p.s('sound')}` : '',
      'Framing and subject stay as in the start image.', p.s('look', 'light', 'approach')].filter(Boolean).join(' ')];
  },
};
const LAYOUT_OF = { 'nano-banana-pro': 'paragraph', 'nano-banana-2': 'paragraph', 'seedream-5': 'paragraph', 'gpt-image': 'gpt',
  'seedance-2.5': 'seedance', 'seedance-2.0': 'seedance', 'kling-3': 'kling', 'veo-3.1': 'veo' };

// Words, not pictures: one paragraph a chat model can act on, built from the card. Pitfalls go in here, they are advice for a writer.
function chatPrompt(item, fields, kind) {
  const product = fields.subject || '[your product]';
  const audience = fields.setting || '[your audience]';
  const low = (t) => t.charAt(0).toLowerCase() + t.slice(1);
  const notes = (item.pitfalls || []).filter((p) => p.evidence !== 'unverified').slice(0, 2).map((p) => sent(first(p.text))).join(' ');
  const name = item.name.replace(/\s*\(.*\)$/, '').replace(/^Prompt guide: /, '');
  if (kind === 'write') {
    const what = { hook: 'five opening lines', script: 'a script outline, beat by beat, with the seconds per beat,', cta: 'three closing calls to action', format: 'a shot-by-shot outline' }[item.category];
    return [`Write ${what} for a short video about ${product}, for ${audience}.`, `Use the ${low(name)} pattern: ${low(sent(item.effect))}`, notes,
      `${item.category === 'hook' ? 'Example' : 'How it works'}: ${low(sent(item.phrase))}`, 'Plain spoken language, no hashtags, no emoji. Tell me which one you would post first and why, in one line.'].filter(Boolean).join(' ');
  }
  return [`Give me ${PLAN[item.category]}, for a short video about ${product}, for ${audience}.`, `The technique is ${low(name)}: ${low(sent(item.effect))}`, `How it works: ${low(sent(item.phrase))}`, `It is right for: ${low(sent(item.use_when))}`, notes,
    'Be concrete: numbers, seconds and settings, no theory. Ask me one question first if something you need is missing.'].filter(Boolean).join(' ');
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
  return [...layout(parts(shotItems, model, models, genderOf(fields.subject)), S, P, model), ...refLines(shotItems.filter((i) => i.media.includes(model.medium)))]
    .filter(Boolean).join('\n');
}
