// ---------- Everything you can see, made of boxes, cones and cylinders ----------
//
// No model files. Every building, tree and creature is assembled here from
// primitives with flat shading, which is what gives the island its toy-like look.
// Buildings are built at the origin with y = 0 on the ground; the world puts
// them in place and adds a foundation underneath.
import * as THREE from 'three';

const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...extra });

export const MAT = {
  plaster: lam(0xefe4cc), plaster2: lam(0xe6d3ad),
  timber: lam(0x4b3223), wood: lam(0x7a5535), woodLight: lam(0xa27b4f), plank: lam(0x8e6841),
  thatch: lam(0xcaa45a), thatchDark: lam(0xa9853f),
  tile: lam(0xa4543a), tileDark: lam(0x7f3d2a), slate: lam(0x4f5967), slateDark: lam(0x3c4452),
  stone: lam(0x9d978c), stoneDark: lam(0x7a756d), stoneLight: lam(0xb9b3a6), cobble: lam(0x8a8478),
  dirt: lam(0x6f5436), soil: lam(0x5a4028), straw: lam(0xd8bf6a),
  iron: lam(0x3c3f45), gold: lam(0xe0b53c), rope: lam(0xb59a66),
  cloth: lam(0xe9e1cf), red: lam(0xb2352e), blue: lam(0x2f5da8), green: lam(0x3f7d3a), yellow: lam(0xe8c547),
  leaf: lam(0x4f8f3a), leaf2: lam(0x67a643), leaf3: lam(0x3f7a33), pine: lam(0x2f6a3a), pine2: lam(0x3d7d45),
  bark: lam(0x6b4a2f), berry: lam(0xd8283b), bush: lam(0x3f8a3c),
  rock: lam(0x918d85), rock2: lam(0x7b7872), ore: lam(0xc9763a),
  water: new THREE.MeshLambertMaterial({ color: 0x2a6f8f }),
  // Windows light up at night; main.js sets the intensity once for all of them.
  window: new THREE.MeshLambertMaterial({ color: 0x2c2a26, emissive: 0xffb04a, emissiveIntensity: 0 }),
  stained: new THREE.MeshLambertMaterial({ color: 0x2f2a44, emissive: 0x9a7bff, emissiveIntensity: 0 }),
  coals: new THREE.MeshBasicMaterial({ color: 0xff6a1a }),
  flame: new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: 0.92, depthWrite: false }),
  flame2: new THREE.MeshBasicMaterial({ color: 0xffe07a, transparent: true, opacity: 0.95, depthWrite: false }),
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

/** The top half of a disc, facing +z: door and window arches. */
function arch(r, thick, mat, x, y, z){
  const geo = new THREE.CylinderGeometry(r, r, thick, 14, 1, false, 0, Math.PI);
  geo.rotateX(Math.PI / 2);
  geo.rotateZ(Math.PI / 2);
  return mesh(geo, mat, x, y, z);
}

/** A gabled roof whose ridge runs along x. Slopes fall toward ±z. */
function gableRoof(w, d, h, mat, { over = 0.4, thick = 0.24, ridge = null } = {}){
  const g = new THREE.Group();
  const ang = Math.atan2(h, d / 2);
  const len = Math.hypot(d / 2, h);
  for (const s of [-1, 1]){
    const m = box(w + over * 2, thick, len + over, mat);
    m.rotation.x = s * ang;
    const dz = (s * d / 2) / len, dy = -h / len;
    m.position.set(0, h / 2 + dy * over / 2 + thick / 2, s * d / 4 + dz * over / 2);
    g.add(m);
  }
  if (ridge){
    const r = box(w + over * 2 + 0.1, 0.28, 0.34, ridge, 0, h + 0.12, 0);
    g.add(r);
  }
  return g;
}

/** A triangle of wall to close the end of a gabled roof, lying in the z–y plane. */
function gable(d, h, thick, mat){
  const s = new THREE.Shape();
  s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  geo.rotateY(Math.PI / 2);
  geo.translate(-thick / 2, 0, 0);
  return mesh(geo, mat);
}

/** A glowing window with a wooden cross in it, facing +z. */
function windowPane(w, h, frame = MAT.timber, glass = MAT.window){
  const g = new THREE.Group();
  g.add(box(w, h, 0.08, glass, 0, 0, 0));
  g.add(box(w + 0.14, 0.1, 0.14, frame, 0, h / 2, 0.02));
  g.add(box(w + 0.14, 0.12, 0.2, frame, 0, -h / 2, 0.04));
  g.add(box(0.07, h, 0.12, frame, 0, 0, 0.02));
  g.add(box(w, 0.07, 0.12, frame, 0, 0, 0.02));
  return g;
}

function door(w, h, mat = MAT.plank){
  const g = new THREE.Group();
  g.add(box(w, h, 0.12, mat, 0, h / 2, 0));
  for (const y of [0.25, h - 0.3]) g.add(box(w * 0.9, 0.08, 0.16, MAT.iron, 0, y, 0.02));
  g.add(box(0.08, 0.08, 0.1, MAT.gold, w * 0.3, h * 0.5, 0.08));
  return g;
}

/** A cloth flag that ripples. Its update is called every frame by the world. */
export function makeFlag(color, w = 1.4, h = 0.9){
  const geo = new THREE.PlaneGeometry(w, h, 8, 3);
  geo.translate(w / 2, 0, 0);
  const base = geo.attributes.position.array.slice();
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
  m.castShadow = true;
  m.userData.dynamic = true;
  m.userData.wave = (t) => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3){
      const x = base[i];
      p[i + 2] = Math.sin(x * 3.2 - t * 5) * 0.14 * (x / w);
      p[i + 1] = base[i + 1] - (x / w) * 0.08 * Math.sin(t * 2);
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  };
  return m;
}

function flagpole(color, height = 2.2){
  const g = new THREE.Group();
  g.add(cyl(0.04, 0.05, height, 6, MAT.timber, 0, height / 2, 0));
  g.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), MAT.gold, 0, height + 0.05, 0));
  const f = makeFlag(color);
  f.position.set(0.04, height - 0.5, 0);
  g.add(f);
  g.userData.flag = f;
  return g;
}

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
    a.rotation.y = t * 2;
  };
  return g;
}

/** Timber framing on a wall face: posts, rails and braces, like a Tudor house. */
function timberFrame(g, w, h, y0, z, { braces = true, rotY = 0 } = {}){
  const f = new THREE.Group();
  const posts = Math.max(2, Math.round(w / 1.25) + 1);
  for (let i = 0; i < posts; i++){
    const x = -w / 2 + (i / (posts - 1)) * w;
    f.add(box(0.16, h, 0.1, MAT.timber, x, y0 + h / 2, 0));
  }
  f.add(box(w + 0.1, 0.16, 0.12, MAT.timber, 0, y0 + 0.08, 0));
  f.add(box(w + 0.1, 0.16, 0.12, MAT.timber, 0, y0 + h - 0.08, 0));
  f.add(box(w, 0.12, 0.1, MAT.timber, 0, y0 + h * 0.5, 0));
  if (braces){
    const bw = w / (posts - 1);
    const len = Math.hypot(bw, h * 0.5);
    const ang = Math.atan2(h * 0.5, bw);
    for (const [i, s] of [[0, 1], [posts - 2, -1]]){
      const x = -w / 2 + (i + 0.5) * bw;
      const b = box(len, 0.1, 0.08, MAT.timber, x, y0 + h * 0.25, 0);
      b.rotation.z = s * ang;
      f.add(b);
    }
  }
  f.rotation.y = rotY;
  if (rotY === 0) f.position.z = z; else f.position.x = z;
  g.add(f);
}

