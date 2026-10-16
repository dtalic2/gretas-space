// ---------- Colours of land ----------

import { SPARE_COLORS } from './data.js';

const TOO_CLOSE = 75;         // colours nearer than this (red, green, blue apart) look the same on the island

const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const hex = (c) => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const apart = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const WHITE = [255, 255, 255], BLACK = [0, 0, 0];

/** Everyone's land colour, first come first served: anyone whose colour is
 *  too like someone's before them gets the most different spare one. */
export function assignColors(wanted){
  const taken = [];
  return wanted.map(c => {
    if (c === 'rainbow') return c;          // nobody else's land looks like a rainbow
    const want = rgb(c);
    if (taken.every(t => apart(t, want) >= TOO_CLOSE)){ taken.push(want); return c; }
    let best = SPARE_COLORS[0], far = -1;
    for (const s of SPARE_COLORS){
      const d = Math.min(...taken.map(t => apart(t, rgb(s))));
      if (d > far){ far = d; best = s; }
    }
    taken.push(rgb(best));
    return best;
  });
}

// Rainbow land changes colour cell by cell, in diagonal stripes.
const STRIPES = 40;
function hsl(h, s, l){
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
const RAINBOW = Array.from({ length: STRIPES }, (_, k) => hsl(k * 360 / STRIPES, .85, .62));
export const rainbowAt = (x, y) => (x + y) % STRIPES;
export const RAINBOW_CSS = 'linear-gradient(90deg, #ff4d6d, #ffb000, #3fae4a, #2f80ed, #9b5de5)';

/** The shades one player's land, trail and name label are drawn in. */
export function palette(color){
  if (color === 'rainbow'){
    return {
      rainbow: true, css: RAINBOW_CSS, ink: '#4a2c9a',
      land: RAINBOW.map(c => hex(mix(c, WHITE, .1))),
      side: RAINBOW.map(c => hex(mix(c, BLACK, .3))),
      mini: RAINBOW,
      trail: (t) => hex(hsl((t * 90) % 360, .9, .78)),
    };
  }
  const c = rgb(color);
  return {
    rainbow: false, css: color,
    land: hex(mix(c, WHITE, .12)),
    side: hex(mix(c, BLACK, .32)),
    ink: hex(mix(c, BLACK, .5)),
    mini: c,
    trail: hex(mix(c, WHITE, .42)),
  };
}
