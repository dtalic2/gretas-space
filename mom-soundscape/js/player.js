// ---------- Playing sounds back, with voices ----------
//
// Recordings are decoded once into an AudioBuffer and kept. On the way the
// quiet bits before and after are trimmed off, so a button makes its sound the
// moment you tap it, and quiet recordings are turned up so every button is
// about as loud as the others. Lots of sounds can play at once; a limiter at
// the end stops them crackling when they all add up.
//
// If this browser can't decode its own recording (it should always be able
// to), the sound plays through an <audio> element instead, without voices.

import { VOICE_BY_ID } from './data.js';

const AC = window.AudioContext || window.webkitAudioContext;
let ctx = null;
let master = null;

export function audio(){
  if (!ctx && AC) {
    ctx = new AC();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 8;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    master = ctx.createGain();
    master.connect(limiter);
    limiter.connect(ctx.destination);
  }
  return ctx;
}

// Phones only let sound start after a tap, so call this from every tap.
export function wake(){
  const c = audio();
  if (c && c.state !== 'running') c.resume().catch(() => {});
}

// On iPhones, plain web-page sound is silenced by the ring/silent switch.
// Saying it's "playback" (like a music app) lets it through. Recording needs
// "play-and-record". Browsers without this just ignore it.
export function setSession(type){
  try { if (navigator.audioSession) navigator.audioSession.type = type; } catch {}
}

// ---------------------------------------------------------------- decoding

const cache = new Map();   // sound id -> Promise of a prepared sound

export function prepare(id, data, mime){
  if (!cache.has(id)) {
    const p = build(data, mime);
    cache.set(id, p);
    p.catch(() => { if (cache.get(id) === p) cache.delete(id); });
  }
  return cache.get(id);
}

// Use an already-prepared sound for `id` (a new recording that's just been saved).
export function adopt(id, prep){
  forget(id);
  cache.set(id, Promise.resolve(prep));
}

export function forget(id){
  const p = cache.get(id);
  cache.delete(id);
  if (p) p.then(release, () => {});
}

export function release(prep){
  if (prep && prep.url) URL.revokeObjectURL(prep.url);
}

export async function build(data, mime){
  const c = audio();
  if (c) {
    try {
      // decodeAudioData takes the buffer away from us, so give it a copy.
      return shape(c, await decode(c, data.slice(0)));
    } catch {}
  }
  return { kind: 'element', url: URL.createObjectURL(new Blob([data], { type: mime || '' })), secs: 0, quiet: false };
}

function decode(c, data){
  return new Promise((resolve, reject) => {
    // Old Safari only has the callback form, new browsers return a promise too.
    const p = c.decodeAudioData(data, resolve, reject);
    if (p && p.then) p.then(resolve, reject);
  });
}

function shape(c, buf){
  const chans = [];
  for (let i = 0; i < buf.numberOfChannels; i++) chans.push(buf.getChannelData(i));
  const n = buf.length, rate = buf.sampleRate;

  let peak = 0;
  for (const d of chans) for (let i = 0; i < n; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }

  // Trim the quiet before and after, keeping a moment either side.
  let from = 0, to = n;
  if (peak > 0.01) {
    const th = peak * 0.06;
    const loud = i => chans.some(d => Math.abs(d[i]) > th);
    while (from < n && !loud(from)) from++;
    while (to > from && !loud(to - 1)) to--;
    from = Math.max(0, from - Math.round(rate * 0.04));
    to = Math.min(n, to + Math.round(rate * 0.15));
    if (to - from < rate * 0.05) { from = 0; to = n; }
  }
  const len = Math.max(1, to - from);
  const out = c.createBuffer(chans.length, len, rate);
  const fade = Math.min(Math.round(rate * 0.006), len >> 2);   // no clicks at the cut
  chans.forEach((d, ci) => {
    const o = out.getChannelData(ci);
    o.set(d.subarray(from, from + len));
    for (let i = 0; i < fade; i++) { const g = i / fade; o[i] *= g; o[len - 1 - i] *= g; }
  });

  return {
    kind: 'buffer',
    buf: out,
    rev: null,                                  // made the first time it's played backwards
    secs: len / rate,
    gain: peak > 0.0001 ? Math.min(0.9 / peak, 6) : 1,
    quiet: peak < 0.02,                         // probably nothing was heard
  };
}

