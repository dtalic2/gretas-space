// ---------- The game ----------
//
// The whole loop in one place: Milbils walk on at the far row, hop about the 5x5
// board drifting toward the tower, and you shoot them off it. Anything that hops
// past the near row reaches the tower and costs a shield.
//
// Rendering lives in render.js and reads this module; nothing here touches the
// canvas.

import { N, cellCenter, inBoard } from './board.js';
import { TYPES, buildWave, roundSpeed } from './types.js';
import { towerStats, BEAM_SPREAD } from './upgrades.js';
import { state, save } from './state.js';
import * as fx from './fx.js';
import * as audio from './audio.js';

export const PHASE = { INTRO: 'intro', PLAY: 'play', CLEAR: 'clear', OVER: 'over' };

let uid = 0;

export const game = {
  L: null,
  phase: PHASE.INTRO,
  round: 1,
  milbils: [],
  queue: [],            // variants still waiting to walk on
  spawnT: 0,
  shields: 3,
  deflects: 0,          // Deflector bounces left this round
  charge: 1,            // 0..1, laser readiness
  aim: { x: 0, y: 0 },
  barrel: -Math.PI / 2, // where the turret is actually pointing, eased
  locked: [],           // Milbils currently under the crosshair
  bannerT: 0,
  banner: null,
  roundCoins: 0,
  perfect: true,
  time: 0,
  paused: false,
};

// ---------- geometry helpers ----------

/** Unit vector from the muzzle toward wherever the player is aiming. */
function aimDir() {
  const { muzzle } = game.L;
  let dx = game.aim.x - muzzle.x, dy = game.aim.y - muzzle.y;
  // Never let the barrel point at or below the horizon — there is nothing there.
  if (dy > -8) dy = -8;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

/** Distance along a ray to a circle, or -1 if it misses / is behind the muzzle. */
function rayHit(ox, oy, dx, dy, cx, cy, r) {
  const t = (cx - ox) * dx + (cy - oy) * dy;
  if (t < 0) return -1;
  const px = ox + dx * t, py = oy + dy * t;
  return Math.hypot(px - cx, py - cy) <= r ? t : -1;
}

/** How far the beam runs before it leaves the screen. */
function rayExit(ox, oy, dx, dy, W, H) {
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (W - ox) / dx);
  if (dx < -1e-6) t = Math.min(t, -ox / dx);
  if (dy > 1e-6) t = Math.min(t, (H - oy) / dy);
  if (dy < -1e-6) t = Math.min(t, -oy / dy);
  return Number.isFinite(t) ? t : Math.hypot(W, H);
}

/** Live pixel position of a Milbil, including its hop arc. */
export function posOf(m) {
  const L = game.L;
  const a = cellCenter(L, m.fromCol, m.fromRow);
  const b = cellCenter(L, m.col, m.row);
  const t = m.hopT >= 1 ? 1 : m.hopT * m.hopT * (3 - 2 * m.hopT);   // smoothstep
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t - Math.sin(Math.PI * Math.min(1, m.hopT)) * L.cell * 0.30,
  };
}

export function hitRadius(m) {
  return game.L.cell * m.t.hit;
}

/** Squares that already have a Milbil on them, so nothing stacks up. */
function occupied(except) {
  const set = new Set();
  for (const m of game.milbils) {
    if (m === except || m.dead || m.escaping) continue;
    set.add(m.col + m.row * N);
    if (m.hopT < 1) set.add(m.fromCol + m.fromRow * N);   // reserve the square it left
  }
  return set;
}

// ---------- rounds ----------

