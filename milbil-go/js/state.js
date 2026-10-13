// ---------- Your save, and what everything you own adds up to ----------

import { CROPS, ANIMALS, CHARMS, SPECIES_BY_ID, PLOT_MAX, PLOT_START, REACH_M, LEVEL_XP,
         THIRST_SPEED, DIG_REFUND, CAP_DEAL_OFF, CAP_PLOT_OFF, CAP_SEED_SAVE, CAP_DIG_BACK,
         CAP_LUCK, OFFLINE_CAP_MS } from './data.js';
import { emptyPlot, advance } from './garden.js';

const KEY = 'milbil-go-v1';

export function fresh(){
  return {
    v: 1,
    name: '',
    avatar: 'common',
    coins: 10,
    xp: 0,
    seeds: { carrot: 4 },
    selSeed: 'carrot',
    basket: {},
    plots: Array.from({ length: PLOT_MAX }, emptyPlot),
    plotsOwned: PLOT_START,
    animals: {}, charms: {}, decor: {}, tools: {},
    tree: null,
    dex: {},
    gone: {},           // wild milbils already caught or run off: id -> when they'd have left
    starters: null,     // the three that wait for you on your very first walk
    lastPos: null,
    mode: null,         // 'gps' | 'pad'
    stats: { caught: 0, harvested: 0, earned: 0, walked: 0 },
    settings: { sound: true, buzz: true },
    savedAt: Date.now(),
  };
}

export function load(){
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
  const base = fresh();
  if (!s || s.v !== 1) return base;
  const out = { ...base, ...s,
    stats: { ...base.stats, ...(s.stats || {}) },
    settings: { ...base.settings, ...(s.settings || {}) } };
  // Plots: keep only crops that still exist, and always have PLOT_MAX of them.
  out.plots = Array.from({ length: PLOT_MAX }, (_, i) => {
    const p = s.plots?.[i];
    return p && CROPS[p.crop] ? { ...emptyPlot(), ...p } : emptyPlot();
  });
  for (const bag of ['seeds', 'basket']){
    for (const k of Object.keys(out[bag])) if (!CROPS[k] || !(out[bag][k] > 0)) delete out[bag][k];
  }
  if (!SPECIES_BY_ID[out.avatar]) out.avatar = 'common';
  // Crops kept growing while you were away (up to 8 hours' worth).
  const away = Math.min(OFFLINE_CAP_MS, Math.max(0, Date.now() - (s.savedAt || Date.now())));
  const m = mods(out);
  for (const p of out.plots) advance(p, away, m);
  return out;
}

export function save(s){
  s.savedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function wipe(){ try { localStorage.removeItem(KEY); } catch {} }

/** Every bonus from animals, charms and the milbil you're playing as, summed once. */
export function mods(s){
  const perk = SPECIES_BY_ID[s.avatar]?.perk || {};
  const m = { grow: 1, sell: 1, luck: 0, thirst: THIRST_SPEED, regrow: 1, seedSave: 0, off: 0,
              plotOff: 0, digBack: DIG_REFUND, treeSpeed: 1, treeBatch: 0, water: false,
              reach: REACH_M, catch: 0, coins: 1, xp: 1 };
  const add = (src, n = 1) => {
    m.grow += (src.boost || 0) * n;
    m.sell += (src.value || 0) * n;
    m.luck += (src.luck || 0) * n;
  };
  for (const [id, n] of Object.entries(s.animals)) if (ANIMALS[id]) add(ANIMALS[id], n);
  for (const id of Object.keys(s.charms)){
    const c = CHARMS[id];
    if (!c) continue;
    add(c);
    if (c.thirstEase) m.thirst = Math.max(m.thirst, c.thirstEase);
    m.regrow += c.regrow || 0;
    m.seedSave += c.seedSave || 0;
    m.off += c.dealOff || 0;
    m.plotOff += c.plotOff || 0;
    m.digBack += c.digBack || 0;
    m.treeSpeed += c.treeSpeed || 0;
    m.treeBatch += c.treeBatch || 0;
    if (c.water) m.water = true;
  }
  m.grow += perk.grow || 0;
  m.sell += perk.sell || 0;
  m.luck += perk.luck || 0;
  if (perk.thirst) m.thirst = Math.max(m.thirst, perk.thirst);
  m.seedSave += perk.seedSave || 0;
  m.off += perk.off || 0;
  m.reach += perk.reach || 0;
  m.catch += perk.catch || 0;
  m.coins += perk.coins || 0;
  m.xp += perk.xp || 0;

  m.luck = Math.min(CAP_LUCK, m.luck);
  m.seedSave = Math.min(CAP_SEED_SAVE, m.seedSave);
  m.off = Math.min(CAP_DEAL_OFF, m.off);
  m.plotOff = Math.min(CAP_PLOT_OFF, m.plotOff);
  m.digBack = Math.min(CAP_DIG_BACK, m.digBack);
  return m;
}

export function levelOf(xp){
  let l = 1;
  while (l < LEVEL_XP.length && xp >= LEVEL_XP[l]) l++;
  return l;
}
/** 0..1 through the current level. */
export function levelProgress(xp){
  const l = levelOf(xp);
  if (l >= LEVEL_XP.length) return 1;
  return (xp - LEVEL_XP[l - 1]) / (LEVEL_XP[l] - LEVEL_XP[l - 1]);
}
