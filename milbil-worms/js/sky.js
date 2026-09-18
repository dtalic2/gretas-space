// ---------- Behind everything ----------
//
// Four layers that move at different speeds as the camera pans: a gradient wash
// fixed to the screen, a nebula-and-stars plate at 0.35, far hills at 0.62, near
// hills at 0.78. Parallax is the cheapest depth there is — the ground is the
// only thing at 1.0, and that alone makes a flat 2D map feel like a place with
// distance in it.
//
// The maths: to make a layer appear to move at fraction p of the camera, draw it
// shifted by cam * (1 - p) inside the normal world transform. Both plates are
// drawn wider than the world so the shift never runs off their edge.

import { TAU, seeded, fbm } from './util.js';
import { WORLD } from './terrain.js';

const OVER = 0.34;   // how far each plate extends past the world, each side

function plate(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = Math.round(h);
  return c;
}

export function makeBackdrop(theme, seed) {
  const rand = seeded(seed + 991);
  const W = WORLD.w * (1 + OVER * 2);
  const H = WORLD.h * (1 + OVER);

  // --- stars + nebula ---
  const stars = plate(W * 0.75, H * 0.75);
  const s = stars.getContext('2d');
  const sw = stars.width, sh = stars.height;

  for (let i = 0; i < 5; i++) {
    const x = rand() * sw, y = rand() * sh * 0.85, r = sh * (0.18 + rand() * 0.3);
    const g = s.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, theme.nebula[i % theme.nebula.length]);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    s.fillStyle = g;
    s.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 900; i++) {
    const x = rand() * sw, y = rand() * sh;
    const r = rand() < 0.94 ? 0.5 + rand() * 0.9 : 1.4 + rand() * 1.3;
    s.globalAlpha = 0.25 + rand() * 0.75;
    s.fillStyle = theme.stars;
    s.beginPath();
    s.arc(x, y, r, 0, TAU);
    s.fill();
    if (r > 1.4) {
      s.globalAlpha *= 0.5;
      s.beginPath();
      s.arc(x, y, r * 3.2, 0, TAU);
      s.fill();
    }
  }
  s.globalAlpha = 1;

  // --- a moon, low and huge, because it gives the eye something to hang on ---
  const mx = sw * (0.18 + rand() * 0.64), my = sh * (0.12 + rand() * 0.2);
  const mr = 42 + rand() * 34;
  const mg = s.createRadialGradient(mx, my, mr * 0.2, mx, my, mr * 4);
  mg.addColorStop(0, 'rgba(255,255,255,.16)');
  mg.addColorStop(1, 'rgba(255,255,255,0)');
  s.fillStyle = mg;
  s.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
  s.fillStyle = 'rgba(255,255,255,.82)';
  s.beginPath();
  s.arc(mx, my, mr, 0, TAU);
  s.fill();
  s.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) {
    s.globalAlpha = 0.1 + rand() * 0.2;
    s.beginPath();
    s.arc(mx + (rand() - 0.5) * mr * 1.3, my + (rand() - 0.5) * mr * 1.3, mr * (0.1 + rand() * 0.22), 0, TAU);
    s.fill();
  }
  s.globalCompositeOperation = 'source-over';
  s.globalAlpha = 1;

  // --- two ridgelines ---
  const hills = plate(W * 0.9, H * 0.9);
  const hc = hills.getContext('2d');
  const hw = hills.width, hh = hills.height;
  for (let layer = 0; layer < 2; layer++) {
    const ridge = fbm(seed + 400 + layer * 31, 3);
    const baseY = hh * (0.56 + layer * 0.16);
    const amp = hh * (0.2 - layer * 0.07);
    hc.beginPath();
    hc.moveTo(0, hh);
    for (let x = 0; x <= hw; x += 8) {
      hc.lineTo(x, baseY - (ridge(x / (420 - layer * 160)) - 0.4) * 2 * amp);
    }
    hc.lineTo(hw, hh);
    hc.closePath();
    const g = hc.createLinearGradient(0, baseY - amp, 0, hh);
    g.addColorStop(0, theme.hills[layer]);
    g.addColorStop(1, theme.sky[2]);
    hc.fillStyle = g;
    hc.fill();
    // a thin lit crest, so the ridge is not just a black hole in the sky
    hc.strokeStyle = theme.rimGlow;
    hc.globalAlpha = 0.16 - layer * 0.06;
    hc.lineWidth = 2;
    hc.stroke();
    hc.globalAlpha = 1;
  }

  // Both plates fade out at their own edges. Zoomed right out you can see past
  // them, and a starfield that stops in a straight line is worse than one that
  // thins out into the dark.
  for (const plate of [stars, hills]) {
    const c = plate.getContext('2d');
    const pw = plate.width, ph = plate.height;
    c.globalCompositeOperation = 'destination-out';
    const edges = [
      [0, 0, pw * 0.1, 0], [pw, 0, pw * 0.9, 0],
      [0, 0, 0, ph * 0.1], [0, ph, 0, ph * 0.9],
    ];
    for (const [x0, y0, x1, y1] of edges) {
      const g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, pw, ph);
    }
    c.globalCompositeOperation = 'source-over';
  }

  return { stars, hills };
}

