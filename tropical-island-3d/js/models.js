// ---------- Everything you can see, made of boxes, cones and cylinders ----------
//
// No model files. Palms, huts, animals and fish are all built here from
// primitives with flat shading, which gives the island its toy-like look.
import * as THREE from 'three';

const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...extra });

export const MAT = {
  trunk: lam(0x9a7a52), trunk2: lam(0x7f623e), frond: lam(0x3fae4a), frond2: lam(0x2f9440),
  coconut: lam(0x6b4a2a), leaf: lam(0x45a845), leaf2: lam(0x5cc050), mango: lam(0xff9a2a), banana: lam(0xf4d64a),
  bamboo: lam(0xd8c078), bambooDark: lam(0xa89050), thatch: lam(0xd8b060), thatchDark: lam(0xb08a3e),
  plank: lam(0xb88a5a), plankDark: lam(0x8a6440), rope: lam(0xd0b888),
  rock: lam(0x9a9088), rock2: lam(0x7d746c), sand: lam(0xf0dfae),
  white: lam(0xfaf6ee), red: lam(0xe0443a), pink: lam(0xff7aa8), yellow: lam(0xffd23a), orange: lam(0xff8a2a),
  purple: lam(0x9a5ad8), teal: lam(0x2ac0b0), blue: lam(0x2f6ae0), green: lam(0x3fae4a), dark: lam(0x231a12),
  cloth: lam(0xf05a7a), cloth2: lam(0x2ab0d0), iron: lam(0x5a5f66),
  flame: new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: 0.92, depthWrite: false }),
  flame2: new THREE.MeshBasicMaterial({ color: 0xffe07a, transparent: true, opacity: 0.95, depthWrite: false }),
  window: new THREE.MeshLambertMaterial({ color: 0x2c2a26, emissive: 0xffb04a, emissiveIntensity: 0 }),
  pearl: new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xbfd8ff, emissiveIntensity: 0.4 }),
};

// ------------------------------------------------------------ merging
/**
 * Fold every static mesh under `root` into one mesh per material. A cottage is
 * a couple of hundred boxes; drawn one by one that is a couple of hundred draw
 * calls (twice, with shadows). Merged it is about a dozen. Anything marked
 * `userData.dynamic` — flames, flags, sails — is left alone so it can move.
 */
export function mergeStatic(root){
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const found = [];
  const walk = (o) => {
    if (o.userData.dynamic) return;
    for (const c of o.children) walk(c);
    if (o.isMesh && !o.isInstancedMesh && o !== root && !Array.isArray(o.material)) found.push(o);
  };
  walk(root);
  if (found.length < 2) return;
  const m = new THREE.Matrix4();
  for (const o of found){
    const key = o.material.uuid + (o.castShadow ? 's' : '');
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, shadow: o.castShadow, parts: [] });
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    m.multiplyMatrices(inv, o.matrixWorld);
    geo.applyMatrix4(m);
    buckets.get(key).parts.push(geo);
    o.parent.remove(o);
  }
  for (const { mat, shadow, parts } of buckets.values()){
    let n = 0;
    for (const p of parts) n += p.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let off = 0;
    for (const p of parts){
      pos.set(p.attributes.position.array, off * 3);
      nor.set(p.attributes.normal.array, off * 3);
      off += p.attributes.position.count;
      p.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.computeBoundingSphere();
    const mm = new THREE.Mesh(geo, mat);
    mm.castShadow = shadow;
    mm.receiveShadow = true;
    root.add(mm);
  }
}

// ------------------------------------------------------------ primitives
function mesh(geo, mat, x = 0, y = 0, z = 0, shadow = true){
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}
const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
const cyl = (rt, rb, h, seg, mat, x, y, z) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
const cone = (r, h, seg, mat, x, y, z) => mesh(new THREE.ConeGeometry(r, h, seg), mat, x, y, z);


function flameCluster(scale = 1){
  const g = new THREE.Group();
  const a = cone(0.32 * scale, 0.9 * scale, 7, MAT.flame, 0, 0.45 * scale, 0);
  const b = cone(0.18 * scale, 0.6 * scale, 6, MAT.flame2, 0, 0.3 * scale, 0);
  a.castShadow = b.castShadow = false;
  g.add(a, b);
  g.userData.dynamic = true;
  g.userData.flick = (t, seed = 0) => {
    a.scale.set(1 + Math.sin(t * 13 + seed) * 0.08, 1 + Math.sin(t * 17 + seed) * 0.2, 1 + Math.cos(t * 11 + seed) * 0.08);
    b.scale.y = 1 + Math.sin(t * 21 + seed) * 0.25;
  };
  return g;
}

