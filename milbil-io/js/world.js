// ---------- The island: land, trails, filling in, and catching ----------
//
// The island is a grid of cells. Every cell has an owner (0 for nobody) and may
// have someone's trail on it. A milbil walks smoothly, and each time it steps
// into a new cell:
//
//   - If the cell has somebody else's trail on it, that somebody is caught.
//     If it's the milbil's own trail, the milbil is caught.
//   - If the cell is its own land and it has a trail out, the trail and
//     everything the trail closes off become its land.
//   - Otherwise it leaves a trail.
//
// Nothing in here touches the page, so it can be tested on its own.

import { GRID, RADIUS, SPEED, TURN, START_R, SELF_GRACE } from './data.js';

export const W = GRID;
export const MID = W / 2;
const N = W * W;

export const inside = new Uint8Array(N);     // 1 for cells on the island
export const owner = new Uint8Array(N);      // whose land (player id, 0 for nobody)
export const trail = new Uint8Array(N);      // whose trail (player id, 0 for none)
export const trailSeq = new Int32Array(N);   // when it was laid, counted in the owner's own steps
const stamp = new Int32Array(N);             // for filling in: reached from outside on pass `gen`
const stack = new Int32Array(N);
let gen = 0;

export const TOTAL = (() => {
  let n = 0;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++){
    const dx = x + .5 - MID, dy = y + .5 - MID;
    if (dx * dx + dy * dy <= RADIUS * RADIUS){ inside[y * W + x] = 1; n++; }
  }
  return n;
})();

export const world = {
  players: [],      // players[id - 1]
  time: 0,          // seconds of play
  events: [],       // what happened since the page last looked: captures and catches
};

export const pct = (p) => p.cells / TOTAL * 100;
export const cellAt = (x, y) => (y | 0) * W + (x | 0);

/** Start again with an empty island. */
export function reset(){
  owner.fill(0);
  trail.fill(0);
  world.players.length = 0;
  world.events.length = 0;
  world.time = 0;
}

export function addPlayer(opts){
  const p = {
    id: world.players.length + 1, name: 'Milbil', human: false, ...opts,
    alive: false, still: false, x: 0, y: 0, dir: 0, want: 0, cx: -1, cy: -1,
    cells: 0, peak: 0, kills: 0,
    trail: [],      // cells of trail, oldest first
    pts: [],        // where the trail bends, for drawing it smoothly
    seq: 0,
    box: { x0: 0, y0: 0, x1: 0, y1: 0 },   // every cell it owns is inside this
    home: { x: 0, y: 0 },                  // the last place it stood on its own land
    bornAt: 0, diedAt: 0, walk: Math.random() * 6,
  };
  world.players.push(p);
  return p;
}

function setOwner(i, id){
  const old = owner[i];
  if (old === id) return;
  if (old) world.players[old - 1].cells--;
  owner[i] = id;
  if (id){
    const p = world.players[id - 1], b = p.box;
    p.cells++;
    const x = i % W, y = (i - x) / W;
    if (x < b.x0) b.x0 = x; else if (x > b.x1) b.x1 = x;
    if (y < b.y0) b.y0 = y; else if (y > b.y1) b.y1 = y;
  }
}

/** Somewhere to start that's well away from everybody else. */
export function findSpot(){
  let best = null, bestScore = -Infinity;
  for (let k = 0; k < 80; k++){
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (RADIUS - 12);
    const x = Math.floor(MID + Math.cos(a) * r) + .5, y = Math.floor(MID + Math.sin(a) * r) + .5;
    let score = 24;
    for (const q of world.players) if (q.alive) score = Math.min(score, Math.hypot(q.x - x, q.y - y));
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++){
      const i = cellAt(x + dx, y + dy);
      if (owner[i] || trail[i]) score -= 0.5;
    }
    if (score > bestScore){ bestScore = score; best = { x, y }; }
    if (score >= 24) break;
  }
  return best;
}

/** Put a milbil on the island with a little round patch of land. */
export function spawn(p, at = findSpot()){
  p.x = at.x; p.y = at.y;
  p.cx = Math.floor(p.x); p.cy = Math.floor(p.y);
  p.dir = p.want = Math.atan2(MID - p.y, MID - p.x) + (Math.random() - .5) * 2;
  p.alive = true;
  p.trail.length = 0; p.pts.length = 0; p.seq = 0;
  p.cells = 0; p.peak = 0; p.kills = 0;
  p.box = { x0: p.cx, y0: p.cy, x1: p.cx, y1: p.cy };
  p.home = { x: p.x, y: p.y };
  p.bornAt = world.time;
  const r = START_R, r2 = r * r;
  for (let y = Math.floor(p.y - r); y <= Math.ceil(p.y + r); y++){
    for (let x = Math.floor(p.x - r); x <= Math.ceil(p.x + r); x++){
      const dx = x + .5 - p.x, dy = y + .5 - p.y, i = y * W + x;
      if (dx * dx + dy * dy <= r2 && inside[i]) setOwner(i, p.id);
    }
  }
  p.peak = p.cells;
  wipeouts(p);
}

/** Catch a milbil: its trail and its land disappear. */
export function kill(p, by, how){
  if (!p.alive) return;
  p.alive = false;
  for (const i of p.trail) if (trail[i] === p.id) trail[i] = 0;
  p.trail.length = 0; p.pts.length = 0;
  const b = p.box;
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++){
    const i = y * W + x;
    if (owner[i] === p.id) setOwner(i, 0);
  }
  p.diedAt = world.time;
  if (by && by !== p) by.kills++;
  world.events.push({ type: 'die', p, by, how, x: p.x, y: p.y });
}

