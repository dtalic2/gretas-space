// ---------- The island: one height function, and everything built from it ----------
//
// `height(x, z)` is the only place the shape of the island lives. The mesh, your
// feet, how deep the water is, and where every palm stands all read it.
import * as THREE from 'three';

export const SEA = 0;
export const BOUND = 120;
export const LAGOON = { x: 2, z: 38, r: 19 };     // the sheltered bay on the south side
export const HILL = { x: -6, z: -14, h: 13, s: 12 };
export const REEF = 72;                           // radius of the ring of coral

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
export const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function coast(a){
  return 48 + 5 * Math.sin(3 * a + 0.5) + 3 * Math.sin(5 * a + 1.3) + 2 * Math.sin(9 * a);
}

/** 0 out at sea, 1 in the middle of the island. */
export function inland(x, z){
  return smooth(1.05, 0.7, Math.hypot(x, z) / coast(Math.atan2(z, x)));
}

export function height(x, z){
  const d = Math.hypot(x, z);
  const t = d / coast(Math.atan2(z, x));
  const land = smooth(1.05, 0.7, t);
  let h = -3 + 5.6 * land;

  const inner = smooth(0.5, 0.95, land);
  h += (fbm(x * 0.05, z * 0.05) - 0.5) * 2.2 * inner;
  // The jungle hill.
  h += HILL.h * Math.exp(-((x - HILL.x) ** 2 + (z - HILL.z) ** 2) / (2 * HILL.s * HILL.s)) * inner;

  // Past the beach the sea floor falls away into deep blue.
  h -= 9 * smooth(1.15, 1.9, t);

  // The lagoon: a round, sandy-bottomed bay, never deeper than you can see.
  const ld = Math.hypot(x - LAGOON.x, z - LAGOON.z);
  const lag = smooth(LAGOON.r + 2, LAGOON.r - 7, ld);
  h += (-1.9 + (noise(x * 0.15, z * 0.15) - 0.5) * 0.6 - h) * lag;

  // The reef: a ring of shallow coral out in the blue.
  const reef = Math.exp(-((d - REEF) ** 2) / (2 * 2.4 * 2.4)) * (0.55 + 0.45 * noise(x * 0.08, z * 0.08));
  h += (-0.9 - h) * reef;

  return h;
}

export function slope(x, z){
  const e = 0.6;
  return Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
}

/** Walk from (x, z) along (dx, dz) until the ground drops below `level`. */
export function shoreFrom(x, z, dx, dz, level = 0.2){
  const l = Math.hypot(dx, dz); dx /= l; dz /= l;
  for (let s = 0; s < 120; s += 0.25){
    if (height(x + dx * s, z + dz * s) < level) return { x: x + dx * s, z: z + dz * s };
  }
  return { x, z };
}

// ------------------------------------------------------------ meshes
const C = {
  deep: new THREE.Color(0x3d7f8a), reefSand: new THREE.Color(0xd8e0b8), wet: new THREE.Color(0xe0cf9a),
  sand: new THREE.Color(0xf6e6b4), grass: new THREE.Color(0x6cc04a), grass2: new THREE.Color(0x4fa83c),
  jungle: new THREE.Color(0x2f8a3a), rock: new THREE.Color(0x8a8078), soil: new THREE.Color(0x9a7a4a),
};

export function buildTerrain(scene){
  const SIZE = 340, SEG = 210;
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
    if (h < -2.5) col.copy(C.deep).lerp(C.reefSand, smooth(-8, -2.5, h));
    else if (h < 0.1) col.copy(C.reefSand).lerp(C.wet, smooth(-2.5, 0.1, h));
    else if (h < 1.3) col.copy(C.wet).lerp(C.sand, smooth(0.1, 0.5, h));
    else {
      col.copy(C.sand).lerp(C.grass, smooth(1.3, 1.9, h));
      col.lerp(C.grass2, fbm(x * 0.07, z * 0.07));
      col.lerp(C.jungle, smooth(4, 8, h) * 0.8);
      col.lerp(C.rock, smooth(0.7, 1.2, slope(x, z)) * 0.7);
      if (n > 0.8) col.lerp(C.soil, 0.2);
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

/** A clear turquoise sea with rippling light and a foam line on the sand. */
export function buildSea(scene){
  const geo = new THREE.PlaneGeometry(900, 900, 170, 170);
  geo.rotateX(-Math.PI / 2);
  const uniforms = { uTime: { value: 0 }, uUnder: { value: 0 } };
  const mat = new THREE.MeshPhongMaterial({
    color: 0x22b8c8, specular: 0xffffff, shininess: 90,
    transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uUnder = uniforms.uUnder;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        varying vec3 vWorld;
        float wave(vec2 p){
          return sin(p.x * 0.16 + uTime * 1.0) * 0.1 + sin(p.y * 0.21 - uTime * 0.8) * 0.08
               + sin((p.x + p.y) * 0.45 + uTime * 1.6) * 0.04;
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
        uniform float uUnder;
        varying vec3 vWorld;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        // Dappled light on the surface.
        vec2 q = vWorld.xz * 0.35;
        float c = sin(q.x * 2.3 + uTime * 1.3 + sin(q.y * 1.7 + uTime)) * sin(q.y * 2.1 - uTime * 1.1 + sin(q.x * 1.9));
        gl_FragColor.rgb += pow(max(c, 0.0), 6.0) * 0.28 * (1.0 - uUnder);
        // Out in the deep, the sea is a darker blue.
        float d = length(vWorld.xz);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.05, 0.3, 0.5), smoothstep(80.0, 130.0, d) * 0.6);
        gl_FragColor.a = mix(gl_FragColor.a, 0.9, smoothstep(80.0, 130.0, d));`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  scene.add(mesh);

  // Foam where the sea meets the sand.
  const verts = [], alphas = [], idx = [];
  const N = 420;
  for (let i = 0; i <= N; i++){
    const a = (i / N) * Math.PI * 2;
    let r = 100;
    while (r > 5 && height(Math.cos(a) * r, Math.sin(a) * r) < SEA) r -= 0.2;
    const cx = Math.cos(a), sz = Math.sin(a);
    verts.push(cx * (r + 1.4), 0, sz * (r + 1.4), cx * (r - 0.2), 0, sz * (r - 0.2));
    alphas.push(0, 1);
  }
  for (let i = 0; i < N; i++){ const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  fg.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));
  fg.setIndex(idx);
  const foamMat = new THREE.ShaderMaterial({
    uniforms: { uTime: uniforms.uTime, uBright: { value: 1 } }, transparent: true, depthWrite: false,
    vertexShader: `attribute float alpha; varying float vA; varying vec2 vXZ;
      void main(){ vA = alpha; vXZ = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position + vec3(0.0, 0.07, 0.0), 1.0); }`,
    fragmentShader: `uniform float uTime; uniform float uBright; varying float vA; varying vec2 vXZ;
      void main(){ float p = 0.5 + 0.5 * sin(uTime * 1.2 + atan(vXZ.y, vXZ.x) * 11.0); gl_FragColor = vec4(vec3(uBright), vA * p * 0.8); }`,
  });
  const foam = new THREE.Mesh(fg, foamMat);
  foam.renderOrder = 3;
  scene.add(foam);

  return {
    mesh,
    update(t, bright, under){ uniforms.uTime.value = t; uniforms.uUnder.value = under ? 1 : 0; foamMat.uniforms.uBright.value = bright; },
  };
}
