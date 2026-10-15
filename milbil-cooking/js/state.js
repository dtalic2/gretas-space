// ---------- Your restaurant, saved ----------
//
// Everything that lasts between visits lives in S and is saved to
// localStorage. Customers in the room don't: after a reload the doors open
// again and new ones come in.

import { START_COINS, START_TABLES, START_DISHES, PLACES, PLACE, DISHES, DISH, TABLE_COSTS, MACHINE_COSTS, tableCost } from './data.js';

const KEY = 'milbil-cooking-v1';

const fresh = () => ({
  started: false,
  name: '',
  color: '#ff6fa5',
  coins: START_COINS,
  place: 'cafe',        // the restaurant you're in
  places: ['cafe'],     // the ones you own
  dishes: [...START_DISHES],
  tables: START_TABLES,
  machines: 0,
  served: 0,
  earned: 0,
  perfect: {},          // dish id -> how many you've served
  sound: true,
  sign: { name: '', font: 'rounded', color: 'white', bg: 'accent' },
});

export const S = fresh();

export function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(S, fresh(), JSON.parse(raw));
  } catch {}
  // Saves from before you bought food and restaurants one at a time had a
  // "tier" and the dishes that came with it.
  if (S.tier){
    const old = ['cafe', 'bistro', 'family', 'diner', 'palace'].slice(0, Math.min(5, S.tier | 0));
    const oldMenu = [['nachos', 'jamtoast', 'fruitsalad', 'smoothie'], ['pancakes', 'hotchoc', 'salad', 'hotdog'],
      ['burger', 'spaghetti', 'tacos', 'sundae'], ['pizza', 'friedrice', 'milkshake', 'waffles'],
      ['cake', 'ramen', 'curry', 'tart']].slice(0, old.length).flat();
    S.places = old;
    S.place = old[old.length - 1];
    S.dishes = [...START_DISHES, ...oldMenu];
    delete S.tier;
  }
  S.places = [...new Set(['cafe', ...(Array.isArray(S.places) ? S.places : [])])].filter(id => PLACE[id]);
  if (!S.places.includes(S.place)) S.place = 'cafe';
  S.dishes = [...new Set([...START_DISHES, ...(Array.isArray(S.dishes) ? S.dishes : [])])].filter(id => DISH[id]);
  S.tables = Math.min(Math.max(START_TABLES, S.tables | 0), START_TABLES + TABLE_COSTS.length);
  S.machines = Math.min(Math.max(0, S.machines | 0), MACHINE_COSTS.length);
  S.coins = Math.max(0, Math.round(Number(S.coins) || 0));
  S.sign = { ...fresh().sign, ...(S.sign && typeof S.sign === 'object' ? S.sign : {}) };
}

export function save(){
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
}

export function wipe(){
  const keep = { name: S.name, color: S.color, sound: S.sound, sign: S.sign };
  Object.assign(S, fresh(), keep, { started: true });
  save();
}

// ------------------------------------------------------------- helpers ---

export const place = () => PLACE[S.place] || PLACES[0];
export const owns = (placeId) => S.places.includes(placeId);
export const hasDish = (dishId) => S.dishes.includes(dishId);
/** The dishes on your menu, cheapest first. */
export const menu = () => DISHES.filter(d => S.dishes.includes(d.id));

/** What the next table costs, or null if this restaurant has no more room. */
export const nextTableCost = () => S.tables < place().maxTables ? tableCost(S.tables) : null;
export const nextMachineCost = () => MACHINE_COSTS[S.machines] ?? null;
/** Tables showing in the restaurant you're in. */
export const tablesHere = () => Math.min(S.tables, place().maxTables);

export function spend(n){
  if (S.coins < n) return false;
  S.coins -= n;
  save();
  return true;
}

export function earn(n){
  S.coins += n;
  S.earned += n;
  save();
}

export const fmt = (n) => Math.round(n).toLocaleString('en-GB');