// ------------------------------------------------------------ plants
/** A leaning palm. `fruit` is the coconut cluster you can pick. */
export function makePalm(r, coconuts = true){
  const g = new THREE.Group();
  const s = 0.85 + r() * 0.4;
  const lean = 0.5 + r() * 0.6;                     // how far it bends toward +x
  const top = new THREE.Group();
  const n = 7;
  let x = 0, y = 0;
  for (let i = 0; i < n; i++){
    const f = i / n;
    const len = 0.9 * s;
    const ang = f * lean * 0.5;
    const seg = cyl(0.17 * s * (1 - f * 0.35), 0.22 * s * (1 - f * 0.3), len, 7, i % 2 ? MAT.trunk : MAT.trunk2, 0, 0, 0);
    seg.position.set(x + Math.sin(ang) * len / 2, y + Math.cos(ang) * len / 2, 0);
    seg.rotation.z = -ang;
    top.add(seg);
    x += Math.sin(ang) * len; y += Math.cos(ang) * len;
  }
  const crown = new THREE.Group();
  crown.position.set(x, y, 0);
  for (let i = 0; i < 8; i++){
    const frond = new THREE.Group();
    frond.rotation.y = (i / 8) * Math.PI * 2 + r() * 0.3;
    let fx = 0, fy = 0;
    for (let k = 0; k < 4; k++){
      const len = 0.75 * s;
      const droop = 0.15 + k * 0.32;
      const leaf = box(len, 0.05, (0.62 - k * 0.12) * s, k % 2 ? MAT.frond : MAT.frond2, 0, 0, 0);
      leaf.position.set(fx + Math.cos(droop) * len / 2, fy - Math.sin(droop) * len / 2, 0);
      leaf.rotation.z = -droop;
      frond.add(leaf);
      fx += Math.cos(droop) * len; fy -= Math.sin(droop) * len;
    }
    crown.add(frond);
  }
  top.add(crown);
  const fruit = new THREE.Group();
  if (coconuts){
    for (let i = 0; i < 3; i++){
      const a = (i / 3) * Math.PI * 2;
      fruit.add(mesh(new THREE.SphereGeometry(0.2 * s, 7, 5), MAT.coconut, Math.cos(a) * 0.2, -0.25, Math.sin(a) * 0.2));
    }
    fruit.position.set(x, y, 0);
    top.add(fruit);
  }
  g.add(top);
  mergeStatic(crown);
  g.userData = { top, fruit: coconuts ? fruit : null, fruitAt: new THREE.Vector3(x, y - 0.3, 0), scale: s };
  return g;
}

export function makeMangoTree(r){
  const g = new THREE.Group();
  const s = 0.9 + r() * 0.3;
  const body = new THREE.Group();
  body.add(cyl(0.2 * s, 0.3 * s, 2.0 * s, 7, MAT.trunk2, 0, 1.0 * s, 0));
  for (let i = 0; i < 4; i++){
    const b = mesh(new THREE.IcosahedronGeometry((1.1 + r() * 0.4) * s, 0), i % 2 ? MAT.leaf : MAT.leaf2,
      (r() - 0.5) * 1.4 * s, (2.6 + r() * 0.8) * s, (r() - 0.5) * 1.4 * s);
    b.rotation.set(r() * 3, r() * 3, 0);
    body.add(b);
  }
  mergeStatic(body);
  g.add(body);
  const fruit = new THREE.Group();
  for (let i = 0; i < 7; i++){
    const a = r() * Math.PI * 2, rr = 1.1 * s + r() * 0.4;
    const m = mesh(new THREE.SphereGeometry(0.16, 7, 5), MAT.mango, Math.cos(a) * rr, (2.0 + r() * 1.2) * s, Math.sin(a) * rr, false);
    m.scale.y = 1.3;
    fruit.add(m);
  }
  mergeStatic(fruit);
  g.add(fruit);
  g.userData = { top: body, fruit, scale: s };
  return g;
}

export function makeBanana(r){
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.add(cyl(0.16, 0.24, 1.8, 7, MAT.leaf2, 0, 0.9, 0));
  for (let i = 0; i < 7; i++){
    const leaf = new THREE.Group();
    leaf.position.y = 1.7;
    leaf.rotation.y = (i / 7) * Math.PI * 2 + r();
    const l = box(1.8, 0.04, 0.55, i % 2 ? MAT.leaf : MAT.frond, 0.9, 0.25, 0);
    l.rotation.z = 0.35 + r() * 0.2;
    leaf.add(l);
    body.add(leaf);
  }
  mergeStatic(body);
  g.add(body);
  const fruit = new THREE.Group();
  fruit.position.set(0.25, 1.4, 0.1);
  for (let i = 0; i < 6; i++){
    const b = cyl(0.05, 0.045, 0.34, 5, MAT.banana, Math.cos(i) * 0.1, (i % 3) * 0.1, Math.sin(i) * 0.1);
    b.rotation.z = 0.5 + (i % 2) * 0.3;
    fruit.add(b);
  }
  mergeStatic(fruit);
  g.add(fruit);
  g.userData = { top: body, fruit, scale: 1 };
  return g;
}

export function makeFlowers(r){
  const g = new THREE.Group();
  const cols = [MAT.pink, MAT.red, MAT.yellow, MAT.purple, MAT.orange];
  for (let i = 0; i < 3; i++){
    const b = mesh(new THREE.IcosahedronGeometry(0.5 + r() * 0.25, 0), MAT.leaf, (r() - 0.5) * 0.8, 0.4, (r() - 0.5) * 0.8);
    g.add(b);
  }
  const c = cols[Math.floor(r() * cols.length)];
  for (let i = 0; i < 8; i++){
    const a = r() * Math.PI * 2;
    g.add(mesh(new THREE.OctahedronGeometry(0.12, 0), c, Math.cos(a) * 0.6, 0.45 + r() * 0.4, Math.sin(a) * 0.6, false));
  }
  mergeStatic(g);
  return g;
}

