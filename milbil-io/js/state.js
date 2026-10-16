// ---------- Your save: who you play as, your settings and your bests ----------

import { ROSTER_BY_ID, LEVELS } from './data.js';

const KEY = 'milbil-io-v1';

const fresh = () => ({
  v: 1,
  name: '',
  pick: 'chomp',          // which milbil you play as
  level: 'friendly',      // how the other milbils play
  sound: true,
  best: 0,                // most land you've ever had, in % of the island
  bestKills: 0,           // most milbils caught in one game
  bestPlace: 0,           // highest place on the leaderboard (1 is first)
  games: 0,
});

function load(){
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
  const out = { ...fresh(), ...(s && s.v === 1 ? s : {}) };
  out.name = String(out.name || '').slice(0, 12);
  if (!ROSTER_BY_ID[out.pick]) out.pick = 'chomp';
  if (!LEVELS[out.level]) out.level = 'friendly';
  out.sound = out.sound !== false;
  out.best = Math.max(0, Math.min(100, Number(out.best) || 0));
  out.bestKills = Math.max(0, out.bestKills | 0);
  out.bestPlace = Math.max(0, out.bestPlace | 0);
  out.games = Math.max(0, out.games | 0);
  return out;
}

export const S = load();

export function save(){
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
}
