// ---------- Real-world maths, and where things are on the map ----------
//
// Nothing about the world is stored. Shops and wild milbils are worked out from
// the latitude/longitude grid and the clock, so:
//   * a shop is always on the same corner, for everyone, forever;
//   * milbils come and go on their own timers even while the game is shut;
//   * reloading never rerolls anything.

import { SHOP_TYPES, KEEPERS, SPECIES, RARITY,
         SHOP_CELL_M, SPAWN_CELL_M, SPAWN_PERIOD_S, SPAWN_CHANCE } from './data.js';

export const EARTH_R = 6371000;
const M_PER_DEG_LAT = 111320;
const D2R = Math.PI / 180;

// ---------------------------------------------------------------- mercator ---

/** Web-mercator world pixel at fractional zoom z (256px tiles). */
export function toWorld(lat, lng, z){
  const s = 256 * Math.pow(2, z);
  const sin = Math.sin(Math.max(-85.05, Math.min(85.05, lat)) * D2R);
  return {
    x: (lng + 180) / 360 * s,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s,
  };
}

/** Metres per world pixel at this latitude and zoom. */
export const metersPerPixel = (lat, z) => 156543.03392 * Math.cos(lat * D2R) / Math.pow(2, z);

// --------------------------------------------------------------- distances ---

/** Metres between two points. Equirectangular — exact enough at walking range. */
export function distance(a, b){
  const x = (b.lng - a.lng) * D2R * Math.cos((a.lat + b.lat) / 2 * D2R);
  const y = (b.lat - a.lat) * D2R;
  return Math.hypot(x, y) * EARTH_R;
}

/** Compass bearing in degrees, 0 = north, clockwise. */
export function bearingTo(a, b){
  const x = (b.lng - a.lng) * Math.cos((a.lat + b.lat) / 2 * D2R);
  const y = b.lat - a.lat;
  return (Math.atan2(x, y) / D2R + 360) % 360;
}

/** Move a point by metres east / north. */
export function offset(p, east, north){
  return {
    lat: p.lat + north / M_PER_DEG_LAT,
    lng: p.lng + east / (M_PER_DEG_LAT * Math.cos(p.lat * D2R)),
  };
}

// ----------------------------------------------------------------- hashing ---

/** murmur3 finaliser over a mix of integers — a stable dice roll per input. */
export function hash(...ns){
  let h = 0x2545f491;
  for (const n of ns){
    h = Math.imul(h ^ (n | 0), 0x9e3779b1);
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}
/** 0..1 from a hash. */
export const roll = (...ns) => hash(...ns) / 4294967296;

function weighted(entries, r){
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = r * total;
  for (const [key, w] of entries){ if ((x -= w) < 0) return key; }
  return entries[entries.length - 1][0];
}

// -------------------------------------------------------------------- grid ---
// Rows are a fixed height everywhere. Each row's columns are sized for the
// latitude of its one-degree band, so cells stay roughly square in metres from
// the equator to Scotland, and every row has one unambiguous set of columns
// no matter where the player is standing.

function* cellsNear(p, radiusM, cellM){
  const dLat = cellM / M_PER_DEG_LAT;
  const r0 = Math.floor((p.lat - radiusM / M_PER_DEG_LAT) / dLat);
  const r1 = Math.floor((p.lat + radiusM / M_PER_DEG_LAT) / dLat);
  for (let row = r0; row <= r1; row++){
    const band = Math.round(row * dLat);
    const dLng = cellM / (M_PER_DEG_LAT * Math.cos(band * D2R));
    const span = radiusM / (M_PER_DEG_LAT * Math.cos(p.lat * D2R));
    const c0 = Math.floor((p.lng - span) / dLng);
    const c1 = Math.floor((p.lng + span) / dLng);
    for (let col = c0; col <= c1; col++) yield { row, col, dLat, dLng };
  }
}

/** A point inside a cell, kept off the edges so neighbours don't clump. */
const inCell = (c, u, v) => ({
  lat: (c.row + 0.15 + 0.7 * u) * c.dLat,
  lng: (c.col + 0.15 + 0.7 * v) * c.dLng,
});

// ------------------------------------------------------------------- shops ---
// Shop lots come in blocks of 3x2 cells. Each block holds exactly one of every
// kind of shop plus one empty lot, shuffled differently in every block. So
// wherever you stand, all five kinds are a short walk away — never a long hike
// because the dice put every Market somewhere else.

const BLOCK = [...Object.keys(SHOP_TYPES), null];
const mod = (a, n) => ((a % n) + n) % n;

function shopTypeAt(row, col){
  const br = Math.floor(row / 2), bc = Math.floor(col / 3);
  const order = BLOCK.slice();
  for (let i = order.length - 1; i > 0; i--){
    const j = hash(16, br, bc, i) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order[mod(row, 2) * 3 + mod(col, 3)];
}

/** Every shop within radiusM of p, nearest first. */
export function shopsNear(p, radiusM){
  const out = [];
  for (const c of cellsNear(p, radiusM, SHOP_CELL_M)){
    const type = shopTypeAt(c.row, c.col);
    if (!type) continue;
    const pos = inCell(c, roll(12, c.row, c.col), roll(13, c.row, c.col));
    const d = distance(p, pos);
    if (d > radiusM) continue;
    const keeper = KEEPERS[hash(15, c.row, c.col) % KEEPERS.length];
    out.push({ id:`s${c.row}_${c.col}`, kind:'shop', type, keeper, ...pos, d,
               name:`${keeper}'s ${SHOP_TYPES[type].name}` });
  }
  return out.sort((a, b) => a.d - b.d);
}

// ----------------------------------------------------------------- milbils ---

/** Night for spawning purposes: 7pm to 6am, local time. */
export const isNight = (t) => { const h = new Date(t).getHours(); return h >= 19 || h < 6; };

function speciesEntries(night){
  return SPECIES.map(s => {
    const tier = SPECIES.filter(o => o.rarity === s.rarity).length;
    let w = RARITY[s.rarity].weight / tier;
    if (s.night) w *= night ? 4 : 0.35;
    return [s.id, w];
  });
}
const DAY_ENTRIES = speciesEntries(false);
const NIGHT_ENTRIES = speciesEntries(true);

/**
 * Every wild milbil out right now within radiusM of p.
 * Each cell has its own phase, so they don't all turn over at once. In each
 * five-minute window a cell may get one milbil, which shows up a little after
 * the window opens and wanders off two to four minutes later.
 */
export function milbilsNear(p, radiusM, now = Date.now()){
  const out = [];
  const period = SPAWN_PERIOD_S * 1000;
  for (const c of cellsNear(p, radiusM, SPAWN_CELL_M)){
    const phase = hash(21, c.row, c.col) % period;
    const bucket = Math.floor((now + phase) / period);
    if (roll(22, c.row, c.col, bucket) >= SPAWN_CHANCE) continue;
    const start = bucket * period - phase;
    const appear = start + roll(23, c.row, c.col, bucket) * 60000;
    const leave = appear + 120000 + roll(24, c.row, c.col, bucket) * 120000;
    if (now < appear || now >= leave) continue;
    const pos = inCell(c, roll(25, c.row, c.col, bucket), roll(26, c.row, c.col, bucket));
    const d = distance(p, pos);
    if (d > radiusM) continue;
    const species = weighted(isNight(appear) ? NIGHT_ENTRIES : DAY_ENTRIES, roll(27, c.row, c.col, bucket));
    out.push({ id:`m${c.row}_${c.col}_${bucket}`, kind:'milbil', species, ...pos, d, leave });
  }
  return out.sort((a, b) => a.d - b.d);
}
