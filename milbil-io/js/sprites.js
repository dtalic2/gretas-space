// ---------- Milbils as pictures for the board ----------
//
// Each milbil is drawn once into a small canvas, which is much quicker to put
// on the board sixty times a second than an SVG or a big PNG. Drawn milbils
// come from milbil.js; the rest are Greta's own drawings in art/.

import { drawLook } from './milbil.js';

const HEIGHT = 192;                 // pixels, about twice what the board ever needs
const cache = new Map();

/** { ready, img, foot } where foot is how far down the picture the feet are. */
export function sprite(ch){
  let s = cache.get(ch.id);
  if (s) return s;
  s = { ready: false, img: null, foot: ch.art ? .985 : .962 };
  cache.set(ch.id, s);
  const img = new Image();
  img.onload = () => {
    const w = Math.round(HEIGHT * img.naturalWidth / img.naturalHeight) || Math.round(HEIGHT * 88 / 106);
    const c = document.createElement('canvas');
    c.width = w; c.height = HEIGHT;
    c.getContext('2d').drawImage(img, 0, 0, w, HEIGHT);
    s.img = c;
    s.ready = true;
  };
  img.src = ch.art || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    drawLook(ch.look).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="176" height="212" '));
  return s;
}
