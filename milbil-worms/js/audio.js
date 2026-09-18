// ---------- Sound, synthesised ----------
//
// No files: every sound here is oscillators and filtered noise, built on demand.
// That keeps the whole game one folder with nothing to download, and it means a
// Milbil's yelp can be pitched per creature — each one gets its own voice from
// its index, which is worth more character than a handful of sampled grunts.

let ctx = null;
let master = null;
let muted = false;

export function setMuted(v) { muted = v; }
export function isMuted() { return muted; }

function ac() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.3;
  master.connect(ctx.destination);
  return ctx;
}

export function unlock() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume();
}

function tone({ freq, to = null, dur = 0.12, type = 'square', vol = 0.5, delay = 0, slide = 'exp' }) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) {
    if (slide === 'lin') osc.frequency.linearRampToValueAtTime(Math.max(20, to), t0 + dur);
    else osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.2, vol = 0.4, delay = 0, freq = 900, q = 1, type = 'bandpass', sweepTo = null }) {
  if (muted) return;
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
  f.type = type;
  f.frequency.setValueAtTime(freq, t0);
  f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

// ---- the kit ----

export const sfx = {
  step: () => tone({ freq: 160 + Math.random() * 40, dur: 0.045, type: 'square', vol: 0.06 }),
  jump: () => tone({ freq: 340, to: 720, dur: 0.14, type: 'triangle', vol: 0.2 }),
  land: () => tone({ freq: 180, to: 90, dur: 0.1, type: 'square', vol: 0.18 }),

  charge: (p) => tone({ freq: 220 + p * 900, dur: 0.05, type: 'sawtooth', vol: 0.07 }),

  launch: () => {
    noise({ dur: 0.36, vol: 0.28, freq: 380, sweepTo: 1800, q: 1.2 });
    tone({ freq: 420, to: 150, dur: 0.3, type: 'sawtooth', vol: 0.16 });
  },
  lob: () => tone({ freq: 620, to: 300, dur: 0.16, type: 'triangle', vol: 0.18 }),
  bounce: () => tone({ freq: 480 + Math.random() * 200, to: 260, dur: 0.07, type: 'square', vol: 0.14 }),
  fuse: () => tone({ freq: 1500, dur: 0.035, type: 'square', vol: 0.07 }),

  boom: (size = 1) => {
    noise({ dur: 0.5 * size, vol: 0.55, freq: 900 * size, sweepTo: 60, q: 0.7, type: 'lowpass' });
    tone({ freq: 160 / size, to: 38, dur: 0.55 * size, type: 'sawtooth', vol: 0.34 });
    tone({ freq: 70, to: 30, dur: 0.4 * size, type: 'sine', vol: 0.3 });
  },
  beam: () => {
    tone({ freq: 1800, to: 240, dur: 0.22, type: 'sawtooth', vol: 0.26 });
    noise({ dur: 0.18, vol: 0.2, freq: 2600, sweepTo: 600 });
  },
  shot: () => {
    noise({ dur: 0.14, vol: 0.4, freq: 1400, sweepTo: 300, q: 0.8 });
    tone({ freq: 300, to: 90, dur: 0.12, type: 'square', vol: 0.2 });
  },
  plane: () => {
    tone({ freq: 90, to: 120, dur: 1.1, type: 'sawtooth', vol: 0.1, slide: 'lin' });
    noise({ dur: 1.1, vol: 0.1, freq: 260, q: 3 });
  },

  // A Milbil's voice. `v` is the creature's index, so the same one always squeaks
  // at the same pitch and you learn who just got hit without looking.
  ouch: (v = 0) => {
    const f = 520 + ((v * 97) % 260);
    tone({ freq: f, to: f * 0.55, dur: 0.22, type: 'square', vol: 0.22 });
    tone({ freq: f * 1.5, to: f * 0.7, dur: 0.16, type: 'triangle', vol: 0.12, delay: 0.03 });
  },
  gone: (v = 0) => {
    const f = 620 + ((v * 97) % 260);
    [0, 1, 2, 3].forEach((i) =>
      tone({ freq: f * Math.pow(0.72, i), dur: 0.16, type: 'square', vol: 0.2, delay: i * 0.085 }));
    noise({ dur: 0.3, vol: 0.3, freq: 500, sweepTo: 80, delay: 0.3 });
  },
  splash: () => {
    noise({ dur: 0.45, vol: 0.4, freq: 700, sweepTo: 2600, q: 0.6 });
    tone({ freq: 200, to: 600, dur: 0.2, type: 'sine', vol: 0.12 });
  },

  crate: () => [0, 4, 7, 12].forEach((s, i) =>
    tone({ freq: 523.25 * Math.pow(2, s / 12), dur: 0.16, type: 'triangle', vol: 0.18, delay: i * 0.05 })),
  pickup: () => [0, 7, 12, 16].forEach((s, i) =>
    tone({ freq: 659.25 * Math.pow(2, s / 12), dur: 0.14, type: 'square', vol: 0.17, delay: i * 0.055 })),

  select: () => tone({ freq: 880, dur: 0.05, type: 'square', vol: 0.12 }),
  turn: (team) => [0, 5].forEach((s, i) =>
    tone({ freq: (team ? 392 : 523.25) * Math.pow(2, s / 12), dur: 0.2, type: 'triangle', vol: 0.2, delay: i * 0.1 })),
  tick: () => tone({ freq: 1200, dur: 0.04, type: 'square', vol: 0.1 }),
  warn: () => tone({ freq: 300, to: 200, dur: 0.3, type: 'sawtooth', vol: 0.18 }),

  mega: () => {
    // Four sawtooths a chord apart, swelling. It is meant to be a bit much.
    [0, 4, 7, 12].forEach((s, i) =>
      tone({ freq: 261.63 * Math.pow(2, s / 12), dur: 1.5, type: 'sawtooth', vol: 0.12, delay: i * 0.06 }));
  },
  win: () => [0, 4, 7, 12, 16].forEach((s, i) =>
    tone({ freq: 523.25 * Math.pow(2, s / 12), dur: 0.3, type: 'triangle', vol: 0.24, delay: i * 0.11 })),
  lose: () => [0, 1, 2, 3].forEach((i) =>
    tone({ freq: 440 * Math.pow(0.79, i), dur: 0.34, type: 'sawtooth', vol: 0.22, delay: i * 0.15 })),
  sudden: () => {
    tone({ freq: 130, to: 65, dur: 1.4, type: 'sawtooth', vol: 0.24 });
    noise({ dur: 1.4, vol: 0.16, freq: 200, q: 2 });
  },
};