// ------------------------------------------------------------ nature
export function makeTree(kind, r){
  const g = new THREE.Group();
  const top = new THREE.Group();
  const s = 0.85 + r() * 0.5;
  if (kind === 'pine'){
    const trunk = cyl(0.16 * s, 0.26 * s, 1.6 * s, 6, MAT.bark, 0, 0.8 * s, 0);
    top.add(trunk);
    const mats = [MAT.pine, MAT.pine2];
    for (let i = 0; i < 3; i++){
      const c = cone((1.7 - i * 0.42) * s, (2.1 - i * 0.3) * s, 7, mats[i % 2], 0, (1.8 + i * 1.15) * s, 0);
      c.rotation.y = r() * 3;
      top.add(c);
    }
  } else {
    const trunk = cyl(0.2 * s, 0.32 * s, 2.2 * s, 6, MAT.bark, 0, 1.1 * s, 0);
    top.add(trunk);
    const mats = [MAT.leaf, MAT.leaf2, MAT.leaf3];
    const n = 3 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++){
      const b = mesh(new THREE.IcosahedronGeometry((1.0 + r() * 0.5) * s, 0), mats[i % 3],
        (r() - 0.5) * 1.4 * s, (2.6 + r() * 1.1) * s, (r() - 0.5) * 1.4 * s);
      b.rotation.set(r() * 3, r() * 3, 0);
      top.add(b);
    }
  }
  g.add(top);
  const stump = cyl(0.26 * s, 0.32 * s, 0.35, 7, MAT.bark, 0, 0.17, 0);
  stump.add(mesh(new THREE.CylinderGeometry(0.24 * s, 0.24 * s, 0.02, 7), MAT.woodLight, 0, 0.18, 0, false));
  stump.visible = false;
  g.add(stump);
  mergeStatic(top);
  g.userData = { top, stump, scale: s, canopy: 4.5 * s };
  return g;
}

export function makeRock(kind, r){
  const g = new THREE.Group();
  const s = kind === 'iron' ? 0.9 + r() * 0.3 : 0.8 + r() * 0.6;
  const body = new THREE.Group();
  const main = mesh(new THREE.DodecahedronGeometry(1, 0), kind === 'iron' ? MAT.rock2 : MAT.rock, 0, 0.55 * s, 0);
  main.scale.set(1.2 * s, 0.85 * s, 1.0 * s);
  main.rotation.set(r(), r() * 3, r());
  body.add(main);
  const side = mesh(new THREE.DodecahedronGeometry(0.6, 0), MAT.rock2, 0.8 * s, 0.3 * s, 0.3 * s);
  side.rotation.set(r(), r(), r());
  body.add(side);
  if (kind === 'iron'){
    for (let i = 0; i < 6; i++){
      const a = r() * Math.PI * 2;
      const c = mesh(new THREE.OctahedronGeometry(0.2 + r() * 0.15, 0), MAT.ore,
        Math.cos(a) * 0.9 * s, 0.4 + r() * 0.6 * s, Math.sin(a) * 0.8 * s);
      c.rotation.set(r() * 3, r() * 3, r() * 3);
      body.add(c);
    }
  }
  mergeStatic(body);
  g.add(body);
  const rubble = new THREE.Group();
  for (let i = 0; i < 4; i++){
    const p = mesh(new THREE.DodecahedronGeometry(0.2 + r() * 0.15, 0), MAT.rock2, (r() - 0.5) * 1.2, 0.1, (r() - 0.5) * 1.2);
    rubble.add(p);
  }
  rubble.visible = false;
  g.add(rubble);
  g.userData = { top: body, stump: rubble, scale: s };
  return g;
}

export function makeBush(r){
  const g = new THREE.Group();
  const body = new THREE.Group();
  for (let i = 0; i < 3; i++){
    const b = mesh(new THREE.IcosahedronGeometry(0.6 + r() * 0.3, 0), MAT.bush, (r() - 0.5) * 0.9, 0.5 + r() * 0.2, (r() - 0.5) * 0.9);
    b.rotation.set(r() * 3, r() * 3, 0);
    body.add(b);
  }
  g.add(body);
  const berries = new THREE.Group();
  const bg = new THREE.SphereGeometry(0.09, 6, 4);
  for (let i = 0; i < 14; i++){
    const a = r() * Math.PI * 2, e = r() * 1.1;
    const m = mesh(bg, MAT.berry, Math.cos(a) * 0.75, 0.35 + e * 0.5, Math.sin(a) * 0.75, false);
    berries.add(m);
  }
  mergeStatic(body);
  mergeStatic(berries);
  g.add(berries);
  g.userData = { top: berries, stump: null, body, scale: 1 };
  return g;
}

export function makeFishSpot(){
  const g = new THREE.Group();
  const rings = [];
  const rm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false });
  for (let i = 0; i < 3; i++){
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.95, 24), rm.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    g.add(ring);
    rings.push(ring);
  }
  const fish = new THREE.Group();
  const fb = mesh(new THREE.SphereGeometry(0.22, 8, 6), lam(0x9fb7c4));
  fb.scale.set(1, 0.6, 2);
  fish.add(fb);
  const tail = cone(0.18, 0.3, 4, lam(0x7d97a5), 0, 0, -0.5);
  tail.rotation.x = -Math.PI / 2;
  fish.add(tail);
  fish.visible = false;
  g.add(fish);
  g.userData = { rings, fish, top: fish, stump: null, scale: 1 };
  return g;
}

/** The boat you arrived in, broken on the sand. */
export function makeWreck(){
  const g = new THREE.Group();
  const hull = new THREE.Group();
  hull.add(box(0.3, 0.3, 7, MAT.timber, 0, 0.15, 0));
  for (let i = 0; i < 6; i++){
    const z = -2.8 + i * 1.1;
    const w = 2.4 - Math.abs(z) * 0.25;
    for (const s of [-1, 1]){
      const rib = box(0.16, 1.6, 0.16, MAT.timber, s * w / 2, 0.8, z);
      rib.rotation.z = -s * 0.35;
      hull.add(rib);
    }
  }
  for (let j = 0; j < 3; j++){
    for (const s of [-1, 1]){
      if (s === 1 && j === 2) continue;           // a hole in the side
      const p = box(0.08, 0.34, 6.4 - j * 0.6, MAT.plank, s * (1.05 + j * 0.18), 0.35 + j * 0.42, 0);
      p.rotation.z = -s * 0.35;
      hull.add(p);
    }
  }
  hull.rotation.z = 0.35;
  g.add(hull);
  const mast = cyl(0.12, 0.15, 4.5, 6, MAT.wood, 0.6, 1.2, -0.3);
  mast.rotation.z = 1.15;
  g.add(mast);
  const sail = box(2.6, 0.04, 2, MAT.cloth, 2.8, 0.25, 0.6);
  sail.rotation.set(0.05, 0.4, 0.05);
  g.add(sail);
  g.add(box(0.8, 0.8, 0.8, MAT.plank, -2.2, 0.4, 2.2));
  const barrel = cyl(0.38, 0.38, 0.9, 10, MAT.wood, -2.6, 0.38, 0.9);
  barrel.rotation.z = Math.PI / 2;
  g.add(barrel);
  return g;
}

