// ---------- A copy of all your books, in a file ----------
//
// Everything the game keeps, the browser keeps for it, on this device — and
// a browser can throw it away. Safari clears what a website keeps if it isn't
// opened for a week, everything made in a Private tab goes when the tab
// closes, and a game added to the Home Screen keeps its books apart from
// Safari's. A copy in a file is safe from all of that.
//
// ⚙️ Settings → 💾 Save a copy makes one file with every book in it, and the
// soundtracks and the voices on their bubbles too. 📂 Bring books back reads
// one — on this device or any other — and puts back every book in it that
// isn't here already (or is newer than the one here).
//
// The sound is written into the file as text (base64), so the whole copy is
// one ordinary JSON file.

import { getTrack, getClip, putTrack, putClip } from './store.js';
import { allPages } from './model.js';

const KIND = 'milbil-books-copy';

function toText(buf){
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromText(str){
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

/** Every voice clip a book's bubbles use. */
const clipsIn = (b) => new Set(allPages(b).flatMap(pg => pg.panels.flatMap(p => p.words.map(t => t.voice?.id).filter(Boolean))));

/** All the books, and their sounds, as one file to keep. */
export async function makeCopy(books){
  const sounds = [];
  for (const b of books){
    if (b.track){
      const t = await getTrack(b.id).catch(() => null);
      if (t?.data) sounds.push({ track: b.id, mime: t.mime, secs: t.secs, pages: t.pages || [], at: t.at, data: toText(t.data) });
    }
    for (const id of clipsIn(b)){
      const c = await getClip(id).catch(() => null);
      if (c?.data) sounds.push({ clip: id, mime: c.mime, secs: c.secs, data: toText(c.data) });
    }
  }
  const copy = { kind: KIND, v: 1, made: Date.now(), books, sounds };
  return new Blob([JSON.stringify(copy)], { type: 'application/json' });
}

/** A file's name for a copy made today: "Milbil Books 2026-11-21.json". */
export function copyName(){
  const d = new Date();
  const two = (n) => String(n).padStart(2, '0');
  return `Milbil Books ${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}.json`;
}

/** Read a copy. Resolves with { books, sounds }; rejects if the file isn't one. */
export async function readCopy(file){
  const data = JSON.parse(await new Response(file).text());
  if (data?.kind !== KIND || !Array.isArray(data.books)) throw new Error('not a copy of Milbil Books');
  return data;
}

/** Put a copy's soundtracks and voices back. Resolves with how many went back. */
export async function restoreSounds(data){
  let n = 0;
  for (const s of data.sounds || []){
    try {
      if (s.clip) await putClip({ id: s.clip, mime: s.mime, secs: s.secs, data: fromText(s.data) });
      else if (s.track) await putTrack({ id: s.track, mime: s.mime, secs: s.secs, pages: s.pages || [], at: s.at, data: fromText(s.data) });
      else continue;
      n++;
    } catch {}
  }
  return n;
}
