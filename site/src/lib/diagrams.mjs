// Diagrams for the camera fundamentals that have no clip: a frame shape, a frame on a figure, a camera position,
// a field of view, a guide in a frame, a lighting plot, a sun position. Inline SVG from parameters, drawn in a 240 by 100 box that sits above the name pill.
// Every glyph is Lucide 0.460.0 (ISC), copied from src/icons (the check script compares them); nothing here draws a person or an object.
// A card without an entry in MAP keeps its words.
const PERSON = '<circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/>';
const CAMERA = '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>';
const FACING = '<circle cx="12" cy="12" r="10"/><path d="M16 12H8"/><path d="m12 8-4 4 4 4"/>';
const ARROW = '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>';
const SOURCE = {   // one symbol per kind of source, always the same size
  lamp: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
};
export const GLYPHS = { 'person-standing': PERSON, video: CAMERA, 'circle-arrow-left': FACING, 'arrow-right': ARROW, lightbulb: SOURCE.lamp, sun: SOURCE.sun, flame: SOURCE.flame, moon: SOURCE.moon };

// horizontal angle of view in degrees on a full-frame sensor, 36 mm wide: 2 * atan(36 / (2 * focal length))
export const aov = (f) => (2 * Math.atan(36 / (2 * f)) * 180) / Math.PI;
export const AOV = Object.fromEntries([24, 35, 50, 85, 135].map((f) => [f, aov(f)]));

const n = (v) => +v.toFixed(2);
const DEG = 180 / Math.PI;
// classes: f the frame (quiet fill, ink line), t the quiet fill alone, s a soft line, d a soft dashed line (a guide or a line of sight)
const rect = (x, y, w, h, cls) => `<rect class="${cls}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"/>`;
const line = (x1, y1, x2, y2, cls = '') => `<path${cls && ` class="${cls}"`} d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}"/>`;
// the figure by its feet (the glyph stands 16 tall, head at 4, feet at 20), the camera and the top-view subject by their centre
const person = (x, y, s) => `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)}) translate(-12 -20)">${PERSON}</g>`;
const glyph = (g, x, y, deg, s, cls = '') => `<g${cls && ` class="${cls}"`} transform="translate(${n(x)} ${n(y)}) rotate(${n(deg)}) scale(${s}) translate(-12 -12)">${g}</g>`;
// a camera at c aimed at t, with one line of sight that stops short of both
function aimed(cx, cy, tx, ty, cs, gap) {
  const len = Math.hypot(tx - cx, ty - cy), ux = (tx - cx) / len, uy = (ty - cy) / len;
  return glyph(CAMERA, cx, cy, Math.atan2(uy, ux) * DEG, cs) + line(cx + ux * (10 * cs + 4), cy + uy * (10 * cs + 4), tx - ux * gap, ty - uy * gap, 'd');
}
// a source at l lighting a target of half-width tr at t: a quiet wedge between two soft rays. panel: [distance from the target, half-length] of a
// diffuser or a window in the way, which is then the source the subject sees
function lit(g, lx, ly, tx, ty, tr, panel) {
  const len = Math.hypot(tx - lx, ty - ly), ux = (tx - lx) / len, uy = (ty - ly) / len, px = -uy, py = ux;
  const a = [lx + ux * 10, ly + uy * 10], b1 = [tx + px * tr, ty + py * tr], b2 = [tx - px * tr, ty - py * tr];
  const poly = (...pts) => `<path class="t" d="M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z"/>`, ray = (p, q) => line(p[0], p[1], q[0], q[1], 's');
  if (!panel) return poly(a, b1, b2) + ray(a, b1) + ray(a, b2) + glyph(SOURCE[g], lx, ly, 0, 0.8);
  const [pd, ph] = panel, cx = tx - ux * pd, cy = ty - uy * pd, p1 = [cx + px * ph, cy + py * ph], p2 = [cx - px * ph, cy - py * ph];
  return poly(a, p1, b1, b2, p2) + ray(a, p1) + ray(a, p2) + ray(p1, b1) + ray(p2, b2) + line(p1[0], p1[1], p2[0], p2[1]) + glyph(SOURCE[g], lx, ly, 0, 0.8);
}
const F = { x: 40, y: 5, w: 160, h: 90 };   // the 16:9 frame every frame diagram shares
const frame = () => rect(F.x, F.y, F.w, F.h, 'f');