// ------------------------------------------------------------ people and animals
/** A blocky person. Returns parts the animator swings. */
export function makePerson({ tunic = 0x3d6aa8, pants = 0x5a4632, skin = 0xe3b48a, hair = 0x5a3a22, hat = null, hood = null, belt = 0x3a2616 } = {}){
  const g = new THREE.Group();
  const t = lam(tunic), s = lam(skin);
  const legs = [], arms = [];
  for (const k of [-1, 1]){
    const hip = new THREE.Group();
    hip.position.set(k * 0.15, 0.66, 0);
    const leg = box(0.22, 0.6, 0.22, lam(pants), 0, -0.3, 0);
    hip.add(leg);
    hip.add(box(0.25, 0.14, 0.34, MAT.timber, 0, -0.6, 0.04));
    g.add(hip);
    legs.push(hip);
  }
  const body = box(0.64, 0.74, 0.4, t, 0, 1.02, 0);
  g.add(body);
  g.add(box(0.66, 0.1, 0.42, lam(belt), 0, 0.72, 0));
  g.add(box(0.7, 0.26, 0.44, t, 0, 0.58, 0));      // skirt of the tunic
  for (const k of [-1, 1]){
    const sh = new THREE.Group();
    sh.position.set(k * 0.43, 1.34, 0);
    sh.add(box(0.19, 0.58, 0.19, t, 0, -0.27, 0));
    sh.add(box(0.17, 0.15, 0.17, s, 0, -0.62, 0));
    g.add(sh);
    arms.push(sh);
  }
  const head = new THREE.Group();
  head.position.y = 1.62;
  head.add(box(0.46, 0.44, 0.42, s, 0, 0, 0));
  head.add(box(0.48, 0.14, 0.44, lam(hair), 0, 0.2, -0.01));
  head.add(box(0.48, 0.3, 0.12, lam(hair), 0, 0.06, -0.19));
  for (const k of [-1, 1]) head.add(box(0.07, 0.08, 0.04, lam(0x231a12), k * 0.11, 0.03, 0.21));
  head.add(box(0.08, 0.1, 0.08, lam(skin - 0x101010), 0, -0.05, 0.23));
  if (hat){
    head.add(cyl(0.34, 0.34, 0.05, 10, lam(hat), 0, 0.24, 0));
    head.add(cyl(0.2, 0.26, 0.24, 10, lam(hat), 0, 0.36, 0));
  }
  if (hood){
    head.add(box(0.54, 0.5, 0.5, lam(hood), 0, 0.06, -0.04));
    head.add(box(0.36, 0.3, 0.1, s, 0, -0.02, 0.23));   // face shows through
    for (const k of [-1, 1]) head.add(box(0.07, 0.08, 0.04, lam(0x231a12), k * 0.11, 0.03, 0.29));
    const tip = cone(0.16, 0.4, 4, lam(hood), 0, 0.1, -0.38);
    tip.rotation.x = -1.2;
    head.add(tip);
  }
  g.add(head);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root: g, legs, arms, head, body };
}

export function makeTools(){
  const g = new THREE.Group();
  const handle = (len) => cyl(0.035, 0.035, len, 5, MAT.woodLight, 0, -len / 2, 0);
  const axe = new THREE.Group();
  axe.add(handle(0.9));
  const blade = box(0.06, 0.3, 0.3, MAT.iron, 0, -0.85, 0.14);
  axe.add(blade);
  const pick = new THREE.Group();
  pick.add(handle(0.9));
  const ph = box(0.07, 0.08, 0.7, MAT.iron, 0, -0.85, 0);
  pick.add(ph);
  const hammer = new THREE.Group();
  hammer.add(handle(0.7));
  hammer.add(box(0.18, 0.16, 0.34, MAT.iron, 0, -0.7, 0));
  const sword = new THREE.Group();
  sword.add(box(0.05, 0.18, 0.06, MAT.timber, 0, -0.1, 0));
  sword.add(box(0.06, 0.06, 0.34, MAT.gold, 0, -0.22, 0));
  sword.add(box(0.03, 0.9, 0.1, lam(0xc9cfd6), 0, -0.7, 0));
  const rod = new THREE.Group();
  rod.add(cyl(0.02, 0.035, 1.8, 5, MAT.woodLight, 0, -0.9, 0));
  const basket = new THREE.Group();
  basket.add(cyl(0.2, 0.15, 0.22, 8, MAT.straw, 0, -0.18, 0.1));
  for (const t of [axe, pick, hammer, sword, rod, basket]){ t.visible = false; g.add(t); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root: g, axe, pick, hammer, sword, rod, hand: basket };
}

export function makeWolf(){
  const g = new THREE.Group();
  const fur = lam(0x6f6d6a), dark = lam(0x4a4745), belly = lam(0xa8a39a);
  const body = box(0.6, 0.55, 1.3, fur, 0, 0.75, 0);
  g.add(body);
  g.add(box(0.5, 0.2, 1.0, belly, 0, 0.52, 0));
  const head = new THREE.Group();
  head.position.set(0, 1.0, 0.75);
  head.add(box(0.46, 0.42, 0.44, fur, 0, 0, 0));
  head.add(box(0.26, 0.2, 0.34, belly, 0, -0.08, 0.34));
  head.add(box(0.1, 0.08, 0.08, lam(0x1a1a1a), 0, -0.02, 0.52));
  for (const k of [-1, 1]){
    const ear = cone(0.09, 0.24, 4, dark, k * 0.14, 0.3, -0.05);
    head.add(ear);
  }
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffd23a });
  for (const k of [-1, 1]) head.add(mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), eyeMat, k * 0.12, 0.07, 0.23, false));
  g.add(head);
  const legs = [];
  for (const [x, z] of [[-0.2, 0.45], [0.2, 0.45], [-0.2, -0.45], [0.2, -0.45]]){
    const hip = new THREE.Group();
    hip.position.set(x, 0.55, z);
    hip.add(box(0.16, 0.55, 0.16, dark, 0, -0.27, 0));
    g.add(hip);
    legs.push(hip);
  }
  const tail = box(0.14, 0.14, 0.6, dark, 0, 0.85, -0.85);
  tail.rotation.x = 0.6;
  g.add(tail);
  return { root: g, legs, head, tail };
}

export function makeSheep(){
  const g = new THREE.Group();
  const wool = lam(0xf4f1e8), face = lam(0x3a3430);
  const body = mesh(new THREE.IcosahedronGeometry(0.55, 1), wool, 0, 0.72, 0);
  body.scale.set(1, 0.85, 1.35);
  g.add(body);
  const head = new THREE.Group();
  head.position.set(0, 0.85, 0.72);
  head.add(box(0.3, 0.32, 0.36, face, 0, 0, 0));
  head.add(mesh(new THREE.IcosahedronGeometry(0.2, 0), wool, 0, 0.18, -0.05));
  for (const k of [-1, 1]){ const e = box(0.18, 0.06, 0.08, face, k * 0.2, 0.06, -0.02); head.add(e); }
  g.add(head);
  const legs = [];
  for (const [x, z] of [[-0.22, 0.35], [0.22, 0.35], [-0.22, -0.35], [0.22, -0.35]]){
    const hip = new THREE.Group();
    hip.position.set(x, 0.45, z);
    hip.add(box(0.12, 0.45, 0.12, face, 0, -0.22, 0));
    g.add(hip);
    legs.push(hip);
  }
  return { root: g, legs, head };
}

// ------------------------------------------------------------ buildings
//
// Each builder returns { group, height, smoke: [local points], flames: [..],
// lights: [local points], tick(t) }. `height` is how tall it is, which the
// construction clipping plane climbs to.

