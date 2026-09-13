// ---------- Drawing a Milbil ----------
//
// One creature, traced straight off the sketch, inside a 100x100 design box:
//
//   * a wonky square body with a folded-over flap at the top-left corner
//   * a small upright eye on the left, a big leaf-shaped eye on the right
//   * a cyan grin running across two square teeth
//   * one arm thrown up mid-wave with a splayed hand, one arm out low
//   * two bent legs caught mid-dance
//
// Nothing here is drawn live during play. Every variant is baked into a strip of
// dance frames once at boot (`buildSprites`) and the game just blits them — a
// neon stroke is four shadow-blurred passes, and doing that for a dozen Milbils
// sixty times a second would melt a phone.

import { neon, neonFill, wobbly, wobblyEllipse, leaf, rng } from './neon.js';
import { TYPES, ORDER } from './types.js';

export const FRAMES = 8;          // one full dance cycle
const BOX = 100;                  // design-box units
export const FIT = 0.80;                 // how much of the sprite the design box fills (rest is glow headroom)

/** The sketch's own colours, as [hue, sat%, light%]. Variants rotate `h`. */
const BASE = {
  body:    [ 58, 92, 62],
  eyeL:    [ 74, 78, 60],
  eyeR:    [136, 96, 60],
  grin:    [186, 96, 66],
  teeth:   [122, 88, 58],
  armUp:   [318, 96, 68],
  armDown: [ 46, 92, 66],
  hand:    [205, 94, 68],
  legs:    [344, 96, 70],
};

function palette(hue) {
  const p = {};
  for (const k in BASE) {
    const [h, s, l] = BASE[k];
    p[k] = `hsl(${(h + hue) % 360} ${s}% ${l}%)`;
  }
  return p;
}

/**
 * Draw one Milbil into the current transform, filling a BOX x BOX square.
 *
 * `phase` runs 0..1 over the dance cycle. `seed` fixes the hand-drawn wobble; it
 * shifts a little per frame so the outline *boils* the way a flip-book does.
 */
export function drawMilbil(ctx, pal, phase, seed, opts = {}) {
  const { fat = 1, lw = 2.5 } = opts;
  const rand = rng(seed);
  const w = 0.9;                                   // wobble amplitude, design units
  const TAU = Math.PI * 2;

  // --- dance -------------------------------------------------------------
  const tilt = Math.sin(phase * TAU) * 0.055;      // whole-body sway
  const bob  = Math.sin(phase * TAU * 2) * 2.0;    // little vertical bounce
  const wave = Math.sin(phase * TAU) * 5.0;        // the raised hand waving
  const kick = Math.sin(phase * TAU + 1.1) * 3.2;  // legs alternating
  const blink = phase > 0.60 && phase < 0.72;      // eyes shut for one beat

  ctx.save();
  ctx.translate(BOX / 2, BOX / 2 + bob);
  ctx.rotate(tilt);
  ctx.scale(fat, 1);
  ctx.translate(-BOX / 2, -BOX / 2);

  // --- body --------------------------------------------------------------
  // Deliberately not a rectangle: the sketch's square leans, and the top-left
  // corner folds back on itself into a little flap.
  const body = wobbly([
    [36, 21], [70, 25], [68, 66], [36, 64], [31, 34], [36, 21],
  ], w, rand, 4);
  neon(ctx, body, pal.body, lw * 1.15, { glow: 1.15 });

  // --- eyes --------------------------------------------------------------
  if (blink) {
    neon(ctx, wobbly([[40, 35], [50, 34]], w * 0.6, rand, 2), pal.eyeL, lw * 0.85);
    neon(ctx, wobbly([[51, 32], [66, 31]], w * 0.6, rand, 2), pal.eyeR, lw * 0.95);
  } else {
    // left: small upright oval
    neon(ctx, wobblyEllipse(45.5, 35, 4.6, 7.2, 0.11, rand, 16), pal.eyeL, lw * 0.85);
    // right: the big leaf, the one that gives a Milbil its lopsided stare
    neon(ctx, leaf(58.5, 32, 8.2, 5.4, -0.10), pal.eyeR, lw * 0.95, { glow: 1.2 });
    // pupils, both looking slightly off to one side
    const pd = new Path2D();
    pd.arc(46.0, 37.4, 1.35, 0, TAU);
    neonFill(ctx, pd, '#ffffff', { glow: 0.9 });
    const pd2 = new Path2D();
    pd2.arc(60.6, 32.2, 1.5, 0, TAU);
    neonFill(ctx, pd2, '#ffffff', { glow: 0.9 });
  }

  // --- teeth, then the grin across them ----------------------------------
  const teeth = new Path2D();
  teeth.moveTo(44, 39.5);
  teeth.lineTo(59.5, 39.0);
  teeth.lineTo(59.0, 49.5);
  teeth.quadraticCurveTo(51.5, 54.5, 44.5, 49.0);
  teeth.closePath();
  teeth.moveTo(51.7, 39.2);
  teeth.lineTo(51.5, 52.2);
  neon(ctx, teeth, pal.teeth, lw * 0.8, { glow: 0.95 });

  neon(ctx, wobbly([[38.5, 45.5], [50, 43.6], [63, 42.2]], w * 0.7, rand, 3), pal.grin, lw * 0.95, { glow: 1.25 });

  // --- raised arm, mid-wave ----------------------------------------------
  const wx = 85 + wave * 0.55, wy = 31 - wave * 0.45;
  neon(ctx, wobbly([[68, 47], [79.5, 45], [wx, wy]], w, rand, 3), pal.armUp, lw, { glow: 1.1 });
  const upHand = new Path2D();
  for (const [fx, fy] of [[wx + 4.5, wy - 13], [wx + 8.5, wy - 9.5], [wx - 4.5, wy - 9]]) {
    upHand.moveTo(wx, wy); upHand.lineTo(fx, fy);
  }
  neon(ctx, upHand, pal.armDown, lw * 0.8, { glow: 1.1 });

  // --- low arm, fingers splayed ------------------------------------------
  neon(ctx, wobbly([[36, 48], [25, 50.5], [17.5, 55]], w, rand, 3), pal.armDown, lw, { glow: 1.05 });
  const loHand = new Path2D();
  for (const [fx, fy] of [[7, 58], [11.5, 68], [19, 71]]) {
    loHand.moveTo(17.5, 55); loHand.lineTo(fx, fy);
  }
  neon(ctx, loHand, pal.hand, lw * 0.8, { glow: 1.1 });

  // --- legs, caught mid-step ---------------------------------------------
  neon(ctx, wobbly([[45, 64], [47.5, 78 + kick * 0.35], [34 - kick, 88], [27 - kick, 86.5]], w, rand, 3), pal.legs, lw, { glow: 1.05 });
  neon(ctx, wobbly([[58, 65], [59.5, 81 - kick * 0.35], [64 + kick, 94], [73 + kick, 92]], w, rand, 3), pal.legs, lw, { glow: 1.05 });

  ctx.restore();
}