export function makeRock(r){
  const g = new THREE.Group();
  const s = 0.6 + r() * 0.9;
  const m = mesh(new THREE.DodecahedronGeometry(1, 0), MAT.rock, 0, 0.4 * s, 0);
  m.scale.set(1.3 * s, 0.8 * s, 1.0 * s);
  m.rotation.set(r(), r() * 3, r());
  g.add(m);
  g.add(mesh(new THREE.DodecahedronGeometry(0.5, 0), MAT.rock2, 0.9 * s, 0.2, 0.3 * s));
  mergeStatic(g);
  g.userData.scale = s;
  return g;
}

export function makeCoral(r){
  const g = new THREE.Group();
  const cols = [MAT.pink, MAT.orange, MAT.purple, MAT.yellow, MAT.teal, MAT.red];
  const n = 4 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++){
    const c = cols[Math.floor(r() * cols.length)];
    const x = (r() - 0.5) * 2, z = (r() - 0.5) * 2;
    const kind = r();
    if (kind < 0.4){
      for (let k = 0; k < 3; k++){
        const br = cyl(0.06, 0.1, 0.8 + r() * 0.6, 5, c, x + (r() - 0.5) * 0.4, 0.4, z + (r() - 0.5) * 0.4);
        br.rotation.set((r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.8);
        g.add(br);
      }
    } else if (kind < 0.7){
      const b = mesh(new THREE.IcosahedronGeometry(0.4 + r() * 0.3, 1), c, x, 0.3, z);
      b.scale.y = 0.7;
      g.add(b);
    } else {
      const f = cone(0.5, 0.9, 6, c, x, 0.45, z);
      f.rotation.x = Math.PI;
      g.add(f);
    }
  }
  mergeStatic(g);
  return g;
}

export function makeSeaweed(r){
  const g = new THREE.Group();
  const blades = new THREE.Group();
  for (let i = 0; i < 5; i++){
    const h = 0.8 + r() * 0.9;
    const b = box(0.12, h, 0.04, i % 2 ? MAT.green : MAT.frond2, (r() - 0.5) * 0.5, h / 2, (r() - 0.5) * 0.5);
    b.rotation.y = r() * 3;
    blades.add(b);
  }
  mergeStatic(blades);
  g.add(blades);
  g.userData = { top: blades, fruit: blades, sway: r() * 6 };
  return g;
}

export function makeShell(r, kind = 'shell'){
  const g = new THREE.Group();
  if (kind === 'star'){
    for (let i = 0; i < 5; i++){
      const arm = box(0.34, 0.06, 0.1, MAT.orange, 0, 0.04, 0);
      arm.geometry.translate(0.17, 0, 0);
      arm.rotation.y = (i / 5) * Math.PI * 2;
      g.add(arm);
    }
  } else if (kind === 'pearl'){
    const bottom = mesh(new THREE.SphereGeometry(0.3, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MAT.rock2, 0, 0.18, 0);
    const lid = mesh(new THREE.SphereGeometry(0.3, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), MAT.rock, 0, 0.2, -0.05);
    lid.rotation.x = -0.6;
    g.add(bottom, lid);
    g.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), MAT.pearl, 0, 0.24, 0.04));
  } else {
    const c = r() < 0.5 ? MAT.pink : MAT.white;
    const sh = cone(0.16, 0.34, 7, c, 0, 0.1, 0);
    sh.rotation.z = Math.PI / 2 - 0.2;
    g.add(sh);
    g.add(mesh(new THREE.SphereGeometry(0.1, 6, 4), c, 0.12, 0.08, 0));
  }
  g.rotation.y = r() * 6;
  g.userData = { top: g, fruit: g };
  return g;
}

// ------------------------------------------------------------ places
/** The pier, running along +z from its origin on the sand. */
export function makeDock(len){
  const g = new THREE.Group();
  const W = 2.2, Y = 0.75;
  for (let z = 0; z < len; z += 0.5){
    const p = box(W, 0.1, 0.44, (z * 2) % 2 ? MAT.plank : MAT.plankDark, 0, Y, z + 0.25);
    g.add(p);
  }
  for (let z = 0; z <= len; z += 2.5){
    for (const x of [-W / 2, W / 2]){
      g.add(cyl(0.1, 0.12, 4, 6, MAT.plankDark, x, Y - 1.8, z));
      g.add(cyl(0.11, 0.11, 0.5, 6, MAT.plankDark, x, Y + 0.25, z));
    }
  }
  for (const x of [-W / 2, W / 2]) g.add(box(0.06, 0.06, len, MAT.rope, x, Y + 0.45, len / 2));
  // A bucket and a crate at the end.
  g.add(cyl(0.22, 0.18, 0.36, 8, MAT.cloth2, 0.6, Y + 0.23, len - 0.8));
  g.add(box(0.6, 0.5, 0.6, MAT.plank, -0.55, Y + 0.3, len - 1.0));
  mergeStatic(g);
  return g;
}

