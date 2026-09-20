// ---------- Persistence, the starting town, and coming back later ----------
import { START_COINS, BARN_START, BARN_STEP, OFFLINE_CAP, MILBIL_NAMES, BUILD } from './data.js';

// Where a town is kept. `LEGACY` is the single-save key every build before
// this one used: a game may be part-played under it right now, in somebody's
// browser, so it is read once, copied into a slot, and then left alone forever
// as a backup. Nothing in here ever writes to it or deletes it.
const LEGACY = 'milbiltown.save.v1';
const INDEX = 'milbiltown.towns.v1';
export const SLOTS = 3;
const slotKey = (n) => `milbiltown.town.${n}`;

function readJSON(key){
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key, value){
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** The card shown for a town in the picker. */
function metaOf(state){
  if (!state) return null;
  let pop = 0;
  for (const o of state.objs || []){
    const d = BUILD[o.type];
    if (d && d.gives) pop += d.gives;
  }
  return {
    level: state.level || 1,
    coins: Math.floor(state.coins || 0),
    pop,
    buildings: (state.objs || []).length,
    savedAt: state.lastSeen || 0,
  };
}

/**
 * The list of towns and which one is being played. Creating it is also the one
 * moment the old single save is adopted — copied into town 1, original intact.
 */
export function index(){
  let idx = readJSON(INDEX);
  if (!idx || typeof idx !== 'object' || typeof idx.towns !== 'object'){
    idx = { active: 1, towns: {} };
    const legacy = localStorage.getItem(LEGACY);
    if (legacy && !localStorage.getItem(slotKey(1))){
      try {
        localStorage.setItem(slotKey(1), legacy);      // the game in progress
        idx.towns[1] = { name: 'My town', adopted: true };
      } catch { /* storage refused; the legacy save is still where it was */ }
    }
    writeJSON(INDEX, idx);
  }
  if (!idx.towns) idx.towns = {};
  if (!idx.active || idx.active < 1 || idx.active > SLOTS) idx.active = 1;
  return idx;
}

export const activeSlot = () => index().active;

export function townName(n){
  const idx = index();
  return (idx.towns[n] && idx.towns[n].name) || `Town ${n}`;
}

/** Every slot, filled or not, for the picker. */
export function listTowns(){
  const idx = index();
  const out = [];
  for (let n = 1; n <= SLOTS; n++){
    const state = readJSON(slotKey(n));
    out.push({
      slot: n,
      name: townName(n),
      active: n === idx.active,
      empty: !state,
      meta: metaOf(state),
    });
  }
  return out;
}

/** The pre-slots save, if one is still sitting there. Read-only, always. */
export function backupTown(){
  const state = readJSON(LEGACY);
  return state ? { meta: metaOf(state), text: localStorage.getItem(LEGACY) } : null;
}

export function setActive(n){
  const idx = index();
  idx.active = Math.max(1, Math.min(SLOTS, n));
  return writeJSON(INDEX, idx);
}

export function renameTown(n, name){
  const idx = index();
  idx.towns[n] = { ...(idx.towns[n] || {}), name: String(name).slice(0, 24) };
  return writeJSON(INDEX, idx);
}

/** Empty one slot. The active town cannot be deleted out from under you. */
export function deleteTown(n){
  const idx = index();
  if (n === idx.active) return false;
  try { localStorage.removeItem(slotKey(n)); } catch { return false; }
  delete idx.towns[n];
  return writeJSON(INDEX, idx);
}

/** Text of any town, active or not — used by the per-town file button. */
export function townText(n){
  return localStorage.getItem(slotKey(n));
}

/** Drop a saved town into a slot. Refuses to land on one that is not empty. */
export function putTown(n, text){
  if (localStorage.getItem(slotKey(n))) return false;
  try {
    localStorage.setItem(slotKey(n), text);
  } catch {
    return false;
  }
  const idx = index();
  idx.towns[n] = { ...(idx.towns[n] || {}), name: townName(n) };
  return writeJSON(INDEX, idx);
}

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
  try { raw = localStorage.getItem(slotKey(activeSlot())); } catch { /* private mode */ }
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
    const idx = index();
    localStorage.setItem(slotKey(idx.active), JSON.stringify(state));
    // Keep the card in the picker honest without reading the whole town back.
    idx.towns[idx.active] = { ...(idx.towns[idx.active] || {}), name: townName(idx.active) };
    writeJSON(INDEX, idx);
  } catch (err){
    console.warn('could not save', err);
  }
}

/** Can this page actually keep a save? Private windows and some embedded
 *  viewers say yes to localStorage and then quietly drop everything. */
export function storageWorks(){
  try {
    localStorage.setItem(INDEX + '.probe', '1');
    const ok = localStorage.getItem(INDEX + '.probe') === '1';
    localStorage.removeItem(INDEX + '.probe');
    return ok;
  } catch {
    return false;
  }
}

/** The whole town as text, for a file or the clipboard. */
export function exportText(state){
  return JSON.stringify({ ...state, lastSeen: Date.now() }, null, 1);
}

/**
 * Take a town back in. Throws with something readable if the text is not a
 * save, so a mistyped paste says so instead of wiping the island.
 */
export function importText(text){
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That is not a save file — the text is not readable.');
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.objs) || typeof parsed.coins !== 'number'){
    throw new Error('That file is not a Milbil Town save.');
  }
  const state = migrate(parsed);
  try {
    localStorage.setItem(slotKey(activeSlot()), JSON.stringify(state));
  } catch {
    throw new Error('This page is not allowed to save — try a normal browser tab.');
  }
  return state;
}

/** Start the active town over. Other towns, and the backup, are untouched. */
export function wipe(){
  try { localStorage.removeItem(slotKey(activeSlot())); } catch { /* ignore */ }
}

/** How long the player was away, capped so a week off is not an instant win. */
export function awaySeconds(state){
  const away = (Date.now() - (state.lastSeen || Date.now())) / 1000;
  return Math.max(0, Math.min(away, OFFLINE_CAP));
}
