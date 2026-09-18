// ---------- Drawing a Milbil ----------
//
// The same creature as Milbil Tower, traced off the original sketch inside a
// 100x100 design box: a wonky square body with a folded top-left corner, a small
// upright eye on the left and a big leaf-shaped eye on the right, a cyan grin
// over two square teeth, one arm thrown up mid-wave, and two bent legs.
//
// What is different here is that a Milbil now has to *do* things — stand, walk,
// fly through the air after a rocket, and hold a weapon pointed wherever the
// player is aiming. So the sketch is baked into four pose cycles per team, and
// the one thing that cannot be baked (the arm holding the gun, which points at
// an angle chosen a hundred times a second) is stroked live. That arm is four
// short paths; the rest of the creature is thirty, and a neon stroke is four
// blurred passes. Baking the thirty is the whole difference between 60fps and
// a hot phone.

import { neon, neonFill, wobbly, wobblyEllipse, leaf, rng } from './neon.js';
import { TAU } from './util.js';

const BOX = 100;
export const FIT = 0.76;        // design box as a fraction of the sprite (rest is glow headroom)
export const IDLE_FRAMES = 8;
export const WALK_FRAMES = 6;

/** The sketch's own colours, as [hue, sat%, light%]. A team rotates `h`. */
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

export function palette(hue) {
  const p = {};
  for (const k in BASE) {
    const [h, s, l] = BASE[k];
    p[k] = `hsl(${(h + hue + 360) % 360} ${s}% ${l}%)`;
  }
  return p;
}

/**
 * One Milbil, filling a BOX x BOX square of the current transform.
 *
 * `pose` is 'idle' | 'walk' | 'air' | 'hurt', `phase` runs 0..1 over that pose's
 * cycle, and `seed` fixes the hand-drawn wobble — it shifts a little per frame so
 * the outline *boils* the way a flip-book does.
 */