function campfire(){
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(1.1, 1.2, 0.06, 14), MAT.dirt, 0, 0.03, 0, false));
  for (let i = 0; i < 9; i++){
    const a = (i / 9) * Math.PI * 2;
    const s = mesh(new THREE.DodecahedronGeometry(0.22, 0), MAT.stone, Math.cos(a) * 0.72, 0.14, Math.sin(a) * 0.72);
    s.rotation.set(i, i * 2, 0);
    g.add(s);
  }
  for (let i = 0; i < 4; i++){
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const log = cyl(0.08, 0.1, 1.0, 6, MAT.bark, Math.cos(a) * 0.22, 0.35, Math.sin(a) * 0.22);
    log.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    g.add(log);
  }
  g.add(mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.08, 10), MAT.coals, 0, 0.08, 0, false));
  const f = flameCluster(1.1);
  f.position.y = 0.1;
  g.add(f);
  // Log benches.
  for (const [x, z, r] of [[-1.9, 0.4, 0.3], [1.5, -1.3, -0.9]]){
    const b = cyl(0.2, 0.2, 1.3, 7, MAT.bark, x, 0.2, z);
    b.rotation.set(0, r, Math.PI / 2);
    g.add(b);
  }
  return {
    group: g, height: 1.4, smoke: [new THREE.Vector3(0, 1.2, 0)], sparks: [new THREE.Vector3(0, 0.6, 0)],
    lights: [new THREE.Vector3(0, 0.9, 0)],
    tick: (t) => f.userData.flick(t),
  };
}

function torch(){
  const g = new THREE.Group();
  g.add(cyl(0.07, 0.1, 2.2, 6, MAT.wood, 0, 1.1, 0));
  g.add(cyl(0.16, 0.1, 0.22, 6, MAT.iron, 0, 2.25, 0));
  const f = flameCluster(0.55);
  f.position.y = 2.33;
  g.add(f);
  return { group: g, height: 2.8, lights: [new THREE.Vector3(0, 2.6, 0)], sparks: [new THREE.Vector3(0, 2.5, 0)], tick: (t) => f.userData.flick(t, 3) };
}

function hut(){
  const g = new THREE.Group();
  g.add(cyl(1.95, 2.05, 0.25, 12, MAT.stoneDark, 0, 0.12, 0));
  g.add(cyl(1.85, 1.9, 1.7, 12, MAT.woodLight, 0, 1.05, 0));
  // Wattle stakes around the wall.
  for (let i = 0; i < 16; i++){
    const a = (i / 16) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.3) continue;       // leave the doorway
    g.add(cyl(0.07, 0.07, 1.8, 5, MAT.timber, Math.cos(a) * 1.9, 1.05, Math.sin(a) * 1.9));
  }
  g.add(cyl(1.92, 1.92, 0.12, 12, MAT.timber, 0, 1.6, 0));
  const roof = cone(2.7, 2.6, 12, MAT.thatch, 0, 3.15, 0);
  g.add(roof);
  g.add(cone(2.72, 0.5, 12, MAT.thatchDark, 0, 2.05, 0));
  g.add(cyl(0.12, 0.25, 0.5, 6, MAT.thatchDark, 0, 4.55, 0));
  const d = door(0.85, 1.35);
  d.position.set(0, 0.25, 1.86);
  g.add(d);
  const w = windowPane(0.45, 0.4);
  w.position.set(1.33, 1.25, 1.33);
  w.rotation.y = Math.PI / 4;
  g.add(w);
  // A woodpile by the door.
  for (let i = 0; i < 5; i++){
    const l = cyl(0.12, 0.12, 0.9, 6, MAT.bark, -1.75 + (i % 3) * 0.26, 0.14 + Math.floor(i / 3) * 0.22, 1.35 + (i % 2) * 0.05);
    l.rotation.x = Math.PI / 2;
    l.rotation.z = -0.6;
    g.add(l);
  }
  return { group: g, height: 4.9, smoke: [new THREE.Vector3(0, 4.8, 0)] };
}

function farm(){
  const g = new THREE.Group();
  const W = 6.4, D = 4.6;
  g.add(mesh(new THREE.BoxGeometry(W, 0.14, D), MAT.soil, 0, 0.07, 0, false));
  const rows = 5, per = 12;
  for (let r = 0; r < rows; r++){
    const z = -D / 2 + 0.5 + r * ((D - 1) / (rows - 1));
    g.add(mesh(new THREE.BoxGeometry(W - 0.4, 0.1, 0.36), MAT.dirt, 0, 0.16, z, false));
  }
  // Wheat: every stalk is one instance, so a field is two draw calls.
  const stalkMat = new THREE.MeshLambertMaterial({ color: 0x78a83c, flatShading: true });
  const headMat = new THREE.MeshLambertMaterial({ color: 0x9ab84a, flatShading: true });
  const stalks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 1, 0.06), stalkMat, rows * per * 2);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.3, 0.13), headMat, rows * per * 2);
  const wheat = new THREE.Group();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  let k = 0;
  for (let r = 0; r < rows; r++){
    const z = -D / 2 + 0.5 + r * ((D - 1) / (rows - 1));
    for (let i = 0; i < per * 2; i++){
      const x = -W / 2 + 0.4 + (i / (per * 2 - 1)) * (W - 0.8);
      const lean = Math.sin(i * 1.7 + r) * 0.12;
      e.set(lean, 0, Math.cos(i * 2.3 + r) * 0.12);
      q.setFromEuler(e);
      const hgt = 0.85 + ((i * 7 + r * 3) % 5) * 0.05;
      m4.compose(new THREE.Vector3(x, 0.2 + hgt / 2, z + ((i % 2) - 0.5) * 0.14), q, new THREE.Vector3(1, hgt, 1));
      stalks.setMatrixAt(k, m4);
      m4.compose(new THREE.Vector3(x + lean * 0.1, 0.2 + hgt + 0.1, z + ((i % 2) - 0.5) * 0.14), q, new THREE.Vector3(1, 1, 1));
      heads.setMatrixAt(k, m4);
      k++;
    }
  }
  stalks.castShadow = heads.castShadow = true;
  wheat.add(stalks, heads);
  wheat.userData.dynamic = true;
  g.add(wheat);

  // Fence.
  const fx = W / 2 + 0.35, fz = D / 2 + 0.35;
  const post = new THREE.CylinderGeometry(0.06, 0.07, 0.9, 5);
  for (let x = -fx; x <= fx + 0.01; x += (2 * fx) / 6){
    for (const z of [-fz, fz]) g.add(mesh(post, MAT.wood, x, 0.45, z));
  }
  for (let z = -fz + (2 * fz) / 4; z < fz - 0.01; z += (2 * fz) / 4){
    for (const x of [-fx, fx]) g.add(mesh(post, MAT.wood, x, 0.45, z));
  }
  for (const y of [0.4, 0.75]){
    g.add(box(2 * fx, 0.07, 0.06, MAT.woodLight, 0, y, -fz));
    g.add(box(2 * fx * 0.36, 0.07, 0.06, MAT.woodLight, -fx * 0.64, y, fz));
    g.add(box(2 * fx * 0.36, 0.07, 0.06, MAT.woodLight, fx * 0.64, y, fz));
    g.add(box(0.06, 0.07, 2 * fz, MAT.woodLight, -fx, y, 0));
    g.add(box(0.06, 0.07, 2 * fz, MAT.woodLight, fx, y, 0));
  }
  // Scarecrow.
  const sc = new THREE.Group();
  sc.position.set(fx - 0.6, 0, -fz + 0.6);
  sc.add(cyl(0.05, 0.05, 2.1, 5, MAT.wood, 0, 1.05, 0));
  sc.add(box(1.3, 0.07, 0.07, MAT.wood, 0, 1.55, 0));
  sc.add(box(0.5, 0.6, 0.3, MAT.red, 0, 1.4, 0));
  sc.add(mesh(new THREE.SphereGeometry(0.2, 8, 6), MAT.straw, 0, 1.95, 0));
  sc.add(cyl(0.3, 0.3, 0.04, 8, MAT.thatchDark, 0, 2.1, 0));
  sc.add(cone(0.16, 0.26, 8, MAT.thatchDark, 0, 2.24, 0));
  g.add(sc);

  const green = new THREE.Color(0x78a83c), gold = new THREE.Color(0xe0b84a);
  const hGreen = new THREE.Color(0x9ab84a), hGold = new THREE.Color(0xf0cf62);
  return {
    group: g, height: 2.4,
    setGrowth(f){
      wheat.scale.y = 0.08 + f * 0.92;
      wheat.visible = f > 0.01;
      heads.visible = f > 0.5;
      const c = Math.max(0, (f - 0.6) / 0.4);
      stalkMat.color.copy(green).lerp(gold, c);
      headMat.color.copy(hGreen).lerp(hGold, c);
    },
    tick: (t) => { wheat.rotation.z = Math.sin(t * 1.3) * 0.015; },
  };
}