export function startRound(n) {
  const S = towerStats(state.up);
  game.round = n;
  game.milbils = [];
  game.queue = buildWave(n);
  game.spawnT = 0;
  game.shields = S.maxShields;
  game.deflects = S.deflects;
  game.charge = 1;
  game.roundCoins = 0;
  game.perfect = true;
  game.phase = PHASE.INTRO;
  game.bannerT = 0;
  game.banner = {
    title: `ROUND ${n}`,
    sub: n === 1 ? '1 Milbil' : `${n} Milbils`,
    boss: game.queue.includes('mega'),
  };
  fx.clear();
  for (const k of game.queue) state.seen[k] = 1;
  save();
}

function clearRound() {
  game.phase = PHASE.CLEAR;
  game.bannerT = 0;

  const bonus = 12 * game.round;
  const perfect = game.perfect ? 25 * game.round : 0;
  state.coins += bonus + perfect;
  state.best = Math.max(state.best, game.round);
  save();

  game.banner = {
    title: 'ROUND CLEAR',
    sub: `+${bonus} clear bonus${perfect ? `  ·  +${perfect} tower untouched` : ''}`,
    good: true,
  };
  audio.roundClear();
}

function gameOver() {
  game.phase = PHASE.OVER;
  game.banner = null;
  audio.gameOver();
  fx.shake(24);
}

// ---------- Milbils ----------

function spawn(key) {
  const t = TYPES[key];
  const occ = occupied(null);
  const free = [];
  for (let c = 0; c < N; c++) if (!occ.has(c + 0 * N)) free.push(c);
  if (!free.length) return false;                     // far row full — wait

  const col = free[(Math.random() * free.length) | 0];
  game.milbils.push({
    id: ++uid,
    key, t,
    col, row: 0, fromCol: col, fromRow: 0,
    hp: t.hp, maxHp: t.hp,
    hopT: 1, hopDur: 0.34,
    rest: (t.hopMs / 1000) * (0.7 + Math.random() * 0.6),
    phase: Math.random(),
    alpha: 1, flash: 0,
    warp: 0,                                          // 0..1 arrival animation
    dodgeCd: 0,
    stun: 0,
    escaping: false,
    dead: false,
    seed: Math.random() * 1000,
    x: 0, y: 0,
  });
  audio.arrive();
  return true;
}

/** Pick the next square. Milbils drift toward the tower but wander a good deal. */
function chooseHop(m) {
  const occ = occupied(m);
  const opts = [];
  const add = (dc, dr, w) => {
    const c = m.col + dc, r = m.row + dr;
    if (dr === 1 && r === N) { opts.push({ c, r, w, escape: true }); return; }  // off the near edge
    if (!inBoard(c, r) || occ.has(c + r * N)) return;
    opts.push({ c, r, w });
  };
  add(0, 1, 42);      // toward the tower
  add(-1, 0, 20);
  add(1, 0, 20);
  add(0, -1, 10);     // back away
  if (!opts.length) return null;

  let total = 0;
  for (const o of opts) total += o.w;
  let r = Math.random() * total;
  for (const o of opts) { r -= o.w; if (r <= 0) return o; }
  return opts[opts.length - 1];
}

function beginHop(m, target) {
  m.fromCol = m.col; m.fromRow = m.row;
  m.col = target.c; m.row = target.r;
  m.hopT = 0;
  m.hopDur = m.t.boss ? 0.46 : 0.32;
  m.escaping = !!target.escape;
}

/** Keep a floating number on screen when its Milbil pops near an edge. */
function floatAt(x, y, text, color, opts) {
  const m = game.L.cell * 0.95;
  fx.floater(Math.max(m, Math.min(game.L.W - m, x)), y, text, color, opts);
}

function damage(m, amount, at, opts = {}) {
  const S = towerStats(state.up);
  m.hp -= amount;
  m.flash = 1;
  const col = `hsl(${(58 + m.t.hue) % 360} 95% 65%)`;
  if (m.hp <= 0) {
    pop(m, opts);
    return true;
  }
  // Anything that survives a zap is frozen stiff for a moment.
  if (S.stunSec) m.stun = Math.max(m.stun, S.stunSec);
  fx.burst(at.x, at.y, col, 9, game.L.cell * 2.0);
  audio.thud();
  return false;
}