/** Your hut, up on stilts, porch facing +z. */
export function makeHut(){
  const g = new THREE.Group();
  const S = 4.2, Y = 1.3, H = 2.3;
  for (const x of [-S / 2, S / 2]) for (const z of [-S / 2, S / 2 + 1.4]) g.add(cyl(0.12, 0.14, Y + 0.6, 6, MAT.bambooDark, x, (Y - 0.6) / 2 + 0.3, z));
  g.add(box(S + 0.4, 0.2, S + 1.8, MAT.plank, 0, Y, 0.7));
  // Bamboo walls: a box, with canes standing proud of it.
  g.add(box(S, H, S, MAT.bamboo, 0, Y + H / 2 + 0.1, 0));
  for (let i = 0; i <= 12; i++){
    const p = -S / 2 + (i / 12) * S;
    for (const side of [-1, 1]){
      if (side === 1 && Math.abs(p) < 0.6) continue;         // the doorway
      g.add(cyl(0.07, 0.07, H, 5, MAT.bambooDark, p, Y + H / 2 + 0.1, side * (S / 2 + 0.03)));
      g.add(cyl(0.07, 0.07, H, 5, MAT.bambooDark, side * (S / 2 + 0.03), Y + H / 2 + 0.1, p));
    }
  }
  g.add(box(1.0, 1.7, 0.1, MAT.dark, 0, Y + 0.95, S / 2 + 0.04));
  const w = box(0.8, 0.6, 0.08, MAT.window, 1.3, Y + 1.4, S / 2 + 0.06);
  g.add(w);
  const roof = cone(S * 0.95, 2.4, 4, MAT.thatch, 0, Y + H + 1.3, 0);
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  const lip = cone(S * 0.97, 0.5, 4, MAT.thatchDark, 0, Y + H + 0.35, 0);
  lip.rotation.y = Math.PI / 4;
  g.add(lip);
  // Steps up to the porch.
  for (let i = 0; i < 4; i++) g.add(box(1.2, 0.12, 0.4, MAT.plank, 0, Y - 0.3 - i * 0.32, S / 2 + 1.8 + i * 0.35));
  // Railing on the porch.
  for (const x of [-S / 2, S / 2]) g.add(box(0.08, 0.08, 1.6, MAT.bambooDark, x, Y + 0.8, S / 2 + 0.8));
  // A potted plant and a surfboard.
  g.add(cyl(0.25, 0.2, 0.4, 8, MAT.orange, -1.5, Y + 0.3, S / 2 + 0.9));
  g.add(mesh(new THREE.IcosahedronGeometry(0.35, 0), MAT.leaf, -1.5, Y + 0.75, S / 2 + 0.9));
  const board = box(0.6, 2.2, 0.1, MAT.cloth2, S / 2 + 0.4, 1.1, 1.2);
  board.rotation.set(0, 0.3, 0.2);
  g.add(board);
  mergeStatic(g);
  return { group: g, deck: Y + 0.1 };
}

/** Kai's Tiki Shack: a counter under a thatch roof, crates of fruit, surfboards. */
export function makeShack(){
  const g = new THREE.Group();
  for (const x of [-2, 2]) for (const z of [-1.6, 1.6]) g.add(cyl(0.12, 0.14, 3, 6, MAT.bambooDark, x, 1.5, z));
  g.add(box(4.2, 1.1, 0.7, MAT.bamboo, 0, 0.55, 1.4));
  g.add(box(4.5, 0.12, 0.9, MAT.plank, 0, 1.15, 1.4));
  g.add(box(4.2, 2.8, 0.2, MAT.bamboo, 0, 1.4, -1.6));
  const roof = box(5.4, 0.3, 4.4, MAT.thatch, 0, 3.2, 0);
  roof.rotation.x = -0.12;
  g.add(roof);
  for (let i = 0; i < 12; i++) g.add(box(0.35, 0.5, 0.1, MAT.thatchDark, -2.5 + i * 0.45, 2.85, 2.25));
  // Sign.
  g.add(box(2.2, 0.6, 0.1, MAT.plankDark, 0, 3.7, 2.1));
  g.add(box(0.5, 0.35, 0.12, MAT.yellow, -0.6, 3.7, 2.15));
  g.add(box(0.5, 0.35, 0.12, MAT.pink, 0.0, 3.7, 2.15));
  g.add(box(0.5, 0.35, 0.12, MAT.teal, 0.6, 3.7, 2.15));
  // Fruit on the counter.
  for (let i = 0; i < 5; i++) g.add(mesh(new THREE.SphereGeometry(0.14, 7, 5), i % 2 ? MAT.mango : MAT.banana, -1.5 + i * 0.7, 1.32, 1.4));
  // Crates, and surfboards leaning on the side.
  g.add(box(0.8, 0.6, 0.8, MAT.plank, 2.7, 0.3, 1.6));
  g.add(box(0.7, 0.5, 0.7, MAT.plankDark, 2.8, 0.85, 1.5));
  for (const [c, dz] of [[MAT.cloth, -0.8], [MAT.yellow, 0], [MAT.cloth2, 0.8]]){
    const b = box(0.6, 2.4, 0.1, c, -2.5, 1.2, dz);
    b.rotation.z = 0.18;
    g.add(b);
  }
  mergeStatic(g);
  return g;
}