function cottage(variant = 0){
  const g = new THREE.Group();
  const W = 5, D = 4;
  const roofMat = [MAT.thatch, MAT.tile, MAT.slate][variant % 3];
  const ridgeMat = [MAT.thatchDark, MAT.tileDark, MAT.slateDark][variant % 3];
  const plaster = variant % 2 ? MAT.plaster2 : MAT.plaster;

  // Ground floor in stone.
  g.add(box(W + 0.3, 0.35, D + 0.3, MAT.stoneDark, 0, 0.17, 0));
  g.add(box(W, 1.9, D, MAT.stone, 0, 1.3, 0));
  // Corner quoins, lighter stone.
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]){
    for (let i = 0; i < 4; i++) g.add(box(0.36, 0.3, 0.36, MAT.stoneLight, x, 0.55 + i * 0.44, z));
  }
  // Upper floor jetties out over the lower one.
  const UW = W + 0.5, UD = D + 0.5, UY = 2.25, UH = 1.75;
  g.add(box(UW + 0.1, 0.2, UD + 0.1, MAT.timber, 0, UY + 0.1, 0));
  g.add(box(UW, UH, UD, plaster, 0, UY + 0.2 + UH / 2, 0));
  timberFrame(g, UW, UH, UY + 0.2, UD / 2 + 0.03);
  timberFrame(g, UW, UH, UY + 0.2, -UD / 2 - 0.03);
  timberFrame(g, UD, UH, UY + 0.2, UW / 2 + 0.03, { rotY: Math.PI / 2, braces: false });
  timberFrame(g, UD, UH, UY + 0.2, -UW / 2 - 0.03, { rotY: Math.PI / 2, braces: false });
  // Jetty brackets.
  for (const x of [-1.8, 0, 1.8]){
    const b = box(0.14, 0.5, 0.14, MAT.timber, x, UY - 0.15, D / 2 + 0.12);
    b.rotation.x = -0.6;
    g.add(b);
  }

  // Roof, ridge along x, with plaster gables at the ends.
  const RY = UY + 0.2 + UH, RH = 2.5;
  const roof = gableRoof(UW, UD, RH, roofMat, { over: 0.45, thick: 0.3, ridge: ridgeMat });
  roof.position.y = RY;
  g.add(roof);
  for (const s of [-1, 1]){
    const gb = gable(UD, RH, 0.2, plaster);
    gb.position.set(s * (UW / 2 - 0.1), RY, 0);
    g.add(gb);
    const kp = box(0.14, RH * 0.9, 0.12, MAT.timber, s * (UW / 2 + 0.02), RY + RH * 0.45, 0);
    g.add(kp);
    const gw = windowPane(0.5, 0.55);
    gw.position.set(s * (UW / 2 + 0.03), RY + 0.8, 0);
    gw.rotation.y = s * Math.PI / 2;
    g.add(gw);
  }
  // Dormer on the front slope.
  const dorm = new THREE.Group();
  dorm.add(box(1.2, 1.0, 1.2, plaster, 0, 0.5, 0));
  const dr = gableRoof(1.2, 1.2, 0.6, roofMat, { over: 0.15, thick: 0.16 });
  dr.rotation.y = Math.PI / 2;
  dr.position.y = 1.0;
  dorm.add(dr);
  const dw = windowPane(0.5, 0.5);
  dw.position.set(0, 0.5, 0.62);
  dorm.add(dw);
  dorm.position.set(-0.9, RY + 0.35, UD / 2 - 0.6);
  g.add(dorm);

  // Chimney.
  const ch = box(0.8, RH + 2.4, 0.8, MAT.stoneDark, 1.6, RY + (RH + 2.4) / 2 - 1.2, -0.8);
  g.add(ch);
  g.add(box(0.95, 0.2, 0.95, MAT.stone, 1.6, RY + RH + 1.25, -0.8));

  // Front: door, windows, a flower box.
  const d = door(0.95, 1.65);
  d.position.set(-0.9, 0.35, D / 2 + 0.02);
  g.add(d);
  g.add(box(1.25, 0.2, 0.2, MAT.stoneLight, -0.9, 2.1, D / 2 + 0.06));
  const w1 = windowPane(0.75, 0.65);
  w1.position.set(1.1, 1.35, D / 2 + 0.04);
  g.add(w1);
  for (const x of [-1.5, 1.5]){
    const w = windowPane(0.7, 0.7);
    w.position.set(x, UY + 1.1, UD / 2 + 0.06);
    g.add(w);
    const w2 = windowPane(0.7, 0.7);
    w2.position.set(x, UY + 1.1, -UD / 2 - 0.06);
    w2.rotation.y = Math.PI;
    g.add(w2);
    const fb = box(0.85, 0.18, 0.25, MAT.wood, x, UY + 0.62, UD / 2 + 0.16);
    g.add(fb);
    for (let i = 0; i < 4; i++){
      g.add(mesh(new THREE.SphereGeometry(0.08, 5, 4), i % 2 ? MAT.berry : MAT.yellow, x - 0.3 + i * 0.2, UY + 0.76, UD / 2 + 0.18, false));
    }
  }
  // Steps and a barrel.
  g.add(box(1.2, 0.2, 0.5, MAT.stoneLight, -0.9, 0.1, D / 2 + 0.35));
  g.add(cyl(0.32, 0.32, 0.8, 10, MAT.wood, 2.1, 0.4, D / 2 + 0.5));

  return { group: g, height: RY + RH + 1.5, smoke: [new THREE.Vector3(1.6, RY + RH + 1.4, -0.8)] };
}

function well(){
  const g = new THREE.Group();
  g.add(cyl(1.3, 1.4, 0.2, 14, MAT.cobble, 0, 0.1, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.95, 14, 1, true), lam(0x9d978c, { side: THREE.DoubleSide }), 0, 0.62, 0));
  const lip = mesh(new THREE.TorusGeometry(1.05, 0.14, 6, 14), MAT.stoneLight, 0, 1.1, 0);
  lip.rotation.x = Math.PI / 2;
  g.add(lip);
  g.add(mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.05, 14), MAT.water, 0, 0.75, 0, false));
  for (const s of [-1, 1]) g.add(box(0.16, 2.2, 0.16, MAT.wood, s * 1.0, 1.3, 0));
  const winch = cyl(0.1, 0.1, 2.1, 8, MAT.woodLight, 0, 2.05, 0);
  winch.rotation.z = Math.PI / 2;
  g.add(winch);
  const crank = box(0.08, 0.4, 0.08, MAT.iron, 1.12, 1.9, 0);
  g.add(crank);
  g.add(cyl(0.02, 0.02, 0.8, 4, MAT.rope, 0, 1.6, 0));
  g.add(cyl(0.18, 0.14, 0.26, 8, MAT.plank, 0, 1.12, 0));
  const roof = gableRoof(1.6, 2.2, 0.8, MAT.tile, { over: 0.2, thick: 0.14, ridge: MAT.tileDark });
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 2.35;
  g.add(roof);
  return { group: g, height: 3.4 };
}

