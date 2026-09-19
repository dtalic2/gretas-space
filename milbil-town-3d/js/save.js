// ---------- Persistence, the starting town, and coming back later ----------
import { START_COINS, BARN_START, BARN_STEP, OFFLINE_CAP, MILBIL_NAMES } from './data.js';

const KEY = 'milbiltown.save.v1';

/** The town every new player wakes up in: a barn, a helipad, a home, three fields. */
export function defaultState(){
  const now = Date.now();
  const s = {
    v: 1,
    coins: START_COINS,
    xp: 0,
    level: 1,
    barn: { wheat: 4 },
    barnUps: 0,
    nextUid: 1,
    objs: [],
    orders: [],
    nextOrderAt: now + 8000,
    skipAt: 0,
    step: 0,
    stats: { harvest: 0, made: 0, delivered: 0, built: 0 },
    seenHelp: false,
    muted: false,
    lastSeen: now,
  };

  // Anchored at the min corner of the footprint, in tile coordinates.
  const start = [
    ['barn',    10, 10],
    ['helipad',  5, 10],
    ['cottage',  6,  6],
    ['field',   10,  7],
    ['field',   11,  7],
    ['field',   10,  8],
    ['tree',    13, 12],
    ['tree',     4, 13],
    ['flowers',  9, 12],
  ];
  for (const [type, x, z] of start) s.objs.push(newObj(s, type, x, z));
  return s;
}

/** A fresh object of `type` at tile (x,z). Everything type-specific starts here. */
export function newObj(state, type, x, z){
  const o = { uid: state.nextUid++, type, x, z, born: Date.now() };
  if (type === 'field'){ o.crop = null; o.at = 0; }
  if (type === 'barn' || type === 'helipad'){ o.fixed = true; }
  return o;
}

/** Houses get named residents purely so the info sheet can be charming. */
export function residentsFor(uid, count){
  const out = [];
  for (let i = 0; i < count; i++){
    // Deterministic from the uid so the same milbils live there every session.
    const h = (uid * 2654435761 + i * 40503) >>> 0;
    out.push(MILBIL_NAMES[h % MILBIL_NAMES.length]);
  }
  return out;
}

export function barnMax(state){ return BARN_START + state.barnUps * BARN_STEP; }

export function load(){
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { /* private mode */ }
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch (err){
    console.warn('save was unreadable, starting a fresh town', err);
    return defaultState();
  }
}

/** Shallow-merge onto a fresh state so a save from an older build still boots. */
function migrate(s){
  const base = defaultState();
  const out = { ...base, ...s };
  out.stats = { ...base.stats, ...(s.stats || {}) };
  out.barn = (s.barn && typeof s.barn === 'object') ? { ...s.barn } : {};
  if (!Array.isArray(out.objs) || !out.objs.length) out.objs = base.objs;
  if (!Array.isArray(out.orders)) out.orders = [];
  out.objs = out.objs.filter(o => o && typeof o.type === 'string');
  // Saves from before the helipad have a post balloon doing its job.
  for (const o of out.objs){
    if (o.type === 'balloon' && o.fixed){ o.type = 'helipad'; o.x = Math.max(0, o.x - 1); o.z = Math.max(0, o.z - 1); }
  }
  out.nextUid = Math.max(out.nextUid || 1, ...out.objs.map(o => (o.uid || 0) + 1));
  for (const o of out.objs){
    if (!Array.isArray(o.queue)) delete o.queue;
    if (!Array.isArray(o.ready)) delete o.ready;
  }
  out.coins = Math.max(0, Math.floor(out.coins) || 0);
  out.xp = Math.max(0, Math.floor(out.xp) || 0);
  return out;
}

export function save(state){
  try {
    state.lastSeen = Date.now();
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err){
    console.warn('could not save', err);
  }
}

export function wipe(){
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** How long the player was away, capped so a week off is not an instant win. */
export function awaySeconds(state){
  const away = (Date.now() - (state.lastSeen || Date.now())) / 1000;
  return Math.max(0, Math.min(away, OFFLINE_CAP));
}