export function makeHammock(){
  const g = new THREE.Group();
  for (const x of [-1.8, 1.8]) g.add(cyl(0.12, 0.14, 2.2, 6, MAT.trunk2, x, 1.1, 0));
  const n = 9;
  for (let i = 0; i < n; i++){
    const f = i / (n - 1);
    const x = -1.5 + f * 3;
    const y = 1.3 - Math.sin(f * Math.PI) * 0.55;
    const seg = box(3 / (n - 1) + 0.05, 0.06, 1.0, i % 2 ? MAT.cloth : MAT.yellow, x, y, 0);
    seg.rotation.z = Math.cos(f * Math.PI) * 0.5;
    g.add(seg);
  }
  for (const s of [-1, 1]) g.add(box(0.4, 0.04, 0.06, MAT.rope, s * 1.65, 1.35, 0));
  g.add(box(0.5, 0.18, 0.7, MAT.white, -1.1, 1.05, 0));
  mergeStatic(g);
  return g;
}

export function makeTorch(){
  const g = new THREE.Group();
  g.add(cyl(0.06, 0.09, 2.2, 6, MAT.bambooDark, 0, 1.1, 0));
  g.add(cyl(0.16, 0.1, 0.3, 6, MAT.thatchDark, 0, 2.3, 0));
  const f = flameCluster(0.5);
  f.position.y = 2.4;
  g.add(f);
  g.userData = { flame: f, lightAt: new THREE.Vector3(0, 2.7, 0) };
  return g;
}

export function makeUmbrella(){
  const g = new THREE.Group();
  const pole = cyl(0.04, 0.04, 2.4, 5, MAT.white, 0, 1.2, 0);
  pole.rotation.z = 0.1;
  g.add(pole);
  const top = new THREE.Group();
  top.position.set(0.12, 2.35, 0);
  top.rotation.z = 0.1;
  for (let i = 0; i < 8; i++){
    const wedge = mesh(new THREE.ConeGeometry(1.6, 0.6, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), i % 2 ? MAT.cloth : MAT.white);
    wedge.material = i % 2 ? MAT.cloth : MAT.white;
    top.add(wedge);
  }
  g.add(top);
  const towel = box(0.9, 0.03, 1.8, MAT.cloth2, 0.9, 0.03, 0.4);
  g.add(towel);
  g.add(box(0.9, 0.04, 0.2, MAT.yellow, 0.9, 0.05, -0.2));
  mergeStatic(g);
  return g;
}

export function makeCanoe(){
  const g = new THREE.Group();
  const hull = mesh(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MAT.plankDark, 0, 0.45, 0);
  hull.scale.set(0.6, 0.45, 2.4);
  g.add(hull);
  g.add(box(1.0, 0.06, 0.2, MAT.plank, 0, 0.4, 0.6));
  g.add(box(1.0, 0.06, 0.2, MAT.plank, 0, 0.4, -0.6));
  const paddle = box(0.12, 0.04, 1.8, MAT.plank, 0.2, 0.5, 0);
  paddle.rotation.y = 0.3;
  g.add(paddle);
  mergeStatic(g);
  return g;
}

// ------------------------------------------------------------ people
/**
 * A blocky person in beachwear. Returns the parts the animator swings, plus
 * `hand` (right hand, for the rod) and `shoulder` (for a parrot to sit on).
 */
export function makePerson({ shirt = 0xff7a5a, shirt2 = 0xffd23a, shorts = 0x2f6ae0, skin = 0xe3b48a, hair = 0x3a2616,
  hat = false, lei = false, glasses = false, hairStyle = 'short' } = {}){
  const g = new THREE.Group();
  const s = lam(skin), sh = lam(shirt), hm = lam(hair);
  const legs = [], arms = [];
  for (const k of [-1, 1]){
    const hip = new THREE.Group();
    hip.position.set(k * 0.15, 0.66, 0);
    hip.add(box(0.24, 0.3, 0.24, lam(shorts), 0, -0.13, 0));
    hip.add(box(0.19, 0.34, 0.19, s, 0, -0.44, 0));
    hip.add(box(0.22, 0.06, 0.32, MAT.orange, 0, -0.63, 0.04));
    g.add(hip);
    legs.push(hip);
  }
  const body = box(0.64, 0.72, 0.4, sh, 0, 1.02, 0);
  g.add(body);
  // Flowers on the shirt.
  const dot = lam(shirt2);
  for (const [x, y, z] of [[-0.18, 1.2, 0.21], [0.16, 0.95, 0.21], [-0.05, 0.78, 0.21], [0.2, 1.25, -0.21], [-0.15, 0.9, -0.21]]){
    g.add(box(0.1, 0.1, 0.02, dot, x, y, z));
  }
  g.add(box(0.66, 0.2, 0.42, lam(shorts), 0, 0.62, 0));
  let hand = null, shoulder = null;
  for (const k of [-1, 1]){
    const arm = new THREE.Group();
    arm.position.set(k * 0.43, 1.34, 0);
    arm.add(box(0.19, 0.24, 0.19, sh, 0, -0.1, 0));
    arm.add(box(0.16, 0.36, 0.16, s, 0, -0.38, 0));
    arm.add(box(0.17, 0.14, 0.17, s, 0, -0.62, 0));
    const h = new THREE.Group();
    h.position.set(0, -0.62, 0.05);
    arm.add(h);
    if (k === 1) hand = h;
    g.add(arm);
    arms.push(arm);
  }
  shoulder = new THREE.Group();
  shoulder.position.set(-0.38, 1.42, 0);
  g.add(shoulder);

  const head = new THREE.Group();
  head.position.y = 1.62;
  head.add(box(0.46, 0.44, 0.42, s, 0, 0, 0));
  head.add(box(0.48, 0.14, 0.44, hm, 0, 0.2, -0.01));
  if (hairStyle === 'long') head.add(box(0.5, 0.6, 0.12, hm, 0, -0.08, -0.2));
  else head.add(box(0.48, 0.28, 0.12, hm, 0, 0.07, -0.19));
  for (const k of [-1, 1]) head.add(box(0.07, 0.08, 0.04, MAT.dark, k * 0.11, 0.03, 0.21));
  head.add(box(0.18, 0.04, 0.03, lam(0xc0504a), 0, -0.12, 0.215));          // a smile
  head.add(box(0.08, 0.1, 0.08, lam(skin - 0x101010), 0, -0.04, 0.23));
  if (glasses){
    for (const k of [-1, 1]) head.add(box(0.16, 0.1, 0.03, MAT.dark, k * 0.11, 0.04, 0.23));
    head.add(box(0.46, 0.03, 0.03, MAT.dark, 0, 0.07, 0.23));
  }
  if (hat){
    head.add(cyl(0.5, 0.5, 0.04, 14, lam(0xf0d890), 0, 0.24, 0));
    head.add(cyl(0.22, 0.27, 0.26, 12, lam(0xf0d890), 0, 0.36, 0));
    head.add(cyl(0.275, 0.275, 0.07, 12, MAT.pink, 0, 0.28, 0));
  }
  g.add(head);
  if (lei){
    const cols = [MAT.pink, MAT.yellow, MAT.red, MAT.white];
    for (let i = 0; i < 14; i++){
      const a = (i / 14) * Math.PI * 2;
      g.add(mesh(new THREE.OctahedronGeometry(0.07, 0), cols[i % 4], Math.sin(a) * 0.3, 1.36 - (Math.cos(a) > 0 ? 0.12 : 0), Math.cos(a) * 0.24, false));
    }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root: g, legs, arms, head, body, hand, shoulder };
}

