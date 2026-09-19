// ---------- The rules: growing, making, ordering, levelling ----------
//
// Nothing in here touches the DOM or three.js. It takes a state object (the
// thing that gets saved) and mutates it, which makes the whole game testable
// and means offline catch-up is the same code as the live tick.

import {
  CROPS, GOODS, ITEMS, BUILD, FIXED, CATALOGUE, CHARACTERS, CHARACTER,
  ORDER_SLOTS, ORDER_GAP, ORDER_SKIP_COOLDOWN,
  fieldCost, barnUpgradeCost, levelForXp, xpForLevel,
} from './data.js';
import { barnMax, newObj } from './save.js';
import { isBuildable } from './island.js';

export const QUEUE_CAP = 4;      // recipes you can line up at one factory

// ------------------------------------------------------------- lookups ----

export const def = (type) => BUILD[type] || FIXED[type] || null;
export const crop = (id) => CROPS.find(c => c.id === id) || null;
export const good = (id) => GOODS.find(g => g.id === id) || null;
export const recipesAt = (type) => GOODS.filter(g => g.at === type);
export const objAt = (state, uid) => state.objs.find(o => o.uid === uid) || null;

export function footprint(o){
  const d = def(o.type);
  return { w: d ? d.w : 1, d: d ? d.d : 1 };
}

// ----------------------------------------------------------------- barn ----

export function barnCount(state){
  let n = 0;
  for (const k in state.barn) n += state.barn[k];
  return n;
}
export const barnSpace = (state) => Math.max(0, barnMax(state) - barnCount(state));

/** Adds what fits and returns how much actually went in. */
export function addItem(state, id, n){
  const fits = Math.min(n, barnSpace(state));
  if (fits > 0) state.barn[id] = (state.barn[id] || 0) + fits;
  return fits;
}

export const hasItem = (state, id, n) => (state.barn[id] || 0) >= n;

export function takeItem(state, id, n){
  if (!hasItem(state, id, n)) return false;
  state.barn[id] -= n;
  if (state.barn[id] <= 0) delete state.barn[id];
  return true;
}

export function hasAll(state, need){
  for (const id in need) if (!hasItem(state, id, need[id])) return false;
  return true;
}

export function upgradeBarn(state){
  const cost = barnUpgradeCost(state.barnUps);
  if (state.coins < cost) return false;
  state.coins -= cost;
  state.barnUps++;
  return true;
}

/** Sell surplus straight out of the barn — the quick way to clear space. */
export function sellItem(state, id, n){
  const it = ITEMS[id];
  if (!it || !takeItem(state, id, n)) return 0;
  const paid = it.sell * n;
  state.coins += paid;
  return paid;
}

// ----------------------------------------------------------- population ----

export function population(state){
  let total = 0, used = 0;
  for (const o of state.objs){
    const d = def(o.type);
    if (!d) continue;
    if (d.gives) total += d.gives;
    if (d.needs) used += d.needs;
  }
  return { total, used, free: total - used };
}

// ------------------------------------------------------------ placement ----

export function tilesOf(o){
  const { w, d } = footprint(o);
  const out = [];
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) out.push([o.x + dx, o.z + dz]);
  return out;
}

/** Tiles taken by something already standing, optionally ignoring one object. */
export function occupied(state, ignoreUid){
  const set = new Set();
  for (const o of state.objs){
    if (o.uid === ignoreUid) continue;
    for (const [ix, iz] of tilesOf(o)) set.add(ix + ',' + iz);
  }
  return set;
}

export function canPlace(state, type, x, z, ignoreUid){
  const d = def(type);
  if (!d) return { ok:false, why:'Unknown building' };
  const taken = occupied(state, ignoreUid);
  for (let dz = 0; dz < d.d; dz++){
    for (let dx = 0; dx < d.w; dx++){
      const ix = x + dx, iz = z + dz;
      if (!isBuildable(ix, iz)) return { ok:false, why:'Too close to the edge — try further in' };
      if (taken.has(ix + ',' + iz)) return { ok:false, why:'Something is already there' };
    }
  }
  return { ok:true };
}

export function countOf(state, type){
  return state.objs.reduce((n, o) => n + (o.type === type ? 1 : 0), 0);
}

export function costOf(state, type){
  if (type === 'field') return fieldCost(countOf(state, 'field'));
  const d = BUILD[type];
  return d ? d.cost : 0;
}

