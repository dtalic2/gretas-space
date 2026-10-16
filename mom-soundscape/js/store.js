// ---------- Keeping the sounds: IndexedDB, so they're still there tomorrow ----------
//
// Each sound is one record:
//   { id, name, emoji, color, voice, loop, order, created, mime, secs, audio }
// `audio` is the recording itself, as an ArrayBuffer, in whatever format this
// browser records in (`mime`). An ArrayBuffer rather than a Blob because older
// Safaris couldn't keep Blobs in IndexedDB.

const DB_NAME = 'mom-soundscape';
const STORE = 'sounds';

let opening = null;

function open(){
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('no-indexeddb')); return; }
      let req;
      try { req = indexedDB.open(DB_NAME, 1); } catch (err) { reject(err); return; }
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'id' }); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    });
    opening.catch(() => { opening = null; });
  }
  return opening;
}

// Runs `fn` on the store inside one transaction and resolves once it's
// written, with the result of the request `fn` returns (if it returns one).
function run(mode, fn){
  return open().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('aborted'));
  }));
}

export const loadAll = () =>
  run('readonly', s => s.getAll()).then(list => (list || []).sort((a, b) => a.order - b.order));

export const put = rec => run('readwrite', s => { s.put(rec); });

export const putMany = recs => run('readwrite', s => { recs.forEach(r => s.put(r)); });

export const remove = id => run('readwrite', s => { s.delete(id); });

// Ask the browser not to clear the sounds out when it's short of space.
export function keepForever(){
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist().catch(() => {}); } catch {}
}