export function makeRod(){
  const g = new THREE.Group();
  const pole = cyl(0.02, 0.035, 2.2, 5, MAT.bambooDark, 0, 0, 1.0);
  pole.rotation.x = Math.PI / 2;
  g.add(pole);
  g.add(cyl(0.07, 0.07, 0.08, 8, MAT.iron, 0.06, 0, 0.2));
  const tip = new THREE.Object3D();
  tip.position.set(0, 0, 2.1);
  g.add(tip);
  g.userData.tip = tip;
  return g;
}

export function makeUkulele(){
  const g = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.08, 10), MAT.plank, 0, 0, 0);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  g.add(box(0.07, 0.04, 0.6, MAT.plankDark, 0, 0, 0.4));
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.09, 8), MAT.dark, 0, 0, 0.02));
  return g;
}

// ------------------------------------------------------------ animals
export function makeDog(){
  const g = new THREE.Group();
  const fur = lam(0xd09a5a), light = lam(0xf0d8b0), dark = lam(0x6a4a2a);
  g.add(box(0.5, 0.45, 0.95, fur, 0, 0.62, 0));
  g.add(box(0.4, 0.15, 0.7, light, 0, 0.42, 0));
  const head = new THREE.Group();
  head.position.set(0, 0.95, 0.55);
  head.add(box(0.42, 0.38, 0.4, fur, 0, 0, 0));
  head.add(box(0.24, 0.18, 0.28, light, 0, -0.08, 0.28));
  head.add(box(0.1, 0.08, 0.06, MAT.dark, 0, -0.02, 0.43));
  for (const k of [-1, 1]){
    head.add(box(0.06, 0.07, 0.03, MAT.dark, k * 0.1, 0.07, 0.2));
    const ear = box(0.12, 0.26, 0.2, dark, k * 0.24, -0.02, -0.02);
    ear.rotation.z = k * 0.25;
    head.add(ear);
  }
  const tongue = box(0.08, 0.02, 0.1, MAT.pink, 0, -0.17, 0.36);
  head.add(tongue);
  g.add(head);
  const legs = [];
  for (const [x, z] of [[-0.16, 0.32], [0.16, 0.32], [-0.16, -0.32], [0.16, -0.32]]){
    const hip = new THREE.Group();
    hip.position.set(x, 0.45, z);
    hip.add(box(0.13, 0.45, 0.13, fur, 0, -0.22, 0));
    g.add(hip);
    legs.push(hip);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.78, -0.47);
  const tt = box(0.08, 0.08, 0.4, fur, 0, 0.1, -0.15);
  tt.rotation.x = -0.7;
  tail.add(tt);
  g.add(tail);
  g.add(box(0.44, 0.07, 0.07, MAT.red, 0, 0.8, 0.38));                   // collar
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root: g, legs, head, tail };
}