/** Why you may or may not buy this right now — the shop card reads it directly. */
export function buyCheck(state, type){
  const d = BUILD[type];
  if (!d) return { ok:false, why:'Unknown building' };
  if (state.level < d.level) return { ok:false, why:`Unlocks at level ${d.level}` };
  const cost = costOf(state, type);
  if (state.coins < cost) return { ok:false, why:`Costs ${cost} coins` };
  if (d.needs){
    const pop = population(state);
    if (pop.free < d.needs) return { ok:false, why:`Needs ${d.needs} free milbils — build homes` };
  }
  return { ok:true, cost };
}

/** Place a bought building. Returns the new object, or null if the spot is bad. */
export function build(state, type, x, z){
  const check = buyCheck(state, type);
  if (!check.ok) return null;
  if (!canPlace(state, type, x, z).ok) return null;
  state.coins -= check.cost;
  const o = newObj(state, type, x, z);
  state.objs.push(o);
  state.stats.built++;
  const levels = gainXp(state, Math.max(1, Math.round(check.cost / 10)));
  return { obj:o, levels, cost:check.cost };
}

export function moveObj(state, uid, x, z){
  const o = objAt(state, uid);
  if (!o || o.fixed) return false;
  if (!canPlace(state, o.type, x, z, uid).ok) return false;
  o.x = x; o.z = z;
  return true;
}

/** Decor and fields can be sold back for half. Houses would evict milbils, so no. */
export function canSell(o){
  const d = BUILD[o.type];
  return !!d && (d.kind === 'decor' || d.kind === 'field');
}

export function sellObj(state, uid){
  const o = objAt(state, uid);
  if (!o || !canSell(o)) return 0;
  const refund = Math.round(costOf(state, o.type) * 0.5);
  state.objs = state.objs.filter(b => b.uid !== uid);
  state.coins += refund;
  return refund;
}

// ---------------------------------------------------------------- crops ----

export const seedCost = (c) => (c.id === 'wheat' ? 0 : Math.max(1, Math.round(c.sell * 0.3)));

export function plantCheck(state, cropId){
  const c = crop(cropId);
  if (!c) return { ok:false, why:'No such seed' };
  if (state.level < c.level) return { ok:false, why:`Unlocks at level ${c.level}` };
  const cost = seedCost(c);
  if (state.coins < cost) return { ok:false, why:`Seed costs ${cost}` };
  return { ok:true, cost };
}

export function plant(state, o, cropId, now = Date.now()){
  if (o.type !== 'field' || o.crop) return false;
  const check = plantCheck(state, cropId);
  if (!check.ok) return false;
  state.coins -= check.cost;
  o.crop = cropId;
  o.at = now;
  return true;
}

export function cropReadyAt(o){
  const c = o.crop && crop(o.crop);
  return c ? o.at + c.secs * 1000 : 0;
}
export function cropProgress(o, now){
  const c = o.crop && crop(o.crop);
  if (!c) return 0;
  return Math.max(0, Math.min(1, (now - o.at) / (c.secs * 1000)));
}
export const cropReady = (o, now) => !!o.crop && now >= cropReadyAt(o);

/** Returns {id, n, xp} on success, or {full:true} if the barn cannot take it. */
export function harvest(state, o, now = Date.now()){
  if (!cropReady(o, now)) return null;
  const c = crop(o.crop);
  if (barnSpace(state) < c.yield) return { full:true };
  addItem(state, c.id, c.yield);
  o.crop = null;
  o.at = 0;
  state.stats.harvest++;
  const levels = gainXp(state, c.xp);
  return { id:c.id, n:c.yield, xp:c.xp, levels };
}

// ------------------------------------------------------------ factories ----

export function queueCheck(state, o, goodId){
  const g = good(goodId);
  if (!g || g.at !== o.type) return { ok:false, why:'Not made here' };
  if (state.level < g.level) return { ok:false, why:`Unlocks at level ${g.level}` };
  const queued = (o.queue || []).length;
  if (queued >= QUEUE_CAP) return { ok:false, why:'The bench is full' };
  for (const id in g.in){
    if (!hasItem(state, id, g.in[id])) return { ok:false, why:`Needs ${g.in[id]} ${ITEMS[id].name}` };
  }
  return { ok:true };
}

