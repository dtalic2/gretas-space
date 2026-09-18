// ---------- Things in the air ----------
//
// One integrator for everything that flies, and a `kind` switch at the moment of
// firing. Projectiles never touch the terrain array or the Milbils directly —
// they call G.blast(), which is the single place damage happens, so a bomblet, a
// stick of dynamite and a MEGA MILL all crater the map the same way.
//
// Substepping matters here. A bazooka at full power moves 16 px per frame at
// 60fps, and the terrain is sampled per pixel — at one step per frame a fast
// rocket skips straight through a thin ledge. Every projectile is advanced in
// slices of at most 4 world pixels.

import { TAU, clamp, dist } from './util.js';
import { WEAPONS } from './weapons.js';
import * as fx from './fx.js';
import { sfx } from './audio.js';
import { neon } from './neon.js';

export const GRAVITY = 640;
export const WIND_ACC = 115;

let uid = 0;

function make(G, opts) {
  return {
    id: ++uid,
    x: 0, y: 0, vx: 0, vy: 0,
    w: opts.w,
    team: opts.team,
    born: G.time,
    fuse: opts.fuse ?? null,
    trail: [],
    smokeT: 0,
    spin: 0,
    dead: false,
    ...opts,
  };
}

/** The muzzle: just outside the Milbil's hand, so nothing detonates on itself. */
export function muzzleOf(m) {
  const a = m.aim;
  return { x: m.x + Math.cos(a) * 26, y: m.y - 22 + Math.sin(a) * 26 };
}

// ---------------------------------------------------------------- firing

export function fire(G, key, { angle, power, target }) {
  const w = WEAPONS[key];
  const m = G.active;
  if (!m) return false;

  if (w.kind === 'hitscan') return hitscan(G, w, m, angle);
  if (w.kind === 'target' && w.utility) return teleport(G, m, target);
  if (w.kind === 'strike') return airstrike(G, w, target);

  const mz = muzzleOf(m);
  const speed = (w.speed ?? 700) * clamp(power, 0.08, 1);

  if (w.kind === 'drop') {
    G.projectiles.push(make(G, {
      w, team: m.team, kind: 'drop',
      x: m.x + m.facing * 16, y: m.y - 14,
      vx: m.facing * 40, vy: -70,
      fuse: w.fuse, owner: m.id,
    }));
    sfx.lob();
    return true;
  }

  if (w.kind === 'target') {                // homing
    G.projectiles.push(make(G, {
      w, team: m.team, kind: 'homing',
      x: mz.x, y: mz.y,
      vx: Math.cos(angle) * speed * 0.55, vy: Math.sin(angle) * speed * 0.55,
      target: { ...target }, owner: m.id,
    }));
    sfx.launch();
    return true;
  }

  G.projectiles.push(make(G, {
    w, team: m.team, kind: 'lob',
    x: mz.x, y: mz.y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    fuse: w.fuse ?? null, owner: m.id,
  }));
  if (w.mega) sfx.mega();
  else if (w.speed >= 900) sfx.launch();
  else sfx.lob();
  return true;
}

/** Scatter gun and Zap Beam: no flight time, so the whole shot resolves now. */
function hitscan(G, w, m, angle) {
  const mz = muzzleOf(m);
  const pellets = w.pellets ?? 1;
  for (let i = 0; i < pellets; i++) {
    const a = angle + (pellets > 1 ? (i - (pellets - 1) / 2) * w.spread * 2 : 0);
    const dx = Math.cos(a), dy = Math.sin(a);
    let hitX = mz.x + dx * w.range, hitY = mz.y + dy * w.range;
    const hits = [];

    for (let t = 8; t < w.range; t += 4) {
      const x = mz.x + dx * t, y = mz.y + dy * t;
      if (G.terrain.solidAt(x, y)) { hitX = x; hitY = y; break; }
      let stop = false;
      for (const o of G.milbils) {
        if (!o.alive || o.id === m.id || hits.includes(o.id)) continue;
        if (dist(x, y, o.x, o.y - 20) < 17) {
          hits.push(o.id);
          if (!w.pierce) { hitX = x; hitY = y; stop = true; }
          G.blast(x, y, w.radius, w.damage, { team: m.team, color: w.color, crater: w.pierce ? 12 : w.radius * 0.5 });
          break;
        }
      }
      if (stop) break;
      if (y > G.waterY) { hitX = x; hitY = y; break; }
    }

    if (w.beam) {
      fx.bolt(mz.x, mz.y, hitX, hitY, w.color, { life: 0.34, width: 4, jag: 0.035 });
      fx.bolt(mz.x, mz.y, hitX, hitY, '#ffffff', { life: 0.22, width: 1.6, jag: 0.02 });
      fx.light(hitX, hitY, 130, w.color, 0.3);
      sfx.beam();
    } else {
      fx.bolt(mz.x, mz.y, hitX, hitY, w.trail, { life: 0.12, width: 2.2, jag: 0.012 });
      sfx.shot();
    }
    fx.spark(mz.x, mz.y, w.color, { n: 8, speed: 260, dir: a, spread: 0.7, life: 0.3, size: 2 });
    if (!hits.length || w.pierce) {
      G.blast(hitX, hitY, w.radius, w.damage, { team: m.team, color: w.color, crater: w.radius * 0.75, quiet: w.beam });
    }
    fx.shake(w.beam ? 5 : 3);
  }
  return true;
}

