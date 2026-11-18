// ---------- Drawing on the page ----------
//
// Every line you draw is kept as a list of points rather than as a picture, so
// a page can be redrawn crisply at any size — tiny on the shelf, huge in the
// reader — and a whole book of drawings still fits comfortably in storage.
//
//   { c: colour, w: thickness, g: glow pen?, b: behind the milbils?, e: rubber?,
//     p: [x0, y0, x1, y1, …] }                     all in page units
//
// There are two sheets of glass over each page: one behind the milbils and one
// in front of them. A line goes on one or the other; the rubber rubs out both,
// so it always rubs out whatever you can see.

import { PAGE_W } from './model.js';

/** A colour two-thirds of the way to white: the bright core of a glow line. */
function core(hex){
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const mix = (v) => Math.round(v + (255 - v) * 0.68);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

/** Trace a line through the points with soft corners, like a real pen. */
function trace(ctx, p, k){
  const n = p.length / 2;
  ctx.moveTo(p[0] * k, p[1] * k);
  if (n === 2){ ctx.lineTo(p[2] * k, p[3] * k); return; }
  for (let i = 1; i < n - 1; i++){
    const x = p[2 * i] * k, y = p[2 * i + 1] * k;
    const nx = p[2 * i + 2] * k, ny = p[2 * i + 3] * k;
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  ctx.lineTo(p[2 * n - 2] * k, p[2 * n - 1] * k);
}

/** Draw one line. `k` is canvas pixels per page unit. */
export function drawStroke(ctx, s, k){
  const p = s.p;
  if (!p || p.length < 2) return;
  const w = Math.max(0.6, s.w * k);
  const colour = s.e ? '#000' : s.c;
  const glow = s.g && !s.e;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (s.e) ctx.globalCompositeOperation = 'destination-out';

  if (p.length < 4){                       // a single tap: a dot
    ctx.beginPath();
    ctx.arc(p[0] * k, p[1] * k, w / 2, 0, Math.PI * 2);
    if (glow){ ctx.shadowColor = colour; ctx.shadowBlur = Math.min(w * 1.4, 60); }
    ctx.fillStyle = colour;
    ctx.fill();
    if (glow){
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(p[0] * k, p[1] * k, w * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = core(colour);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  ctx.beginPath();
  trace(ctx, p, k);
  ctx.strokeStyle = colour;
  ctx.lineWidth = w;
  if (glow){
    // Greta's milbils are drawn in light: a bright core with a colour haze round it.
    ctx.shadowColor = colour;
    ctx.shadowBlur = Math.min(w * 1.4, 60);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = core(colour);
    ctx.lineWidth = w * 0.42;
    ctx.stroke();
  } else {
    ctx.stroke();
  }
  ctx.restore();
}

/** Redraw one sheet of glass from scratch. */
export function paintInk(canvas, strokes, layer){
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const k = canvas.width / PAGE_W;
  const back = layer === 'back';
  for (const s of strokes) if (s.e || !!s.b === back) drawStroke(ctx, s, k);
}

/** Does this sheet have anything to draw at all? */
export const usesLayer = (strokes, layer) => strokes.some(s => !s.e && !!s.b === (layer === 'back'));

/**
 * Thin out the points of a finished line (Ramer–Douglas–Peucker). A finger
 * drags out a point every few pixels; most of them sit on a straight bit and
 * add nothing.
 */
export function simplify(p, tol = 1.4){
  const n = p.length / 2;
  if (n <= 2) return p.map(Math.round);
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length){
    const [a, b] = stack.pop();
    const ax = p[2 * a], ay = p[2 * a + 1], bx = p[2 * b], by = p[2 * b + 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let far = -1, farD = tol;
    for (let i = a + 1; i < b; i++){
      const d = Math.abs((bx - ax) * (ay - p[2 * i + 1]) - (ax - p[2 * i]) * (by - ay)) / len;
      if (d > farD){ farD = d; far = i; }
    }
    if (far > 0){ keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(Math.round(p[2 * i]), Math.round(p[2 * i + 1]));
  return out;
}
