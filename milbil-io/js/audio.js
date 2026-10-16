// ---------- Little sounds, made on the spot (no sound files) ----------

import { S } from './state.js';

let ctx = null;

function ac(){
  if (!ctx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Call from a tap so phones let the page make sound. */
export const unlockAudio = () => { ac(); };

function tone(c, freq, start, dur, type = 'sine', vol = 0.12, slideTo = 0){
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

/** `n` makes some sounds bigger: how much land you just filled in. */
export function sfx(name, n = 0){
  if (!S.sound) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  switch (name){
    case 'fill': {
      const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
      const k = Math.min(notes.length, 2 + n);
      for (let i = 0; i < k; i++) tone(c, notes[i], t + i * .05, .15, 'triangle', .09);
      break;
    }
    case 'catch':  tone(c, 620, t, .08, 'sine', .12, 940); [784, 988, 1319].forEach((f, i) => tone(c, f, t + .08 + i * .06, .16, 'square', .05)); break;
    case 'caught': tone(c, 440, t, .25, 'sawtooth', .07, 220); tone(c, 330, t + .22, .45, 'sawtooth', .07, 110); break;
    case 'poof':   tone(c, 300, t, .12, 'sine', .05, 120); break;
    case 'cheer':  [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(c, f, t + i * .09, .18, 'square', .045)); break;
    case 'crown':  [784, 988, 1175, 1568].forEach((f, i) => tone(c, f, t + i * .07, .22, 'triangle', .1)); break;
    case 'go':     tone(c, 1320, t, .3, 'square', .05); tone(c, 1760, t, .3, 'triangle', .04); break;
    case 'click':  tone(c, 880, t, .05, 'square', .04); break;
  }
}