function teleport(G, m, target) {
  const t = G.terrain;
  let x = clamp(target.x, 24, t.w - 24);
  let y = clamp(target.y, 10, t.h - 10);
  // Drop to whatever is under the chosen point, so you never land inside rock.
  let gy = y;
  while (gy < t.h && !t.solidAt(x, gy)) gy++;
  y = Math.min(gy - 1, G.waterY - 6);

  fx.ring(m.x, m.y - 22, 6, 70, '#7af0ff', { width: 4, life: 0.5 });
  fx.spark(m.x, m.y - 22, '#7af0ff', { n: 26, speed: 260, life: 0.6, size: 2.2, grav: -60 });
  m.x = x;
  m.y = y;
  m.vx = 0;
  m.vy = 0;
  m.grounded = false;
  m.fallFrom = y;
  fx.ring(x, y - 22, 70, 6, '#7af0ff', { width: 4, life: 0.5 });
  fx.spark(x, y - 22, '#ffffff', { n: 22, speed: 200, life: 0.5, size: 2 });
  sfx.pickup();
  return true;
}

function airstrike(G, w, target) {
  const dir = target.x > G.terrain.w / 2 ? -1 : 1;    // fly in from the near edge
  G.plane = {
    x: dir > 0 ? -220 : G.terrain.w + 220,
    y: 80 + Math.random() * 40,
    vx: dir * 680,
    dropped: 0,
    dropAt: target.x,
    bombs: w.bombs,
    w,
    team: G.activeTeam.id,
  };
  sfx.plane();
  return true;
}

// ---------------------------------------------------------------- update

export function update(G, dt) {
  updatePlane(G, dt);

  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const p = G.projectiles[i];
    step(G, p, dt);
    if (p.dead) G.projectiles.splice(i, 1);
  }
}

function updatePlane(G, dt) {
  const pl = G.plane;
  if (!pl) return;
  const prevX = pl.x;
  pl.x += pl.vx * dt;
  fx.puff(pl.x - Math.sign(pl.vx) * 26, pl.y + 4, { n: 1, r: 5, grow: 26, life: 0.9, tint: '150,160,180', rise: 4 });

  // Bombs walk across the target: the middle one lands on the chosen column.
  const spacing = 46 * Math.sign(pl.vx);
  const first = pl.dropAt - spacing * (pl.bombs - 1) / 2;
  while (pl.dropped < pl.bombs) {
    const dropX = first + spacing * pl.dropped;
    const passed = pl.vx > 0 ? prevX <= dropX && pl.x >= dropX : prevX >= dropX && pl.x <= dropX;
    if (!passed) break;
    G.projectiles.push(make(G, {
      w: pl.w, team: pl.team, kind: 'lob',
      x: dropX, y: pl.y + 10,
      vx: pl.vx * 0.25, vy: 60,
      bomb: true,
    }));
    pl.dropped++;
  }

  if (pl.x < -300 || pl.x > G.terrain.w + 300) G.plane = null;
}

