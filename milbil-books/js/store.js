// ---------- Where the books are kept ----------
//
// Books go into IndexedDB, the browser's own database. localStorage is shared
// between every game on dtalic2.github.io and only holds about five megabytes
// between all of them; a few books with drawings in could fill it. IndexedDB
// has room for thousands.
//
// If IndexedDB will not open (some private-browsing windows refuse it, and
// Safari can be slow to wake it up), books fall back to localStorage, and if
// that is full too they live in memory for as long as the tab is open — and
// the game says so rather than pretending.
//
// Wherever a book was put, it is looked for: loading gathers books from the
// database, localStorage and memory, the newest copy of each wins, and
// whatever is outside the database goes into it as soon as the database is
// open — even if that's a while after the game stopped waiting for it. So a
// day when Safari's database was slow never strands a book where the next
// day's game doesn't look.
//
// Soundtracks — recordings of somebody reading a book out loud — and the
// voices recorded onto bubbles are in a second database of their own,
// `milbil-books-sounds`, so that saving a book (which happens every few
// seconds while you make it) never has to carry the sound along with it. A
// separate database also means adding it never had to upgrade the first one,
// which a second open tab can block.
//
// The little settings object (your name, sound, which tab, the last text
// styles you picked) is in localStorage under `milbil-books-v1`.

import { isStyle } from './styles.js';

const DB_NAME = 'milbil-books';
const STORE = 'books';
const SETTINGS_KEY = 'milbil-books-v1';
const FALLBACK_KEY = 'milbil-books-v1-books';
const PATIENCE = 8000;       // ms to wait for the database before getting on without it (for now)

let db = null;
let mode = 'idb';            // 'idb' | 'local' | 'memory'
const memory = new Map();
let late = null;             // what to do if the database opens after the game stopped waiting

export const storageMode = () => mode;

/** If the database turns up late, `fn` is called once its books can be loaded. */
export const onLateOpen = (fn) => { late = fn; };

function openDb(){
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no IndexedDB'));
    let req;
    try { req = indexedDB.open(DB_NAME, 1); } catch (e){ return reject(e); }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => {
      // If a newer version of the game ever needs to change the database, step
      // aside for it rather than leave it waiting on this tab.
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

function run(kind, fn){
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, kind);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('aborted'));
  });
}

const canLocal = () => {
  try { localStorage.setItem('milbil-books-probe', '1'); localStorage.removeItem('milbil-books-probe'); return true; }
  catch { return false; }
};

// Ask the browser not to clear the books out when it is short of space.
const persist = () => { try { navigator.storage?.persist?.()?.catch?.(() => {}); } catch {} };

export async function openStore(){
  const opening = openDb();
  const gaveUp = new Promise(r => setTimeout(() => r(null), PATIENCE));
  try { db = await Promise.race([opening, gaveUp]); } catch { db = null; }
  if (db){ mode = 'idb'; persist(); return; }
  mode = canLocal() ? 'local' : 'memory';
  // It might still open. If it does, it's used from then on, and the books
  // saved anywhere else meanwhile go into it.
  opening.then(async (got) => {
    db = got;
    mode = 'idb';
    persist();
    try { await late?.(); } catch {}
  }, () => {});
}

function readLocal(){
  try { return JSON.parse(localStorage.getItem(FALLBACK_KEY) || '{}') || {}; } catch { return {}; }
}

/**
 * Every book, wherever it was kept: the database, localStorage (from a day
 * when the database wouldn't open) and memory. If the same book is in more
 * than one place, the newest copy wins — and any that aren't in the database
 * yet go into it now, if it's open.
 */
export async function loadBooks(){
  const found = new Map();
  const keep = (b) => {
    if (!b || typeof b !== 'object' || typeof b.id !== 'string') return;
    const had = found.get(b.id);
    if (!had || (Number(b.updated) || 0) > (Number(had.updated) || 0)) found.set(b.id, b);
  };
  if (mode === 'idb'){
    try { ((await run('readonly', s => s.getAll())) || []).forEach(keep); }
    catch { mode = canLocal() ? 'local' : 'memory'; }
  }
  Object.values(readLocal()).forEach(keep);
  memory.forEach(keep);
  if (mode === 'idb') await rescue();
  return [...found.values()];
}

/**
 * Books kept outside the database — in localStorage, or in memory — go into
 * it, unless it already has a newer copy, and then stop being kept outside it.
 */
async function rescue(){
  const local = readLocal();
  const outside = [...Object.values(local), ...memory.values()];
  for (const b of outside){
    if (!b || typeof b.id !== 'string') continue;
    try {
      const inside = await run('readonly', s => s.get(b.id));
      if (!inside || (Number(b.updated) || 0) > (Number(inside.updated) || 0)) await run('readwrite', s => s.put(b));
      delete local[b.id];
      memory.delete(b.id);
    } catch { break; }
  }
  try {
    if (Object.keys(local).length) localStorage.setItem(FALLBACK_KEY, JSON.stringify(local));
    else localStorage.removeItem(FALLBACK_KEY);
  } catch {}
}

/** Save one book. Resolves true if it is safely stored, false if only in memory. */
export async function putBook(book){
  const copy = JSON.parse(JSON.stringify(book));
  if (mode === 'idb'){
    try { await run('readwrite', s => s.put(copy)); return true; }
    catch { mode = canLocal() ? 'local' : 'memory'; }
  }
  if (mode === 'local'){
    const all = readLocal();
    all[book.id] = copy;
    try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(all)); return true; }
    catch { mode = 'memory'; }
  }
  memory.set(book.id, copy);
  return false;
}