/**
 * Chain Zap: a popping Milbil throws a spark at whoever is standing too close.
 *
 * Arcs deal a flat 1 damage and are marked `noChain`, so a chain is exactly one
 * hop deep and a crowded board cannot cascade into itself.
 */
function chainFrom(from) {
  const S = towerStats(state.up);
  if (!S.chain) return;
  const range = game.L.cell * S.chainRange;

  const near = game.milbils
    .filter((o) => !o.dead && o.warp > 0.35)
    .map((o) => ({ o, d: Math.hypot(o.x - from.x, o.y - from.y) }))
    .filter((c) => c.d <= range)
    .sort((a, b) => a.d - b.d)
    .slice(0, S.chain);

  for (const c of near) {
    fx.bolt(from.x, from.y, c.o.x, c.o.y, '#c9a0ff');
    damage(c.o, 1, { x: c.o.x, y: c.o.y }, { noChain: true });
  }
  if (near.length) audio.chain();
}

function pop(m, opts = {}) {
  m.dead = true;
  const p = posOf(m);
  const col = `hsl(${(58 + m.t.hue) % 360} 95% 66%)`;
  state.coins += m.t.coins;
  state.popped++;
  game.roundCoins += m.t.coins;
  fx.popBurst(p.x, p.y, col, game.L.cell);
  floatAt(p.x, p.y - game.L.cell * 0.25, `+${m.t.coins}`, '#ffd75e', { size: m.t.boss ? 34 : 24 });
  fx.shake(m.t.boss ? 16 : 5);
  audio.pop(m.t.boss);
  save();
  if (!opts.noChain) chainFrom(p);
}

/** A Milbil that hopped off the near edge has reached the tower. */
function reachTower(m) {
  // Deflector: throw it back to the far row instead, and charge nothing for it.
  if (game.deflects > 0) {
    const occ = occupied(m);
    const free = [];
    for (let c = 0; c < N; c++) if (!occ.has(c)) free.push(c);
    if (free.length) {
      game.deflects--;
      m.escaping = false;
      m.col = m.fromCol = free[(Math.random() * free.length) | 0];
      m.row = m.fromRow = 0;
      m.hopT = 1;
      m.rest = (m.t.hopMs / 1000) * 1.2;
      m.stun = Math.max(m.stun, 0.5);
      const p = posOf(m);
      fx.burst(game.L.muzzle.x, game.L.muzzle.y - 10, '#5fffa8', 22, 300);
      fx.bolt(game.L.muzzle.x, game.L.muzzle.y - 10, p.x, p.y, '#5fffa8');
      floatAt(game.L.muzzle.x, game.L.muzzle.y - game.L.towerH * 0.7, 'BOUNCED!', '#5fffa8', { size: 26 });
      fx.shake(8);
      audio.deflect();
      return;
    }
  }

  m.dead = true;
  game.shields--;
  game.perfect = false;
  const { muzzle } = game.L;
  fx.burst(muzzle.x, muzzle.y - 10, '#ff4d6d', 30, 340);
  floatAt(muzzle.x, muzzle.y - game.L.towerH * 0.7, 'ZAP!', '#ff4d6d', { size: 30 });
  fx.shake(20);
  audio.zapped();
  if (game.shields <= 0) gameOver();
}

// ---------- shooting ----------

/**
 * Unit directions of every beam the tower fires, centre first.
 *
 * The count is always odd, so however wide the fan gets there is still one beam
 * going exactly where the player aimed — an upgrade must never make aiming worse.
 */
export function beamDirs() {
  const S = towerStats(state.up);
  const base = aimDir();
  const a0 = Math.atan2(base.y, base.x);
  const out = [base];
  for (let i = 1; i <= (S.beams - 1) / 2; i++) {
    for (const sign of [-1, 1]) {
      const a = a0 + sign * i * BEAM_SPREAD;
      out.push({ x: Math.cos(a), y: Math.sin(a) });
    }
  }
  return out;
}