function step(G, p, dt) {
  const w = p.w;
  const speed = Math.hypot(p.vx, p.vy);
  const slices = clamp(Math.ceil((speed * dt) / 4), 1, 24);
  const h = dt / slices;

  for (let s = 0; s < slices && !p.dead; s++) {
    if (p.kind === 'homing') {
      const tx = p.target.x - p.x, ty = p.target.y - p.y;
      const td = Math.hypot(tx, ty) || 1;
      const hm = w.homing;
      p.vx += (tx / td) * hm.accel * h;
      p.vy += (ty / td) * hm.accel * h + GRAVITY * (w.gravity ?? 0) * h;
      const v = Math.hypot(p.vx, p.vy);
      if (v > hm.max) { p.vx = (p.vx / v) * hm.max; p.vy = (p.vy / v) * hm.max; }
      if (td < 14) { detonate(G, p, p.x, p.y); return; }
    } else {
      p.vy += GRAVITY * (w.gravity ?? 1) * h;
      p.vx += WIND_ACC * G.wind * (w.wind ?? 0) * h;
    }

    const nx = p.x + p.vx * h;
    const ny = p.y + p.vy * h;

    // --- Milbils. A shot ignores its owner for a moment so point-blank fire
    //     leaves the barrel instead of detonating in the hand.
    const grace = G.time - p.born < 0.09;
    for (const m of G.milbils) {
      if (!m.alive) continue;
      if (grace && m.id === p.owner) continue;
      if (dist(nx, ny, m.x, m.y - 20) < 18) {
        if (w.fuse && (w.bounce ?? 0) > 0) {
          // Live grenades bump off a Milbil rather than sticking to it.
          p.vx = (nx - m.x) * 3.2;
          p.vy = -Math.abs(p.vy) * 0.5 - 60;
          sfx.bounce();
        } else {
          detonate(G, p, nx, ny, m);
          return;
        }
      }
    }

    // --- terrain
    if (G.terrain.solidAt(nx, ny)) {
      if ((w.bounce ?? 0) > 0) {
        const n = G.terrain.normalAt(p.x, p.y, 8);
        const dot = p.vx * n.x + p.vy * n.y;
        p.vx = (p.vx - 2 * dot * n.x) * w.bounce;
        p.vy = (p.vy - 2 * dot * n.y) * w.bounce;
        p.x += n.x * 2.5;
        p.y += n.y * 2.5;
        if (Math.hypot(p.vx, p.vy) > 55) {
          sfx.bounce();
          fx.spark(p.x, p.y, w.color, { n: 4, speed: 90, life: 0.25, size: 1.5 });
        } else {
          // Settled. Sit there and cook.
          p.vx *= 0.3;
          p.vy = 0;
          p.resting = true;
        }
        continue;
      }
      detonate(G, p, nx, ny);
      return;
    }

    p.x = nx;
    p.y = ny;
  }

  // --- fuse, water, edges
  if (p.fuse !== null && p.fuse !== undefined) {
    const before = Math.ceil(p.fuse);
    p.fuse -= dt;
    if (Math.ceil(p.fuse) !== before && p.fuse > 0) sfx.fuse();
    if (p.fuse <= 0) { detonate(G, p, p.x, p.y); return; }
  }
  if (p.y > G.waterY) {
    fx.splash(p.x, G.waterY, G.theme.waterEdge);
    sfx.splash();
    p.dead = true;
    return;
  }
  if (p.x < -400 || p.x > G.terrain.w + 400 || p.y > G.terrain.h + 600) {
    p.dead = true;
    return;
  }

  // --- trail and smoke
  p.spin += dt * 9;
  p.trail.push(p.x, p.y);
  if (p.trail.length > 40) p.trail.splice(0, 2);
  p.smokeT -= dt;
  if (p.smokeT <= 0 && !p.resting) {
    p.smokeT = 0.035;
    fx.puff(p.x, p.y, { n: 1, r: 4, grow: 30, life: 0.9, tint: w.mega ? '90,80,40' : '40,44,54', rise: -14 });
    fx.spark(p.x, p.y, w.trail, { n: 1, speed: 26, life: 0.35, size: 1.5, grav: 20 });
  }
}

