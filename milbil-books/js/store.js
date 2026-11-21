// ---------- Where the books are kept ----------
//
// Books go into IndexedDB, the browser's own database. localStorage is shared
// between every game on dtalic2.github.io and only holds about five megabytes
// between all of them; a few books with drawings in could fill it. IndexedDB
// has room for thousands.
//
// If IndexedDB will not open (some private-browsing windows refuse it), books
// fall back to localStorage, and if that is full too they live in memory for as
// long as the tab is open — and the game says so rather than pretending.
//
// Soundtracks — recordings of somebody reading a book out loud — are in a
// second database of their own, `milbil-books-sounds`, so that saving a book
// (which happens every few seconds while you make it) never has to carry a
// few megabytes of sound along with it. A separate database also means adding
// it never had to upgrade the first one, which a second open tab can block.
//
// The little settings object (your name, sound, which tab, the last text
// styles you picked) is in localStorage
// under `milbil-books-v1`.

import { isStyle } from './styles.js';

const DB_NAME = 'milbil-books';
const STORE = 'books';
const SETTINGS_KEY = 'milbil-books-v1';
const FALLBACK_KEY = 'milbil-books-v1-books';

let db = null;
let mode = 'idb';            // 'idb' | 'local' | 'memory'
const memory = new Map();

export const storageMode = () => mode;

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
    req.onblocked = () => reject(new Error('blocked'));
    setTimeout(() => reject(new Error('timed out')), 4000);
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

export async function openStore(){
  try {
    db = await openDb();
    mode = 'idb';
    // Ask the browser not to clear the books out when it is short of space.
    navigator.storage?.persist?.().catch(() => {});
  } catch {
    mode = 'local';
    try { localStorage.setItem('milbil-books-probe', '1'); localStorage.removeItem('milbil-books-probe'); }
    catch { mode = 'memory'; }
  }
}

function readLocal(){
  try { return JSON.parse(localStorage.getItem(FALLBACK_KEY) || '{}') || {}; } catch { return {}; }
}

export async function loadBooks(){
  if (mode === 'idb'){
    try { return (await run('readonly', s => s.getAll())) || []; }
    catch { mode = 'local'; }
  }
  if (mode === 'local') return Object.values(readLocal());
  return [...memory.values()];
}

/** Save one book. Resolves true if it is safely stored, false if only in memory. */
export async function putBook(book){
  const copy = JSON.parse(JSON.stringify(book));
  if (mode === 'idb'){
    try { await run('readwrite', s => s.put(copy)); return true; }
    catch { mode = 'local'; }
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

export async function removeBook(id){
  memory.delete(id);
  if (mode === 'idb'){
    try { await run('readwrite', s => s.delete(id)); return; } catch {}
  }
  const all = readLocal();
  if (all[id]){
    delete all[id];
    try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(all)); } catch {}
  }
}

// ----------------------------------------------------------- soundtracks ---
//
//   { id: the book's id, mime, data: ArrayBuffer, secs, pages: [{ t, id }], at }
//
// `pages` says which page was showing when, so the pages can turn along with
// the recording. The sound is kept as an ArrayBuffer rather than a Blob: every
// browser that has IndexedDB can store one of those.

let sounds = null;                 // the database, once open; false if it won't
const soundsInMemory = new Map();

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

/** Keep a soundtrack. Resolves true if it is safely stored, false if only for as long as the tab is open. */
export async function putTrack(track){
  if (await openSounds()){
    try { await soundTx('readwrite', s => s.put(track)); return true; } catch {}
  }
  soundsInMemory.set(track.id, track);
  return false;
}

export async function getTrack(id){
  if (soundsInMemory.has(id)) return soundsInMemory.get(id);
  if (await openSounds()){
    try { return (await soundTx('readonly', s => s.get(id))) || null; } catch {}
  }
  return null;
}

export async function removeTrack(id){
  soundsInMemory.delete(id);
  if (await openSounds()){
    try { await soundTx('readwrite', s => s.delete(id)); } catch {}
  }
}

/** Which books have a soundtrack, without loading any of the sound. */
export async function trackIds(){
  const ids = new Set(soundsInMemory.keys());
  if (await openSounds()){
    try { for (const id of (await soundTx('readonly', s => s.getAllKeys())) || []) ids.add(id); } catch {}
  }
  return ids;
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
