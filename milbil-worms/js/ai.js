// ---------- The Milbils on the other side ----------
//
// The CPU solves its shot the same way a person does: guess an arc, watch where
// it lands, adjust. It just does it four hundred times in one frame, against a
// copy of the real projectile integrator — same gravity, same wind, same
// terrain. Which means it is *too* good, so the last thing it does is throw the
// answer away by a few degrees. That deliberate error is the difficulty setting;
// everything else about the search is fixed.
//
// It also plays with a delay on purpose. An instant shot reads as a cheat even
// when it is fair, and watching the turret swing around is half the tension.

import { clamp, dist, angleDiff } from './util.js';
import { WEAPONS } from './weapons.js';
import { GRAVITY, WIND_ACC, muzzleOf } from './projectiles.js';
import { hasAmmo, aliveOf, fireWeapon, selectWeapon, walk, jump, G } from './game.js';

const SKILL = {
  easy:   { angle: 0.10, power: 0.09, think: 1.1 },
  normal: { angle: 0.045, power: 0.05, think: 0.85 },
  tough:  { angle: 0.014, power: 0.02, think: 0.6 },
};

/** Fly a shot and report where it ends up. Coarse on purpose — it is a guess. */
function simulate(w, x, y, angle, power, target, me) {
  const t = G.terrain;
  const dt = 1 / 32;
  const v = (w.speed ?? 700) * power;
  let vx = Math.cos(angle) * v, vy = Math.sin(angle) * v;
  let best = Infinity;
  for (let i = 0; i < 260; i++) {
    vy += GRAVITY * (w.gravity ?? 1) * dt;
    vx += WIND_ACC * G.wind * (w.wind ?? 0) * dt;
    const steps = clamp(Math.ceil((Math.hypot(vx, vy) * dt) / 6), 1, 8);
    for (let s = 0; s < steps; s++) {
      x += (vx * dt) / steps;
      y += (vy * dt) / steps;
      best = Math.min(best, dist(x, y, target.x, target.y));
      if (x < 0 || x > t.w || y > G.waterY) return { x, y, miss: best, drowned: y > G.waterY };
      if (t.solidAt(x, y)) return { x, y, miss: best };
      // A grenade that would clatter into a wall is not a solution; treat first
      // contact as the landing point regardless of bounce. Hitting one of your
      // own on the way is not a solution either — it scores as a bad miss, or
      // the CPU cheerfully rockets its own team-mate in the back.
      for (const m of G.milbils) {
        if (!m.alive || m === me) continue;
        if (dist(x, y, m.x, m.y - 20) < 18) {
          const friendly = m.team === me.team;
          return { x, y, miss: friendly ? best + 600 : 0, hit: m, friendly };
        }
      }
    }
  }
  return { x, y, miss: best, timeout: true };
}

/**
 * Sweep angle and power for the arc that lands closest to the target.
 *
 * The scoring is not just "how close": a shot that lands inside its own blast
 * radius of a team-mate, or of the Milbil firing it, is worse than a miss.
 */
function solve(w, from, target, me, friends) {
  let best = null;
  const blast = (w.radius ?? 60) + 25;
  const powers = [0.32, 0.45, 0.58, 0.7, 0.82, 0.92, 1];
  for (let a = -Math.PI * 0.98; a < -0.02; a += 0.05) {
    for (const p of powers) {
      const r = simulate(w, from.x, from.y, a, p, target, me);
      let score = r.miss;
      if (r.drowned) score += 400;
      for (const f of friends) score += Math.max(0, blast - dist(r.x, r.y, f.x, f.y - 20)) * 2.6;
      score += Math.max(0, blast - dist(r.x, r.y, me.x, me.y - 20)) * 3.2;
      if (!best || score < best.score) best = { angle: a, power: p, score, land: r };
    }
  }
  return best;
}

/** Is one of ours standing in the way of a straight shot? */
function friendInLine(me, from, angle, range) {
  const cx = Math.cos(angle), cy = Math.sin(angle);
  for (const f of aliveOf(me.team)) {
    if (f === me) continue;
    const t = (f.x - from.x) * cx + (f.y - 20 - from.y) * cy;
    if (t < 0 || t > range) continue;
    if (dist(from.x + cx * t, from.y + cy * t, f.x, f.y - 20) < 28) return true;
  }
  return false;
}

function clearAbove(x, y) {
  for (let yy = y - 20; yy > 60; yy -= 8) if (G.terrain.solidAt(x, yy)) return false;
  return true;
}

