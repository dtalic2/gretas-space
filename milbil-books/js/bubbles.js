// ---------- Speech bubbles ----------
//
// Four kinds of words:
//
//   say      an oval with a tail pointing at whoever is talking
//   think    a cloud, with little puffs trailing back to them
//   shout    a spiky yellow burst
//   caption  the narrator, with nobody talking: "Meanwhile, at the beach…"
//            Either a strip right along the top or the bottom of its panel,
//            or a box that can go anywhere.
//
// The words themselves are ordinary HTML, so they wrap like any text. The
// bubble round them is SVG, drawn from the size the words came out at. Each
// bubble is drawn twice: every piece of it outlined, then every piece filled in
// white on top. The fill covers the outlines where the pieces overlap, so the
// oval and its tail come out as one shape with one outline round it.

import { TEXT_SIZE, bodyHalf, bumpRadius, mbWidth, clamp, isStrip, captionFill } from './model.js';

const INK = '#2b2233';
const OUTLINE = 9;          // stroke width; the fill covers the inner half of it

/** Longest a line of words can be before it wraps, in page units. */
export const MAX_W = { say: 380, think: 380, shout: 400, caption: 560 };

export const KINDS = [
  { id:'say',     icon:'💬', name:'Talk' },
  { id:'think',   icon:'💭', name:'Think' },
  { id:'shout',   icon:'💥', name:'Shout' },
  { id:'caption', icon:'📜', name:'Caption' },
];

// ------------------------------------------------------------- measuring ---
//
// The words are set once, off screen, in a box where one pixel is one page
// unit. That gives their size on the page whatever size the page happens to be
// drawn at, and it is stored with the bubble so the thumbnail and the reader
// draw exactly the same shape.

let meter = null;

/** How wide words can be, and how tall, in page units. `max` overrides MAX_W. */
export function measure(text, kind = 'say', size = 'm', max = null){
  if (!meter){
    meter = document.createElement('div');
    meter.className = 'meter';
    meter.setAttribute('aria-hidden', 'true');
    document.body.appendChild(meter);
  }
  max = Math.round(max ?? (MAX_W[kind] || MAX_W.say));
  const el = document.createElement('div');
  el.className = `btxt ${kind}`;
  el.style.cssText = `position:static;font-size:${TEXT_SIZE[size] || TEXT_SIZE.m}px;max-width:${max}px;width:max-content`;
  el.textContent = text || ' ';
  meter.replaceChildren(el);

  // A wrapped paragraph's box is as wide as it was allowed to be. The widest
  // *line* is what the bubble should hug.
  const range = document.createRange();
  range.selectNodeContents(el);
  const lines = [...range.getClientRects()];
  const box = el.getBoundingClientRect();
  const widest = lines.length ? Math.max(...lines.map(r => r.width)) : box.width;
  return { w: Math.ceil(clamp(widest, 16, max)), h: Math.ceil(Math.max(box.height, 20)) };
}

// ---------------------------------------------------------------- shapes ---

