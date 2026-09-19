// ---------- The shape of the ground everything else sits on ----------
//
// One source of truth for "is this tile land?", shared by the renderer (which
// builds the mesh), the placement rules (which refuse to build on air) and the
// milbils (who would rather not walk off the edge).
import { GRID, TILE, ISLAND_R } from './data.js';

export const CENTRE = (GRID - 1) / 2;

/** Stable 0..1 noise for a tile — same island every time the game loads. */
export function hash2(x, z){
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * A smooth blob rather than a circle: the radius wobbles with the angle, so
 * the island has bays and headlands but never a stray one-tile spit.
 */
export function rimRadius(angle){
  return ISLAND_R
    + Math.sin(angle * 3 + 0.7) * 0.95
    + Math.cos(angle * 5 - 1.1) * 0.6;
}

export function isLand(ix, iz){
  if (ix < 0 || iz < 0 || ix >= GRID || iz >= GRID) return false;
  const dx = ix - CENTRE, dz = iz - CENTRE;
  const d = Math.hypot(dx, dz);
  if (d < 2) return true;                      // the town square is always solid
  return d <= rimRadius(Math.atan2(dz, dx));
}

/**
 * The outermost ring of land is the shore: grass, rocks and bushes live there
 * and buildings do not, which keeps the island from looking like a car park.
 */
export function isBuildable(ix, iz){
  return isLand(ix, iz)
    && isLand(ix + 1, iz) && isLand(ix - 1, iz)
    && isLand(ix, iz + 1) && isLand(ix, iz - 1);
}

export const isShore = (ix, iz) => isLand(ix, iz) && !isBuildable(ix, iz);

/** The paved cross through the middle of town. Cosmetic — you may build on it. */
export function isPath(ix, iz){
  return isLand(ix, iz) && (ix === CENTRE || iz === CENTRE);
}

/** Tile index -> world centre of that tile. */
export const worldX = (ix) => (ix - CENTRE) * TILE;
export const worldZ = (iz) => (iz - CENTRE) * TILE;

/** World position -> tile index (floor, so it matches the tile you can see). */
export const tileX = (x) => Math.round(x / TILE + CENTRE);
export const tileZ = (z) => Math.round(z / TILE + CENTRE);

/** Centre of a footprint anchored at (x,z) and w x d tiles big. */
export function footCentre(x, z, w, d){
  return { x: worldX(x) + (w - 1) * TILE / 2, z: worldZ(z) + (d - 1) * TILE / 2 };
}

/** Every land tile, once — handy for mesh building and picking wander targets. */
export function landTiles(){
  const out = [];
  for (let iz = 0; iz < GRID; iz++)
    for (let ix = 0; ix < GRID; ix++)
      if (isLand(ix, iz)) out.push([ix, iz]);
  return out;
}
