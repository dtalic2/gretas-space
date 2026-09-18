// ---------- The ground ----------
//
// Everything a worms game is about lives in this file: a lump of land you can
// blow holes in. It is kept four ways at once, because each of them answers a
// different question fast:
//
//   solid   Uint8Array, one byte per world pixel — "can I stand here?", asked
//           hundreds of times a frame by movement and flying weapons.
//   mask    a canvas of white where the land is — the shape, for compositing.
//   paint   the mask wearing its strata, speckle and scorch marks — what you see.
//   rim     the lit edge, plus a downsampled copy of it used as bloom.
//
// A crater updates `solid` and `mask` immediately, then flags the terrain dirty;
// the expensive half (repainting and re-finding the edge) happens once per frame
// no matter how many bombs went off in it. A cluster bomb landing five bomblets
// in one tick costs the same as one.

import { fbm, seeded, clamp, TAU } from './util.js';

export const WORLD = { w: 1700, h: 950 };

const RIM_SCALE = 0.5;    // the lit edge is found at half resolution
const BLOOM_SCALE = 0.14; // ...and its bloom at a seventh, then scaled back up
const RIM_PX = 5;         // how thick the lit edge is, in world pixels

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** A closed wobbly blob, used for islands, caves and bites out of the surface. */
function blob(ctx, cx, cy, rx, ry, rand, wob = 0.22, segs = 20) {
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * TAU;
    const k = 1 + (rand() - 0.5) * 2 * wob;
    const x = cx + Math.cos(a) * rx * k;
    const y = cy + Math.sin(a) * ry * k;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

export class Terrain {
  constructor(theme, seed) {
    this.w = WORLD.w;
    this.h = WORLD.h;
    this.theme = theme;
    this.seed = seed >>> 0;

    this.mask = cv(this.w, this.h);
    this.texture = cv(this.w, this.h);
    this.scorch = cv(this.w, this.h);
    this.paint = cv(this.w, this.h);
    this.rim = cv(this.w * RIM_SCALE, this.h * RIM_SCALE);
    this.erode = cv(this.w * RIM_SCALE, this.h * RIM_SCALE);
    this.bloom = cv(this.w * BLOOM_SCALE, this.h * BLOOM_SCALE);

    this.solid = new Uint8Array(this.w * this.h);
    this.dirty = true;

    this.generate();
    this.readSolid();      // the texture is shaded off the real surface, so this first
    this.bakeTexture();
    this.refresh();
  }

  // ---------- generation ----------

  generate() {
    const rand = seeded(this.seed);
    const { w, h } = this;
    const c = this.mask.getContext('2d');
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#fff';

    const rolling = fbm(this.seed + 11, 4);
    const bumps = fbm(this.seed + 23, 3);
    const fine = fbm(this.seed + 37, 2);

    // Style decides how the ground is broken up. All three are playable from
    // both sides — the spawn picker in game.js needs somewhere flat at each end.
    const style = ['hills', 'islands', 'mesas'][(rand() * 3) | 0];
    this.style = style;

    const base = h * (style === 'islands' ? 0.52 : 0.58);
    const amp = style === 'mesas' ? 120 : 200;
    const surface = (x) =>
      clamp(
        base +
          (rolling(x / 520) - 0.5) * 2 * amp +
          (bumps(x / 150) - 0.5) * 2 * 54 +
          (fine(x / 38) - 0.5) * 2 * 13,
        h * 0.2,
        h * 0.82,
      );

    // --- the land itself ---
    c.beginPath();
    c.moveTo(-40, h + 40);
    for (let x = -40; x <= w + 40; x += 6) c.lineTo(x, surface(x));
    c.lineTo(w + 40, h + 40);
    c.closePath();
    c.fill();

    // --- mesas: flat-topped blocks that make good, dangerous perches ---
    if (style === 'mesas') {
      const n = 2 + ((rand() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const x = w * (0.16 + 0.68 * (i + rand() * 0.6) / n);
        const bw = 110 + rand() * 150;
        const top = surface(x) - (90 + rand() * 130);
        c.beginPath();
        c.moveTo(x - bw, h);
        c.lineTo(x - bw * (0.75 + rand() * 0.2), top + 14);
        for (let t = -1; t <= 1; t += 0.12) {
          c.lineTo(x + bw * 0.8 * t, top + (rand() - 0.5) * 7);
        }
        c.lineTo(x + bw * (0.75 + rand() * 0.2), top + 14);
        c.lineTo(x + bw, h);
        c.closePath();
        c.fill();
      }
    }

    // --- islands: chasms cut clean through to the water ---
    if (style === 'islands') {
      const cuts = 2 + ((rand() * 2) | 0);
      c.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < cuts; i++) {
        const cx = w * (0.22 + (0.56 * (i + 0.5)) / cuts) + (rand() - 0.5) * 90;
        const half = 58 + rand() * 52;
        // Walls wander with noise rather than jittering per vertex: random
        // vertices give a sawtooth, which reads as a mistake, not as rock.
        const left = fbm(this.seed + 600 + i * 13, 2);
        const right = fbm(this.seed + 900 + i * 13, 2);
        c.beginPath();
        c.moveTo(cx - half, h + 30);
        for (let y = h + 30; y > h * 0.08; y -= 22) {
          c.lineTo(cx - half * (0.72 + left(y / 190) * 0.62), y);
        }
        for (let y = h * 0.08; y < h + 30; y += 22) {
          c.lineTo(cx + half * (0.72 + right(y / 190) * 0.62), y);
        }
        c.closePath();
        c.fill();
      }
      c.globalCompositeOperation = 'source-over';
    }

    // --- floating islands, for the shots nobody expects ---
    const floaters = 1 + ((rand() * 3) | 0);
    for (let i = 0; i < floaters; i++) {
      const x = w * (0.12 + rand() * 0.76);
      const y = h * (0.16 + rand() * 0.3);
      blob(c, x, y, 60 + rand() * 90, 22 + rand() * 26, rand, 0.2);
    }

    // --- caves and overhangs, bitten back out ---
    c.globalCompositeOperation = 'destination-out';
    const caves = 3 + ((rand() * 4) | 0);
    for (let i = 0; i < caves; i++) {
      const x = w * (0.08 + rand() * 0.84);
      const y = surface(x) + 60 + rand() * 220;
      blob(c, x, Math.min(y, h - 40), 40 + rand() * 90, 26 + rand() * 60, rand, 0.3);
    }
    const bites = 2 + ((rand() * 3) | 0);
    for (let i = 0; i < bites; i++) {
      const x = w * (0.08 + rand() * 0.84);
      blob(c, x, surface(x) + 24, 34 + rand() * 60, 20 + rand() * 34, rand, 0.32);
    }
    c.globalCompositeOperation = 'source-over';
  }

  /**
   * The unchanging colour of rock.
   *
   * The thing that makes a 2D map read as *land* and not as a silhouette is a
   * lit crust: a band of brighter colour that hugs the surface wherever the
   * surface happens to be, with strata running parallel to it underneath. Both
   * are built off the real per-column surface read back out of the mask, so
   * floating islands and cave roofs get the same treatment as the main ground.
   */
  bakeTexture() {
    const { w, h } = this;
    const c = this.texture.getContext('2d');
    const t = this.theme;
    const rand = seeded(this.seed + 5501);

    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, t.rock[0]);
    g.addColorStop(0.45, t.rock[1]);
    g.addColorStop(1, t.rock[2]);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);

    // --- per-column surface, sampled once ---
    const STEP = 3;
    const cols = Math.ceil(w / STEP) + 1;
    const surf = new Float32Array(cols);
    for (let i = 0; i < cols; i++) surf[i] = this.surfaceAt(Math.min(w - 1, i * STEP));

    // --- lit crust: the surface polyline stroked wide and soft, three times.
    //     Stroking rather than filling per column is what keeps it seamless —
    //     column strips leave a comb of vertical edges wherever the surface
    //     steps. Half of each stroke lands above the surface and is cut away
    //     when the texture is clipped to the mask, which is exactly what makes
    //     the band hug the ground however the ground is shaped.
    const surfacePath = (jumpLimit) => {
      c.beginPath();
      let pen = false;
      for (let i = 0; i < cols; i++) {
        const y = surf[i];
        if (y >= h - 1) { pen = false; continue; }
        // A cliff is a jump, not a line: drawing through it streaks the rock.
        if (pen && Math.abs(y - surf[i - 1]) > jumpLimit) pen = false;
        if (pen) c.lineTo(i * STEP, y);
        else { c.moveTo(i * STEP, y); pen = true; }
      }
    };

    c.lineJoin = 'round';
    c.lineCap = 'round';
    for (const [width, alpha] of [[190, 0.35], [90, 0.5], [34, 0.8], [10, 1]]) {
      c.globalAlpha = alpha;
      c.strokeStyle = t.crust;
      c.lineWidth = width;
      surfacePath(70);
      c.stroke();
    }
    c.globalAlpha = 1;

    // --- strata, running parallel to the surface ---
    const wave = fbm(this.seed + 77, 3);
    for (let band = 0; band < 9; band++) {
      const depth = 52 + band * 44;
      c.strokeStyle = t.strata;
      c.globalAlpha = Math.max(0.16, 0.85 - band * 0.085);
      c.lineWidth = 2 + (band % 3);
      c.beginPath();
      let pen = false;
      for (let i = 0; i < cols; i++) {
        const y = surf[i] + depth + (wave((i * STEP) / 220 + band * 3.7) - 0.5) * 2 * 16;
        if (y >= h || surf[i] >= h - 1) { pen = false; continue; }
        if (pen && Math.abs(surf[i] - surf[i - 1]) > 70) pen = false;
        if (pen) c.lineTo(i * STEP, y);
        else { c.moveTo(i * STEP, y); pen = true; }
      }
      c.stroke();
    }
    c.globalAlpha = 1;

    // --- grit, so large flat areas are not dead colour ---
    for (let i = 0; i < 3200; i++) {
      const x = rand() * w, y = rand() * h, r = 0.6 + rand() * 2.1;
      c.fillStyle = rand() < 0.45 ? 'rgba(255,255,255,.055)' : 'rgba(0,0,0,.2)';
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
    }
  }

  /** Copy the mask's alpha into the byte array the physics reads. */
  readSolid() {
    const { w, h } = this;
    const data = this.mask.getContext('2d', { willReadFrequently: true })
      .getImageData(0, 0, w, h).data;
    const s = this.solid;
    for (let i = 0, p = 3; i < s.length; i++, p += 4) s[i] = data[p] > 110 ? 1 : 0;
  }

  // ---------- queries ----------

  solidAt(x, y) {
    const xi = x | 0, yi = y | 0;
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return false;
    return this.solid[yi * this.w + xi] === 1;
  }

  /** First solid pixel at or below `y`, scanning down. `h` if there is none. */
  groundBelow(x, y) {
    const xi = clamp(x | 0, 0, this.w - 1);
    for (let yy = Math.max(0, y | 0); yy < this.h; yy++) {
      if (this.solid[yy * this.w + xi]) return yy;
    }
    return this.h;
  }

  /** Top of the land in this column, scanning from the sky down. */
  surfaceAt(x) {
    return this.groundBelow(x, 0);
  }

  /**
   * Which way "out of the ground" points here, by sampling a ring. Used for
   * bouncing grenades: a flat floor gives (0,-1), a wall gives (±1,0), and a
   * slope gives what you would expect in between.
   */
  normalAt(x, y, r = 7) {
    let nx = 0, ny = 0;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const dx = Math.cos(a), dy = Math.sin(a);
      if (this.solidAt(x + dx * r, y + dy * r)) { nx -= dx; ny -= dy; }
    }
    const len = Math.hypot(nx, ny);
    if (len < 0.001) return { x: 0, y: -1 };
    return { x: nx / len, y: ny / len };
  }

  /** True if a straight line between two points passes through rock. */
  blocked(x0, y0, x1, y1, step = 6) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(d / step));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this.solidAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return true;
    }
    return false;
  }

  // ---------- destruction ----------

  /**
   * Blow a hole. The byte array is updated by hand rather than read back from
   * the mask — reading pixels back is the single slowest thing you can do to a
   * canvas, and an explosion is a circle, which is trivial to rasterise.
   */
  crater(cx, cy, r) {
    const { w, h } = this;
    const x0 = clamp((cx - r) | 0, 0, w - 1), x1 = clamp((cx + r) | 0, 0, w - 1);
    const y0 = clamp((cy - r) | 0, 0, h - 1), y1 = clamp((cy + r) | 0, 0, h - 1);
    const rr = r * r;
    for (let y = y0; y <= y1; y++) {
      const dy = y - cy, row = y * w;
      const span = Math.sqrt(Math.max(0, rr - dy * dy));
      const a = clamp(Math.ceil(cx - span), 0, w - 1);
      const b = clamp(Math.floor(cx + span), 0, w - 1);
      for (let x = a; x <= b; x++) this.solid[row + x] = 0;
    }

    const m = this.mask.getContext('2d');
    m.save();
    m.globalCompositeOperation = 'destination-out';
    m.beginPath();
    m.arc(cx, cy, r, 0, TAU);
    m.fill();
    m.restore();

    // Scorch: a burnt lip just inside the new edge, so old craters read as old.
    const s = this.scorch.getContext('2d');
    const g = s.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 1.5);
    g.addColorStop(0, 'rgba(0,0,0,.55)');
    g.addColorStop(0.55, 'rgba(0,0,0,.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    s.fillStyle = g;
    s.beginPath();
    s.arc(cx, cy, r * 1.5, 0, TAU);
    s.fill();

    this.dirty = true;
  }

  // ---------- repaint ----------

  /** Rebuild what you actually see. Called at most once a frame. */
  refresh() {
    if (!this.dirty) return;
    this.dirty = false;
    const { w, h } = this;

    // paint = (texture + scorch) clipped to the mask
    const p = this.paint.getContext('2d');
    p.setTransform(1, 0, 0, 1, 0, 0);
    p.globalCompositeOperation = 'source-over';
    p.clearRect(0, 0, w, h);
    p.drawImage(this.texture, 0, 0);
    p.drawImage(this.scorch, 0, 0);
    p.globalCompositeOperation = 'destination-in';
    p.drawImage(this.mask, 0, 0);
    p.globalCompositeOperation = 'source-over';

    // rim = mask minus mask-eroded-by-RIM_PX, tinted. Erosion is the
    // intersection of the mask with itself shifted in eight directions, which
    // is eight blits at half resolution — far cheaper than touching pixels.
    const rw = this.rim.width, rh = this.rim.height;
    const e = this.erode.getContext('2d');
    e.setTransform(1, 0, 0, 1, 0, 0);
    e.globalCompositeOperation = 'source-over';
    e.clearRect(0, 0, rw, rh);
    e.drawImage(this.mask, 0, 0, rw, rh);
    e.globalCompositeOperation = 'destination-in';
    const k = RIM_PX * RIM_SCALE;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      e.drawImage(this.mask, Math.cos(a) * k, Math.sin(a) * k, rw, rh);
    }

    const r = this.rim.getContext('2d');
    r.setTransform(1, 0, 0, 1, 0, 0);
    r.globalCompositeOperation = 'source-over';
    r.clearRect(0, 0, rw, rh);
    r.drawImage(this.mask, 0, 0, rw, rh);
    r.globalCompositeOperation = 'destination-out';
    r.drawImage(this.erode, 0, 0);
    r.globalCompositeOperation = 'source-in';
    r.fillStyle = this.theme.rim;
    r.fillRect(0, 0, rw, rh);
    r.globalCompositeOperation = 'source-over';

    // bloom = the rim, tiny. Scaled back up at draw time it is a free blur, and
    // unlike ctx.filter it works everywhere.
    const b = this.bloom.getContext('2d');
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, this.bloom.width, this.bloom.height);
    b.drawImage(this.rim, 0, 0, this.bloom.width, this.bloom.height);
  }

  /**
   * Draw in world space; the caller has already applied the camera.
   *
   * `rect` is the visible world rectangle. Blitting the whole 1700x950 plate
   * three times a frame when a phone can see a fifth of it is the difference
   * between 60fps and 15 — the browser still samples every source pixel even
   * where the result lands off screen.
   */
  draw(ctx, rect) {
    this.refresh();
    const x0 = clamp(rect.x0, 0, this.w), x1 = clamp(rect.x1, 0, this.w);
    const y0 = clamp(rect.y0, 0, this.h), y1 = clamp(rect.y1, 0, this.h);
    const sw = x1 - x0, sh = y1 - y0;
    if (sw <= 0 || sh <= 0) return;

    const blit = (img, alpha, mode) => {
      const k = img.width / this.w;
      ctx.save();
      if (mode) ctx.globalCompositeOperation = mode;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, x0 * k, y0 * k, sw * k, sh * k, x0, y0, sw, sh);
      ctx.restore();
    };

    blit(this.bloom, 0.5, 'lighter');
    blit(this.paint, 1, null);
    blit(this.rim, 0.95, 'lighter');
  }
}