export function queueGood(state, o, goodId, now = Date.now()){
  const check = queueCheck(state, o, goodId);
  if (!check.ok) return false;
  const g = good(goodId);
  for (const id in g.in) takeItem(state, id, g.in[id]);
  o.queue = o.queue || [];
  o.ready = o.ready || [];
  const last = o.queue.length ? o.queue[o.queue.length - 1].endAt : now;
  o.queue.push({ id:g.id, secs:g.secs, endAt: last + g.secs * 1000 });
  return true;
}

/** Cancel the last thing in the line and get the ingredients back. */
export function unqueueLast(state, o){
  if (!o.queue || o.queue.length < 2) return false;      // the head is already cooking
  const item = o.queue.pop();
  const g = good(item.id);
  for (const id in g.in) addItem(state, id, g.in[id]);
  return true;
}

/** Moves anything finished onto the factory's shelf. Same code online and off. */
export function tickFactory(o, now){
  const q = o.queue;
  if (!q || !q.length) return 0;
  o.ready = o.ready || [];
  let made = 0;
  while (q.length && q[0].endAt <= now){
    const head = q.shift();
    o.ready.push(head.id);
    made++;
    if (q.length) q[0].endAt = head.endAt + q[0].secs * 1000;
  }
  return made;
}

export function factoryProgress(o, now){
  if (!o.queue || !o.queue.length) return 0;
  const head = o.queue[0];
  return Math.max(0, Math.min(1, 1 - (head.endAt - now) / (head.secs * 1000)));
}

/** Empty the shelf into the barn. Stops early (and says so) if the barn fills. */
export function collect(state, o){
  if (!o.ready || !o.ready.length) return null;
  const got = {};
  let xp = 0, left = 0;
  const keep = [];
  for (const id of o.ready){
    if (barnSpace(state) < 1){ keep.push(id); left++; continue; }
    addItem(state, id, 1);
    got[id] = (got[id] || 0) + 1;
    xp += good(id).xp;
    state.stats.made++;
  }
  o.ready = keep;
  const levels = gainXp(state, xp);
  return { got, xp, left, levels };
}

// --------------------------------------------------------------- orders ----

/** What a visitor can plausibly ask for: crops you grow, goods you can make. */
export function orderPool(state){
  const pool = [];
  for (const c of CROPS) if (state.level >= c.level) pool.push(c);
  for (const g of GOODS){
    if (state.level < g.level) continue;
    if (state.objs.some(o => o.type === g.at)) pool.push(g);
  }
  return pool;
}

/** Whoever the order is addressed to — old saves have none, so fall back. */
export function characterFor(order){
  return CHARACTER[order && order.who] || CHARACTERS[(order && order.uid || 0) % CHARACTERS.length];
}

