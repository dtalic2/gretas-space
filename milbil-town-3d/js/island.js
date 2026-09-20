// ---------- The shape of the ground everything else sits on ----------
//
// One source of truth for "is this tile land, and whose?", shared by the
// renderer (which builds the meshes), the placement rules (which refuse to
// build on air, or on an island you have not claimed) and the milbils (who
// would rather not walk off the edge).

import { TILE, ISLANDS } from './data.js';

// The home island's centre, in tile coordinates. Everything is measured from
// here, including the other islands, so saved towns keep their positions.
export const CENTRE = 9;

/** Stable 0..1 noise for a tile — same island every time the game loads. */
export function hash2(x, z){
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * A smooth blob rather than a circle: the radius wobbles with the angle, so an
 * island has bays and headlands but never a stray one-tile spit.
 */
export function rimRadius(isle, angle){
  return isle.r
    + Math.sin(angle * 3 + isle.wob[1]) * isle.wob[0]
    + Math.cos(angle * 5 + isle.wob[3]) * isle.wob[2];
}

/** Which island a tile belongs to, or null for open sky. */
export function isleAt(ix, iz){
  for (const isle of ISLANDS){
    const dx = ix - isle.cx, dz = iz - isle.cz;
    const d = Math.hypot(dx, dz);
    if (d < 2) return isle;                       // the middle is always solid
    if (d <= rimRadius(isle, Math.atan2(dz, dx))) return isle;
  }
  return null;
}

export const isLand = (ix, iz) => !!isleAt(ix, iz);

/**
 * The outermost ring of land is the shore: grass, rocks and bushes live there
 * and buildings do not, which keeps an island from looking like a car park.
 */
export function isBuildable(ix, iz){
  return isLand(ix, iz)
    && isLand(ix + 1, iz) && isLand(ix - 1, iz)
    && isLand(ix, iz + 1) && isLand(ix, iz - 1);
}

export const isShore = (ix, iz) => isLand(ix, iz) && !isBuildable(ix, iz);

/** The paved cross through the middle of an island. Cosmetic — build on it. */
export function isPath(ix, iz){
  const isle = isleAt(ix, iz);
  return !!isle && (ix === Math.round(isle.cx) || iz === Math.round(isle.cz));
}

/** Tile index -> world centre of that tile. */
export const worldX = (ix) => (ix - CENTRE) * TILE;
export const worldZ = (iz) => (iz - CENTRE) * TILE;

/** World position -> tile index. */
export const tileX = (x) => Math.round(x / TILE + CENTRE);
export const tileZ = (z) => Math.round(z / TILE + CENTRE);

/** Centre of a footprint anchored at (x,z) and w x d tiles big. */
export function footCentre(x, z, w, d){
  return { x: worldX(x) + (w - 1) * TILE / 2, z: worldZ(z) + (d - 1) * TILE / 2 };
}

/** Where an island sits in world space, and how wide it is. */
export function isleCentre(isle){
  return { x: worldX(isle.cx), z: worldZ(isle.cz), r: (isle.r + isle.wob[0]) * TILE };
}

/** The tile box every island fits inside — what the mesh builders walk over. */
export const BOUNDS = (() => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const isle of ISLANDS){
    const reach = isle.r + isle.wob[0] + isle.wob[2] + 1;
    x0 = Math.min(x0, Math.floor(isle.cx - reach));
    x1 = Math.max(x1, Math.ceil(isle.cx + reach));
    z0 = Math.min(z0, Math.floor(isle.cz - reach));
    z1 = Math.max(z1, Math.ceil(isle.cz + reach));
  }
  return { x0, x1, z0, z1 };
})();

/** Every land tile of one island, or of all of them. */
export function landTiles(isleId){
  const out = [];
  for (let iz = BOUNDS.z0; iz <= BOUNDS.z1; iz++){
    for (let ix = BOUNDS.x0; ix <= BOUNDS.x1; ix++){
      const isle = isleAt(ix, iz);
      if (!isle) continue;
      if (isleId != null && isle.id !== isleId) continue;
      out.push([ix, iz]);
    }
  }
  return out;
}
