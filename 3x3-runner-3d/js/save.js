// ---------- Persistence ----------
// One JSON blob in localStorage. Every access is guarded: private windows and blocked
// storage throw, and the game must still play (it just forgets on reload).

import { MISSION_POOL } from './data.js';

const KEY = 'tt-runner-3d-v1';

export function defaultSave(){
  return {
    coins: 0,
    xp: 0,
    level: 1,
    best: 0,
    bestDistance: 0,
    runs: 0,
    dog: 'milo',
    owned: [],                               // outfit ids
    wear: { hat:null, eyes:null, neck:null, back:null },
    upgrades: { magnet:0, double:0, shield:0, rocket:0 },
    boosts: { headstart:0, startshield:0, revive:0 },
    tables: [2,3,4,5,10],                    // tables selected for practice
    mixed: true,
    missions: { next: 3, active: [0,1,2].map(i => ({ idx:i, progress:0 })), done: 0 },
    daily: { date:null, quests:[], claimedReward:null, loginStreak:0, lastLogin:null },
    totals: { correct:0, asked:0, coins:0, distance:0 },
    rivalsBeaten: [],
    math: null,                              // MathEngine.serialize()
    settings: { sound:true, music:true, quality:'high', voice:true, shake:true },
  };
}

export function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    return merge(defaultSave(), JSON.parse(raw));
  } catch {
    return defaultSave();
  }
}

export function save(state){
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
}

export function reset(){
  try { localStorage.removeItem(KEY); } catch {}
  return defaultSave();
}

// Deep-merge saved data over defaults so new fields appear for old saves.
function merge(base, over){
  if (!over || typeof over !== 'object' || Array.isArray(over)) return over ?? base;
  const out = { ...base };
  for (const k of Object.keys(over)){
    const b = base[k];
    out[k] = (b && typeof b === 'object' && !Array.isArray(b)) ? merge(b, over[k]) : over[k];
  }
  // Guard against a mission pointer past the pool after content changes.
  if (out.missions){
    out.missions.active = (out.missions.active || []).filter(m => MISSION_POOL[m.idx]);
  }
  return out;
}