/** Throw a book away — from everywhere it might be kept, so it can't come back. */
export async function removeBook(id){
  memory.delete(id);
  if (db){ try { await run('readwrite', s => s.delete(id)); } catch {} }
  const all = readLocal();
  if (all[id]){
    delete all[id];
    try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(all)); } catch {}
  }
}

// ------------------------------------------------- soundtracks and voices ---
//
// Two kinds of recording live in the sounds database, each under its own id:
//
//   a soundtrack   { id: the book's id, mime, data: ArrayBuffer, secs, pages: [{ t, id }], at }
//   a voice clip   { id: 'voice:' + its id, mime, data, secs }   — on a bubble or a sound button
//
// A soundtrack's `pages` says which page was showing when, so the pages can
// turn along with it. The sound is kept as an ArrayBuffer rather than a Blob:
// every browser that has IndexedDB can store one of those.

let sounds = null;                 // the database, once open; false if it won't
const soundsInMemory = new Map();
const CLIP = 'voice:';

function openSounds(){
  if (sounds !== null) return Promise.resolve(sounds);
  return new Promise((resolve) => {
    let req;
    const give = (v) => { sounds = v; resolve(v); };
    try { req = indexedDB.open('milbil-books-sounds', 1); } catch { give(false); return; }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('tracks')) req.result.createObjectStore('tracks', { keyPath: 'id' });
    };
    req.onsuccess = () => { req.result.onversionchange = () => req.result.close(); give(req.result); };
    req.onerror = () => give(false);
    req.onblocked = () => give(false);
    setTimeout(() => { if (sounds === null) give(false); }, 4000);
  });
}

function soundTx(kind, fn){
  return new Promise((resolve, reject) => {
    const tx = sounds.transaction('tracks', kind);
    const req = fn(tx.objectStore('tracks'));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('aborted'));
  });
}

/** Keep a recording. Resolves true if it is safely stored, false if only for as long as the tab is open. */
async function putSound(rec){
  if (await openSounds()){
    try { await soundTx('readwrite', s => s.put(rec)); return true; } catch {}
  }
  soundsInMemory.set(rec.id, rec);
  return false;
}

async function getSound(id){
  if (soundsInMemory.has(id)) return soundsInMemory.get(id);
  if (await openSounds()){
    try { return (await soundTx('readonly', s => s.get(id))) || null; } catch {}
  }
  return null;
}

async function removeSound(id){
  soundsInMemory.delete(id);
  if (await openSounds()){
    try { await soundTx('readwrite', s => s.delete(id)); } catch {}
  }
}

/** Every recording's id, without loading any of the sound. */
async function soundKeys(){
  const ids = new Set(soundsInMemory.keys());
  if (await openSounds()){
    try { for (const id of (await soundTx('readonly', s => s.getAllKeys())) || []) ids.add(String(id)); } catch {}
  }
  return [...ids];
}

export const putTrack = putSound;
export const getTrack = getSound;
export const removeTrack = removeSound;

/** Which books have a soundtrack. */
export async function trackIds(){
  return new Set((await soundKeys()).filter(k => !k.startsWith(CLIP)));
}

export const putClip = (clip) => putSound({ ...clip, id: CLIP + clip.id });
export const getClip = (id) => getSound(CLIP + id);
export const removeClip = (id) => removeSound(CLIP + id);

/** Every voice clip's id. */
export async function clipIds(){
  return (await soundKeys()).filter(k => k.startsWith(CLIP)).map(k => k.slice(CLIP.length));
}

// -------------------------------------------------------------- settings ---

const DEFAULTS = () => ({
  name: '',
  welcomed: false,
  sound: true,
  tab: 'create',
  open: null,                 // the book being edited when the tab was closed
  pen: { c: '#2b2233', w: 14, g: false, b: false },
  rubber: 44,
  readSpeed: 'normal',        // how fast Read Aloud reads: slow, normal or fast
  savedCopy: 0,               // when 💾 Save a copy was last used
  wordsFont: 'comic',         // the text style new bubbles start in: the last one picked
  captionFont: 'comic',       // ...and new captions
  recent: ['#2b2233', '#e5484d', '#2f6fe0', '#4cbb4a', '#ffc531'],
});

export const settings = DEFAULTS();

export function loadSettings(){
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (raw && typeof raw === 'object') Object.assign(settings, DEFAULTS(), raw);
  } catch {}
  settings.name = String(settings.name || '').slice(0, 30);
  if (!['create', 'library', 'sounds'].includes(settings.tab)) settings.tab = 'create';
  settings.pen = { ...DEFAULTS().pen, ...(settings.pen || {}) };
  settings.pen.w = Math.max(3, Math.min(90, Number(settings.pen.w) || 14));
  settings.rubber = Math.max(10, Math.min(140, Number(settings.rubber) || 44));
  if (!Array.isArray(settings.recent) || !settings.recent.length) settings.recent = DEFAULTS().recent;
  if (!['slow', 'normal', 'fast'].includes(settings.readSpeed)) settings.readSpeed = 'normal';
  if (!isStyle(settings.wordsFont)) settings.wordsFont = 'comic';
  if (!isStyle(settings.captionFont)) settings.captionFont = 'comic';
  return settings;
}

export function saveSettings(){
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}