export function makeParrot(){
  const g = new THREE.Group();
  const red = lam(0xe0302a), blue = lam(0x2f6ae0), yellow = lam(0xffd23a);
  const body = mesh(new THREE.SphereGeometry(0.2, 8, 6), red, 0, 0.3, 0);
  body.scale.set(0.9, 1.2, 1);
  g.add(body);
  const head = new THREE.Group();
  head.position.set(0, 0.56, 0.05);
  head.add(mesh(new THREE.SphereGeometry(0.14, 8, 6), red, 0, 0, 0));
  const beak = cone(0.06, 0.16, 5, yellow, 0, -0.03, 0.16);
  beak.rotation.x = Math.PI / 2 + 0.4;
  head.add(beak);
  for (const k of [-1, 1]){
    head.add(mesh(new THREE.SphereGeometry(0.04, 6, 4), MAT.white, k * 0.09, 0.03, 0.08));
    head.add(mesh(new THREE.SphereGeometry(0.02, 5, 3), MAT.dark, k * 0.1, 0.03, 0.11));
  }
  g.add(head);
  const wings = [];
  for (const k of [-1, 1]){
    const w = new THREE.Group();
    w.position.set(k * 0.17, 0.38, 0);
    const a = box(0.06, 0.3, 0.26, blue, 0, -0.08, -0.02);
    const b = box(0.05, 0.14, 0.2, yellow, 0, 0.06, 0.02);
    w.add(a, b);
    g.add(w);
    wings.push(w);
  }
  const tail = box(0.1, 0.05, 0.45, blue, 0, 0.12, -0.3);
  tail.rotation.x = 0.6;
  g.add(tail);
  for (const k of [-1, 1]) g.add(box(0.04, 0.12, 0.04, MAT.dark, k * 0.07, 0.06, 0.02));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root: g, wings, head };
}

export function makeMonkey(){
  const g = new THREE.Group();
  const fur = lam(0x7a4e2a), face = lam(0xe8c09a);
  g.add(mesh(new THREE.SphereGeometry(0.3, 8, 6), fur, 0, 0.7, 0));
  g.children[0].scale.set(1, 1.15, 0.85);
  const head = new THREE.Group();
  head.position.set(0, 1.12, 0.02);
  head.add(mesh(new THREE.SphereGeometry(0.24, 8, 6), fur, 0, 0, 0));
  head.add(mesh(new THREE.SphereGeometry(0.17, 8, 6), face, 0, -0.03, 0.12));
  for (const k of [-1, 1]){
    head.add(mesh(new THREE.SphereGeometry(0.09, 6, 4), face, k * 0.25, 0.02, 0));
    head.add(box(0.05, 0.06, 0.03, MAT.dark, k * 0.07, 0.03, 0.27));
  }
  head.add(box(0.12, 0.03, 0.03, MAT.dark, 0, -0.09, 0.28));
  g.add(head);
  const legs = [], arms = [];
  for (const k of [-1, 1]){
    const leg = new THREE.Group();
    leg.position.set(k * 0.14, 0.48, 0);
    leg.add(box(0.12, 0.42, 0.12, fur, 0, -0.2, 0));
    g.add(leg); legs.push(leg);
    const arm = new THREE.Group();
    arm.position.set(k * 0.3, 0.88, 0);
    arm.add(box(0.1, 0.5, 0.1, fur, 0, -0.24, 0));
    g.add(arm); arms.push(arm);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.5, -0.25);
  let y = 0, z = 0;
  for (let i = 0; i < 6; i++){
    const a = i * 0.45;
    const seg = box(0.07, 0.07, 0.22, fur, 0, y, z);
    seg.rotation.x = -a;
    tail.add(seg);
    z -= Math.cos(a) * 0.18; y += Math.sin(a) * 0.18;
  }
  g.add(tail);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root: g, legs, arms, head, tail };
}

export function makeTurtle(){
  const g = new THREE.Group();
  const shell = mesh(new THREE.SphereGeometry(0.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam(0x3f7a3a), 0, 0, 0);
  shell.scale.set(1, 0.55, 1.2);
  g.add(shell);
  for (let i = 0; i < 6; i++){
    const a = (i / 6) * Math.PI * 2;
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 6), lam(0x6a9a4a), Math.cos(a) * 0.35, 0.3, Math.sin(a) * 0.42));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 6), lam(0x6a9a4a), 0, 0.38, 0));
  const skin = lam(0x8ab870);
  g.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 12), lam(0xd8d0a0), 0, 0, 0));
  g.children.at(-1).scale.z = 1.2;
  const head = new THREE.Group();
  head.position.set(0, 0.08, 0.9);
  head.add(mesh(new THREE.SphereGeometry(0.2, 8, 6), skin, 0, 0, 0.05));
  for (const k of [-1, 1]) head.add(box(0.05, 0.05, 0.03, MAT.dark, k * 0.1, 0.06, 0.2));
  g.add(head);
  const flippers = [];
  for (const [x, z, s] of [[-0.62, 0.45, 1], [0.62, 0.45, 1], [-0.45, -0.6, 0.6], [0.45, -0.6, 0.6]]){
    const f = new THREE.Group();
    f.position.set(x, 0, z);
    const p = box(0.55 * s, 0.06, 0.25 * s, skin, Math.sign(x) * 0.25 * s, 0, 0);
    f.add(p);
    g.add(f);
    flippers.push(f);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root: g, flippers, head };
}

