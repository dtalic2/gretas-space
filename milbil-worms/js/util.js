// ---------- Small shared maths ----------
//
// Nothing in here knows about the game; it is the handful of helpers that every
// other module ended up wanting.

export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

/** Frame-rate independent easing: pull `a` toward `b`, `rate` per second. */
export const approach = (a, b, rate, dt) => b + (a - b) * Math.pow(1 - rate, dt * 60);

/** Shortest signed difference between two angles. */
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** mulberry32 — a second seeded generator, for world layout rather than art. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (arr, rand = Math.random) => arr[(rand() * arr.length) | 0];

export function shuffle(arr, rand = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 1-D value noise with smooth interpolation, summed over octaves. The terrain
 * silhouette is built out of this — cheap, seedable, and it never repeats
 * inside one map.
 */
export function noise1(seed) {
  const rand = seeded(seed);
  const table = new Float32Array(512);
  for (let i = 0; i < 512; i++) table[i] = rand();
  return (x) => {
    const i = Math.floor(x), f = x - i;
    const a = table[i & 511], b = table[(i + 1) & 511];
    return lerp(a, b, smooth(f));
  };
}

export function fbm(seed, octaves = 4) {
  const layers = [];
  for (let o = 0; o < octaves; o++) layers.push(noise1(seed + o * 7919));
  return (x) => {
    let sum = 0, amp = 1, freq = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += layers[o](x * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.07;
    }
    return sum / norm;
  };
}
