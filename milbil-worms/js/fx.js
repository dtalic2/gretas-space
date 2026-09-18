// ---------- Sparks, smoke, shake ----------
//
// One flat pool of effects, all in world coordinates, drawn between the terrain
// and the HUD. The only thing worth knowing: `explode()` is deliberately six
// separate effects layered on one timeline — a white core flash that is gone in
// 80ms, a shock ring, fire, terrain debris that falls, smoke that lingers for
// seconds, and a kick to the camera. A single expanding orange circle reads as a
// sprite; the stack reads as a detonation.

import { TAU } from './util.js';

export const particles = [];
export const smoke = [];
export const rings = [];
export const bolts = [];
export const floaters = [];
export const lights = [];
let shakeAmt = 0;
let flash = { a: 0, color: '#fff' };

const dots = new Map();
/** A pre-rendered radial dot. Drawing thousands of arcs a frame is death. */
function glowDot(color) {
  let c = dots.get(color);
  if (c) return c;
  const R = 32;
  c = document.createElement('canvas');
  c.width = c.height = R * 2;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(R, R, 0, R, R, R);
  grad.addColorStop(0, color);
  grad.addColorStop(0.32, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.globalAlpha = 0.92;
  g.beginPath();
  g.arc(R, R, R, 0, TAU);
  g.fill();
  dots.set(color, c);
  return c;
}

export function spark(x, y, color, opts = {}) {
  const {
    n = 1, speed = 200, spread = TAU, dir = 0, life = 0.5,
    size = 2.2, grav = 300, drag = 0.2, fade = 1,
  } = opts;
  for (let i = 0; i < n; i++) {
    const a = dir + (Math.random() - 0.5) * spread;
    const v = speed * (0.3 + Math.random() * 0.9);
    particles.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: life * (0.6 + Math.random() * 0.8), age: 0,
      r: size * (0.5 + Math.random()), color, grav, drag, fade,
    });
  }
}

export function puff(x, y, opts = {}) {
  const { n = 1, speed = 40, r = 16, grow = 34, life = 1.6, tint = '18,22,30', rise = -22 } = opts;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    smoke.push({
      x: x + Math.cos(a) * r * 0.4, y: y + Math.sin(a) * r * 0.4,
      vx: Math.cos(a) * speed * Math.random(), vy: rise * (0.5 + Math.random()),
      r: r * (0.6 + Math.random() * 0.7), grow, life: life * (0.7 + Math.random() * 0.6),
      age: 0, tint, spin: (Math.random() - 0.5) * 2,
    });
  }
}

export function ring(x, y, r0, r1, color, opts = {}) {
  rings.push({ x, y, r0, r1, color, width: opts.width ?? 5, life: opts.life ?? 0.42, age: 0, fill: !!opts.fill });
}

export function bolt(x0, y0, x1, y1, color, opts = {}) {
  const segs = opts.segs ?? 9;
  const jag = opts.jag ?? 0.16;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const k = i === 0 || i === segs ? 0 : (Math.random() - 0.5) * len * jag;
    pts.push([x0 + dx * t + nx * k, y0 + dy * t + ny * k]);
  }
  bolts.push({ pts, color, age: 0, life: opts.life ?? 0.3, width: opts.width ?? 3 });
}

export function floater(x, y, text, color, opts = {}) {
  floaters.push({
    x, y, text, color, age: 0,
    life: opts.life ?? 1.2, size: opts.size ?? 22, vy: opts.vy ?? -46,
  });
}

/** A short-lived pool of light on the terrain, drawn additively under entities. */
export function light(x, y, r, color, life = 0.35) {
  lights.push({ x, y, r, color, life, age: 0 });
}

export function shake(amount) {
  shakeAmt = Math.min(38, shakeAmt + amount);
}

export function screenFlash(alpha, color = '#fff') {
  flash = { a: Math.max(flash.a, alpha), color };
}

export function shakeOffset() {
  if (shakeAmt < 0.1) return { x: 0, y: 0 };
  return { x: (Math.random() - 0.5) * shakeAmt, y: (Math.random() - 0.5) * shakeAmt };
}

export function flashAlpha() {
  return flash.a > 0.002 ? flash : null;
}

/** The full stack. `radius` is the blast radius, in world pixels. */
export function explode(x, y, radius, opts = {}) {
  const { color = '#ffb457', debris = '#2a3a4d', mega = false } = opts;
  const s = radius / 60;

  ring(x, y, radius * 0.18, radius * 1.25, '#ffffff', { width: 5 * s, life: 0.24 });
  ring(x, y, radius * 0.1, radius * 1.85, color, { width: 3.4 * s, life: 0.48 });
  spark(x, y, '#ffffff', { n: 14 * s, speed: 320 * s, life: 0.24, size: 2.4 * s, grav: 60 });
  spark(x, y, color, { n: 26 * s, speed: 260 * s, life: 0.62, size: 2.8 * s, grav: 220 });
  spark(x, y, '#ffd75e', { n: 12 * s, speed: 420 * s, life: 0.5, size: 1.8 * s, grav: 420 });
  spark(x, y, debris, { n: 16 * s, speed: 300 * s, life: 1.5, size: 2.6 * s, grav: 900, drag: 0.02 });
  puff(x, y, { n: 8 + 6 * s, r: radius * 0.4, grow: radius * 1.1, life: 2.1, speed: 70 * s });
  light(x, y, radius * 3.2, color, 0.42);
  shake(mega ? 34 : 6 + 10 * s);
  screenFlash(mega ? 0.55 : Math.min(0.3, 0.09 * s), mega ? '#fff2b8' : '#ffffff');
}