/** The fixed wash. Screen space — call before the camera transform. */
export function drawSkyWash(ctx, theme, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, theme.sky[0]);
  g.addColorStop(0.55, theme.sky[1]);
  g.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * The parallax plates. World space — call inside the camera transform.
 *
 * Each plate is drawn shifted by cam * (1 - p), and only the slice of it the
 * camera can actually see is blitted.
 */
export function drawBackdrop(ctx, bd, cam, rect) {
  const dx = -WORLD.w * OVER;
  const dy = -WORLD.h * (OVER * 0.8);
  const dw = WORLD.w * (1 + OVER * 2);
  const dh = WORLD.h * (1 + OVER);

  for (const l of [{ img: bd.stars, p: 0.35 }, { img: bd.hills, p: 0.68 }]) {
    const tx = cam.x * (1 - l.p), ty = cam.y * (1 - l.p);
    const cx0 = Math.max(rect.x0 - tx, dx), cx1 = Math.min(rect.x1 - tx, dx + dw);
    const cy0 = Math.max(rect.y0 - ty, dy), cy1 = Math.min(rect.y1 - ty, dy + dh);
    if (cx1 <= cx0 || cy1 <= cy0) continue;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.drawImage(
      l.img,
      ((cx0 - dx) / dw) * l.img.width, ((cy0 - dy) / dh) * l.img.height,
      ((cx1 - cx0) / dw) * l.img.width, ((cy1 - cy0) / dh) * l.img.height,
      cx0, cy0, cx1 - cx0, cy1 - cy0,
    );
    ctx.restore();
  }
}

/**
 * Drifting motes — embers, snow, spores, depending on theme. Kept here rather
 * than in fx.js because they are scenery: they never interact with anything and
 * they must not be cleared when the effects pool is.
 */
export class Motes {
  constructor(theme) {
    this.theme = theme;
    this.list = [];
    const m = theme.motes;
    for (let i = 0; i < m.count; i++) {
      this.list.push({
        x: Math.random() * WORLD.w,
        y: Math.random() * WORLD.h,
        r: m.size * (0.4 + Math.random()),
        vx: (Math.random() - 0.5) * 16,
        vy: m.rise * (0.5 + Math.random()),
        ph: Math.random() * TAU,
      });
    }
  }

  update(dt, wind) {
    for (const p of this.list) {
      p.ph += dt * 1.4;
      p.x += (p.vx + wind * 26 + Math.sin(p.ph) * 9) * dt;
      p.y += p.vy * dt;
      if (p.y < -20) p.y = WORLD.h + 10;
      if (p.y > WORLD.h + 20) p.y = -10;
      if (p.x < -20) p.x = WORLD.w + 10;
      if (p.x > WORLD.w + 20) p.x = -10;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = this.theme.motes.color;
    for (const p of this.list) {
      ctx.globalAlpha = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(p.ph));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