/** Bake one variant's dance cycle at a given pixel size. */
export function buildSpriteFor(key, px) {
  const t = TYPES[key];
  const pal = palette(t.hue);
  const frames = [];
  for (let f = 0; f < FRAMES; f++) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    const c = cv.getContext('2d');
    const k = (px * FIT) / BOX;
    c.translate(px * (1 - FIT) / 2, px * (1 - FIT) / 2);
    c.scale(k, k);
    // The seed shifts per frame so the outline boils like hand-drawn animation.
    drawMilbil(c, pal, f / FRAMES, 1000 + t.hue * 7 + f * 131, {
      fat: t.boss ? 1.06 : 1,
      lw: t.boss ? 3.1 : 2.5,
    });
    frames.push(cv);
  }
  return frames;
}

/**
 * How big a variant's sprite needs to be for the current board.
 *
 * Sized per variant rather than one size for all: a MEGA is over twice the width
 * of a Zippy, and baking every variant at the MEGA's resolution would waste tens
 * of megabytes on a phone for no visible gain.
 */
export function spritePx(key, cell, dpr) {
  const t = TYPES[key];
  const want = (cell * t.scale / FIT) * Math.min(2, dpr);
  return Math.round(Math.max(160, Math.min(360, want)));
}

/**
 * Bake every variant, yielding to the browser between them so the boot bar can
 * actually paint. Nothing here is drawn live during play — a neon stroke is four
 * shadow-blurred passes, and doing that for a dozen Milbils sixty times a second
 * would melt a phone.
 */
export async function buildSprites(cell, dpr, onProgress) {
  const sheets = {};
  for (let i = 0; i < ORDER.length; i++) {
    const key = ORDER[i];
    sheets[key] = buildSpriteFor(key, spritePx(key, cell, dpr));
    onProgress?.((i + 1) / ORDER.length);
    await new Promise((r) => requestAnimationFrame(r));
  }
  return sheets;
}

/** A single still, for the shop and the field guide. */
export function milbilStill(key, px) {
  const t = TYPES[key];
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const c = cv.getContext('2d');
  const k = (px * FIT) / BOX;
  c.translate(px * (1 - FIT) / 2, px * (1 - FIT) / 2);
  c.scale(k, k);
  drawMilbil(c, palette(t.hue), 0.12, 1000 + t.hue * 7, { lw: 2.5 });
  return cv;
}
