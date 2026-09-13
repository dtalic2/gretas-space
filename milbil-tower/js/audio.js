// ---------- Sound ----------
//
// Small synthesised blips — no files to load, nothing to wait for at boot.
// Everything is one or two oscillators through a gain envelope.
//
// The context is created on the first real sound, because browsers refuse to
// start one before the player has touched the page.

import { state } from './state.js';

let ctx = null;
let master = null;

function ac() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.28;
  master.connect(ctx.destination);
  return ctx;
}

/** Nudge a suspended context awake — call from a real input handler. */
export function unlock() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume();
}

/**
 * One tone. `to` sweeps the pitch, which is what makes a laser sound like a
 * laser rather than a beep.
 */
function tone({ freq, to = null, dur = 0.12, type = 'square', vol = 0.6, delay = 0 }) {
  if (state.muted) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.2, vol = 0.4, delay = 0, freq = 900 }) {
  if (state.muted) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);

  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

export const laser      = () => tone({ freq: 1400, to: 260, dur: 0.16, type: 'sawtooth', vol: 0.32 });
export const thud       = () => tone({ freq: 200, to: 120, dur: 0.09, type: 'square', vol: 0.30 });
export const dodge      = () => tone({ freq: 700, to: 1500, dur: 0.09, type: 'sine', vol: 0.22 });
export const arrive     = () => tone({ freq: 320, to: 700, dur: 0.13, type: 'triangle', vol: 0.20 });
export const coin       = () => { tone({ freq: 990, dur: 0.06, type: 'square', vol: 0.22 }); tone({ freq: 1480, dur: 0.10, type: 'square', vol: 0.20, delay: 0.055 }); };
export const combo      = () => [0, 1, 2].forEach((i) => tone({ freq: 700 * Math.pow(1.26, i), dur: 0.10, type: 'square', vol: 0.22, delay: i * 0.06 }));
export const zapped     = () => { noise({ dur: 0.32, vol: 0.5, freq: 380 }); tone({ freq: 220, to: 60, dur: 0.32, type: 'sawtooth', vol: 0.3 }); };
export const buy        = () => [0, 1].forEach((i) => tone({ freq: 620 * Math.pow(1.5, i), dur: 0.12, type: 'triangle', vol: 0.26, delay: i * 0.07 }));
export const gameOver   = () => [0, 1, 2, 3].forEach((i) => tone({ freq: 440 * Math.pow(0.79, i), dur: 0.30, type: 'sawtooth', vol: 0.24, delay: i * 0.13 }));
export const roundClear = () => [0, 2, 4, 7].forEach((s, i) => tone({ freq: 523.25 * Math.pow(2, s / 12), dur: 0.22, type: 'triangle', vol: 0.24, delay: i * 0.09 }));

export function pop(boss = false) {
  noise({ dur: boss ? 0.45 : 0.18, vol: boss ? 0.55 : 0.35, freq: boss ? 300 : 1200 });
  tone({ freq: boss ? 180 : 620, to: boss ? 55 : 180, dur: boss ? 0.5 : 0.16, type: 'square', vol: boss ? 0.34 : 0.26 });
  coin();
}