function blacksmith(){
  const g = new THREE.Group();
  const W = 6, D = 5;
  g.add(box(W + 0.2, 0.3, D + 0.2, MAT.cobble, 0, 0.15, 0));
  // Enclosed back room.
  g.add(box(W, 2.8, 2.2, MAT.stone, 0, 1.7, -D / 2 + 1.1));
  for (const x of [-W / 2, W / 2]) for (let i = 0; i < 4; i++) g.add(box(0.34, 0.32, 0.34, MAT.stoneLight, x, 0.55 + i * 0.6, -D / 2 + 2.2));
  const ww = windowPane(0.6, 0.6);
  ww.position.set(1.4, 2.0, -D / 2 + 2.22);
  g.add(ww);
  // Open front, a lean-to roof on posts.
  for (const x of [-W / 2 + 0.2, 0, W / 2 - 0.2]) g.add(box(0.22, 2.6, 0.22, MAT.timber, x, 1.6, D / 2 - 0.2));
  g.add(box(W + 0.2, 0.22, 0.26, MAT.timber, 0, 2.9, D / 2 - 0.2));
  const roof = box(W + 0.8, 0.22, D + 0.6, MAT.slate, 0, 3.4, 0.1);
  roof.rotation.x = 0.16;
  g.add(roof);
  g.add(box(W + 0.9, 0.3, 0.3, MAT.slateDark, 0, 3.8, -D / 2 - 0.1));
  // Forge with glowing coals and a tall chimney.
  g.add(box(1.8, 1.0, 1.4, MAT.stoneDark, -1.6, 0.8, -0.6));
  g.add(mesh(new THREE.BoxGeometry(1.2, 0.08, 0.9), MAT.coals, -1.6, 1.34, -0.6, false));
  g.add(box(1.2, 1.0, 1.0, MAT.stoneDark, -1.6, 2.4, -1.0));
  g.add(box(0.8, 4.4, 0.8, MAT.stoneDark, -1.6, 4.0, -1.5));
  g.add(box(1.0, 0.2, 1.0, MAT.stone, -1.6, 6.25, -1.5));
  // Anvil on a stump.
  g.add(cyl(0.3, 0.34, 0.6, 8, MAT.bark, 0.6, 0.6, 0.9));
  g.add(box(0.36, 0.2, 0.3, MAT.iron, 0.6, 1.0, 0.9));
  g.add(box(0.7, 0.18, 0.34, MAT.iron, 0.6, 1.18, 0.9));
  const horn = cone(0.12, 0.35, 5, MAT.iron, 1.1, 1.18, 0.9);
  horn.rotation.z = -Math.PI / 2;
  g.add(horn);
  // Water barrel and a rack of swords.
  g.add(cyl(0.38, 0.38, 0.8, 10, MAT.wood, 2.2, 0.7, 1.4));
  g.add(mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 10), MAT.water, 2.2, 1.1, 1.4, false));
  g.add(box(1.4, 0.1, 0.3, MAT.wood, 2.0, 1.7, -0.3));
  for (let i = 0; i < 4; i++) g.add(box(0.05, 1.0, 0.1, lam(0xc9cfd6), 1.5 + i * 0.32, 1.3, -0.25));
  // Hanging sign.
  const sign = new THREE.Group();
  sign.add(box(0.06, 0.06, 0.9, MAT.iron, 0, 0, 0.45));
  sign.add(box(0.06, 0.6, 0.8, MAT.woodLight, 0, -0.35, 0.8));
  sign.add(box(0.08, 0.2, 0.2, MAT.iron, 0, -0.35, 0.8));
  sign.position.set(W / 2 + 0.05, 2.7, D / 2 - 0.4);
  g.add(sign);
  return {
    group: g, height: 6.5, smoke: [new THREE.Vector3(-1.6, 6.4, -1.5)], smokeDark: true,
    sparks: [new THREE.Vector3(-1.6, 1.5, -0.6)], lights: [new THREE.Vector3(-1.4, 1.9, 0)],
  };
}

function windmill(){
  const g = new THREE.Group();
  g.add(cyl(2.5, 2.7, 0.35, 10, MAT.cobble, 0, 0.17, 0));
  const tower = cyl(1.55, 2.25, 7, 10, MAT.plaster, 0, 3.85, 0);
  g.add(tower);
  for (const y of [0.9, 7.2]) g.add(cyl(y > 5 ? 1.62 : 2.28, y > 5 ? 1.62 : 2.28, 0.25, 10, MAT.timber, 0, y, 0));
  const d = door(0.9, 1.6);
  d.position.set(0, 0.35, 2.15);
  d.rotation.x = -0.08;
  g.add(d);
  for (const [y, a] of [[3.2, 0.5], [5.2, -0.6], [4.4, 2.6]]){
    const w = windowPane(0.45, 0.6);
    const r = 2.25 - (y / 7) * 0.7 + 0.04;
    w.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    w.rotation.y = a;
    g.add(w);
  }
  const cap = cone(2.0, 2.2, 10, MAT.thatch, 0, 8.4, 0);
  g.add(cap);
  // Sails.
  const hub = new THREE.Group();
  hub.position.set(0, 7.6, 1.95);
  const axle = cyl(0.18, 0.18, 0.8, 8, MAT.timber, 0, 0, -0.2);
  axle.rotation.x = Math.PI / 2;
  hub.add(axle);
  for (let i = 0; i < 4; i++){
    const arm = new THREE.Group();
    arm.rotation.z = (i / 4) * Math.PI * 2;
    arm.add(box(0.2, 5.4, 0.14, MAT.wood, 0, 2.8, 0.2));
    arm.add(box(1.25, 4.0, 0.05, MAT.cloth, 0.7, 3.3, 0.25));
    for (let k = 0; k < 5; k++) arm.add(box(1.3, 0.06, 0.08, MAT.woodLight, 0.7, 1.5 + k * 0.9, 0.28));
    hub.add(arm);
  }
  hub.userData.dynamic = true;
  g.add(hub);
  // Flour sacks.
  for (const [x, z] of [[1.9, 1.3], [2.3, 0.6]]){
    const s = mesh(new THREE.SphereGeometry(0.36, 8, 6), MAT.cloth, x, 0.62, z);
    s.scale.y = 1.2;
    g.add(s);
  }
  return { group: g, height: 12.5, tick: (t) => { hub.rotation.z = -t * 0.9; } };
}

