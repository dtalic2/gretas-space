// ---------- How the other milbils play ----------
//
// The same way people play paper.io: step out of your land, walk a loop, and
// come back in to fill it. Every so often each one has a think:
//
//   - Could somebody reach my trail before I get home? Then hurry home.
//   - Is somebody's trail close by? Go and cut it.
//
// The way home is worked out cell by cell so it goes round the milbil's own
// trail, not through it. And every tick it steers, looking a few cells ahead
// so it doesn't walk into its own trail or off the island.

import { world, owner, trail, trailSeq, inside, W, MID, cellAt } from './world.js';
import { RADIUS, SPEED, TURN } from './data.js';

const TAU = Math.PI * 2;
const AROUND = [0, .3, -.3, .6, -.6, .95, -.95, 1.3, -1.3, 1.7, -1.7, 2.2, -2.2, 2.7, -2.7, Math.PI];
const LOOK_DT = .065;          // look ahead in steps of this many seconds (under half a cell)
const LOOK = 6, LOOK_FAR = 10; // this many steps; friendly ones look further for your trail
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const mid = (i) => ({ x: i % W + .5, y: (i / W | 0) + .5 });

export const newBrain = () => ({ going: 'out', wp: [], chase: null, next: 0, homeFor: 0, homeD: 0 });

// Pull a point back onto the island, away from the rim.
function onIsland(q, margin = 4){
  const dx = q.x - MID, dy = q.y - MID, r = Math.hypot(dx, dy), m = RADIUS - margin;
  return r > m ? { x: MID + dx / r * m, y: MID + dy / r * m } : q;
}

const centre = (p) => ({ x: (p.box.x0 + p.box.x1 + 1) / 2, y: (p.box.y0 + p.box.y1 + 1) / 2 });

// The shortest way back to its own land that doesn't cross its own trail:
// a breadth-first search out from where it stands. Returns waypoints and how
// many cells long the way is, or null if it's boxed in. It first tries to
// keep a cell of room from the trail, since a milbil can't turn on the spot.
const seen = new Int32Array(W * W), from = new Int32Array(W * W), queue = new Int32Array(W * W);
let gen = 0;

function hugsTrail(p, i){
  for (const n of [i - 1, i + 1, i - W, i + W, i - W - 1, i - W + 1, i + W - 1, i + W + 1]){
    if (trail[n] === p.id && trailSeq[n] < p.seq - 3) return true;
  }
  return false;
}

function search(p, roomy){
  gen++;
  const start = cellAt(p.x, p.y), sx = start % W, sy = start / W | 0;
  let head = 0, tail = 0;
  queue[tail++] = start; seen[start] = gen; from[start] = -1;
  while (head < tail){
    const i = queue[head++];
    if (owner[i] === p.id){
      const path = [];
      for (let j = i; j !== -1; j = from[j]) path.push(j);
      path.reverse();
      const wp = [];
      for (let k = 3; k < path.length - 1; k += 3) wp.push(mid(path[k]));
      wp.push(mid(i));
      return { wp, length: path.length };
    }
    const x = i % W, y = (i - x) / W;
    if (Math.abs(x - sx) > 48 || Math.abs(y - sy) > 48) continue;
    for (const n of [i - 1, i + 1, i - W, i + W]){
      if (seen[n] === gen || !inside[n] || trail[n] === p.id) continue;
      if (roomy && owner[n] !== p.id && Math.abs(n % W - sx) + Math.abs((n / W | 0) - sy) > 2 && hugsTrail(p, n)) continue;
      seen[n] = gen; from[n] = i; queue[tail++] = n;
    }
  }
  return null;
}

const routeHome = (p) => search(p, true) || search(p, false);

// How near the nearest other milbil is to any of p's trail.
function threat(p){
  let best = Infinity;
  const t = p.trail;
  for (const q of world.players){
    if (q === p || !q.alive) continue;
    for (let k = t.length - 1; k >= 0; k -= 2){
      const i = t[k], dx = i % W + .5 - q.x, dy = (i / W | 0) + .5 - q.y;
      const d = dx * dx + dy * dy;
      if (d < best) best = d;
    }
  }
  return Math.sqrt(best);
}

// The nearest bit of somebody else's trail it could go and cut.
function prey(p, lv){
  let best = null, bd = lv.chase * lv.chase;
  for (const q of world.players){
    if (q === p || !q.alive || !q.trail.length) continue;
    if (q.human && !(p.ai.hunter ??= Math.random() < lv.you)) continue;
    const t = q.trail;
    for (let k = t.length - 1; k >= 0; k -= 2){
      const { x, y } = mid(t[k]);
      const d = (x - p.x) ** 2 + (y - p.y) ** 2;
      if (d < bd){ bd = d; best = { x, y, you: q.human }; }
    }
  }
  return best;
}

