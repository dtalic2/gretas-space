// ---------- Sparks, shards, floating numbers and screen shake ----------
//
// All of it is short-lived and purely decorative: the simulation never reads back
// out of here. Particles are plain additive dots — against a black board that
// reads as light, and it costs nothing next to a real neon stroke.

// One soft dot per colour, baked once and blitted additively. A shadowBlur per
// particle is what turned a busy board into a slideshow; this looks the same and
// costs a texture blit.
const dots = new Map();
function glowDot(color) {
  let cv = dots.get(color);
  if (cv) return cv;
  const R = 32;
  cv = document.createElement('canvas');
  cv.width = cv.height = R * 2;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(R, R, 0, R, R, R);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalAlpha = 0.9;
  c.fillStyle = g;
  c.beginPath(); c.arc(R, R, R, 0, Math.PI * 2); c.fill();
  dots.set(color, cv);
  return cv;
}

const particles = [];
const floaters = [];
const beams = [];
let shakeAmt = 0;

export function burst(x, y, color, n = 18, speed = 220, spread = Math.PI * 2, dir = 0) {
  for (let i = 0; i < n; i++) {
    const a = dir + (Math.random() - 0.5) * spread;
    const v = speed * (0.35 + Math.random() * 0.85);
    particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.35 + Math.random() * 0.5, age: 0,
      r: 1.4 + Math.random() * 2.6, color,
    });
  }
}

/** The shower a Milbil leaves when it pops: shards that fall and fade. */
export function popBurst(x, y, color, size) {
  burst(x, y, color, 26, size * 3.2);
  burst(x, y, '#ffffff', 10, size * 2.0);
}

export function floater(x, y, text, color, opts = {}) {
  floaters.push({ x, y, text, color, age: 0, life: opts.life ?? 1.1, size: opts.size ?? 22, vy: opts.vy ?? -52 });
}

/** A laser beam, drawn for a moment after the shot lands. */
export function beam(x0, y0, x1, y1, color, width) {
  beams.push({ x0, y0, x1, y1, color, width, age: 0, life: 0.22 });
}

export function shake(amount) {
  shakeAmt = Math.min(26, shakeAmt + amount);
}

export function shakeOffset() {
  if (shakeAmt < 0.1) return { x: 0, y: 0 };
  return {
    x: (Math.random() - 0.5) * shakeAmt,
    y: (Math.random() - 0.5) * shakeAmt,
  };
}

export function update(dt) {
  shakeAmt *= Math.pow(0.0016, dt);       // fast, frame-rate independent decay

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age >= p.life) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 320 * dt;                     // a little gravity so shards arc
    p.vx *= Math.pow(0.12, dt);
    p.vy *= Math.pow(0.5, dt);
  }

  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.age += dt;
    if (f.age >= f.life) { floaters.splice(i, 1); continue; }
    f.y += f.vy * dt;
    f.vy *= Math.pow(0.25, dt);
  }

  for (let i = beams.length - 1; i >= 0; i--) {
    beams[i].age += dt;
    if (beams[i].age >= beams[i].life) beams.splice(i, 1);
  }
}

export function draw(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const b of beams) {
    const k = 1 - b.age / b.life;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.shadowColor = b.color;
    ctx.strokeStyle = b.color;
    ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1);
    ctx.globalAlpha = 0.30 * k; ctx.shadowBlur = 40; ctx.lineWidth = b.width * 3.2; ctx.stroke();
    ctx.globalAlpha = 0.75 * k; ctx.shadowBlur = 22; ctx.lineWidth = b.width * 1.5; ctx.stroke();
    ctx.globalAlpha = k;        ctx.shadowBlur = 10; ctx.lineWidth = b.width * 0.5;
    ctx.strokeStyle = '#ffffff'; ctx.stroke();
    ctx.restore();
  }

  for (const p of particles) {
    const k = 1 - p.age / p.life;
    const r = p.r * k * 3.2;
    ctx.globalAlpha = k * 0.95;
    ctx.drawImage(glowDot(p.color), p.x - r, p.y - r, r * 2, r * 2);
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of floaters) {
    const k = 1 - f.age / f.life;
    ctx.globalAlpha = Math.min(1, k * 2.2);
    ctx.font = `900 ${f.size}px "Baloo 2", "Trebuchet MS", system-ui, sans-serif`;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.globalAlpha *= 0.5;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}

export function clear() {
  particles.length = 0;
  floaters.length = 0;
  beams.length = 0;
  shakeAmt = 0;
}