const DRAW = {
  // the frame at its true proportion, inside a faint 16:9 for comparison
  ratio({ r }) { const w = Math.min(F.w, F.h * r), h = w / r; return (Math.abs(r - 16 / 9) > 0.01 ? rect(F.x, F.y, F.w, F.h, 'd') : '') + rect(120 - w / 2, 50 - h / 2, w, h, 'f'); },
  // where a 16:9 frame cuts the figure. The figure keeps its size and its place through the series (feet at 120, 92); once the frame would outgrow the box
  // it stays as large as the full shot's and the figure shrinks instead. frame: its top and bottom in figure units; people: the x of each figure
  shot({ frame: [top, bottom], people = [12] }) {
    const fh = bottom - top, k = Math.min(4.4, 84.5 / fh), fw = (fh * 16) / 9;
    return rect(120 - (fw * k) / 2, 92 - (20 - top) * k, fw * k, fh * k, 'f') + people.map((x) => person(120 + (x - 12) * k, 92, k)).join('');
  },
  // side view. h: camera height, d: its distance, at: the height it aims at, all in figure units (5 the eyes, 14 the hips, 20 the ground)
  side({ h, d = 22, at = h, k = 3.8, cs = 1.1, gx = 164, figure = true }) {
    const gy = 92, cx = gx - d * k, cy = gy - (20 - h) * k, tx = gx, ty = gy - (20 - at) * k;
    const gap = !figure ? 3 : at <= 5 ? k + 3 : 3.5 + Math.max(0, at - 14) * 0.5 * k;   // stop before the head, the body or the legs
    return line(50, gy, 190, gy, 's') + (figure ? person(gx, gy, k) : '') + aimed(cx, cy, tx, ty, cs, gap);
  },
  // the lens on the ground beside the feet, looking straight up along the figure
  up({ d = 7, k = 3.8, cs = 1.1 }) { const gx = 150, gy = 92, cx = gx - d * k; return line(50, gy, 190, gy, 's') + person(gx, gy, k) + aimed(cx, gy - 10 * cs - 1.5, cx, gy - 15 * k, cs, 0); },
  // top view. az: where the camera stands around the subject, 0 in front of it, 180 behind; the arrow in the circle is where the subject faces
  plan({ az }) {
    const sx = 120, sy = 48, R = 36, a = az / DEG, on = (t) => `${n(sx - R * Math.cos(t))} ${n(sy + R * Math.sin(t))}`, open = 20 / DEG;
    return `<path class="d" d="M${on(a + open)}A${R} ${R} 0 1 0 ${on(a - open)}"/>` + glyph(FACING, sx, sy, 0, 1.15) + aimed(sx - R * Math.cos(a), sy + R * Math.sin(a), sx, sy, 1.1, 11.5 + 3.5);
  },
  // the camera rolled about its lens: the frame turns, the ground and the figure stay level
  roll({ deg }) { return `<rect class="f" x="75" y="19" width="90" height="50.63" transform="rotate(${-deg} 120 44.3)"/>` + line(50, 70, 190, 70, 's') + person(120, 70, 2.6); },
  // lighting plot, top view: the camera at the bottom looking up at the subject, which faces it. az: where a source stands around the subject,
  // 0 at the camera, 90 at the subject's left (frame right), -90 at frame left, 180 behind; r: how far
  plot({ lamps }) {
    const sx = 120, sy = 46;
    return lamps.map(({ az, r = 46, g = 'lamp', panel }) => lit(g, sx + r * Math.sin(az / DEG), sy + r * Math.cos(az / DEG), sx, sy, 11.5, panel)).join('') + glyph(FACING, sx, sy, -90, 1.15) + aimed(sx, sy + 42, sx, sy, 1.1, 15);
  },
  // lighting, side view, where height is the point: the camera at eye level in front, the source d in front of the figure at height h (figure units)
  glow({ d, h, g = 'lamp' }) { const k = 3.8, gx = 164, gy = 92; return lit(g, gx - d * k, gy - (20 - h) * k, gx, gy - 15 * k, k + 1) + DRAW.side({ h: 5 }); },
  // the sun on its path over the horizon. t: degrees along the path from the eastern horizon (90 overhead, past 180 below the western horizon)
  sky({ t }) {
    const cx = 120, hy = 80, R = 64, on = (a) => `${n(cx - R * Math.cos(a / DEG))} ${n(hy - R * Math.sin(a / DEG))}`, arc = (a, b) => (b - a > 1 ? `<path class="d" d="M${on(a)}A${R} ${R} 0 0 1 ${on(b)}"/>` : '');
    return arc(-10, t - 9) + arc(t + 9, 190) + line(44, hy, 196, hy, 's') + glyph(SOURCE.sun, cx - R * Math.cos(t / DEG), hy - R * Math.sin(t / DEG), 0, 0.75, t > 180 || t < 0 ? 's' : '');
  },
  // a field of view at its true angle, seen from above
  lens({ f }) {
    const a = aov(f) / 2 / DEG, R = 72, ax = 96, ay = 50, x = ax + R * Math.cos(a), dy = R * Math.sin(a);
    return `<path class="t" d="M${ax} ${ay}L${n(x)} ${n(ay - dy)}A${R} ${R} 0 0 1 ${n(x)} ${n(ay + dy)}Z"/>` + line(ax, ay, x, ay - dy) + line(ax, ay, x, ay + dy) + glyph(CAMERA, ax - 13, ay, 0, 1.1);
  },
  // a guide inside the 16:9 frame
  guide({ kind, at = 0.88 }) {
    const tx = F.x + F.w / 3, ty = F.y + F.h / 3, feet = F.y + F.h - 9, s = (feet - ty) / 15;   // a figure whose eyes sit on the upper third
    const parts = {
      thirds: () => [1, 2].map((i) => line(F.x + (F.w * i) / 3, F.y, F.x + (F.w * i) / 3, F.y + F.h, 'd') + line(F.x, F.y + (F.h * i) / 3, F.x + F.w, F.y + (F.h * i) / 3, 'd')).join('') + person(tx, feet, s),
      symmetry: () => line(120, F.y, 120, F.y + F.h, 'd') + person(120, feet, s),
      centre: () => line(112, 50, 128, 50) + line(120, 42, 120, 58),
      space: () => person(F.x + F.w - 24, feet, 1.5),
      lines: () => [F.x, F.x + 66, F.x + F.w].map((x) => line(x, F.y + F.h, x + (146 - x) * 0.9, F.y + F.h + (46 - F.y - F.h) * 0.9, 's')).join('') + person(146, 46, 1),
      short: () => person(tx, feet, s) + glyph(ARROW, tx - 21, ty, 180, 0.8),
      level: () => { const y = F.y + F.h * at; return Array.from({ length: 9 }, (_, i) => line(F.x, F.y + (F.h * (i + 1)) / 10, F.x + 4, F.y + (F.h * (i + 1)) / 10, 's')).join('') + line(F.x, y, F.x + F.w, y, 'd') + person(120, y, 2.6); },
    };
    return frame() + parts[kind]();
  },
};