export function detonate(G, p, x, y, hitMilbil = null) {
  p.dead = true;
  const w = p.w;

  if (w.cluster) {
    fx.explode(x, y, w.radius, { color: w.color, debris: G.theme.rock[0] });
    G.blast(x, y, w.radius, w.damage, { team: p.team, color: w.color, quiet: true });
    for (let i = 0; i < w.cluster.count; i++) {
      const a = -Math.PI / 2 + (i - (w.cluster.count - 1) / 2) * 0.42 + (Math.random() - 0.5) * 0.18;
      const v = w.cluster.speed * (0.75 + Math.random() * 0.5);
      G.projectiles.push(make(G, {
        w: { ...w, cluster: null, damage: w.cluster.damage, radius: w.cluster.radius, wind: 0.4 },
        team: p.team, kind: 'lob',
        x, y: y - 6,
        vx: Math.cos(a) * v + p.vx * 0.22, vy: Math.sin(a) * v,
        bomblet: true,
      }));
    }
    sfx.boom(0.7);
    return;
  }

  G.blast(x, y, w.radius, w.damage, {
    team: p.team, color: w.color, mega: w.mega, direct: hitMilbil,
  });
}

// ---------------------------------------------------------------- drawing

export function draw(G, ctx) {
  // the plane
  const pl = G.plane;
  if (pl) {
    ctx.save();
    ctx.translate(pl.x, pl.y);
    ctx.scale(Math.sign(pl.vx), 1);
    const body = new Path2D();
    body.moveTo(-34, 0); body.lineTo(18, 0); body.lineTo(30, -5); body.lineTo(16, -9);
    body.lineTo(-24, -9); body.closePath();
    body.moveTo(-6, -9); body.lineTo(-14, -20); body.lineTo(2, -20); body.lineTo(6, -9);
    body.moveTo(-30, -9); body.lineTo(-38, -20); body.lineTo(-26, -20);
    neon(ctx, body, '#ffd75e', 2.4, { glow: 1.1 });
    ctx.restore();
  }

  for (const p of G.projectiles) {
    const w = p.w;
    // trail
    if (p.trail.length > 3) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = w.trail;
      ctx.shadowColor = w.trail;
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0], p.trail[1]);
        for (let i = 2; i < p.trail.length; i += 2) ctx.lineTo(p.trail[i], p.trail[i + 1]);
        ctx.globalAlpha = pass ? 0.75 : 0.22;
        ctx.shadowBlur = pass ? 8 : 24;
        ctx.lineWidth = pass ? 2 : 7;
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    const ang = p.kind === 'lob' && !p.w.fuse ? Math.atan2(p.vy, p.vx) : p.spin;
    ctx.rotate(p.w.fuse ? Math.sin(p.spin) * 0.5 : ang);

    if (w.mega) {
      // The MEGA MILL flies as a little haloed Milbil head, because of course.
      const halo = new Path2D();
      halo.ellipse(0, -16, 15, 5, 0, 0, TAU);
      neon(ctx, halo, '#fff2b8', 2.2, { glow: 1.6 });
      const head = new Path2D();
      head.rect(-11, -10, 22, 21);
      head.moveTo(-6, -3); head.lineTo(-2, -3);
      head.moveTo(3, -4); head.lineTo(8, -4);
      head.moveTo(-7, 5); head.lineTo(7, 4);
      neon(ctx, head, '#ffd75e', 2.6, { glow: 1.5 });
    } else if (w.fuse && w.kind === 'drop') {
      const stick = new Path2D();
      stick.rect(-7, -12, 14, 24);
      neon(ctx, stick, w.color, 2.6, { glow: 1.2 });
      const fuseP = new Path2D();
      fuseP.moveTo(0, -12); fuseP.quadraticCurveTo(6, -20, 1, -24);
      neon(ctx, fuseP, '#ffd75e', 2, { glow: 1.4 });
      fx.spark(p.x, p.y - 24, '#ffd75e', { n: 1, speed: 60, life: 0.25, size: 1.4, grav: -20 });
    } else if (w.fuse) {
      const g = new Path2D();
      g.arc(0, 0, 9, 0, TAU);
      g.moveTo(0, -9); g.lineTo(2, -15);
      neon(ctx, g, w.color, 2.6, { glow: 1.25 });
    } else {
      const r = new Path2D();
      r.moveTo(14, 0); r.lineTo(-6, -6); r.lineTo(-10, 0); r.lineTo(-6, 6); r.closePath();
      neon(ctx, r, w.color, 2.4, { glow: 1.3 });
    }
    ctx.restore();

  }
}
