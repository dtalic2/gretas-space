// ---------- Milbils as pictures for the board ----------
//
// Each milbil is drawn once into a small canvas, which is much quicker to put
// on the board sixty times a second than an SVG or a big PNG. Drawn milbils
// come from milbil.js, and get a glow in their own colour so they light up the
// black island the way Greta's drawings do. The rest are Greta's own drawings
// in art/, which glow already.

import { drawLook } from './milbil.js';

const HEIGHT = 192;                 // pixels, about twice what the board ever needs
const GLOW = 14;                    // pixels of glow round a drawn milbil
const cache = new Map();

/** { ready, img, foot, scale }: foot is how far down the picture the feet are,
 *  and scale is how much taller the picture is than the milbil (for its glow). */
export function sprite(ch){
  let s = cache.get(ch.id);
  if (s) return s;
  s = { ready: false, img: null, foot: ch.art ? .985 : .962, scale: 1 };
  cache.set(ch.id, s);
  const img = new Image();
  img.onload = () => {
    const w = Math.round(HEIGHT * img.naturalWidth / img.naturalHeight) || Math.round(HEIGHT * 88 / 106);
    const pad = ch.art ? 0 : GLOW;
    const c = document.createElement('canvas');
    c.width = w + pad * 2; c.height = HEIGHT + pad * 2;
    const g = c.getContext('2d');
    if (pad){
      g.shadowColor = ch.look.line === 'rainbow' ? '#c49bff' : ch.look.line;
      g.shadowBlur = GLOW;
      g.drawImage(img, pad, pad, w, HEIGHT);       // twice, for a stronger glow
      g.shadowBlur = GLOW / 2;
    }
    g.drawImage(img, pad, pad, w, HEIGHT);
    s.foot = (pad + s.foot * HEIGHT) / c.height;
    s.scale = c.height / HEIGHT;
    s.img = c;
    s.ready = true;
  };
  img.src = ch.art || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    drawLook(ch.look).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="176" height="212" '));
  return s;
}