export function makeCrab(){
  const g = new THREE.Group();
  const red = lam(0xe0442a);
  const body = mesh(new THREE.SphereGeometry(0.28, 8, 5), red, 0, 0.22, 0);
  body.scale.set(1.3, 0.55, 1);
  g.add(body);
  for (const k of [-1, 1]){
    g.add(cyl(0.02, 0.02, 0.16, 4, red, k * 0.09, 0.4, 0.14));
    g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), MAT.white, k * 0.09, 0.49, 0.14));
    g.add(mesh(new THREE.SphereGeometry(0.025, 5, 3), MAT.dark, k * 0.09, 0.5, 0.18));
  }
  const claws = [];
  for (const k of [-1, 1]){
    const c = new THREE.Group();
    c.position.set(k * 0.32, 0.22, 0.18);
    c.add(box(0.2, 0.06, 0.06, red, k * 0.08, 0, 0));
    const top = box(0.16, 0.1, 0.12, red, k * 0.2, 0.04, 0.05);
    const bot = box(0.14, 0.05, 0.1, red, k * 0.2, -0.04, 0.05);
    c.add(top, bot);
    c.userData.top = top;
    g.add(c);
    claws.push(c);
  }
  const legs = [];
  for (const k of [-1, 1]) for (let i = 0; i < 3; i++){
    const l = new THREE.Group();
    l.position.set(k * 0.3, 0.2, -0.1 + i * 0.1);
    const seg = box(0.24, 0.04, 0.04, red, k * 0.1, -0.08, 0);
    seg.rotation.z = k * -0.7;
    l.add(seg);
    g.add(l);
    legs.push(l);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root: g, claws, legs };
}

export function makeDolphin(){
  const g = new THREE.Group();
  const grey = lam(0x6a8aa8), belly = lam(0xdce6ee);
  const body = mesh(new THREE.SphereGeometry(0.5, 12, 8), grey, 0, 0, 0);
  body.scale.set(0.8, 0.8, 2.6);
  g.add(body);
  const bl = mesh(new THREE.SphereGeometry(0.45, 10, 6), belly, 0, -0.12, 0.1);
  bl.scale.set(0.75, 0.6, 2.3);
  g.add(bl);
  const snout = cyl(0.12, 0.18, 0.4, 8, grey, 0, -0.05, 1.45);
  snout.rotation.x = Math.PI / 2;
  g.add(snout);
  for (const k of [-1, 1]){
    g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), MAT.dark, k * 0.26, 0.12, 0.95));
    const fin = box(0.5, 0.05, 0.25, grey, k * 0.45, -0.2, 0.4);
    fin.rotation.z = k * -0.4;
    g.add(fin);
  }
  const dorsal = cone(0.22, 0.5, 4, grey, 0, 0.5, -0.1);
  dorsal.rotation.x = -0.5;
  g.add(dorsal);
  const tail = new THREE.Group();
  tail.position.set(0, 0, -1.3);
  tail.add(box(0.9, 0.06, 0.35, grey, 0, 0, -0.1));
  g.add(tail);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root: g, tail };
}

/** A fish, or the boot, held up when you catch it. */
export function makeFish(def){
  const g = new THREE.Group();
  const c = lam(def.color);
  if (def.key === 'boot'){
    g.add(box(0.26, 0.5, 0.3, c, 0, 0.1, 0));
    g.add(box(0.26, 0.18, 0.55, c, 0, -0.1, 0.14));
    return g;
  }
  if (def.key === 'squid'){
    const b = cone(0.2, 0.7, 7, new THREE.MeshLambertMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.6 }), 0, 0.3, 0);
    g.add(b);
    for (let i = 0; i < 6; i++) g.add(cyl(0.025, 0.02, 0.4, 4, c, Math.cos(i) * 0.1, -0.2, Math.sin(i) * 0.1));
    return g;
  }
  const size = def.key === 'sword' ? 1.3 : def.key === 'mahi' ? 1.1 : def.key === 'puffer' ? 0.7 : 0.8;
  const body = mesh(new THREE.SphereGeometry(0.25, 10, 7), c, 0, 0, 0);
  body.scale.set(0.5, def.key === 'puffer' ? 1.1 : 0.8, def.key === 'puffer' ? 1.1 : 1.6);
  g.add(body);
  const tail = cone(0.2, 0.3, 4, c, 0, 0, -0.45);
  tail.rotation.x = -Math.PI / 2;
  g.add(tail);
  g.add(cone(0.1, 0.25, 4, c, 0, 0.22, -0.05));
  for (const k of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.04, 6, 4), MAT.dark, k * 0.11, 0.05, 0.25));
  if (def.key === 'clown') for (const z of [0.1, -0.15]) g.add(box(0.27, 0.36, 0.05, MAT.white, 0, 0, z));
  if (def.key === 'sword'){ const b = cyl(0.015, 0.04, 0.6, 5, c, 0, 0, 0.6); b.rotation.x = Math.PI / 2; g.add(b); }
  if (def.key === 'golden') g.children[0].material = new THREE.MeshLambertMaterial({ color: 0xffd23a, emissive: 0xffa000, emissiveIntensity: 0.5 });
  g.scale.setScalar(size);
  return g;
}

export function makeGull(){
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.2, 8, 5), MAT.white, 0, 0, 0, false);
  body.scale.set(0.8, 0.7, 1.6);
  g.add(body);
  const beak = cone(0.04, 0.14, 4, MAT.yellow, 0, 0, 0.36);
  beak.rotation.x = Math.PI / 2;
  g.add(beak);
  const wings = [];
  for (const k of [-1, 1]){
    const w = new THREE.Group();
    w.add(box(0.7, 0.03, 0.26, lam(0xc8ccd0), k * 0.35, 0, 0));
    g.add(w);
    wings.push(w);
  }
  return { root: g, wings };
}