/** Prefer a visitor who is not already standing on the pad. */
function pickCharacter(state){
  const here = new Set(state.orders.map(o => o.who));
  const free = CHARACTERS.filter(c => !here.has(c.id));
  const pool = free.length ? free : CHARACTERS;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function rollOrder(state, now = Date.now()){
  const pool = orderPool(state);
  if (!pool.length) return null;
  // Later items are worth more, so a bigger town gets bigger asks.
  const picks = Math.min(pool.length, 1 + (Math.random() < 0.55 ? 1 : 0) + (Math.random() < 0.3 ? 1 : 0));
  const bag = pool.slice();
  const want = [];
  for (let i = 0; i < picks; i++){
    const it = bag.splice(Math.floor(Math.random() * bag.length), 1)[0];
    const max = it.kind === 'good' || it.in ? 3 : 6;
    const n = 1 + Math.floor(Math.random() * max);
    want.push({ id: it.id, n });
  }
  let coins = 0, xp = 0;
  for (const w of want){
    const it = ITEMS[w.id];
    coins += it.sell * w.n;
    xp += it.xp * w.n;
  }
  return {
    uid: state.nextUid++,
    who: pickCharacter(state),
    want,
    coins: Math.max(5, Math.round(coins * 1.65 / 5) * 5),
    xp: Math.max(3, Math.round(xp * 0.55)),
    at: now,
  };
}

export function tickOrders(state, now = Date.now()){
  if (!Array.isArray(state.orders)) state.orders = [];
  let added = 0;
  // Stepping the due time by whole gaps (rather than from `now`) means a night
  // away hands back a full board instead of a single order.
  while (state.orders.length < ORDER_SLOTS && now >= state.nextOrderAt){
    const o = rollOrder(state, now);
    if (!o) break;
    state.orders.push(o);
    added++;
    state.nextOrderAt += ORDER_GAP * 1000;
  }
  // Board full, or the backlog is used up: the next one is a gap from now, so
  // the timer never drifts off into the past.
  if (state.orders.length >= ORDER_SLOTS || state.nextOrderAt < now){
    state.nextOrderAt = now + ORDER_GAP * 1000;
  }
  return added;
}

export const canFill = (state, order) =>
  order.want.every(w => hasItem(state, w.id, w.n));

export function fillOrder(state, orderUid, now = Date.now()){
  const order = state.orders.find(o => o.uid === orderUid);
  if (!order || !canFill(state, order)) return null;
  for (const w of order.want) takeItem(state, w.id, w.n);
  state.coins += order.coins;
  state.orders = state.orders.filter(o => o.uid !== orderUid);
  state.stats.delivered++;
  const levels = gainXp(state, order.xp);
  if (state.orders.length < ORDER_SLOTS){
    state.nextOrderAt = Math.min(state.nextOrderAt, now + ORDER_GAP * 1000);
  }
  return { coins:order.coins, xp:order.xp, levels, who: characterFor(order) };
}

export const skipReadyIn = (state, now) => Math.max(0, (state.skipAt - now) / 1000);

export function skipOrder(state, orderUid, now = Date.now()){
  if (now < state.skipAt) return false;
  const before = state.orders.length;
  state.orders = state.orders.filter(o => o.uid !== orderUid);
  if (state.orders.length === before) return false;
  state.skipAt = now + ORDER_SKIP_COOLDOWN * 1000;
  state.nextOrderAt = Math.min(state.nextOrderAt, now + 6000);
  return true;
}

// ------------------------------------------------------------ levelling ----

export function gainXp(state, n){
  if (!n) return [];
  const before = state.level;
  state.xp += n;
  const after = levelForXp(state.xp);
  const gained = [];
  for (let l = before + 1; l <= after; l++){
    gained.push(l);
    state.coins += 30 * l;                 // a small purse with every level
  }
  state.level = after;
  return gained;
}

export function levelProgress(state){
  const floor = xpForLevel(state.level);
  const next = xpForLevel(state.level + 1);
  return { floor, next, frac: Math.max(0, Math.min(1, (state.xp - floor) / (next - floor))) };
}

// ------------------------------------------------------- the whole tick ----

/** Advance everything that runs on a clock. Used every frame and after a nap. */
export function tick(state, now = Date.now()){
  let made = 0;
  for (const o of state.objs) if (o.queue) made += tickFactory(o, now);
  const orders = tickOrders(state, now);
  return { made, orders };
}

/** What changed while the game was closed — the "welcome back" card reads this. */
export function report(state, now = Date.now()){
  let fields = 0, shelves = 0;
  for (const o of state.objs){
    if (o.type === 'field' && cropReady(o, now)) fields++;
    if (o.ready) shelves += o.ready.length;
  }
  return { fields, shelves, orders: state.orders.length };
}

// ------------------------------------------------------------ objectives --
// A short guided opening. Each step watches the state and steps itself on.

export const STEPS = [
  { text:'Tap a field 🟩 and plant some wheat',
    want:'field', done:(s) => s.objs.some(o => o.type === 'field' && o.crop) },
  { text:'Wait for it to ripen, then tap the field to harvest',
    want:'field', done:(s) => s.stats.harvest >= 1 },
  { text:'Tap the helipad 🚁 and mail an order to a visitor',
    want:'helipad', done:(s) => s.stats.delivered >= 1 },
  { text:'Tap 🛒 Build and put up a Crumb Bakery',
    want:'shop', done:(s) => s.objs.some(o => o.type === 'bakery') },
  { text:'Tap the bakery and bake some bread',
    want:'bakery', done:(s) => s.stats.made >= 1 },
  { text:'Build another cottage 🏡 — more milbils, more work',
    want:'shop', done:(s) => countOf(s, 'cottage') >= 2 },
];

/** Advances the tutorial pointer and returns the line to show, or null when done. */
export function objective(state){
  while (state.step < STEPS.length && STEPS[state.step].done(state)) state.step++;
  return state.step < STEPS.length ? STEPS[state.step] : null;
}