export function splash(x, y, color) {
  spark(x, y, color, { n: 22, speed: 260, spread: Math.PI * 0.8, dir: -Math.PI / 2, life: 0.8, size: 2.4, grav: 700 });
  ring(x, y, 4, 46, color, { width: 3, life: 0.5 });
  puff(x, y, { n: 4, r: 18, grow: 44, life: 1.2, tint: '90,160,190', rise: -30 });
}

export function update(dt) {
  shakeAmt *= Math.pow(0.0016, dt);
  flash.a *= Math.pow(0.0009, dt);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age >= p.life) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.grav * dt;
    const d = Math.pow(p.drag ?? 0.2, dt);
    p.vx *= d;
    p.vy *= Math.pow(0.55, dt);
  }
  for (let i = smoke.length - 1; i >= 0; i--) {
    const s = smoke[i];
    s.age += dt;
    if (s.age >= s.life) { smoke.splice(i, 1); continue; }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= Math.pow(0.35, dt);
    s.vy = s.vy * Math.pow(0.5, dt) - 6 * dt;
    s.r += s.grow * dt * 0.5;
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].age += dt;
    if (rings[i].age >= rings[i].life) rings.splice(i, 1);
  }
  for (let i = bolts.length - 1; i >= 0; i--) {
    bolts[i].age += dt;
    if (bolts[i].age >= bolts[i].life) bolts.splice(i, 1);
  }
  for (let i = lights.length - 1; i >= 0; i--) {
    lights[i].age += dt;
    if (lights[i].age >= lights[i].life) lights.splice(i, 1);
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.age += dt;
    if (f.age >= f.life) { floaters.splice(i, 1); continue; }
    f.y += f.vy * dt;
    f.vy *= Math.pow(0.3, dt);
  }
}

const puffs = new Map();
/** One soft sprite per smoke tint, scaled at draw time. Building a gradient per
 *  puff per frame costs more than everything else in this file put together. */
function puffSprite(tint) {
  let c = puffs.get(tint);
  if (c) return c;
  const R = 48;
  c = document.createElement('canvas');
  c.width = c.height = R * 2;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(R, R, 0, R, R, R);
  grad.addColorStop(0, `rgba(${tint},.92)`);
  grad.addColorStop(0.55, `rgba(${tint},.42)`);
  grad.addColorStop(1, `rgba(${tint},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, R * 2, R * 2);
  puffs.set(tint, c);
  return c;
}

/** Smoke sits behind everything else; call this before entities are drawn. */
export function drawSmoke(ctx) {
  ctx.save();
  for (const s of smoke) {
    const k = 1 - s.age / s.life;
    ctx.globalAlpha = k * k * 0.5;
    ctx.drawImage(puffSprite(s.tint), s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
  }
  ctx.restore();
}

export function drawLights(ctx) {
  if (!lights.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    const k = 1 - l.age / l.life;
    ctx.globalAlpha = k * k * 0.5;
    ctx.drawImage(glowDot(l.color), l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  ctx.restore();
}

export function draw(ctx, zoom = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const r of rings) {
    const k = r.age / r.life;
    const rad = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 2.6));
    ctx.globalAlpha = Math.pow(1 - k, 1.5);
    ctx.strokeStyle = r.color;
    ctx.shadowColor = r.color;
    ctx.shadowBlur = 22;
    ctx.lineWidth = Math.max(0.6, r.width * (1 - k));
    ctx.beginPath();
    ctx.arc(r.x, r.y, rad, 0, TAU);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  for (const b of bolts) {
    const k = 1 - b.age / b.life;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = b.color;
    ctx.strokeStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(b.pts[0][0], b.pts[0][1]);
    for (let i = 1; i < b.pts.length; i++) ctx.lineTo(b.pts[i][0], b.pts[i][1]);
    ctx.globalAlpha = 0.34 * k;
    ctx.shadowBlur = 28;
    ctx.lineWidth = b.width * 3.4;
    ctx.stroke();
    ctx.globalAlpha = k;
    ctx.shadowBlur = 14;
    ctx.lineWidth = b.width;
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = b.width * 0.36;
    ctx.stroke();
    ctx.restore();
  }

  for (const p of particles) {
    const k = 1 - p.age / p.life;
    const r = p.r * (0.4 + k) * 2.6;
    ctx.globalAlpha = Math.min(1, k * 1.4) * (p.fade ?? 1);
    ctx.drawImage(glowDot(p.color), p.x - r, p.y - r, r * 2, r * 2);
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of floaters) {
    const k = 1 - f.age / f.life;
    const size = f.size / zoom;
    ctx.globalAlpha = Math.min(1, k * 2.4);
    ctx.font = `900 ${size}px "Baloo 2", "Trebuchet MS", system-ui, sans-serif`;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha *= 0.55;
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}

export function clearFx() {
  particles.length = 0;
  smoke.length = 0;
  rings.length = 0;
  bolts.length = 0;
  floaters.length = 0;
  lights.length = 0;
  shakeAmt = 0;
  flash = { a: 0, color: '#fff' };
}