// Anybody who has just lost the last of their land is out.
function wipeouts(by){
  for (const q of world.players) if (q !== by && q.alive && q.cells <= 0) kill(q, by, 'land');
}

// Back home with a trail out: the trail becomes land, and so does everything
// it closes off. To find what's closed off, flood in from just outside the
// milbil's land; whatever the flood can't reach is surrounded.
function capture(p){
  const id = p.id, before = p.cells;
  for (const i of p.trail){
    if (trail[i] === id) trail[i] = 0;
    setOwner(i, id);
  }
  p.trail.length = 0; p.pts.length = 0;

  const b = p.box;
  const x0 = Math.max(0, b.x0 - 1), y0 = Math.max(0, b.y0 - 1);
  const x1 = Math.min(W - 1, b.x1 + 1), y1 = Math.min(W - 1, b.y1 + 1);
  gen++;
  let sp = 0;
  const seed = (i) => { if (owner[i] !== id && stamp[i] !== gen){ stamp[i] = gen; stack[sp++] = i; } };
  for (let x = x0; x <= x1; x++){ seed(y0 * W + x); seed(y1 * W + x); }
  for (let y = y0; y <= y1; y++){ seed(y * W + x0); seed(y * W + x1); }
  while (sp){
    const i = stack[--sp], x = i % W, y = (i - x) / W;
    if (x > x0) seed(i - 1);
    if (x < x1) seed(i + 1);
    if (y > y0) seed(i - W);
    if (y < y1) seed(i + W);
  }
  for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++){
    const i = y * W + x;
    if (stamp[i] !== gen && owner[i] !== id && inside[i]) setOwner(i, id);
  }
  if (p.cells > p.peak) p.peak = p.cells;
  world.events.push({ type: 'capture', p, cells: p.cells - before });
  wipeouts(p);
}

// Stepping into cell i. Returns false if that got the milbil caught.
function enter(p, i){
  const t = trail[i];
  if (t){
    if (t !== p.id) kill(world.players[t - 1], p, 'cut');
    else if (trailSeq[i] < p.seq - SELF_GRACE){ kill(p, p, 'self'); return false; }
  }
  if (owner[i] === p.id){
    if (p.trail.length) capture(p);
  } else if (trail[i] !== p.id){
    if (!p.trail.length) p.pts.push({ x: p.home.x, y: p.home.y });
    trail[i] = p.id;
    trailSeq[i] = ++p.seq;
    p.trail.push(i);
    p.pts.push({ x: p.x, y: p.y });
  }
  return true;
}

function move(p, dt){
  if (p.still) return;               // you, waiting on your land for your first drag
  let d = p.want - p.dir;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  const most = TURN * dt;
  p.dir += d > most ? most : d < -most ? -most : d;

  const ox = p.x, oy = p.y;
  let nx = ox + Math.cos(p.dir) * SPEED * dt, ny = oy + Math.sin(p.dir) * SPEED * dt;
  // The edge of the island is a wall you slide along.
  const ex = nx - MID, ey = ny - MID, r = Math.hypot(ex, ey), max = RADIUS - 0.8;
  if (r > max){ nx = MID + ex / r * max; ny = MID + ey / r * max; }
  p.x = nx; p.y = ny;
  p.walk += dt * 10;

  const cx = Math.floor(nx), cy = Math.floor(ny);
  if (cx !== p.cx || cy !== p.cy){
    if (cx !== p.cx && cy !== p.cy){
      // Corner to corner: go through the side cell the path crosses first, so
      // a trail never has a diagonal gap that someone could slip through.
      const tx = ((cx > p.cx ? cx : p.cx) - ox) / (nx - ox || 1e-9);
      const ty = ((cy > p.cy ? cy : p.cy) - oy) / (ny - oy || 1e-9);
      const i = tx < ty ? p.cy * W + cx : cy * W + p.cx;
      if (!enter(p, i)) return;
    }
    p.cx = cx; p.cy = cy;
    if (!enter(p, cy * W + cx)) return;
  }
  if (owner[cy * W + cx] === p.id){ p.home.x = p.x; p.home.y = p.y; }
}

// Two milbils walking into each other. One standing on its own land with no
// trail out is safe, and wins. If both have trails out, the smaller one loses.
function bumps(){
  const ps = world.players;
  for (let a = 0; a < ps.length; a++){
    const p = ps[a];
    if (!p.alive) continue;
    for (let b = a + 1; b < ps.length && p.alive; b++){
      const q = ps[b];
      if (!q.alive) continue;
      const dx = p.x - q.x, dy = p.y - q.y;
      if (dx * dx + dy * dy > 0.8) continue;
      const pOut = p.trail.length > 0, qOut = q.trail.length > 0;
      if (!pOut && !qOut) continue;
      if (pOut && qOut){
        const pc = p.cells, qc = q.cells;      // a tie catches both
        if (pc <= qc) kill(p, q, 'bump');
        if (qc <= pc) kill(q, p, 'bump');
      } else if (pOut) kill(p, q, 'bump');
      else kill(q, p, 'bump');
    }
  }
}

/** One tick. `steer(p, dt)` sets where each milbil wants to go. */
export function step(dt, steer){
  world.time += dt;
  for (const p of world.players){
    if (!p.alive) continue;
    steer(p, dt);
    move(p, dt);
  }
  bumps();
}

/** Players still on the island, most land first. */
export function standings(){
  return world.players.filter(p => p.alive).sort((a, b) => b.cells - a.cells || a.id - b.id);
}
