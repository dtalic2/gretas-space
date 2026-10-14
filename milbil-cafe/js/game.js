// ---------- The running game: your save, timers, and a little event bus ----------

import { FOODS, FOOD_BY_ID, CAFE_LEVELS, MAX_LEVEL } from './data.js';
import { load, save, wipe } from './state.js';

export const G = {
  s: load(),
  happyUntil: 0,       // Happy Customers runs until this time (performance.now())
  rivalOff: {},        // rival id -> { until, why: 'trash' | 'inspect' }
  rate: 0,             // what you've been earning per second lately
  earnedThisSec: 0,
  wiped: false,
};

const subs = {};
export const on = (ev, fn) => { (subs[ev] ||= []).push(fn); };
export const emit = (ev, data) => { for (const fn of subs[ev] || []) fn(data); };

export const cafeName = () => G.s.name ? `${G.s.name}'s Café` : 'Milbil Café';
export const cafeLevel = () => CAFE_LEVELS[G.s.cafe - 1];
export const happy = () => performance.now() < G.happyUntil;

/** Foods on your menu, in menu order. */
export const menu = () => FOODS.filter(f => G.s.foods[f.id]);
/** The next food you could unlock, if any. */
export const nextLocked = () => FOODS.find(f => !G.s.foods[f.id]);

/** One serving's price right now, café bonus included (but not Happy Customers). */
export function priceOf(id, level = G.s.foods[id]){
  if (!level) return 0;
  return Math.round(FOOD_BY_ID[id].prices[level - 1] * cafeLevel().mult);
}

/** Money from serving milbils: counts toward your earning pace. */
export function earn(n){
  G.s.cash += n;
  G.s.stats.earned += n;
  G.earnedThisSec += n;
  emit('cash', n);
}
/** Money from anywhere else (abilities). */
export function addCash(n){
  G.s.cash += n;
  emit('cash', n);
}
export function spend(n){
  if (G.s.cash < n) return false;
  G.s.cash -= n;
  emit('cash', -n);
  return true;
}

export function addStock(n){
  for (const f of menu()) G.s.stock[f.id] = (G.s.stock[f.id] || 0) + n;
  emit('stock');
}
export const totalStock = () => menu().reduce((t, f) => t + (G.s.stock[f.id] || 0), 0);

export const canUpgrade = (id) => (G.s.foods[id] || 0) < MAX_LEVEL;

export function persist(){ if (!G.wiped) save(G.s); }

/** Throw the save away and start again (the reload must not save it back). */
export function startOver(){
  G.wiped = true;
  wipe();
  location.reload();
}