export function drawMilbil(ctx, pal, pose, phase, seed, opts = {}) {
  const { lw = 2.6, accent = null, aimArm = false } = opts;
  const rand = rng(seed);
  const w = 0.9;                                    // wobble amplitude, design units

  const walking = pose === 'walk';
  const air = pose === 'air';
  const hurt = pose === 'hurt';

  const tilt = hurt ? 0.16 : Math.sin(phase * TAU) * (walking ? 0.085 : 0.055);
  const bob = air ? -1.5 : Math.sin(phase * TAU * 2) * (walking ? 3.2 : 2);
  const wave = air ? 6 : Math.sin(phase * TAU) * (walking ? 3 : 5);
  const kick = walking ? Math.sin(phase * TAU) * 9 : Math.sin(phase * TAU + 1.1) * 3.2;
  const blink = !hurt && phase > 0.6 && phase < 0.72;
  const squash = hurt ? 1.12 : 1;

  ctx.save();
  ctx.translate(BOX / 2, BOX / 2 + bob);
  ctx.rotate(tilt);
  ctx.scale(squash, 1 / squash);
  ctx.translate(-BOX / 2, -BOX / 2);

  // --- body: deliberately not a rectangle. The sketch's square leans, and the
  //     top-left corner folds back on itself into a little flap.
  const body = wobbly([
    [36, 21], [70, 25], [68, 66], [36, 64], [31, 34], [36, 21],
  ], w, rand, 4);
  neon(ctx, body, pal.body, lw * 1.15, { glow: 1.15 });

  // --- headgear: a stub antenna in the team colour, so at a glance across a
  //     whole map you read sides before you read faces.
  if (accent) {
    neon(ctx, wobbly([[53, 23], [56, 10 + wave * 0.25]], w * 0.5, rand, 2), accent, lw * 0.85, { glow: 1.2 });
    const bulb = new Path2D();
    bulb.arc(56, 7 + wave * 0.25, 3.4, 0, TAU);
    neonFill(ctx, bulb, accent, { glow: 1.4 });
  }

  // --- eyes ---
  if (hurt) {
    const x1 = new Path2D();
    x1.moveTo(41, 30); x1.lineTo(50, 40); x1.moveTo(50, 30); x1.lineTo(41, 40);
    neon(ctx, x1, pal.eyeL, lw * 0.85);
    const x2 = new Path2D();
    x2.moveTo(54, 27); x2.lineTo(65, 38); x2.moveTo(65, 27); x2.lineTo(54, 38);
    neon(ctx, x2, pal.eyeR, lw * 0.9);
  } else if (blink) {
    neon(ctx, wobbly([[40, 35], [50, 34]], w * 0.6, rand, 2), pal.eyeL, lw * 0.85);
    neon(ctx, wobbly([[51, 32], [66, 31]], w * 0.6, rand, 2), pal.eyeR, lw * 0.95);
  } else {
    neon(ctx, wobblyEllipse(45.5, 35, 4.6, air ? 8.6 : 7.2, 0.11, rand, 16), pal.eyeL, lw * 0.85);
    neon(ctx, leaf(58.5, 32, 8.2, air ? 6.6 : 5.4, -0.1), pal.eyeR, lw * 0.95, { glow: 1.2 });
    const pd = new Path2D();
    pd.arc(46, 37.4, 1.35, 0, TAU);
    neonFill(ctx, pd, '#ffffff', { glow: 0.9 });
    const pd2 = new Path2D();
    pd2.arc(60.6, 32.2, 1.5, 0, TAU);
    neonFill(ctx, pd2, '#ffffff', { glow: 0.9 });
  }

  // --- teeth, then the grin across them ---
  const teeth = new Path2D();
  teeth.moveTo(44, 39.5);
  teeth.lineTo(59.5, 39);
  teeth.lineTo(59, 49.5);
  teeth.quadraticCurveTo(51.5, 54.5, 44.5, 49);
  teeth.closePath();
  teeth.moveTo(51.7, 39.2);
  teeth.lineTo(51.5, 52.2);
  neon(ctx, teeth, pal.teeth, lw * 0.8, { glow: 0.95 });

  const mouth = hurt
    ? wobbly([[38.5, 47], [45, 43.5], [52, 47.5], [59, 43.5], [64, 47]], w * 0.7, rand, 2)
    : air
      ? wobblyEllipse(51, 45.5, 7.5, 5.5, 0.14, rand, 14)
      : wobbly([[38.5, 45.5], [50, 43.6], [63, 42.2]], w * 0.7, rand, 3);
  neon(ctx, mouth, pal.grin, lw * 0.95, { glow: 1.25 });

  // --- the waving arm: a Milbil waves at you even while being shot at ---
  const wx = 85 + wave * 0.55, wy = (air ? 24 : 31) - wave * 0.45;
  neon(ctx, wobbly([[68, 47], [79.5, 45], [wx, wy]], w, rand, 3), pal.armUp, lw, { glow: 1.1 });
  const upHand = new Path2D();
  for (const [fx, fy] of [[wx + 4.5, wy - 13], [wx + 8.5, wy - 9.5], [wx - 4.5, wy - 9]]) {
    upHand.moveTo(wx, wy); upHand.lineTo(fx, fy);
  }
  neon(ctx, upHand, pal.armDown, lw * 0.8, { glow: 1.1 });

  // --- the low arm, only when nothing live is going to replace it ---
  if (!aimArm) {
    neon(ctx, wobbly([[36, 48], [25, 50.5], [17.5, 55]], w, rand, 3), pal.armDown, lw, { glow: 1.05 });
    const loHand = new Path2D();
    for (const [fx, fy] of [[7, 58], [11.5, 68], [19, 71]]) {
      loHand.moveTo(17.5, 55); loHand.lineTo(fx, fy);
    }
    neon(ctx, loHand, pal.hand, lw * 0.8, { glow: 1.1 });
  }

  // --- legs ---
  if (air) {
    neon(ctx, wobbly([[45, 64], [42, 76], [30, 79], [24, 74]], w, rand, 3), pal.legs, lw, { glow: 1.05 });
    neon(ctx, wobbly([[58, 65], [61, 77], [73, 81], [79, 76]], w, rand, 3), pal.legs, lw, { glow: 1.05 });
  } else {
    neon(ctx, wobbly([[45, 64], [47.5, 78 + kick * 0.35], [34 - kick, 88], [27 - kick, 86.5]], w, rand, 3), pal.legs, lw, { glow: 1.05 });
    neon(ctx, wobbly([[58, 65], [59.5, 81 - kick * 0.35], [64 + kick, 94], [73 + kick, 92]], w, rand, 3), pal.legs, lw, { glow: 1.05 });
  }

  ctx.restore();
}

function bakeFrame(px, pal, pose, phase, seed, opts) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  const k = (px * FIT) / BOX;
  g.translate((px * (1 - FIT)) / 2, (px * (1 - FIT)) / 2);
  g.scale(k, k);
  drawMilbil(g, pal, pose, phase, seed, opts);
  return c;
}

/**
 * Every pose a team's Milbils need, baked once.
 *
 * All the Milbils on a side share these sheets — six of them drawn live would be
 * a hundred and eighty shadow-blurred strokes a frame. Individuality comes from
 * where in the cycle each one is, not from separate art.
 */
export function bakeTeam(hue, accent, px) {
  const pal = palette(hue);
  const o = { lw: 2.6, accent, aimArm: true };
  const sheets = { idle: [], walk: [], air: [], hurt: [] };
  for (let f = 0; f < IDLE_FRAMES; f++) {
    sheets.idle.push(bakeFrame(px, pal, 'idle', f / IDLE_FRAMES, 1000 + hue * 7 + f * 131, o));
  }
  for (let f = 0; f < WALK_FRAMES; f++) {
    sheets.walk.push(bakeFrame(px, pal, 'walk', f / WALK_FRAMES, 2000 + hue * 7 + f * 131, o));
  }
  sheets.air.push(bakeFrame(px, pal, 'air', 0.25, 3000 + hue * 7, o));
  sheets.hurt.push(bakeFrame(px, pal, 'hurt', 0.3, 4000 + hue * 7, o));
  sheets.pal = pal;
  sheets.accent = accent;
  return sheets;
}

/** A still with both arms on, for menus and the team roster. */
export function milbilStill(hue, accent, px, seed = 7) {
  return bakeFrame(px, palette(hue), 'idle', 0.12, seed + hue * 7, { lw: 2.6, accent, aimArm: false });
}
