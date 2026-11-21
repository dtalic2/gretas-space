// ---------- Voices on bubbles, and sound buttons ----------
//
// Any bubble or caption can have somebody's own voice on it, recorded right in
// the card you type its words in: 🔴 Record, say it, ⏹ Stop. A 🔊 button on the
// bubble plays it, and Read Aloud plays it instead of reading the words out
// itself. A bubble can be all voice and no words — handy before you can spell
// everything. And the 🔊 Sound tool puts a sound button anywhere on a page, with
// any sound you like on it: a roar, a splash, a song.
//
// Each recording (a "clip") is kept in the sounds database (store.js) under an
// id of its own; the words just say which clip is theirs: t.voice = { id, secs }.
// A clip is never changed, only replaced by a new one, so a copied bubble can
// share its clip with the original. Clips nothing uses any more are cleared
// away a day later (see tidyClips) — not straight away, because ↩️ Undo might
// still want one back.

import { putClip, getClip, clipIds, removeClip } from './store.js';
import { find, allPages } from './model.js';
import { Mic, canRecord, micTrouble } from './mic.js';
import { clock } from './tracks.js';
import { toast, sfx } from './ui.js';

export const MAX_CLIP = 60;          // seconds: plenty for one bubble

// An id starts with when it was made, so tidyClips knows how old it is without loading it.
const newClipId = () => Date.now().toString(36).padStart(9, '0') + Math.random().toString(36).slice(2, 7);
const clipAge = (id) => Date.now() - (parseInt(String(id).slice(0, 9), 36) || 0);

// --------------------------------------------------------------- playing ---

/**
 * Plays clips, one at a time, through the same <audio> every time: iPads only
 * let sound start from a tap, but an <audio> started from one tap can be
 * started again later from anywhere (Read Aloud, say). So the first tap that
 * might need it calls unlock().
 */
class ClipPlayer {
  constructor(){
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.urls = new Map();           // clip id -> a URL to play it from, kept for next time
    this.now = null;                 // { id, u, done } while one is playing
    this.audio.addEventListener('ended', () => { if (this.now && this.audio.src === this.now.u) this.finish(this.now, true); });
    this.audio.addEventListener('error', () => { if (this.now && this.audio.src === this.now.u) this.finish(this.now, false); });
  }

  /** Call from a tap, before anything is waited for. */
  unlock(){
    if (this.audio.getAttribute('src')) return;
    try { this.audio.play()?.catch(() => {}); } catch {}
  }

  async url(id){
    if (this.urls.has(id)) return this.urls.get(id);
    const clip = await getClip(id);
    if (!clip?.data) return null;
    if (this.urls.has(id)) return this.urls.get(id);
    const u = URL.createObjectURL(new Blob([clip.data], { type: clip.mime || 'audio/webm' }));
    this.urls.set(id, u);
    if (this.urls.size > 40){
      const [old, ou] = this.urls.entries().next().value;
      if (this.now?.id !== old){ URL.revokeObjectURL(ou); this.urls.delete(old); }
    }
    return u;
  }

  /** Get some clips ready, so a tap can start one straight away. */
  warm(ids){ for (const id of ids) if (id && !this.urls.has(id)) this.url(id); }

  /** Which clip is playing, if any. */
  get playing(){ return this.now?.id || null; }

  /** Play a clip. Resolves with how it ended: 'ended', 'failed' (it couldn't play) or 'stopped'. */
  play(id){
    this.stop();
    const now = this.now = { id };
    const done = new Promise(r => { now.done = r; });
    const go = (u) => {
      if (this.now !== now) return;
      if (!u){ this.finish(now, false); return; }
      now.u = u;
      this.audio.src = u;
      try { this.audio.play()?.catch(() => this.finish(now, false)); }
      catch { this.finish(now, false); }
    };
    // already loaded: start it right now, while the tap still counts
    if (this.urls.has(id)) go(this.urls.get(id));
    else this.url(id).then(go, () => go(null));
    return done;
  }

  finish(now, ok){
    if (this.now !== now) return;
    this.now = null;
    now.done(ok ? 'ended' : 'failed');
  }

  stop(){
    const now = this.now;
    if (!now) return;
    this.now = null;
    try { this.audio.pause(); } catch {}
    now.done('stopped');
  }
}

export const clips = new ClipPlayer();

/**
 * Tapping a 🔊: play the voice on those words, lighting up its button while it
 * plays. Tapping it again while it plays stops it.
 */
export async function playWords(page, wordsId, root){
  const t = find(page, wordsId)?.t;
  if (!t?.voice) return;
  const lit = [...(root?.querySelectorAll(`.snd[data-voice="${wordsId}"]`) || [])];
  // tapping one that's playing stops it; anything else playing stops, and this one starts
  if (clips.playing === t.voice.id && lit.some(el => el.classList.contains('playing'))){ clips.stop(); return; }
  clips.unlock();
  lit.forEach(el => el.classList.add('playing'));
  const how = await clips.play(t.voice.id);
  lit.forEach(el => el.classList.remove('playing'));
  if (how === 'failed'){
    // gone from storage, or the browser wouldn't play it
    toast((await getClip(t.voice.id)) ? "It wouldn't play. Tap 🔊 again." : 'That recording has gone. Record it again?');
  }
}

/** Every clip used on a page, to have them ready. */
export const clipsOn = (page) => page.panels.flatMap(p => p.words.map(t => t.voice?.id).filter(Boolean));

// ------------------------------------------------------------- recording ---

