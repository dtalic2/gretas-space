// ---------- Day/night cycle and weather ----------
//
// Every function here is a pure function of absolute epoch time, and that is
// the whole design. Growth is computed closed-form from timestamps so a garden
// keeps growing while the tab is shut (see garden.js). Weather has to work the
// same way, or the two disagree the moment you come back: you'd return to a
// garden that grew as if it never rained, or one that grew as if it always did.
//
// Because it's all derived from the clock, nothing here is saved.

const TAU = Math.PI * 2;

export const DAY_MS     = 240_000;   // one full day + night of real time
export const RAIN_MS    = 42_000;    // how long a single shower lasts
export const RAIN_BONUS = 0.20;      // crops grow 20% faster while it rains

const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth  = (v, a, b) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Which cycle a moment falls in, and how far into it (0..1). */
function split(t){
  const cycle = Math.floor(t / DAY_MS);
  return { cycle, into: t - cycle * DAY_MS };
}

/**
 * When the shower starts in a given cycle. Deterministic, so the same cycle
 * always has the same weather however often it's recomputed.
 *
 * One shower per cycle at a varying time, but always the same *length*. The
 * fixed length is what keeps growTime() closed-form: any whole number of
 * cycles contributes exactly RAIN_MS of rain, so a week offline costs one
 * multiply rather than 2,500 loop iterations. The window is placed so it never
 * straddles a cycle boundary, which would need wrap-around handling.
 */
function rainStart(cycle){
  let h = Math.imul(cycle ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = (h ^ (h >>> 16)) >>> 0;
  return (h / 4294967296) * (DAY_MS - RAIN_MS);
}

/**
 * Whether a moment is inside the shower — the exact window growTime() pays the
 * bonus for. The HUD and the countdown both key off this rather than off the
 * visual intensity below, so what the chip says and what the crops actually get
 * can never drift apart at the edges of a shower.
 */
export function isRaining(t){
  const { cycle, into } = split(t);
  const s = rainStart(cycle);
  return into >= s && into < s + RAIN_MS;
}

/** 0 = dry, 1 = full downpour, with a soft edge either side so it eases in. */
export function rainAt(t){
  const { cycle, into } = split(t);
  const s = rainStart(cycle);
  if (into < s || into >= s + RAIN_MS) return 0;
  const edge = 4000;
  return Math.min(smooth(into - s, 0, edge), smooth(s + RAIN_MS - into, 0, edge));
}

/**
 * Growth time accrued from the epoch up to `t`, in ms.
 *
 * This is the trick that makes rain honest. Rain can't be a plain multiplier on
 * the growth rate: growth is derived from (now - planted), so raising the
 * multiplier would rewrite the *whole* history and every crop would jump
 * forward the instant it started raining, then snap backward when it stopped.
 * Instead we warp the time axis — wet ms are worth 1.2 — and measure growth as
 * a difference of two points on that warped axis. Past growth stays put.
 *
 * Monotonic in t, closed-form, and exact across any offline gap.
 */
export function growTime(t){
  const { cycle, into } = split(t);
  const wet = Math.min(RAIN_MS, Math.max(0, into - rainStart(cycle)));
  return cycle * (DAY_MS + RAIN_BONUS * RAIN_MS) + into + RAIN_BONUS * wet;
}

/**
 * Everything the renderer needs for a moment in time.
 *
 * phase 0 = sunrise, 0.25 = noon, 0.5 = sunset, 0.75 = midnight.
 * `day` is the smoothed 0..1 the palettes blend on; `elev` drives the sun arc.
 */
export function skyAt(t){
  const { into } = split(t);
  const phase = into / DAY_MS;
  const elev  = Math.sin(phase * TAU);
  const rain  = rainAt(t);
  return {
    phase, elev, rain,
    day:   smooth(elev, -0.18, 0.28),
    // Peaks at sunrise and sunset, so the warm light only shows at the edges.
    dusk:  smooth(0.34 - Math.abs(elev), 0, 0.34) * smooth(elev, -0.5, -0.1),
    night: 1 - smooth(elev, -0.18, 0.28),
  };
}

/** Short label for the HUD. */
export function weatherLabel(t){
  const { day, night } = skyAt(t);
  if (isRaining(t))     return { ico:'🌧️', text:'Rain', boosted:true };
  if (night > 0.72)     return { ico:'🌙', text:'Night', boosted:false };
  if (day > 0.72)       return { ico:'☀️', text:'Day',   boosted:false };
  return { ico:'🌇', text:'Dusk', boosted:false };
}
