// ---------- Your save ----------

import { FOODS, CAFE_LEVELS, RIVALS, START_STOCK, MAX_LEVEL, RACE_MINUTES, RACE_DEFAULT } from './data.js';
import { TABLES } from './questions.js';

const KEY = 'milbil-cafe-v1';

export function fresh(){
  return {
    v: 1,
    name: '',
    cash: 0,
    foods: { toast: 1 },            // food id -> level; missing means still locked
    stock: { ...START_STOCK },      // servings on each plate
    cafe: 1,
    rivals: Object.fromEntries(RIVALS.map(r => [r.id, 0])),
    settings: { qmode: 'times', tables: [2, 5, 10], sound: true, mode: 'free', minutes: RACE_DEFAULT, autoServe: false },
    stats: { served: 0, items: 0, earned: 0, right: 0, wrong: 0 },
    boostN: 0,                      // milbils served since the pay boost began
    hints: {},
    records: {},                    // time mode: minutes -> your best { place, cash }
    savedAt: Date.now(),
  };
}

export function load(){
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
  const base = fresh();
  if (!s || s.v !== 1) return base;
  const out = { ...base, ...s,
    settings: { ...base.settings, ...(s.settings || {}) },
    stats: { ...base.stats, ...(s.stats || {}) },
    hints: { ...(s.hints || {}) },
    rivals: { ...base.rivals, ...(s.rivals || {}) } };

  out.cash = Math.max(0, Number(out.cash) || 0);
  out.boostN = Math.max(0, Number(s.boostN) || 0);
  out.cafe = Math.min(CAFE_LEVELS.length, Math.max(1, out.cafe | 0));
  out.foods = {};
  for (const f of FOODS){
    const lvl = s.foods?.[f.id] | 0;
    if (lvl > 0) out.foods[f.id] = Math.min(MAX_LEVEL, lvl);
  }
  out.foods.toast ||= 1;
  out.stock = {};
  for (const id of Object.keys(out.foods)) out.stock[id] = Math.max(0, s.stock?.[id] | 0);
  delete out.used;                  // abilities used to be once-only
  for (const id of Object.keys(out.rivals)) out.rivals[id] = Math.max(0, Number(out.rivals[id]) || 0);
  const t = (out.settings.tables || []).filter(n => TABLES.includes(n));
  out.settings.tables = t.length ? t : [2, 5, 10];
  if (out.settings.mode !== 'time') out.settings.mode = 'free';
  if (!RACE_MINUTES.includes(out.settings.minutes)) out.settings.minutes = RACE_DEFAULT;
  out.records = {};
  for (const m of RACE_MINUTES){
    const r = s.records?.[m];
    if (r && r.place > 0) out.records[m] = { place: r.place | 0, cash: Math.max(0, Number(r.cash) || 0), of: r.of | 0 };
  }
  return out;
}

export function save(s){
  s.savedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function wipe(){ try { localStorage.removeItem(KEY); } catch {} }

