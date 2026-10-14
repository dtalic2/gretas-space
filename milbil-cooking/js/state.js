// ---------- Your restaurant, saved ----------
//
// Everything that lasts between visits lives in S and is saved to
// localStorage. Customers in the room don't: after a reload the doors open
// again and new ones come in.

import { START_COINS, START_TABLES, TIERS, DISHES, TABLE_COSTS, MACHINE_COSTS, tableCost } from './data.js';

const KEY = 'milbil-cooking-v1';

const fresh = () => ({
  started: false,
  name: '',
  color: '#ff6fa5',
  coins: START_COINS,
  tier: 1,
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
  S.tier = Math.min(Math.max(1, S.tier | 0), TIERS.length);
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

export const tier = () => TIERS[S.tier - 1];
export const nextTier = () => TIERS[S.tier] || null;
export const menu = () => DISHES.filter(d => d.tier <= S.tier);

/** What the next table costs, or null if the restaurant is full. */
export const nextTableCost = () => S.tables < tier().maxTables ? tableCost(S.tables) : null;
export const nextMachineCost = () => MACHINE_COSTS[S.machines] ?? null;

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