// Just stepped out: walk out a way, then across. After that it heads home.
// Mostly it turns towards the middle of the island.
function planLoop(p, lv){
  const ux = Math.cos(p.dir), uy = Math.sin(p.dir);
  let side = (MID - p.x) * -uy + (MID - p.y) * ux >= 0 ? 1 : -1;
  if (Math.random() < .2) side = -side;
  const vx = -uy * side, vy = ux * side;
  const grow = Math.min(2.2, Math.max(1, Math.sqrt(p.cells) / 7));
  const d = rand(...lv.loop) * grow, s = rand(...lv.loop) * grow;
  p.ai.wp = [
    { x: p.x + ux * d, y: p.y + uy * d },
    { x: p.x + ux * d + vx * s, y: p.y + uy * d + vy * s },
  ].map(q => onIsland(q));
}

// At home with nowhere to go: pick a way out, away from the middle of its land.
function planExit(p){
  const c = centre(p);
  let a = Math.hypot(p.x - c.x, p.y - c.y) < 1 ? Math.random() * TAU : Math.atan2(p.y - c.y, p.x - c.x);
  a += rand(-.8, .8);
  const reach = Math.max(p.box.x1 - p.box.x0, p.box.y1 - p.box.y0) / 2 + 4;
  let q = { x: p.x + Math.cos(a) * reach, y: p.y + Math.sin(a) * reach };
  if (Math.hypot(q.x - MID, q.y - MID) > RADIUS - 8){
    a = Math.atan2(MID - p.y, MID - p.x) + rand(-.6, .6);
    q = { x: p.x + Math.cos(a) * reach, y: p.y + Math.sin(a) * reach };
  }
  p.ai.wp = [onIsland(q, 6)];
  p.ai.homeFor = 0;
}

function goHome(p){
  const ai = p.ai, r = routeHome(p);
  ai.going = 'home';
  ai.chase = null;
  ai.wp = r ? r.wp : [centre(p)];
  ai.homeD = r ? r.length * .85 : 99;
}

function think(p, lv){
  const ai = p.ai;
  const out = p.trail.length > 0;
  if (out){
    if (ai.going === 'home'){ goHome(p); return; }      // keep the way home fresh
    const r = routeHome(p);
    if (!r || threat(p) < r.length * .85 * lv.care + 2){ goHome(p); return; }
  }
  const was = ai.chase;
  ai.chase = p.trail.length < 30 ? prey(p, lv) : null;
  if (was && !ai.chase && out) goHome(p);                // it got away, or got caught
}

function target(p){
  const ai = p.ai;
  if (ai.chase) return ai.chase;
  while (ai.wp.length){
    const w = ai.wp[0];
    if ((w.x - p.x) ** 2 + (w.y - p.y) ** 2 > 1.44) return w;
    ai.wp.shift();
  }
  if (p.trail.length) goHome(p);
  else planExit(p);
  return ai.wp[0];
}

// Is it safe to turn this way? Walk the curve the milbil would really take
// (it can't turn on the spot) and check the next few cells along it.
// Friendly milbils also count your trail as in the way.
function clear(p, a, spare){
  const rim = (RADIUS - 1.4) ** 2, most = TURN * LOOK_DT, stride = SPEED * LOOK_DT;
  let x = p.x, y = p.y, dir = p.dir;
  for (let k = 0; k < (spare ? LOOK_FAR : LOOK); k++){
    const d = Math.atan2(Math.sin(a - dir), Math.cos(a - dir));
    dir += d > most ? most : d < -most ? -most : d;
    x += Math.cos(dir) * stride;
    y += Math.sin(dir) * stride;
    const i = cellAt(x, y), t = trail[i];
    if (spare && t && t !== p.id && world.players[t - 1].human) return false;
    if (k >= LOOK) continue;
    if ((x - MID) ** 2 + (y - MID) ** 2 > rim) return false;
    if (t === p.id && trailSeq[i] < p.seq - 2) return false;
  }
  return true;
}

/** Called every tick for each bot: set p.want. */
export function steerBot(p, dt, lv){
  const ai = p.ai;
  const out = p.trail.length > 0;
  if (out && ai.going === 'in'){
    ai.going = 'out';
    planLoop(p, lv);
  } else if (!out && ai.going !== 'in'){
    ai.going = 'in';                 // home again
    ai.wp.length = 0;
    ai.chase = null;
    ai.homeFor = 0;
  }
  if (!out && (ai.homeFor += dt) > 5) planExit(p);
  if (world.time >= ai.next){
    ai.next = world.time + lv.think * rand(.8, 1.2);
    think(p, lv);
  }
  const t = target(p);
  const a = Math.atan2(t.y - p.y, t.x - p.x);
  const spare = lv.spare && !ai.chase?.you;      // unless it's coming for you on purpose
  for (const o of AROUND){
    if (clear(p, a + o, spare)){ p.want = a + o; return; }
  }
  p.want = a;
}
