// ---------- Neon stroke primitives ----------
//
// Every line in this game is drawn the way the original Milbil sketch was drawn:
// glowing light on black. A single "neon stroke" is really four passes over the
// same path — a wide blurred halo, a saturated body, a tighter bright pass, and a
// thin near-white core. That stack is what reads as *light* instead of paint;
// one flat stroke with a shadow never does.
//
// Paths are Path2D objects so the four passes re-use one path instead of
// re-issuing the geometry four times.

/**
 * xorshift32. Seeded so a given Milbil always wobbles the same way — the art has
 * to look hand-drawn, but it must not re-scribble itself every frame.
 */
export function rng(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * Stroke a Path2D as a glowing neon tube.
 *
 * width is the width of the *bright* pass; the halo is drawn around it, so a
 * stroke visually occupies roughly 3x this.
 */
export function neon(ctx, path, color, width, opts = {}) {
  const { glow = 1, alpha = 1, core = '#ffffff', dim = 1 } = opts;
  if (alpha <= 0.002) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = color;
  ctx.strokeStyle = color;

  ctx.globalAlpha = 0.20 * alpha * dim; ctx.shadowBlur = 34 * glow; ctx.lineWidth = width * 3.1; ctx.stroke(path);
  ctx.globalAlpha = 0.42 * alpha * dim; ctx.shadowBlur = 20 * glow; ctx.lineWidth = width * 1.9; ctx.stroke(path);
  ctx.globalAlpha = 0.90 * alpha;       ctx.shadowBlur = 11 * glow; ctx.lineWidth = width;       ctx.stroke(path);

  if (core) {
    ctx.strokeStyle = core;
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 6 * glow;
    ctx.lineWidth = Math.max(0.8, width * 0.34);
    ctx.stroke(path);
  }
  ctx.restore();
}

/** Same idea for a filled shape — used for pupils and coin blobs. */
export function neonFill(ctx, path, color, opts = {}) {
  const { glow = 1, alpha = 1 } = opts;
  ctx.save();
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.5 * alpha; ctx.shadowBlur = 22 * glow; ctx.fill(path);
  ctx.globalAlpha = alpha;       ctx.shadowBlur = 9 * glow;  ctx.fill(path);
  ctx.restore();
}

/**
 * A polyline with hand-drawn wobble: each segment is split into `steps` pieces
 * that drift off the true line by up to `amp`. `rand` is a seeded rng, so the
 * same seed always produces the same scribble.
 */
export function wobbly(pts, amp, rand, steps = 3) {
  const p = new Path2D();
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const last = s === steps;
      // The end of a segment must land on the real point or corners drift apart.
      const jx = last ? 0 : (rand() - 0.5) * 2 * amp;
      const jy = last ? 0 : (rand() - 0.5) * 2 * amp;
      p.lineTo(x0 + (x1 - x0) * t + jx, y0 + (y1 - y0) * t + jy);
    }
  }
  return p;
}

/** An ellipse drawn as a wobbly closed loop, so it looks drawn rather than plotted. */
export function wobblyEllipse(cx, cy, rx, ry, amp, rand, segs = 14, rot = 0) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const j = 1 + (rand() - 0.5) * amp;
    const x = Math.cos(a) * rx * j, y = Math.sin(a) * ry * j;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  const p = new Path2D();
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  p.closePath();
  return p;
}

/** Leaf / almond shape — the Milbil's big eye. Two arcs meeting at sharp corners. */
export function leaf(cx, cy, rx, ry, tilt = 0) {
  const p = new Path2D();
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const T = (x, y) => [cx + x * c - y * s, cy + x * s + y * c];
  const [ax, ay] = T(-rx, 0), [bx, by] = T(rx, 0);
  const [c1x, c1y] = T(-rx * 0.3, -ry * 1.5), [c2x, c2y] = T(rx * 0.3, -ry * 1.5);
  const [d1x, d1y] = T(rx * 0.3, ry * 1.5), [d2x, d2y] = T(-rx * 0.3, ry * 1.5);
  p.moveTo(ax, ay);
  p.bezierCurveTo(c1x, c1y, c2x, c2y, bx, by);
  p.bezierCurveTo(d1x, d1y, d2x, d2y, ax, ay);
  return p;
}

