// ---------- Persistence, the starting hotel, and coming back later ----------
import { START_COINS, CHARACTERS, CHARACTER } from './data.js';

const KEY = 'milbilhotel.save.v1';

export function defaultState(){
  const now = Date.now();
  return {
    v: 1,
    created: now,
    lastSeen: now,
    coins: START_COINS,
    xp: 0,
    level: 1,
    floors: 2,                       // the lobby floor and one above it
    rooms: {
      '0:2': { type:'cosy', st:'free' },
      '1:0': { type:'cosy', st:'free' },
    },
    extras: {},
    lobbyUps: 0,
    keepers: 0,
    lobby: [],
    nextArrival: now + 2500,
    uid: 1,
    stats: { checkins:0, collected:0, tidied:0, earned:0, walked:0, vip:{} },
    muted: false,
    introSeen: false,
  };
}

/** Shallow-merge onto a fresh state so a save from an older build still boots. */
function migrate(s){
  const base = defaultState();
  const out = { ...base, ...s };
  out.stats = { ...base.stats, ...(s.stats || {}) };
  out.stats.vip = { ...(s.stats && s.stats.vip || {}) };
  out.rooms = (s.rooms && typeof s.rooms === 'object') ? s.rooms : base.rooms;
  out.extras = (s.extras && typeof s.extras === 'object') ? s.extras : {};
  out.lobby = Array.isArray(s.lobby) ? s.lobby.filter(g => g && g.uid) : [];
  // Older hotels had round milbil guests. Every guest is a drawn character now.
  for (const g of [...out.lobby, ...Object.values(out.rooms).map(r => r && r.guest).filter(Boolean)]){
    if (!g.who || !CHARACTER[g.who]){
      const c = CHARACTERS[g.uid % CHARACTERS.length];
      g.who = c.id; g.name = c.name; delete g.color;
    }
  }
  out.coins = Math.max(0, Math.floor(out.coins) || 0);
  out.xp = Math.max(0, Math.floor(out.xp) || 0);
  out.floors = Math.max(2, Math.floor(out.floors) || 2);
  return out;
}

export function load(){
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { /* private mode */ }
  if (!raw) return defaultState();
  try {
    return migrate(JSON.parse(raw));
  } catch (err){
    console.warn('save was unreadable, starting a fresh hotel', err);
    return defaultState();
  }
}

export function save(state){
  try {
    state.lastSeen = Date.now();
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (err){
    console.warn('could not save', err);
    return false;
  }
}

/** Can this page actually keep a save? Private windows sometimes say yes and don't. */
export function storageWorks(){
  try {
    localStorage.setItem(KEY + '.probe', '1');
    const ok = localStorage.getItem(KEY + '.probe') === '1';
    localStorage.removeItem(KEY + '.probe');
    return ok;
  } catch {
    return false;
  }
}

/** The whole hotel as text, for a file or the clipboard. */
export function exportText(state){
  return JSON.stringify({ ...state, lastSeen: Date.now(), game:'milbil-hotel' }, null, 1);
}

/** Take a hotel back in. Throws something readable if the text is not a save. */
export function importText(text){
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new Error('That is not a save file — the text is not readable.'); }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.rooms !== 'object' || typeof parsed.coins !== 'number'){
    throw new Error('That file is not a Milbil Hotel save.');
  }
  const state = migrate(parsed);
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { throw new Error('This page is not allowed to save — try a normal browser tab.'); }
  return state;
}

export function wipe(){
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
