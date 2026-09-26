// ---------- Saved state ----------
//
// Coins, upgrade levels and the best round survive a reload. The round you are
// *in* does not — losing the tower sends you back to the start of that round, and
// closing the tab sends you back to round 1 with everything you bought intact.

import { UP_ORDER } from './upgrades.js';
import { blankSanctuary, POO_MAX } from './sanctuary.js';
import { TYPES } from './types.js';

const KEY = 'milbil-tower.v1';

function blank() {
  const up = {};
  for (const k of UP_ORDER) up[k] = 0;
  return {
    coins: 0,
    best: 0,           // furthest round cleared
    popped: 0,         // Milbils popped, all time
    up,
    seen: {},          // which variants the player has met, for the field guide
    sanctuary: blankSanctuary(),
    muted: false,
  };
}

export const state = blank();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    state.coins = Math.max(0, s.coins | 0);
    state.best = Math.max(0, s.best | 0);
    state.popped = Math.max(0, s.popped | 0);
    state.muted = !!s.muted;
    state.seen = s.seen && typeof s.seen === 'object' ? s.seen : {};
    // Read levels key by key: an upgrade added in a later version must default
    // to 0 rather than come back undefined out of an old save.
    for (const k of UP_ORDER) state.up[k] = Math.max(0, (s.up && s.up[k]) | 0);

    // The sanctuary is rebuilt field by field: a save from before it existed, or
    // one with a pen of some variant since renamed, must not poison the roster.
    if (s.sanctuary && Array.isArray(s.sanctuary.pens)) {
      const sanc = blankSanctuary();
      sanc.earned = Math.max(0, s.sanctuary.earned | 0);
      sanc.nextName = Math.max(0, s.sanctuary.nextName | 0);
      sanc.frac = Number(s.sanctuary.frac) || 0;
      sanc.lastTick = Number(s.sanctuary.lastTick) || Date.now();
      const num = (v, d) => (Number.isFinite(+v) ? Math.min(1, Math.max(0, +v)) : d);
      for (const pen of s.sanctuary.pens) {
        if (!pen || !TYPES[pen.key]) continue;
        sanc.pens.push({
          key: pen.key,
          name: String(pen.name || 'Milbil').slice(0, 16),
          food: num(pen.food, 1),
          water: num(pen.water, 1),
          poo: Math.min(POO_MAX, Math.max(0, pen.poo | 0)),
          pooT: Math.max(0, Number(pen.pooT) || 0),
          phase: Math.random(),
          since: Number(pen.since) || Date.now(),
        });
      }
      state.sanctuary = sanc;
    }
  } catch {
    /* corrupt or unavailable storage just means a fresh tower */
  }
}

let pending = 0;
export function save() {
  // Coalesce: a busy round can touch state many times a second.
  clearTimeout(pending);
  pending = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  }, 200);
}

