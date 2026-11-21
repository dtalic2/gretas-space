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
// The little settings object (your name, sound, which tab) is in localStorage
// under `milbil-books-v1`.

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
    req.onsuccess = () => resolve(req.result);
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
  recent: ['#2b2233', '#e5484d', '#2f6fe0', '#4cbb4a', '#ffc531'],
});

export const settings = DEFAULTS();

export function loadSettings(){
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (raw && typeof raw === 'object') Object.assign(settings, DEFAULTS(), raw);
  } catch {}
  settings.name = String(settings.name || '').slice(0, 30);
  if (!['create', 'library'].includes(settings.tab)) settings.tab = 'create';
  settings.pen = { ...DEFAULTS().pen, ...(settings.pen || {}) };
  settings.pen.w = Math.max(3, Math.min(90, Number(settings.pen.w) || 14));
  settings.rubber = Math.max(10, Math.min(140, Number(settings.rubber) || 44));
  if (!Array.isArray(settings.recent) || !settings.recent.length) settings.recent = DEFAULTS().recent;
  if (!['slow', 'normal', 'fast'].includes(settings.readSpeed)) settings.readSpeed = 'normal';
  return settings;
}

export function saveSettings(){
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}