/** Every Milbil one beam would cross, nearest first. */
function beamTargets(d = aimDir()) {
  const S = towerStats(state.up);
  const { muzzle } = game.L;
  const pad = game.L.cell * S.beamHalf;
  const out = [];
  for (const m of game.milbils) {
    if (m.dead || m.warp < 0.35) continue;
    const p = posOf(m);
    const t = rayHit(muzzle.x, muzzle.y, d.x, d.y, p.x, p.y, hitRadius(m) + pad);
    if (t >= 0) out.push({ m, t, p });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

export function fire() {
  if (game.phase !== PHASE.PLAY || game.paused) return false;
  if (game.charge < 1) return false;

  const S = towerStats(state.up);
  const { muzzle, W, H } = game.L;
  game.charge = 0;

  const dirs = beamDirs();
  const bw = Math.max(2.5, game.L.cell * S.beamHalf * 1.1);
  const hitAll = [];

  dirs.forEach((d, i) => {
    const targets = beamTargets(d);
    const taken = targets.slice(0, S.pierce);

    // A beam stops at the last thing it was able to hit, but runs off-screen if
    // it had pierce to spare — that reads as "I missed" rather than "it fizzled".
    let end = rayExit(muzzle.x, muzzle.y, d.x, d.y, W, H);
    if (targets.length > S.pierce && taken.length) end = taken[taken.length - 1].t;

    // Outer beams of a fan are drawn slightly thinner so the aimed one still reads
    // as the main shot.
    const k = i === 0 ? 1 : 0.72;
    fx.beam(muzzle.x, muzzle.y, muzzle.x + d.x * end, muzzle.y + d.y * end, '#7af0ff', bw * k);
    fx.burst(muzzle.x + d.x * 14, muzzle.y + d.y * 14, '#7af0ff', i === 0 ? 8 : 4, 200, 1.2, Math.atan2(d.y, d.x));

    // One Milbil standing where two beams cross must not be charged twice.
    for (const hit of taken) if (!hitAll.some((h) => h.m === hit.m)) hitAll.push(hit);
  });

  fx.shake(2.5);
  audio.laser();

  let popped = 0;
  for (const hit of hitAll) {
    if (hit.m.dead) continue;                    // a chain arc may already have got it
    fx.burst(hit.p.x, hit.p.y, '#ffffff', 10, 240);
    if (damage(hit.m, S.damage, hit.p)) popped++;
  }

  // Lining two or more up in one shot is the skill shot; pay for it.
  if (popped >= 2) {
    const bonus = S.comboCoins * (popped - 1);
    state.coins += bonus;
    game.roundCoins += bonus;
    const mid = hitAll[Math.floor(hitAll.length / 2)].p;
    floatAt(mid.x, mid.y - game.L.cell * 0.7,
      `${popped > 2 ? 'TRIPLE' : 'DOUBLE'}!  +${bonus}`, '#9dff6b', { size: 26, life: 1.4 });
    audio.combo();
    save();
  }
  return true;
}

// ---------- frame ----------

export function update(dt) {
  if (game.paused) return;
  game.time += dt;
  const S = towerStats(state.up);
  const speed = roundSpeed(game.round);

  // turret eases toward the aim rather than snapping — it is a tower, not a mouse
  const d = aimDir();
  const want = Math.atan2(d.y, d.x);
  let diff = want - game.barrel;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  game.barrel += diff * Math.min(1, dt * 18);

  if (game.charge < 1) game.charge = Math.min(1, game.charge + dt / S.cooldown);

  fx.update(dt);

  // ---- banners ----
  if (game.phase === PHASE.INTRO) {
    game.bannerT += dt;
    if (game.bannerT > 1.7) { game.phase = PHASE.PLAY; game.banner = null; }
    return;
  }
  if (game.phase === PHASE.CLEAR) {
    game.bannerT += dt;
    if (game.bannerT > 2.4) startRound(game.round + 1);
    return;
  }
  if (game.phase === PHASE.OVER) return;

  // ---- walk-ons ----
  if (game.queue.length) {
    game.spawnT -= dt;
    if (game.spawnT <= 0) {
      if (spawn(game.queue[0])) game.queue.shift();
      game.spawnT = Math.max(0.42, 1.15 - game.round * 0.03);
    }
  }

  // ---- who is under the crosshair, across every beam of the fan ----
  game.locked = [];
  for (const d of beamDirs()) {
    for (const h of beamTargets(d).slice(0, S.pierce)) {
      if (!game.locked.includes(h.m.id)) game.locked.push(h.m.id);
    }
  }

  // ---- Milbils ----
  for (const m of game.milbils) {
    if (m.dead) continue;

    m.warp = Math.min(1, m.warp + dt / 0.45);
    m.flash = Math.max(0, m.flash - dt * 4.5);
    m.dodgeCd = Math.max(0, m.dodgeCd - dt);

    // Stun Coil: frozen mid-step. Freezing the dance is the tell — a Milbil that
    // has stopped moving is one you know will still be there next shot.
    if (m.stun > 0) {
      m.stun = Math.max(0, m.stun - dt);
      if (Math.random() < dt * 9) fx.burst(m.x, m.y, '#9de8ff', 2, 60);
    } else {
      m.phase = (m.phase + dt * (m.t.boss ? 0.5 : 0.8)) % 1;
    }

    // Blinky spends most of its time nearly invisible, with brief bright peaks.
    // A Tracer Array lifts the floor so it can never quite disappear.
    m.alpha = m.t.fade
      ? S.blinkFloor + (1 - S.blinkFloor) * Math.pow(0.5 + 0.5 * Math.sin(game.time * 2.3 + m.seed), 2.4)
      : 1;

    if (m.hopT < 1) {
      m.hopT = Math.min(1, m.hopT + dt / m.hopDur);
      if (m.hopT >= 1) {
        if (m.escaping) { reachTower(m); continue; }
        m.rest = (m.t.hopMs / 1000) * S.hopScale / speed * (0.75 + Math.random() * 0.5);
      }
    } else if (m.stun <= 0) {
      // Shifty feels the crosshair settle on it and bolts sideways.
      if (m.t.dodge && m.dodgeCd <= 0 && game.locked.includes(m.id)) {
        const occ = occupied(m);
        const side = [[-1, 0], [1, 0], [0, -1]]
          .map(([dc, dr]) => ({ c: m.col + dc, r: m.row + dr }))
          .filter((o) => inBoard(o.c, o.r) && !occ.has(o.c + o.r * N));
        if (side.length) {
          beginHop(m, side[(Math.random() * side.length) | 0]);
          m.dodgeCd = 1.15;
          fx.burst(posOf(m).x, posOf(m).y, '#c9a0ff', 10, 200);
          audio.dodge();
          continue;
        }
      }

      m.rest -= dt;
      if (m.rest <= 0) {
        const target = chooseHop(m);
        if (target) beginHop(m, target);
        else m.rest = 0.5;                       // boxed in — dance on the spot
      }
    }

    const p = posOf(m);
    m.x = p.x; m.y = p.y;
  }

  // ---- sweep the dead, then see if the round is done ----
  if (game.milbils.some((m) => m.dead)) {
    game.milbils = game.milbils.filter((m) => !m.dead);
  }
  if (game.phase === PHASE.PLAY && !game.milbils.length && !game.queue.length) clearRound();
}

/** Live Milbils remaining, including the ones still waiting to walk on. */
export function remaining() {
  return game.milbils.filter((m) => !m.dead).length + game.queue.length;
}