function watchtower(){
  const g = new THREE.Group();
  const H = 7, b = 1.5, top = 1.05;
  g.add(box(3.4, 0.3, 3.4, MAT.stoneDark, 0, 0.15, 0));
  for (const x of [-1, 1]) for (const z of [-1, 1]){
    const len = Math.hypot(H, b - top);
    const leg = cyl(0.17, 0.22, len, 6, MAT.bark, x * (b + top) / 2, H / 2, z * (b + top) / 2);
    leg.rotation.z = x * Math.atan2(b - top, H);
    leg.rotation.x = -z * Math.atan2(b - top, H);
    g.add(leg);
  }
  // Cross braces on each side.
  for (let i = 0; i < 4; i++){
    const side = new THREE.Group();
    side.rotation.y = (i / 4) * Math.PI * 2;
    for (const y of [2.2, 4.8]){
      const w = b - (y / H) * (b - top);
      const brace = box(0.1, Math.hypot(2 * w, 2.4), 0.1, MAT.wood, 0, y, w);
      brace.rotation.z = Math.atan2(2 * w, 2.4);
      side.add(brace);
      const brace2 = brace.clone();
      brace2.rotation.z *= -1;
      side.add(brace2);
    }
    g.add(side);
  }
  // Platform and railing.
  g.add(box(3.0, 0.25, 3.0, MAT.plank, 0, H, 0));
  for (const x of [-1.4, -0.47, 0.47, 1.4]) for (const z of [-1.4, 1.4]){
    g.add(box(0.1, 0.9, 0.1, MAT.wood, x, H + 0.55, z));
    g.add(box(0.1, 0.9, 0.1, MAT.wood, z, H + 0.55, x));
  }
  for (const s of [-1.4, 1.4]){
    g.add(box(2.9, 0.1, 0.1, MAT.woodLight, 0, H + 1.0, s));
    g.add(box(0.1, 0.1, 2.9, MAT.woodLight, s, H + 1.0, 0));
  }
  // Roof on four posts.
  for (const x of [-1.3, 1.3]) for (const z of [-1.3, 1.3]) g.add(box(0.14, 2.0, 0.14, MAT.timber, x, H + 1.1, z));
  const roof = cone(2.4, 2.0, 4, MAT.tile, 0, H + 3.0, 0);
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  const pole = flagpole(0xb2352e, 1.6);
  pole.position.y = H + 3.8;
  g.add(pole);
  // Brazier.
  g.add(cyl(0.35, 0.2, 0.35, 8, MAT.iron, 0, H + 0.3, 0));
  const f = flameCluster(0.8);
  f.position.y = H + 0.45;
  g.add(f);
  // Ladder.
  const lad = new THREE.Group();
  for (const x of [-0.3, 0.3]) lad.add(box(0.08, H, 0.08, MAT.woodLight, x, H / 2, 0));
  for (let y = 0.5; y < H; y += 0.5) lad.add(box(0.6, 0.06, 0.08, MAT.woodLight, 0, y, 0));
  lad.position.z = b + 0.1;
  lad.rotation.x = -0.07;
  g.add(lad);
  return {
    group: g, height: H + 5, lights: [new THREE.Vector3(0, H + 1.2, 0)], sparks: [new THREE.Vector3(0, H + 0.9, 0)],
    flags: [pole.userData.flag], tick: (t) => f.userData.flick(t, 1),
  };
}

function chapel(){
  const g = new THREE.Group();
  const W = 4.6, L = 7.5, H = 3.8;
  g.add(box(W + 0.4, 0.4, L + 0.4, MAT.stoneDark, 0, 0.2, -0.6));
  g.add(box(W, H, L, MAT.stoneLight, 0, 0.4 + H / 2, -0.6));
  // Buttresses.
  for (let i = 0; i < 4; i++){
    const z = -0.6 - L / 2 + 0.8 + i * ((L - 1.6) / 3);
    for (const s of [-1, 1]){
      const bt = box(0.4, H * 0.8, 0.5, MAT.stone, s * (W / 2 + 0.2), 0.4 + H * 0.4, z);
      g.add(bt);
    }
  }
  // Tall windows down both sides.
  for (let i = 0; i < 3; i++){
    const z = -0.6 - L / 2 + 1.7 + i * ((L - 3.4) / 2);
    for (const s of [-1, 1]){
      const w = windowPane(0.5, 1.5, MAT.stoneDark, MAT.stained);
      w.position.set(s * (W / 2 + 0.03), 2.4, z);
      w.rotation.y = s * Math.PI / 2;
      g.add(w);
      const top = arch(0.25, 0.1, MAT.stained, s * (W / 2 + 0.03), 3.15, z);
      top.rotation.y = s * Math.PI / 2;
      g.add(top);
    }
  }
  // Steep slate roof, ridge along z.
  const roof = gableRoof(L, W, 2.8, MAT.slate, { over: 0.35, thick: 0.25, ridge: MAT.slateDark });
  roof.rotation.y = Math.PI / 2;
  roof.position.set(0, 0.4 + H, -0.6);
  g.add(roof);
  const back = gable(W, 2.8, 0.3, MAT.stoneLight);
  back.rotation.y = Math.PI / 2;
  back.position.set(0, 0.4 + H, -0.6 - L / 2 + 0.15);
  g.add(back);
  // Round window on the back gable.
  const rose = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 16), MAT.stained, 0, 0.4 + H + 1.0, -0.6 - L / 2 - 0.02);
  rose.rotation.x = Math.PI / 2;
  g.add(rose);

  // Bell tower on the front.
  const T = 2.4, TZ = 3.3, TH = 7.5;
  g.add(box(T, TH, T, MAT.stone, 0, 0.4 + TH / 2, TZ));
  for (let i = 0; i < 6; i++) for (const x of [-T / 2, T / 2]) g.add(box(0.32, 0.4, 0.32, MAT.stoneLight, x, 0.7 + i * 1.1, TZ + T / 2));
  // Belfry: open arches with a bell inside.
  const BY = 0.4 + TH;
  for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(box(0.4, 1.8, 0.4, MAT.stone, x * (T / 2 - 0.2), BY + 0.9, TZ + z * (T / 2 - 0.2)));
  g.add(box(T + 0.2, 0.3, T + 0.2, MAT.stoneDark, 0, BY + 1.95, TZ));
  const bell = new THREE.Group();
  bell.position.set(0, BY + 1.7, TZ);
  const bellMesh = mesh(new THREE.CylinderGeometry(0.28, 0.5, 0.8, 12), MAT.gold, 0, -0.45, 0);
  bell.add(bellMesh);
  bell.add(mesh(new THREE.SphereGeometry(0.1, 6, 5), MAT.iron, 0, -0.9, 0));
  bell.userData.dynamic = true;
  g.add(bell);
  const spire = cone(1.7, 4.2, 4, MAT.slate, 0, BY + 2.1 + 2.1, TZ);
  spire.rotation.y = Math.PI / 4;
  g.add(spire);
  const cross = new THREE.Group();
  cross.add(box(0.1, 0.9, 0.1, MAT.gold, 0, 0.45, 0));
  cross.add(box(0.5, 0.1, 0.1, MAT.gold, 0, 0.6, 0));
  cross.position.set(0, BY + 6.2, TZ);
  g.add(cross);
  // Big arched front door.
  const dr = door(1.2, 2.0, MAT.timber);
  dr.position.set(0, 0.4, TZ + T / 2 + 0.02);
  g.add(dr);
  g.add(arch(0.6, 0.12, MAT.timber, 0, 2.4, TZ + T / 2 + 0.02));
  const clock = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 16), MAT.cloth, 0, 5.6, TZ + T / 2 + 0.04);
  clock.rotation.x = Math.PI / 2;
  g.add(clock);
  const hand = box(0.05, 0.35, 0.04, MAT.iron, 0, 5.72, TZ + T / 2 + 0.1);
  hand.userData.dynamic = true;
  g.add(hand);
  // Gravestones round the side.
  for (const [x, z] of [[3.3, -2], [3.6, -3.4], [3.2, -4.6]]){
    g.add(box(0.5, 0.7, 0.15, MAT.stoneDark, x, 0.35, z));
  }
  return {
    group: g, height: BY + 7.2,
    tick: (t) => { bell.rotation.z = Math.sin(t * 2) * 0.12 * Math.max(0, Math.sin(t * 0.25)); hand.rotation.z = -t * 0.2; },
  };
}