let warned = false;

/**
 * The Voice row in a card: 🔴 Record, then ⏹ Stop, then ▶️ to hear it, 🔴 Again
 * and 🗑️ to take it off. Put `<div class="wc-row voice-row"></div>` in the
 * card and bind it once the card is open.
 *
 * `finish()`, when the card closes with ✓ Done, stops any recording still going,
 * keeps it, and resolves with the voice to put on the words ({ id, secs } or
 * null). `cancel()` drops whatever was going on.
 */
export function bindVoiceRow(row, { voice = null, label = 'Voice', note = 'Say it in your own voice', onChange = null } = {}){
  let state = 'idle';                // idle | asking | recording | saving
  let mic = null, frame = 0, saving = null;

  const paint = () => {
    const head = `<span class="wc-label">${label}</span>`;
    if (state === 'asking') row.innerHTML = `${head}<span class="wc-note">Asking to use the microphone…</span>`;
    else if (state === 'recording'){
      row.innerHTML = `${head}<button type="button" class="chip vc-stop" data-vc="stop">⏹ Stop</button>
        <span class="vc-rec"><i class="sd-dot"></i><b class="vc-time">0:00</b></span><span class="sd-level vc-level"><i></i></span>`;
    } else if (state === 'saving') row.innerHTML = `${head}<span class="wc-note">Saving…</span>`;
    else if (voice){
      row.innerHTML = `${head}<button type="button" class="chip vc-play" data-vc="play">▶️ ${clock(voice.secs)}</button>
        <button type="button" class="chip vc-again" data-vc="rec">🔴 Again</button>
        <button type="button" class="chip vc-off" data-vc="off" aria-label="Take the voice off">🗑️</button>`;
    } else {
      row.innerHTML = `${head}<button type="button" class="chip vc-rec-btn" data-vc="rec"${canRecord() ? '' : ' disabled'}>🔴 Record</button>
        <span class="wc-note">${canRecord() ? note : "This browser can't record."}</span>`;
    }
  };

  const tick = () => {
    if (state !== 'recording' || !mic) return;
    const secs = mic.elapsed();
    const time = row.querySelector('.vc-time');
    if (time) time.textContent = clock(secs);
    const bar = row.querySelector('.vc-level i');
    if (bar) bar.style.transform = `scaleX(${Math.max(0.03, mic.level()).toFixed(3)})`;
    if (secs >= MAX_CLIP){ toast(`That's a whole minute — as long as one recording can be.`); stop(); return; }
    if (!mic.recording){ stop(); return; }
    frame = requestAnimationFrame(tick);
  };

  const record = async () => {
    if (!canRecord()){ toast("Sorry — this browser can't record sound."); sfx('nope'); return; }
    clips.stop();
    const m = mic = new Mic();         // from the tap
    state = 'asking';
    paint();
    try { await m.open(); }
    catch (err){
      if (mic === m){ mic = null; state = 'idle'; paint(); }
      if (err?.name !== 'AbortError') micTrouble(err);
      return;
    }
    if (mic !== m || state !== 'asking'){ m.close(); return; }
    m.start();
    state = 'recording';
    paint();
    tick();
  };

  const stop = () => {
    if (state !== 'recording') return saving || Promise.resolve();
    cancelAnimationFrame(frame);
    const m = mic;
    mic = null;
    state = 'saving';
    paint();
    saving = (async () => {
      const r = await m.stop().catch(() => null);
      if (r){
        const id = newClipId();
        const kept = await putClip({ id, mime: r.mime, data: r.data, secs: r.secs });
        if (!kept && !warned){ warned = true; toast("⚠️ This browser won't keep recordings after the page is closed.", { ms: 6000 }); }
        voice = { id, secs: r.secs };
        clips.warm([id]);
        sfx('words');
      } else toast('Nothing was recorded. Is the microphone working?');
      state = 'idle';
      saving = null;
      if (row.isConnected) paint();
      onChange?.(voice);
    })();
    return saving;
  };

  row.addEventListener('click', (e) => {
    const b = e.target.closest('[data-vc]');
    if (!b || b.disabled) return;
    const act = b.dataset.vc;
    if (act === 'rec') record();
    if (act === 'stop') stop();
    if (act === 'play' && voice){
      if (clips.playing === voice.id){ clips.stop(); return; }
      clips.unlock();
      b.classList.add('on');
      clips.play(voice.id).then(() => b.classList.remove('on'));
    }
    if (act === 'off'){ clips.stop(); voice = null; paint(); onChange?.(voice); sfx('bin'); }
  });
  paint();

  return {
    get voice(){ return voice; },
    get busy(){ return state !== 'idle'; },
    async finish(){
      if (state === 'asking'){ mic?.close(); mic = null; state = 'idle'; }
      await stop();
      return voice;
    },
    cancel(){
      cancelAnimationFrame(frame);
      mic?.close();
      mic = null;
      state = 'idle';
      clips.stop();
    },
  };
}

// --------------------------------------------------------------- tidying ---

/**
 * Clear away clips no book uses any more — once they are a day old, so one
 * that ↩️ Undo might bring back (or that another tab is using) is left alone.
 */
export async function tidyClips(books){
  const used = new Set();
  for (const b of books) for (const pg of allPages(b)) for (const p of pg.panels) for (const t of p.words) if (t.voice?.id) used.add(t.voice.id);
  for (const id of await clipIds()){
    if (!used.has(id) && clipAge(id) > 24 * 3600 * 1000) await removeClip(id);
  }
}
