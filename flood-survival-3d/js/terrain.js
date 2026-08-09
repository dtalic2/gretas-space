// ---------- The valley ----------
//
// One analytic height function is the single source of truth. The mesh, the
// player's feet, the water's shoreline and every prop's altitude all read
// height() — so nothing can ever disagree about where the ground is.
//
// The valley is a closed basin: the rim tops out at RIM_Y, which is *below* the
// water level of the final surge. There is deliberately no natural high ground
// that survives the flood. The only way out is something you build.
import * as THREE from 'three';

export const WORLD = 132;              // terrain spans WORLD x WORLD, centred on origin
export const HALF = WORLD / 2;
export const BOUND = HALF - 3;         // how far the player may walk
export const RIM_Y = 8.35;             // highest natural ground in the valley

const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = (v, a, b) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

/** Centre line of the river at a given z. The river runs north-south. */
export function riverX(z){
  return 16 + 9 * Math.sin(z * 0.045);
}

// Flat pads. Each named place gets one so a building sits level and — more
// importantly — so the day it floods is a number we chose rather than one we
// found out about later.
export const SITES = {
  homestead: { x:   0, z:  16, y: 6.40, r: 14, s: 9, label: 'Homestead' },
  woods:     { x: -34, z:  30, y: 5.60, r: 10, s: 7, label: 'The Woods' },
  claypit:   { x: -16, z: -26, y: 3.40, r:  8, s: 6, label: 'Clay Pit' },
  junkyard:  { x:  34, z:  34, y: 2.20, r:  9, s: 7, label: 'Junk Pile' },
  marsh:     { x:  28, z:  -4, y: 0.50, r: 11, s: 9, label: 'Reed Marsh' },
  ridge:     { x: -44, z: -42, y: 8.20, r: 10, s: 9, label: 'Cedar Ridge' },
};

// Marv's depot is a barge — it floats, so it stays reachable all game. Its x
// comes from the river so it always sits in the channel.
export const DEPOT = { x: riverX(30), z: 30, label: "Marv's Depot" };

/** Rolling ground before pads and river are applied. */
function base(x, z){
  const d = Math.hypot(x, z);
  let h = 3.30
    + 1.15 * Math.sin(x * 0.052) * Math.cos(z * 0.047)
    + 0.55 * Math.sin(x * 0.118 + 1.7) * Math.sin(z * 0.101 - 0.4)
    + 0.22 * Math.sin(x * 0.31 + z * 0.27);
  // Valley walls. Past d=63 the ground is exactly RIM_Y, which caps the whole
  // terrain — the surge is written to clear it.
  return mix(h, RIM_Y, smooth(d, 42, 63));
}

/** Ground height at a world position. */
export function height(x, z){
  let h = base(x, z);

  // Pads, flattened with a soft skirt so they blend into the rolling ground.
  for (const p of Object.values(SITES)){
    const t = 1 - smooth(Math.hypot(x - p.x, z - p.z), p.r, p.r + p.s);
    if (t > 0) h = mix(h, p.y, t);
  }

  // The river is cut last so it carves through pads and rim alike and can
  // actually leave the valley at both ends.
  const dr = x - riverX(z);
  h -= 7.0 * Math.exp(-(dr * dr) / 95);

  return h;
}

/** Upward normal of the ground, by finite difference. Used to orient props. */
export function normalAt(x, z, out = new THREE.Vector3()){
  const e = 0.6;
  const hl = height(x - e, z), hr = height(x + e, z);
  const hd = height(x, z - e), hu = height(x, z + e);
  return out.set(hl - hr, 2 * e, hd - hu).normalize();
}

/** Steepness 0..1, so we can keep trees and rocks off cliff faces. */
export function slopeAt(x, z){
  const n = normalAt(x, z);
  return 1 - n.y;
}

// ---------------------------------------------------------------------------

const GRASS_LOW  = new THREE.Color(0x4a7a3c);
const GRASS_HIGH = new THREE.Color(0x6f9350);
const MUD        = new THREE.Color(0x6b5a3e);
const SAND       = new THREE.Color(0x9c8a63);
const ROCK       = new THREE.Color(0x7d7b74);

/**
 * The terrain mesh, plus a height texture the water shader samples.
 *
 * Vertex colours rather than textures: it keeps the look consistent with the
 * flat-shaded props and costs nothing to author.
 */
export function buildTerrain(){
  const SEG = 168;
  const geo = new THREE.PlaneGeometry(WORLD, WORLD, SEG, SEG);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++){
    const x = pos.getX(i), z = pos.getZ(i);
    const y = height(x, z);
    pos.setY(i, y);

    // Riverbank sand, then mud in the flood plain, then grass climbing to rock.
    const dr = Math.abs(x - riverX(z));
    if (y < -0.6)            c.copy(MUD).lerp(SAND, smooth(y, -3.6, -0.6));
    else if (dr < 12 && y < 1.6) c.copy(SAND).lerp(GRASS_LOW, smooth(dr, 6, 12));
    else                     c.copy(GRASS_LOW).lerp(GRASS_HIGH, smooth(y, 1.0, 7.0));

    if (y > 7.2) c.lerp(ROCK, smooth(y, 7.4, RIM_Y));

    // Break up the flat colour with a little dirt speckle.
    const n = Math.sin(x * 1.7) * Math.sin(z * 1.9);
    c.offsetHSL(0, 0, n * 0.018);

    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Height field as a float texture, for the water shader.
 *
 * The water is one huge plane; it decides per pixel whether that spot is
 * actually under water by comparing the flood level to this. That is what
 * gives a pixel-exact shoreline for free, and why the shoreline is always in
 * agreement with the ground the player is standing on.
 */
export function buildHeightTexture(){
  const N = 512;
  const data = new Float32Array(N * N);
  for (let j = 0; j < N; j++){
    const z = (j / (N - 1) - 0.5) * WORLD;
    for (let i = 0; i < N; i++){
      const x = (i / (N - 1) - 0.5) * WORLD;
      data[j * N + i] = height(x, z);
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}