/** Pick the weapon before solving: what is available shapes what shot to try. */
function chooseWeapon(me, foe, foes) {
  const d = dist(me.x, me.y, foe.x, foe.y);
  const los = !G.terrain.blocked(me.x, me.y - 22, foe.x, foe.y - 20);
  const from = muzzleOf(me);
  const straight = Math.atan2(foe.y - 20 - from.y, foe.x - from.x);
  const clearLine = los && !friendInLine(me, from, straight, d + 40);
  const friendsNearFoe = aliveOf(me.team).some((f) => f !== me && dist(f.x, f.y, foe.x, foe.y) < 150);
  const options = [];

  const add = (key, weight) => { if (hasAmmo(key) && weight > 0) options.push({ key, weight }); };

  add('bazooka', 100);
  add('grenade', d < 420 ? 70 : 18);
  if (clearLine && d < 420) add('shotgun', 120);
  if (clearLine && d < 900) add('zapbeam', 90);
  if (d > 260 && !friendsNearFoe) add('cluster', 55);
  if (!los || d > 700) add('homing', 110);
  if (clearAbove(foe.x, foe.y) && d > 200 && !friendsNearFoe) add('airstrike', 70);
  if (d < 90 && me.hp > 75 && !friendsNearFoe) add('dynamite', 25);

  // Cluster and MEGA are worth more when the other side is bunched up.
  const bunched = foes.filter((f) => dist(f.x, f.y, foe.x, foe.y) < 150).length;
  if (bunched > 1 && !friendsNearFoe) {
    add('cluster', 90 * bunched);
    add('megamill', 60 * bunched);
  }
  if (foes.length === 1 && foe.hp > 80 && !friendsNearFoe) add('megamill', 55);

  let total = 0;
  for (const o of options) total += o.weight;
  let r = Math.random() * total;
  for (const o of options) {
    r -= o.weight;
    if (r <= 0) return o.key;
  }
  return 'bazooka';
}

export function makeAI() {
  return {
    state: 'idle',
    t: 0,
    plan: null,
    walkDir: 0,
    walkT: 0,
    replans: 0,

    reset() {
      this.state = 'idle';
      this.t = 0;
      this.plan = null;
      this.walkDir = 0;
      this.walkT = 0;
      this.replans = 0;
    },

    update(dt) {
      if (G.phase !== 'aim' || !G.active || !G.activeTeam?.cpu) return;
      const me = G.active;
      const skill = SKILL[G.opts.aiSkill] ?? SKILL.normal;
      this.t += dt;

      if (this.state === 'idle') {
        if (this.t < skill.think) return;
        this.think(me, skill);
        return;
      }

      if (this.state === 'walk') {
        this.walkT -= dt;
        walk(me, this.walkDir, dt);
        if (me.grounded && Math.random() < dt * 1.5 && G.terrain.solidAt(me.x + this.walkDir * 16, me.y - 8)) jump(me);
        if (this.walkT <= 0) {
          this.state = 'idle';
          this.t = skill.think * 0.5;
        }
        return;
      }

      if (this.state === 'aim') {
        // Swing the arm around rather than snapping to the answer.
        const d = angleDiff(me.aim, this.plan.angle);
        me.aim += clamp(d, -dt * 2.6, dt * 2.6);
        me.facing = Math.cos(me.aim) >= 0 ? 1 : -1;
        G.power = Math.min(this.plan.power, G.power + dt * 0.9);
        if (Math.abs(d) < 0.03 && G.power >= this.plan.power - 0.01) {
          me.aim = this.plan.angle;
          this.state = 'fire';
          this.t = 0;
        }
        return;
      }

      if (this.state === 'fire') {
        if (this.t < 0.28) return;
        fireWeapon(this.plan.power);
        this.state = 'done';
      }
    },

    think(me, skill) {
      const foes = aliveOf(1 - me.team);
      const friends = aliveOf(me.team).filter((f) => f !== me);
      if (!foes.length) return;

      // Prefer the one that is easiest to finish: closest, weighted by how hurt.
      foes.sort((a, b) =>
        dist(me.x, me.y, a.x, a.y) * (0.4 + a.hp / 140) -
        dist(me.x, me.y, b.x, b.y) * (0.4 + b.hp / 140));
      const foe = foes[0];
      const key = chooseWeapon(me, foe, foes);
      const w = WEAPONS[key];
      selectWeapon(key);
      const target = { x: foe.x, y: foe.y - 18 };

      if (w.kind === 'hitscan') {
        const from = muzzleOf(me);
        this.plan = {
          angle: Math.atan2(target.y - from.y, target.x - from.x) + (Math.random() - 0.5) * skill.angle,
          power: 1,
        };
        this.state = 'aim';
        return;
      }

      if (w.kind === 'strike') {
        G.target = { x: foe.x + (Math.random() - 0.5) * 60 * (skill.angle / 0.045), y: foe.y };
        this.plan = { angle: me.aim, power: 1 };
        this.state = 'fire';
        this.t = 0;
        return;
      }

      if (w.kind === 'target') {                 // homing
        G.target = {
          x: target.x + (Math.random() - 0.5) * 70 * (skill.angle / 0.045),
          y: target.y + (Math.random() - 0.5) * 40,
        };
        this.plan = { angle: Math.atan2(-1, me.facing), power: 0.75 };
        this.state = 'aim';
        return;
      }

      if (w.kind === 'drop') {
        this.plan = { angle: me.aim, power: 0.4 };
        this.state = 'fire';
        this.t = 0;
        return;
      }

      const from = muzzleOf(me);
      const best = solve(w, from, target, me, friends);

      // A hopeless arc usually means something is in the way. Shuffle along and
      // look again — twice, then take the shot regardless.
      if (best.score > 120 && this.replans < 2 && me.grounded) {
        this.replans++;
        this.walkDir = foe.x > me.x ? 1 : -1;
        if (best.land && best.land.x > me.x === this.walkDir > 0 && best.score > 300) this.walkDir *= -1;
        this.walkT = 0.5 + Math.random() * 0.9;
        this.state = 'walk';
        return;
      }

      this.plan = {
        angle: best.angle + (Math.random() - 0.5) * skill.angle * 2,
        power: clamp(best.power + (Math.random() - 0.5) * skill.power * 2, 0.15, 1),
      };
      this.state = 'aim';
    },
  };
}
