// ---------- Soundtracks ----------
//
// A soundtrack is somebody reading a book out loud: recorded in the editor's
// 🎙️ studio (studio.js), named after the book — "Chomp Soundtrack" for a book
// called Chomp — and listened to in 🎧 Soundtracks or along with the pages in
// the reader. While it was recorded, the pages were turned by hand and every
// turn was written down, so whoever listens later sees each page come up just
// as it is being read.
//
//   book.track   { secs, at }                                — so a list can say how long it is
//   the track    { id, mime, data, secs, pages: [{ t, id }], at }   — in store.js's own database
//
// Nothing is sent anywhere: the browser records it and keeps it, like the books.

import { getTrack } from './store.js';

export const trackName = (book) => `${book?.title || 'My Book'} Soundtrack`;

/** Can this browser record? (It needs a microphone it's allowed to ask for, and MediaRecorder.) */
export const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

/** 125 → "2:05" */
export function clock(secs){
  const s = Math.max(0, Math.floor(Number(secs) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Which page was showing `t` seconds in: the last one turned to at or before then. */
export function pageAt(track, t){
  const turns = track?.pages || [];
  let id = turns[0]?.id ?? null;
  for (const p of turns){
    if (p.t <= t + 0.05) id = p.id;
    else break;
  }
  return id;
}

/** When a page first came up in a soundtrack, in seconds; null if it never did. */
export function timeOf(track, id){
  const p = (track?.pages || []).find(p => p.id === id);
  return p ? p.t : null;
}

/**
 * One soundtrack at a time, playing, always through the same <audio>. iPads
 * only let sound start from a tap — but once an <audio> has been started from
 * one, it may be started again later from anywhere. So a tap calls `unlock()`
 * straight away, before the sound has even come out of storage, and `play()`
 * can follow a moment later.
 *
 * `on.time(t)`, `on.end()` and `on.stop()` say what's happening.
 */
export class Player {
  constructor(){
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.url = null;
    this.track = null;
    this.loading = null;
    this.on = {};
    const a = this.audio;
    a.addEventListener('timeupdate', () => { if (this.track && !this.fixing) this.on.time?.(a.currentTime); });
    a.addEventListener('ended', () => { if (this.track) this.on.end?.(); });
    a.addEventListener('pause', () => { if (this.track && !a.ended && !this.fixing) this.on.stop?.(); });
    // Chrome's own recordings don't say how long they are, and can't be skipped
    // through until it has been to the end once to find out. Send it there.
    a.addEventListener('loadedmetadata', () => {
      if (a.duration !== Infinity) return;
      this.fixing = true;
      const back = () => { a.removeEventListener('timeupdate', back); if (this.fixing){ a.currentTime = 0; this.fixing = false; } };
      a.addEventListener('timeupdate', back);
      a.currentTime = 1e101;
    });
  }

  /** Call from a tap, before anything is waited for. */
  unlock(){
    if (this.audio.getAttribute('src')) return;
    try { this.audio.play()?.catch(() => {}); } catch {}
  }

  /** Get a book's soundtrack ready to play. Resolves with the track, or null if it has none. */
  load(id){
    if (this.track?.id === id) return Promise.resolve(this.track);
    if (this.loading?.id === id) return this.loading.p;
    const p = getTrack(id).then((track) => {
      if (this.loading?.p !== p) return this.track?.id === id ? this.track : null;    // something else was asked for meanwhile
      this.loading = null;
      if (!track?.data) return null;
      this.use(track);
      return track;
    });
    this.loading = { id, p };
    return p;
  }

  /** Play a track that's already to hand: one just recorded, say. */
  use(track){
    this.unload();
    this.track = track;
    this.url = URL.createObjectURL(new Blob([track.data], { type: track.mime || 'audio/webm' }));
    this.audio.src = this.url;
  }

  get playing(){ return !!this.track && !this.audio.paused && !this.audio.ended; }
  get time(){ return this.track ? this.audio.currentTime : 0; }

  /** Start (or carry on), from `from` seconds if given. Resolves once it is playing. */
  play(from = null){
    const a = this.audio;
    if (!this.track) return Promise.reject(new Error('nothing loaded'));
    if (from != null) this.seek(from);
    else if (a.ended) this.seek(0);
    return a.play();
  }

  pause(){ if (this.track) this.audio.pause(); }

  /** Skip to `t` seconds. */
  seek(t){ this.fixing = false; this.audio.currentTime = Math.max(0, t); }

  unload(){
    const a = this.audio;
    const had = this.track;
    this.track = null;            // first, so pausing doesn't say "stopped"
    this.loading = null;
    this.fixing = false;
    if (had || a.getAttribute('src')){ a.pause(); a.removeAttribute('src'); try { a.load(); } catch {} }
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
  }
}