function reversed(c, buf){
  const out = c.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
  for (let i = 0; i < buf.numberOfChannels; i++) {
    const o = out.getChannelData(i);
    o.set(buf.getChannelData(i));
    o.reverse();
  }
  return out;
}

// ----------------------------------------------------------------- playing

// Starts a prepared sound. Returns { progress(), stop() }; progress() goes from
// 0 to 1 (round and round when looping). onEnd is called once, when it stops
// by itself or is stopped.
export function play(prep, { voice = 'normal', loop = false, onEnd } = {}){
  if (prep.kind !== 'buffer') return playElement(prep, loop, onEnd);

  const c = audio();
  const buf = voice === 'backwards' ? (prep.rev || (prep.rev = reversed(c, prep.buf))) : prep.buf;
  const rate = (VOICE_BY_ID[voice] && VOICE_BY_ID[voice].rate) || 1;

  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  src.playbackRate.value = rate;

  const level = c.createGain();
  level.gain.value = prep.gain;
  src.connect(level);

  const nodes = [src, level];
  const make = (node) => { nodes.push(node); return node; };
  const oscs = [];
  let out = level;
  let tail = 0;                // seconds of echo left after the sound itself ends

  if (voice === 'robot') {
    // Ring modulation (the sound is multiplied by a 50 Hz wave), then a very
    // short echo that makes it ring like metal.
    const ring = make(c.createGain());
    ring.gain.value = 0;
    const osc = make(c.createOscillator());
    osc.frequency.value = 50;
    osc.connect(ring.gain);
    oscs.push(osc);
    level.connect(ring);
    const comb = make(c.createDelay(0.05));
    comb.delayTime.value = 0.009;
    const fb = make(c.createGain());
    fb.gain.value = 0.5;
    ring.connect(comb); comb.connect(fb); fb.connect(comb);
    const mix = make(c.createGain());
    mix.gain.value = 1.3;
    ring.connect(mix); comb.connect(mix);
    out = mix;
    tail = 0.2;
  } else if (voice === 'echo') {
    const delay = make(c.createDelay(1));
    delay.delayTime.value = 0.3;
    const fb = make(c.createGain());
    fb.gain.value = 0.45;
    const wet = make(c.createGain());
    wet.gain.value = 0.7;
    const mix = make(c.createGain());
    level.connect(mix);
    level.connect(delay); delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(mix);
    out = mix;
    tail = 2;
  }

  const env = make(c.createGain());   // for fading out when stopped early
  out.connect(env);
  env.connect(master);

  const t0 = c.currentTime + 0.005;
  src.start(t0);
  oscs.forEach(o => o.start(t0));

  let done = false;
  const finish = (rest) => {
    if (done) return;
    done = true;
    setTimeout(() => {
      oscs.forEach(o => { try { o.stop(); } catch {} });
      nodes.forEach(nd => { try { nd.disconnect(); } catch {} });
    }, rest * 1000 + 100);
    if (onEnd) onEnd();
  };
  src.onended = () => finish(tail);

  return {
    progress(){
      const p = (c.currentTime - t0) * rate / buf.duration;
      return loop ? ((p % 1) + 1) % 1 : Math.max(0, Math.min(1, p));
    },
    stop(){
      if (done) return;
      const now = c.currentTime;
      try {
        env.gain.setValueAtTime(env.gain.value, now);
        env.gain.linearRampToValueAtTime(0, now + 0.04);
        src.stop(now + 0.05);
      } catch {}
      finish(0.1);
    },
  };
}

function playElement(prep, loop, onEnd){
  const el = new Audio(prep.url);
  el.loop = loop;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.pause();
    if (onEnd) onEnd();
  };
  el.onended = finish;
  el.onerror = finish;
  const p = el.play();
  if (p && p.catch) p.catch(finish);
  return {
    progress(){
      const d = el.duration;
      return isFinite(d) && d > 0 ? el.currentTime / d : 0;
    },
    stop: finish,
  };
}
