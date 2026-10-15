// ---------- Little sounds, made on the spot (no sound files) ----------

import { G } from './game.js';

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

export function sfx(name){
  if (!G.s.settings.sound) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  switch (name){
    case 'serve':   tone(c, 1318, t, .08, 'square', .05); tone(c, 1760, t + .07, .16, 'square', .05); break;
    case 'thanks':  [784, 988, 1175].forEach((f, i) => tone(c, f, t + i * .06, .12, 'triangle', .09)); break;
    case 'correct': [523, 659, 784, 1047].forEach((f, i) => tone(c, f, t + i * .07, .16, 'triangle', .12)); break;
    case 'wrong':   tone(c, 220, t, .22, 'sawtooth', .06, 150); tone(c, 165, t + .18, .32, 'sawtooth', .06, 110); break;
    case 'buy':     tone(c, 880, t, .06, 'square', .045); tone(c, 1175, t + .06, .06, 'square', .045); tone(c, 1568, t + .12, .2, 'square', .045); break;
    case 'nope':    tone(c, 280, t, .14, 'square', .045, 190); break;
    case 'pop':     tone(c, 620, t, .08, 'sine', .1, 940); break;
    case 'bell':    tone(c, 1568, t, .45, 'sine', .05); tone(c, 2093, t + .02, .45, 'sine', .035); break;
    case 'tick':    tone(c, 880, t, .09, 'square', .05); break;
    case 'go':      tone(c, 1320, t, .4, 'square', .06); tone(c, 1760, t, .4, 'triangle', .05); break;
    case 'whistle': tone(c, 2100, t, .5, 'sine', .08, 2300); tone(c, 1900, t + .55, .6, 'sine', .08, 1500); break;
    case 'win':     [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(c, f, t + i * .12, .22, 'square', .05)); break;
    case 'cheer':   [523, 659, 784, 1047].forEach((f, i) => tone(c, f, t + i * .11, .2, 'triangle', .1)); break;
    case 'done':    [392, 523, 659].forEach((f, i) => tone(c, f, t + i * .12, .2, 'triangle', .09)); break;
    case 'power':   [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, f, t + i * .05, .14, 'square', .04)); break;
  }
}