function castle(){
  const g = new THREE.Group();
  const K = 7, KH = 9;
  g.add(box(K + 4.6, 0.5, K + 4.6, MAT.stoneDark, 0, 0.25, 0));
  // The keep.
  g.add(box(K, KH, K, MAT.stone, 0, 0.5 + KH / 2, 0));
  // Horizontal courses of lighter stone.
  for (const y of [3.2, 6.2]) g.add(box(K + 0.12, 0.25, K + 0.12, MAT.stoneLight, 0, y, 0));
  // Crenellations.
  const merlons = (size, y, step = 0.9) => {
    const n = Math.floor(size / step);
    for (let i = 0; i <= n; i += 2){
      const p = -size / 2 + (i / n) * size;
      for (const s of [-1, 1]){
        g.add(box(0.55, 0.7, 0.4, MAT.stone, p, y, s * size / 2));
        g.add(box(0.4, 0.7, 0.55, MAT.stone, s * size / 2, y, p));
      }
    }
  };
  g.add(box(K + 0.5, 0.35, K + 0.5, MAT.stoneLight, 0, 0.5 + KH + 0.17, 0));
  merlons(K + 0.3, 0.5 + KH + 0.7);
  // A small top turret with a pointed roof and the big flag.
  g.add(box(2.4, 2.4, 2.4, MAT.stone, -1.6, 0.5 + KH + 1.2, -1.6));
  const tr = cone(1.9, 2.4, 4, MAT.blue, -1.6, 0.5 + KH + 3.6, -1.6);
  tr.rotation.y = Math.PI / 4;
  g.add(tr);
  const flags = [];
  const bigFlag = flagpole(0xb2352e, 2.8);
  bigFlag.position.set(-1.6, 0.5 + KH + 4.6, -1.6);
  bigFlag.scale.setScalar(1.3);
  g.add(bigFlag);
  flags.push(bigFlag.userData.flag);

  // Round corner towers.
  const TR = 1.7, TH = 11.5;
  for (const x of [-1, 1]) for (const z of [-1, 1]){
    const tx = x * K / 2, tz = z * K / 2;
    g.add(cyl(TR, TR + 0.2, TH, 12, MAT.stone, tx, 0.5 + TH / 2, tz));
    g.add(cyl(TR + 0.25, TR + 0.1, 0.4, 12, MAT.stoneLight, tx, 0.5 + TH, tz));
    for (let i = 0; i < 8; i++){
      const a = (i / 8) * Math.PI * 2;
      g.add(box(0.45, 0.6, 0.45, MAT.stone, tx + Math.cos(a) * (TR + 0.05), 0.5 + TH + 0.5, tz + Math.sin(a) * (TR + 0.05)));
    }
    const roofMat = (x + z) === 0 ? MAT.red : MAT.blue;
    g.add(cone(TR + 0.4, 3.2, 12, roofMat, tx, 0.5 + TH + 2.3, tz));
    const fp = flagpole(x > 0 ? 0xe8c547 : 0x2f5da8, 1.6);
    fp.position.set(tx, 0.5 + TH + 3.8, tz);
    g.add(fp);
    flags.push(fp.userData.flag);
    // Arrow slits.
    for (const y of [3, 6, 9]){
      const a = Math.atan2(z, x);
      const sl = box(0.14, 0.8, 0.14, MAT.iron, tx + Math.cos(a) * TR, y, tz + Math.sin(a) * TR);
      g.add(sl);
    }
  }

  // Gatehouse on the front.
  const GZ = K / 2 + 0.2;
  g.add(box(3.4, 5.4, 1.2, MAT.stoneLight, 0, 0.5 + 2.7, GZ));
  for (let i = -1; i <= 1; i++) g.add(box(0.5, 0.6, 0.4, MAT.stoneLight, i * 1.2, 6.2, GZ + 0.4));
  g.add(box(2.0, 2.6, 0.2, MAT.timber, 0, 0.5 + 1.3, GZ + 0.55));
  g.add(arch(1.0, 0.24, MAT.timber, 0, 3.1, GZ + 0.55));
  // Portcullis bars.
  for (let i = -3; i <= 3; i++) g.add(box(0.07, 3.3, 0.07, MAT.iron, i * 0.28, 0.5 + 1.9, GZ + 0.7));
  for (const y of [1.4, 2.4, 3.3]) g.add(box(1.9, 0.07, 0.07, MAT.iron, 0, y, GZ + 0.72));
  // Banners hanging on the keep.
  for (const x of [-2.2, 2.2]){
    g.add(box(1.1, 2.8, 0.06, MAT.red, x, 6.2, K / 2 + 0.05));
    g.add(box(0.5, 0.5, 0.08, MAT.yellow, x, 6.6, K / 2 + 0.08));
    g.add(box(1.3, 0.12, 0.12, MAT.timber, x, 7.65, K / 2 + 0.08));
    const tail = cone(0.55, 0.5, 3, MAT.red, x, 4.55, K / 2 + 0.05);
    tail.rotation.set(Math.PI, 0, 0);
    tail.scale.z = 0.1;
    g.add(tail);
  }
  // Lit windows high up.
  for (let i = 0; i < 4; i++){
    const side = new THREE.Group();
    side.rotation.y = (i / 4) * Math.PI * 2;
    for (const x of [-1.2, 1.2]){
      const w = windowPane(0.55, 0.9, MAT.stoneDark);
      // Above the banners on the front face.
      w.position.set(x, i === 0 ? 8.3 : 7.4, K / 2 + 0.04);
      side.add(w);
    }
    g.add(side);
  }
  // Steps up to the gate, and torches either side.
  g.add(box(2.8, 0.25, 1.2, MAT.stoneLight, 0, 0.12, GZ + 1.6));
  const tick = [];
  for (const x of [-2.1, 2.1]){
    g.add(box(0.14, 0.5, 0.3, MAT.iron, x, 2.6, GZ + 0.7));
    const f = flameCluster(0.5);
    f.position.set(x, 2.85, GZ + 0.85);
    g.add(f);
    tick.push(f.userData.flick);
  }
  return {
    group: g, height: 0.5 + KH + 7.5, flags,
    lights: [new THREE.Vector3(0, 3.2, GZ + 1.4)],
    smoke: [], tick: (t) => tick.forEach((fn, i) => fn(t, i * 2)),
  };
}

export const BUILDERS = { campfire, torch, hut, farm, cottage, well, blacksmith, windmill, watchtower, chapel, castle };

/** Scaffolding that stands around a building while it goes up. */
export function makeScaffold(r, h){
  const g = new THREE.Group();
  const s = r * 0.95;
  const pole = new THREE.CylinderGeometry(0.06, 0.06, h, 5);
  for (const x of [-s, 0, s]) for (const z of [-s, s]){
    g.add(mesh(pole, MAT.woodLight, x, h / 2, z));
    g.add(mesh(pole, MAT.woodLight, z, h / 2, x));
  }
  for (let y = 1.4; y < h; y += 1.8){
    for (const z of [-s, s]){
      g.add(box(2 * s, 0.08, 0.3, MAT.plank, 0, y, z));
      g.add(box(0.3, 0.08, 2 * s, MAT.plank, z, y, 0));
    }
  }
  // Stacked timber and a pile of stones by the site.
  for (let i = 0; i < 3; i++) g.add(box(1.6, 0.18, 0.2, MAT.woodLight, s + 0.9, 0.1 + i * 0.2, 0.3 + i * 0.03));
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.DodecahedronGeometry(0.25, 0), MAT.stone, -s - 0.7 + i * 0.3, 0.2, s * 0.5 - i * 0.2));
  return g;
}