const each = (type, slugs) => Object.fromEntries(slugs.map((s) => [s, { type }]));
export const MAP = {
  // ratio: the number is read from the card's name
  ...each('ratio', ['ratio-1-1', 'ratio-1-43', 'ratio-1-85', 'ratio-16-9', 'ratio-2-00', 'ratio-2-76', 'ratio-21-9', 'ratio-3-2', 'ratio-4-3', 'ratio-4-5', 'ratio-9-16']),
  // lens: the focal length is read from the card's name
  ...each('lens', ['wide-lens', 'normal-wide-lens', 'standard-lens', 'portrait-lens', 'telephoto-lens']),
  // shot sizes: where the frame's top and bottom fall on the figure (head top 4, chin 6, chest 10, hips 14, knees 17, feet 20)
  'close-up': { type: 'shot', frame: [3.4, 7.2] },
  'medium-close-up': { type: 'shot', frame: [3, 11] },
  'medium-shot': { type: 'shot', frame: [2.8, 14] },
  'cowboy-shot': { type: 'shot', frame: [2.6, 16] },
  'medium-wide-shot': { type: 'shot', frame: [2.4, 17.6] },
  'full-shot': { type: 'shot', frame: [2, 21.2] },
  'wide-shot': { type: 'shot', frame: [-17.5, 22.5] },
  'extreme-wide-shot': { type: 'shot', frame: [-58.7, 25.3] },
  'single-shot': { type: 'shot', frame: [2.8, 14] },
  'two-shot': { type: 'shot', frame: [2.2, 18], people: [5, 19] },
  'group-shot': { type: 'shot', frame: [-2, 22], people: [-2, 12, 26] },
  // angles by height, side view
  'eye-level': { type: 'side', h: 5 },
  'chest-level': { type: 'side', h: 9.5 },
  'hip-level': { type: 'side', h: 14 },
  'knee-level': { type: 'side', h: 17, at: 12 },
  'ground-level': { type: 'side', h: 18.1 },
  'low-angle': { type: 'side', h: 16.5, d: 14, at: 5 },
  'high-angle': { type: 'side', h: 0, d: 16, at: 10 },
  'worms-eye-view': { type: 'up' },
  'birds-eye-view': { type: 'side', h: -41, d: 0, at: 3, k: 1.3, cs: 0.75, gx: 120 },
  'top-down': { type: 'side', h: 4, d: 0, at: 20, gx: 120, figure: false },
  'dutch-angle': { type: 'roll', deg: 14 },
  // angles by viewpoint, top view
  'front-view': { type: 'plan', az: 0 },
  'three-quarter-view': { type: 'plan', az: 45 },
  'profile-shot': { type: 'plan', az: 90 },
  'rear-three-quarter-view': { type: 'plan', az: 135 },
  'back-view': { type: 'plan', az: 180 },
  // composition
  'rule-of-thirds': { type: 'guide', kind: 'thirds' },
  'centred-symmetry': { type: 'guide', kind: 'symmetry' },
  'action-dead-centre': { type: 'guide', kind: 'centre' },
  'negative-space': { type: 'guide', kind: 'space' },
  'leading-lines': { type: 'guide', kind: 'lines' },
  'short-siding': { type: 'guide', kind: 'short' },
  'grid-position': { type: 'guide', kind: 'level', at: 0.88 },
  // light, top view: each source where the card's own phrase puts it
  backlight: { type: 'plot', lamps: [{ az: 180, r: 34 }] },
  'rim-light': { type: 'plot', lamps: [{ az: 150, r: 38 }] },
  'side-light': { type: 'plot', lamps: [{ az: 90, r: 48 }] },
  'rembrandt-light': { type: 'plot', lamps: [{ az: 45 }] },
  'softbox-light': { type: 'plot', lamps: [{ az: -45, r: 58, panel: [30, 13] }] },
  'window-light': { type: 'plot', lamps: [{ az: 90, r: 64, g: 'sun', panel: [30, 15] }] },
  'mixed-light': { type: 'plot', lamps: [{ az: 90, r: 48 }, { az: -90, r: 64, g: 'sun', panel: [30, 15] }] },
  'hard-light': { type: 'plot', lamps: [{ az: 60, r: 70 }] },
  'soft-light': { type: 'plot', lamps: [{ az: 60, r: 70, panel: [28, 16] }] },
  // light, side view: the height is what the card is about
  'butterfly-light': { type: 'glow', d: 11, h: -1 },
  'top-light': { type: 'glow', d: 0, h: -1.5 },
  underlight: { type: 'glow', d: 9, h: 15.5 },
  firelight: { type: 'glow', d: 10, h: 17.5, g: 'flame' },
  moonlight: { type: 'glow', d: 13, h: -1, g: 'moon' },
  // time of day: only the cards that are a sun position; elevations are those of the hour (sunrise about 3, golden hour under 6, blue hour 4 to 6 below)
  dawn: { type: 'sky', t: 3 },
  'high-noon': { type: 'sky', t: 90 },
  'golden-hour': { type: 'sky', t: 174 },
  'blue-hour': { type: 'sky', t: 186 },
};

// { svg, label } for a card, or null when it keeps its words. The label is the one number a diagram may carry (a focal length).
export function diagramOf(item) {
  const m = MAP[item.slug];
  if (!m) return null;
  let p = m, label = '';
  if (m.type === 'ratio') { const [, a, b] = item.name.match(/(\d+(?:\.\d+)?):(\d+)/) || []; if (!a) return null; p = { r: a / b }; }
  if (m.type === 'lens') { const f = Number((item.name.match(/(\d+)\s?mm/) || [])[1]); if (!f) return null; p = { f }; label = `${f} mm`; }
  return { svg: `<svg class="dg" data-dg="${m.type}" viewBox="0 0 240 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${DRAW[m.type](p)}</svg>`, label };
}