const f = (n) => Math.round(n * 10) / 10;
const ovalD = (cx, cy, rx, ry) =>
  `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;

/** A little repeatable wobble, so a cloud keeps its shape between redraws. */
function wobble(seed){
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return (i) => {
    let x = (s + i * 2654435761) >>> 0;
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return (x % 1000) / 1000;
  };
}

/** Where the tail should aim: about where a milbil's mouth is. */
const mouth = (m) => ({ x: m.x, y: m.y - m.h * 0.6 });

/**
 * Which way the tail goes, and how far. Null if the speaker is underneath the
 * bubble already, when a tail would only point at itself.
 */
function aim(t, rx, ry, m){
  const T = mouth(m);
  let dx = T.x - t.x, dy = T.y - t.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return null;
  dx /= dist; dy /= dist;
  const edge = 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);     // centre to the rim, this way
  const room = dist - edge;                                       // rim to mouth
  if (room < 16) return null;                                     // the mouth is under the bubble
  const stop = Math.max(mbWidth(m) * 0.32, 26);                   // don't poke them in the face...
  // ...but somebody standing right beside the bubble still gets a little tail
  const reach = edge + clamp(room - stop, Math.min(30, room * 0.85), 190);
  return { dx, dy, edge, reach };
}

/** Two points on the rim either side of where the tail leaves it. */
function rimPair(t, rx, ry, a, half){
  const phi = Math.atan2(a.dy / ry, a.dx / rx);
  const speed = Math.hypot(rx * Math.sin(phi), ry * Math.cos(phi)) || 1;
  const d = Math.min(half / speed, 0.9);
  const at = (q) => ({ x: t.x + rx * Math.cos(q), y: t.y + ry * Math.sin(q) });
  return [at(phi - d), at(phi + d)];
}

function tailD(t, rx, ry, a, { sharp = false } = {}){
  const half = clamp(Math.min(rx, ry) * 0.36, 14, 40);
  const [b1, b2] = rimPair(t, rx, ry, a, half);
  const tip = { x: t.x + a.dx * a.reach, y: t.y + a.dy * a.reach };
  if (sharp) return `M${f(b1.x)} ${f(b1.y)}L${f(tip.x)} ${f(tip.y)}L${f(b2.x)} ${f(b2.y)}Z`;
  // bend it a little, the way a pen would
  const bend = (a.reach - a.edge) * 0.18;
  const px = -a.dy * bend, py = a.dx * bend;
  const c1 = { x: (b1.x + tip.x) / 2 + px, y: (b1.y + tip.y) / 2 + py };
  const c2 = { x: (b2.x + tip.x) / 2 + px, y: (b2.y + tip.y) / 2 + py };
  return `M${f(b1.x)} ${f(b1.y)}Q${f(c1.x)} ${f(c1.y)} ${f(tip.x)} ${f(tip.y)}Q${f(c2.x)} ${f(c2.y)} ${f(b2.x)} ${f(b2.y)}Z`;
}

function cloudD(t, rx, ry){
  const r = bumpRadius(rx, ry);
  const n = clamp(Math.round(Math.PI * (rx + ry) / (r * 1.45)), 7, 24);
  const jig = wobble(t.id);
  const parts = [ovalD(t.x, t.y, rx, ry)];
  for (let i = 0; i < n; i++){
    const q = (i / n) * Math.PI * 2 + 0.3;
    const rr = r * (0.82 + jig(i) * 0.36);
    parts.push(ovalD(t.x + rx * Math.cos(q), t.y + ry * Math.sin(q), rr, rr));
  }
  return parts;
}

function puffsD(t, rx, ry, a){
  const r = bumpRadius(rx, ry);
  const out = [];
  [[r + 26, 17], [r + 64, 12], [r + 94, 8]].forEach(([d, pr]) => {
    if (a.edge + d + pr > a.reach + 30) return;
    out.push(ovalD(t.x + a.dx * (a.edge + d), t.y + a.dy * (a.edge + d), pr, pr));
  });
  return out;
}

function burstD(t, rx, ry){
  const jig = wobble(t.id);
  const n = clamp(Math.round((rx + ry) / 20), 14, 30);
  const pts = [];
  for (let i = 0; i < n * 2; i++){
    const q = (i / (n * 2)) * Math.PI * 2;
    const k = i % 2 ? 1.0 : 1.2 + jig(i) * 0.1;
    pts.push(`${f(t.x + rx * k * Math.cos(q))} ${f(t.y + ry * k * Math.sin(q))}`);
  }
  return `M${pts.join('L')}Z`;
}

function boxD(t){
  const { rx, ry } = bodyHalf(t);
  const x = t.x - rx, y = t.y - ry, w = rx * 2, h = ry * 2, r = 10;
  return `M${f(x + r)} ${f(y)}H${f(x + w - r)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)}V${f(y + h - r)}` +
    `Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)}H${f(x + r)}Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)}` +
    `V${f(y + r)}Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)}Z`;
}

/**
 * The SVG for one bubble, in page units. `speaker` is the milbil saying it, or
 * null for a caption or somebody who has been deleted.
 */
export function bubbleSVG(t, speaker, { hit = false } = {}){
  const tag = `<g class="bub ${t.kind}${isStrip(t) ? ' strip' : ''}"${hit ? ` data-w="${t.id}"` : ''}>`;
  if (isStrip(t)) return tag + stripSVG(t) + '</g>';
  const { rx, ry } = bodyHalf(t);
  let parts, fill = '#fff';

  if (t.kind === 'caption'){
    parts = [boxD(t)];
    fill = captionFill(t.fill);
  } else if (t.kind === 'think'){
    parts = cloudD(t, rx, ry);
    const a = speaker && aim(t, rx + bumpRadius(rx, ry) * 0.6, ry + bumpRadius(rx, ry) * 0.6, speaker);
    if (a) parts.push(...puffsD(t, rx, ry, { ...a, edge: 1 / Math.sqrt((a.dx / rx) ** 2 + (a.dy / ry) ** 2) }));
  } else if (t.kind === 'shout'){
    parts = [burstD(t, rx, ry)];
    fill = '#fff7a8';
    const a = speaker && aim(t, rx * 1.1, ry * 1.1, speaker);
    if (a) parts.push(tailD(t, rx, ry, a, { sharp: true }));
  } else {
    parts = [ovalD(t.x, t.y, rx, ry)];
    const a = speaker && aim(t, rx, ry, speaker);
    if (a) parts.push(tailD(t, rx, ry, a));
  }

  const lines = parts.map(d => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${OUTLINE}" stroke-linejoin="round"/>`).join('');
  const fills = parts.map(d => `<path d="${d}" fill="${fill}"/>`).join('');
  return `${tag}${lines}${fills}</g>`;
}

/**
 * A strip sits just inside its panel's frame, so the frame is its outline on
 * three sides; it only needs a line of its own along the side facing into the
 * panel. On the cover, where panels have no frame, it is outlined all round.
 */
function stripSVG(t){
  const x = t.x - t.sw / 2, y = t.y - t.sh / 2;
  const fill = captionFill(t.fill);
  if (t.framed === false){
    return `<rect x="${f(x)}" y="${f(y)}" width="${f(t.sw)}" height="${f(t.sh)}" rx="10" fill="${fill}" stroke="${INK}" stroke-width="6"/>`;
  }
  const edge = t.at === 'top' ? y + t.sh : y;
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(t.sw)}" height="${f(t.sh)}" fill="${fill}"/>` +
    `<path d="M${f(x)} ${f(edge)}H${f(x + t.sw)}" stroke="${INK}" stroke-width="6"/>`;
}

