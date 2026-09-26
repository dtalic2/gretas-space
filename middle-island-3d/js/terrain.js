// ---------- The island: one height function, and everything built from it ----------
//
// `height(x, z)` is the single source of truth for where the ground is. The mesh,
// the player's feet, building foundations and every tree read it, so nothing can
// disagree about the ground.
import * as THREE from 'three';

export const SEA = 0;
export const BOUND = 78;                  // how far you can wander (well into the shallows)
export const MEADOW = { x: 0, z: 6, r: 20, h: 2.7 };
export const HILL = { x: 8, z: -34, h: 12.5, s: 13 };
export const WRECK = { x: -6, z: 50 };    // where you wash up

// ------------------------------------------------------------ deterministic noise
export function rng(seed){
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(ix, iz){
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const fade = (t) => t * t * (3 - 2 * t);
export function noise(x, z){
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = fade(x - ix), fz = fade(z - iz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fz;
}
export function fbm(x, z){
  return noise(x, z) * 0.55 + noise(x * 2.1 + 7, z * 2.1 - 3) * 0.3 + noise(x * 4.3 - 11, z * 4.3 + 5) * 0.15;
}

const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// The coastline wobbles so the island is not a circle.
function coast(a){
  return 64 + 6 * Math.sin(3 * a + 0.7) + 4 * Math.sin(5 * a + 2.1) + 2.5 * Math.sin(11 * a + 0.3);
}

/** How far "inland" a point is: 0 at open sea, 1 in the middle. */
export function inland(x, z){
  const t = Math.hypot(x, z) / coast(Math.atan2(z, x));
  return smooth(1.08, 0.72, t);
}

export function height(x, z){
  const land = inland(x, z);
  let h = -4.5 + 7.3 * land;

  // Rolling ground, kept off the beaches so they stay smooth.
  const inner = smooth(0.55, 0.95, land);
  h += (fbm(x * 0.045, z * 0.045) - 0.5) * 3.2 * inner;

  // The hill in the north, where the stone and iron are.
  const hd = ((x - HILL.x) ** 2 + (z - HILL.z) ** 2) / (2 * HILL.s * HILL.s);
  h += HILL.h * Math.exp(-hd) * (0.85 + 0.3 * noise(x * 0.12, z * 0.12));
  // A gentle rise to the east.
  h += 3.5 * Math.exp(-((x - 36) ** 2 + (z - 6) ** 2) / (2 * 9 * 9));

  // The meadow is flattened so there is always room to build.
  const md = Math.hypot(x - MEADOW.x, z - MEADOW.z);
  const flat = smooth(MEADOW.r + 10, MEADOW.r - 4, md);
  h += (MEADOW.h + (noise(x * 0.2, z * 0.2) - 0.5) * 0.25 - h) * flat;

  return h;
}

/** Steepness at a point, roughly metres of rise per metre. */
export function slope(x, z){
  const e = 0.6;
  return Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
}

// ------------------------------------------------------------ meshes
const C = {
  deep: new THREE.Color(0xc7b27d), sand: new THREE.Color(0xe8d49a), wetSand: new THREE.Color(0xcfb97e),
  grass: new THREE.Color(0x7fb04a), grass2: new THREE.Color(0x5d9a3c), forest: new THREE.Color(0x4a7f34),
  dirt: new THREE.Color(0x8b7650), rock: new THREE.Color(0x8d8a82), rock2: new THREE.Color(0x6f6d68),
};

export function buildTerrain(scene){
  const SIZE = 320, SEG = 200;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();

  for (let i = 0; i < pos.count; i++){
    const x = pos.getX(i), z = pos.getZ(i);
    const h = height(x, z);
    pos.setY(i, h);

    const n = noise(x * 0.3, z * 0.3);
    const s = slope(x, z);
    if (h < -0.4) col.copy(C.deep).lerp(C.wetSand, smooth(-4, -0.4, h));
    else if (h < 0.35) col.copy(C.wetSand).lerp(C.sand, smooth(-0.4, 0.35, h));
    else if (h < 1.1) col.copy(C.sand).lerp(C.grass, smooth(0.8, 1.1, h));
    else {
      col.copy(C.grass).lerp(C.grass2, fbm(x * 0.06, z * 0.06));
      const woods = smooth(0.45, 0.62, fbm(x * 0.035 + 20, z * 0.035 - 9));
      col.lerp(C.forest, woods * 0.7);
      if (n > 0.8) col.lerp(C.dirt, 0.25);
      // Rock shows through on the steep bits and high up the hill.
      const rocky = Math.max(smooth(0.55, 1.1, s), smooth(8, 12, h));
      col.lerp(n > 0.5 ? C.rock : C.rock2, rocky);
    }
    col.offsetHSL(0, 0, (n - 0.5) * 0.05);
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

/** A gently heaving sea with a foam line where it meets the sand. */
export function buildSea(scene){
  const geo = new THREE.PlaneGeometry(900, 900, 160, 160);
  geo.rotateX(-Math.PI / 2);

  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.MeshPhongMaterial({
    color: 0x2d8fb3, specular: 0xbfe8ff, shininess: 70,
    transparent: true, opacity: 0.8, depthWrite: false,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        varying vec3 vWorld;
        float wave(vec2 p){
          return sin(p.x * 0.18 + uTime * 1.1) * 0.12 + sin(p.y * 0.23 - uTime * 0.9) * 0.1
               + sin((p.x + p.y) * 0.4 + uTime * 1.7) * 0.05;
        }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp = modelMatrix * vec4(transformed, 1.0);
        transformed.y += wave(wp.xz);
        vWorld = wp.xyz;`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        {
          vec4 wq = modelMatrix * vec4(position, 1.0);
          float e = 0.5;
          float hx = wave(wq.xz + vec2(e, 0.0)) - wave(wq.xz - vec2(e, 0.0));
          float hz = wave(wq.xz + vec2(0.0, e)) - wave(wq.xz - vec2(0.0, e));
          objectNormal = normalize(vec3(-hx / (2.0 * e), 1.0, -hz / (2.0 * e)));
        }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        varying vec3 vWorld;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float sparkle = pow(max(0.0, sin(vWorld.x * 1.3 + uTime * 2.0) * sin(vWorld.z * 1.1 - uTime * 1.6)), 18.0);
        gl_FragColor.rgb += sparkle * 0.25;`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = SEA;
  mesh.renderOrder = 2;
  scene.add(mesh);

  // Foam: a ring of quads that follows the shoreline, pulsing in and out.
  const foamGeo = new THREE.BufferGeometry();
  const verts = [], alphas = [];
  const N = 360;
  for (let i = 0; i <= N; i++){
    const a = (i / N) * Math.PI * 2;
    // Walk inwards until we hit sea level.
    let r = 90;
    while (r > 20 && height(Math.cos(a) * r, Math.sin(a) * r) < SEA) r -= 0.25;
    const cx = Math.cos(a), sz = Math.sin(a);
    verts.push(cx * (r + 1.6), 0, sz * (r + 1.6), cx * (r - 0.3), 0, sz * (r - 0.3));
    alphas.push(0, 1);
  }
  const idx = [];
  for (let i = 0; i < N; i++){
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  foamGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  foamGeo.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));
  foamGeo.setIndex(idx);
  const foamMat = new THREE.ShaderMaterial({
    uniforms: { uTime: uniforms.uTime, uBright: { value: 1 } },
    transparent: true, depthWrite: false,
    vertexShader: `attribute float alpha; varying float vA; varying vec2 vXZ;
      void main(){ vA = alpha; vXZ = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position + vec3(0.0, 0.06, 0.0), 1.0); }`,
    fragmentShader: `uniform float uTime; uniform float uBright; varying float vA; varying vec2 vXZ;
      void main(){
        float pulse = 0.55 + 0.45 * sin(uTime * 1.3 + atan(vXZ.y, vXZ.x) * 9.0);
        gl_FragColor = vec4(vec3(1.0) * uBright, vA * pulse * 0.75);
      }`,
  });
  const foam = new THREE.Mesh(foamGeo, foamMat);
  foam.renderOrder = 3;
  scene.add(foam);

  return {
    update(t, bright){ uniforms.uTime.value = t; foamMat.uniforms.uBright.value = bright; },
    material: mat,
  };
}

/** Points along the shore, just out in the water, where fish gather. */
export function shorePoints(count, seed){
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < count; i++){
    const a = (i / count) * Math.PI * 2 + r() * 0.3;
    let rad = 90;
    while (rad > 20 && height(Math.cos(a) * rad, Math.sin(a) * rad) < SEA) rad -= 0.25;
    // Stand on the sand; the fish are a couple of metres out.
    const cx = Math.cos(a), sz = Math.sin(a);
    out.push({
      x: cx * (rad + 2.6), z: sz * (rad + 2.6),
      standX: cx * (rad - 0.6), standZ: sz * (rad - 0.6),
    });
  }
  return out;
}
