// ---------- The sanctuary ----------
//
// A Milbil you zap is not destroyed — it is dazed, and if there is a free pen it
// gets beamed back to the sanctuary behind the tower. There you feed it, water
// it and scoop up after it, and a Milbil that is looked after pays rent.
//
// Everything here runs on wall-clock time rather than frames, so the same code
// handles a live tick and catching up on hours the tab was closed: `tick()` asks
// how long it has really been and walks that forward in 30-second steps.

import { TYPES } from './types.js';
import { state, save } from './state.js';

export const POO_MAX = 3;

// Minutes from full to empty, and minutes per fresh poo. Tuned so a sanctuary
// left for about a quarter of an hour is still content, and one left overnight
// is thoroughly fed up.
const FOOD_MINUTES = 25;
const WATER_MINUTES = 18;
const POO_MINUTES = 6;

const CATCH_UP_CAP = 8 * 3600;   // seconds of absence worth simulating
const STEP = 30;                 // seconds per simulated step

/** Milbils arrive named. It is much harder to forget to water something called Noodle. */
const NAMES = [
  'Noodle', 'Pip', 'Waffle', 'Bloop', 'Twizzle', 'Mango', 'Sprout', 'Zigzag',
  'Pickle', 'Marbles', 'Doodle', 'Fizz', 'Bramble', 'Custard', 'Squish', 'Bibble',
  'Tumble', 'Nugget', 'Pebble', 'Wobble', 'Clover', 'Jellybean', 'Mop', 'Tuna',
];

export function blankSanctuary() {
  return { pens: [], lastTick: Date.now(), earned: 0, frac: 0, nextName: 0 };
}

/** Pens available. The first three are free; the rest come out of the workshop. */
export function capacity() {
  return 3 + (state.up.pens | 0);
}

/** Needs drain more slowly with Comfort Bedding fitted. */
function drainScale() {
  return 1 - [0, 0.20, 0.35, 0.50][state.up.bedding | 0];
}

/**
 * What a variant pays per minute at full contentment — an eighth of what it pays
 * when you shoot it, so the roster keeps the game's "harder is worth more" rule.
 *
 * Deliberately a supplement, not a living. A full late-game sanctuary left for an
 * untended hour pays about two thirds of one round; shooting Milbils stays far
 * and away the better earner. What the sanctuary buys you is coins arriving
 * while nobody is playing.
 */
export function coinsPerMin(key) {
  return Math.max(1, Math.round(TYPES[key].coins / 8));
}

/** 0..1. Hungry, thirsty and standing in it all count equally. */
export function mood(pen) {
  return (pen.food + pen.water + (1 - pen.poo / POO_MAX)) / 3;
}

export function moodFace(m) {
  return m >= 0.8 ? '😀' : m >= 0.55 ? '🙂' : m >= 0.3 ? '😕' : '😫';
}

export function moodWord(m) {
  return m >= 0.8 ? 'delighted' : m >= 0.55 ? 'content' : m >= 0.3 ? 'grumbling' : 'miserable';
}

/** Coins a minute right now, across the whole sanctuary. */
export function rate() {
  return state.sanctuary.pens.reduce((n, p) => n + coinsPerMin(p.key) * mood(p), 0);
}

export function isFull() {
  return state.sanctuary.pens.length >= capacity();
}

/**
 * Take in a zapped Milbil. Returns the pen, or null if there was no room —
 * the caller decides whether that is worth telling the player about.
 */
export function admit(key) {
  const s = state.sanctuary;
  if (isFull()) return null;
  const pen = {
    key,
    name: NAMES[s.nextName % NAMES.length],
    food: 1, water: 1, poo: 0, pooT: 0,
    phase: Math.random(),
    since: Date.now(),
  };
  s.nextName++;
  s.pens.push(pen);
  save();
  return pen;
}

export function feed(i)  { const p = state.sanctuary.pens[i]; if (p) { p.food = 1; save(); } }
export function water(i) { const p = state.sanctuary.pens[i]; if (p) { p.water = 1; save(); } }
export function scoop(i) { const p = state.sanctuary.pens[i]; if (p) { p.poo = 0; p.pooT = 0; save(); } }
export function release(i) { state.sanctuary.pens.splice(i, 1); save(); }

/** Feed, water and scoop every pen at once — with eight pens, one tap each is a lot. */
export function tendAll() {
  let touched = 0;
  for (const p of state.sanctuary.pens) {
    if (p.food < 1 || p.water < 1 || p.poo > 0) touched++;
    p.food = 1; p.water = 1; p.poo = 0; p.pooT = 0;
  }
  if (touched) save();
  return touched;
}

/** One slice of time: needs drain, poo accumulates, coins accrue. */
function step(dt) {
  const scale = drainScale();
  let coins = 0;
  for (const p of state.sanctuary.pens) {
    coins += coinsPerMin(p.key) * mood(p) * (dt / 60);
    p.food = Math.max(0, p.food - (dt / (FOOD_MINUTES * 60)) * scale);
    p.water = Math.max(0, p.water - (dt / (WATER_MINUTES * 60)) * scale);
    if (p.poo < POO_MAX) {
      p.pooT += dt * scale;
      while (p.pooT >= POO_MINUTES * 60 && p.poo < POO_MAX) {
        p.pooT -= POO_MINUTES * 60;
        p.poo++;
      }
    }
  }
  return coins;
}

/**
 * Advance the sanctuary to now and bank whatever it earned.
 *
 * Called every frame during play — where the elapsed time is a few milliseconds
 * — and once at boot, where it may be hours. Same code either way: coins are
 * earned at the mood of each step, so a sanctuary left overnight stops paying
 * once its water runs out rather than quietly minting coins all night.
 */
export function tick() {
  const s = state.sanctuary;
  const now = Date.now();
  let dt = (now - s.lastTick) / 1000;
  s.lastTick = now;

  if (!(dt > 0)) return 0;                 // also catches a clock that moved backwards
  dt = Math.min(dt, CATCH_UP_CAP);

  let coins = 0;
  while (dt > 0) {
    const slice = Math.min(STEP, dt);
    coins += step(slice);
    dt -= slice;
  }

  // Carry the fraction, or a slow sanctuary would round down to nothing forever.
  s.frac += coins;
  const whole = Math.floor(s.frac);
  if (whole > 0) {
    s.frac -= whole;
    state.coins += whole;
    s.earned += whole;
  }
  return whole;
}

/** Seconds since the sanctuary last ticked — used for the welcome-back line. */
export function awaySeconds() {
  return (Date.now() - state.sanctuary.lastTick) / 1000;
}
