// Every model in the world: crops, stalls, buildings, rival farmers, scenery.
// Each function returns a Group standing on y = 0, centred on its footprint.
import * as THREE from 'three';
import { mat, smooth, geo, box, cyl, cone, ball, torus, group, rnd, signBoard } from './kit.js';

// Lamps and glowing crops share materials so dusk is one tweak.
export const GLOW = new THREE.MeshLambertMaterial({ color: 0xffe3a0, emissive: 0x302000 });
export const GOLD = new THREE.MeshStandardMaterial({ color: 0xffc83a, emissive: 0x6a4300, metalness: 0.6, roughness: 0.3 });
export const GLASS = new THREE.MeshPhongMaterial({ color: 0xcfefff, transparent: true, opacity: 0.28, shininess: 90, specular: 0xffffff, depthWrite: false, side: THREE.DoubleSide });
export function setDusk(k) {
  GLOW.emissive.setRGB(0.2 + 0.8 * k, 0.14 + 0.6 * k, 0.03 + 0.2 * k);
}

const LEAF = 0x5fb83a, LEAF2 = 0x7fd14f, LEAF3 = 0x3f8f2a;

function leaf(len, w, color, angY, tilt, y = 0) {
  const l = box(w, 0.03, len, color, 0, 0, 0);
  l.geometry = geo(`leaf${len},${w}`, () => {
    const g = new THREE.BoxGeometry(w, 0.03, len);
    g.translate(0, 0, len / 2);
    return g;
  });
  const holder = new THREE.Group();
  holder.position.y = y;
  holder.rotation.y = angY;
  l.position.set(0, 0, 0);
  l.rotation.x = -tilt;
  holder.add(l);
  return holder;
}

function star(r, color) {
  const g = geo(`star${r}`, () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const eg = new THREE.ExtrudeGeometry(s, { depth: r * 0.5, bevelEnabled: false });
    eg.center();
    return eg;
  });
  const m = new THREE.Mesh(g, mat(color, { emissive: 0x3a2a00 }));
  m.castShadow = true;
  return m;
}

// ------------------------------------------------------------------ crops
// Small crops come four to a bed, big ones one or two.

export const CROP_LAYOUT = {
  lettuce: 4, carrot: 4, potato: 4, corn: 4, tomato: 2, strawberry: 4, eggplant: 2,
  pumpkin: 1, watermelon: 1, pineapple: 2, kiwi: 1, mango: 1, coconut: 1, starfruit: 1, goldmelon: 1,
};

const CROP_MAKERS = {
  lettuce() {
    const g = group();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const b = ball(0.13, 1, i % 2 ? LEAF2 : 0x9be36a, Math.cos(a) * 0.1, 0.1, Math.sin(a) * 0.1);
      b.scale.set(1, 0.7, 1);
      g.add(b);
    }
    g.add(ball(0.12, 1, 0xc4f08a, 0, 0.17, 0));
    return g;
  },
  carrot() {
    const g = group();
    const root = cone(0.09, 0.3, 7, 0xff8a1e, 0, -0.18, 0);
    root.rotation.x = Math.PI;
    root.position.y = 0.02;
    g.add(root);
    for (let i = 0; i < 5; i++) g.add(leaf(0.3, 0.05, i % 2 ? LEAF : LEAF2, (i / 5) * Math.PI * 2, 1.1, 0.14));
    return g;
  },
  potato() {
    const g = group();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(ball(0.12, 0, i % 2 ? LEAF3 : LEAF, Math.cos(a) * 0.1, 0.2, Math.sin(a) * 0.1));
    }
    g.add(ball(0.1, 0, 0xc49358, 0.12, 0.04, 0.1));
    g.add(ball(0.08, 0, 0xb5834a, -0.1, 0.03, 0.08));
    g.add(ball(0.05, 0, 0xffffff, 0, 0.33, 0));
    return g;
  },
  corn() {
    const g = group(cyl(0.035, 0.05, 1.1, 6, 0x6fae3a));
    for (let i = 0; i < 4; i++) g.add(leaf(0.4, 0.07, i % 2 ? LEAF : LEAF2, i * 1.7, 0.6, 0.25 + i * 0.18));
    const cob = cyl(0.06, 0.05, 0.28, 7, 0xffd84a, 0.07, 0.55, 0);
    cob.rotation.z = -0.3;
    g.add(cob);
    const husk = cone(0.07, 0.2, 6, 0x9ccf5a, 0.05, 0.45, 0);
    husk.rotation.z = -0.3;
    g.add(husk);
    g.add(cone(0.05, 0.2, 5, 0xe6c86a, 0, 1.08, 0));
    return g;
  },
  tomato() {
    const g = group(cyl(0.02, 0.02, 0.9, 5, 0xa7784a));
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1;
      g.add(ball(0.12, 0, i % 2 ? LEAF : LEAF3, Math.cos(a) * 0.12, 0.25 + i * 0.1, Math.sin(a) * 0.12));
    }
    for (const [x, y, z] of [[0.15, 0.35, 0.1], [-0.13, 0.5, 0.12], [0.1, 0.65, -0.12], [-0.08, 0.28, -0.15]]) {
      g.add(ball(0.08, 3, 0xff3b30, x, y, z));
    }
    return g;
  },
  strawberry() {
    const g = group();
    for (let i = 0; i < 5; i++) {
      const b = ball(0.1, 0, i % 2 ? LEAF : LEAF3, Math.cos(i * 1.3) * 0.1, 0.1, Math.sin(i * 1.3) * 0.1);
      b.scale.set(1.2, 0.6, 1.2);
      g.add(b);
    }
    for (const [x, z] of [[0.15, 0.08], [-0.1, 0.14], [0.02, -0.16]]) {
      const berry = cone(0.07, 0.14, 7, 0xff3355, x, 0.02, z);
      berry.rotation.x = Math.PI;
      berry.position.y = 0.1;
      g.add(berry);
      g.add(ball(0.04, 0, LEAF2, x, 0.17, z));
    }
    return g;
  },
  eggplant() {
    const g = group();
    for (let i = 0; i < 6; i++) g.add(ball(0.13, 0, i % 2 ? LEAF : LEAF3, Math.cos(i) * 0.14, 0.35 + (i % 3) * 0.08, Math.sin(i) * 0.14));
    for (const s of [-1, 1]) {
      const e = ball(0.09, 3, 0x6b2f8f, s * 0.14, 0.2, s * 0.05);
      e.scale.set(1, 1.8, 1);
      g.add(e);
      g.add(cone(0.05, 0.06, 5, LEAF3, s * 0.14, 0.34, s * 0.05));
    }
    return g;
  },
  pumpkin() {
    const g = group();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const rib = ball(0.24, 3, i % 2 ? 0xff8c1a : 0xf57c0f, Math.cos(a) * 0.18, 0.26, Math.sin(a) * 0.18);
      rib.scale.set(0.8, 1, 0.8);
      g.add(rib);
    }
    g.add(cyl(0.04, 0.05, 0.16, 5, 0x6b8a2e, 0, 0.46, 0));
    for (let i = 0; i < 3; i++) g.add(leaf(0.35, 0.22, LEAF, i * 2.1 + 0.4, -0.1, 0.03));
    return g;
  },
  watermelon() {
    const g = group();
    const m = ball(0.32, 3, 0x2f8f3a, 0, 0.26, 0);
    m.scale.set(1.35, 0.85, 1);
    g.add(m);
    for (let i = -2; i <= 2; i++) {
      const s = torus(0.3, 0.018, 0x9fe07a, Math.PI, i * 0.12, 0.26, 0);
      s.rotation.y = Math.PI / 2;
      s.scale.set(1, 0.85, 1.0 - Math.abs(i) * 0.18);
      g.add(s);
    }
    for (let i = 0; i < 4; i++) g.add(leaf(0.35, 0.2, i % 2 ? LEAF : LEAF3, i * 1.6, -0.1, 0.03));
    return g;
  },
  pineapple() {
    const g = group();
    for (let i = 0; i < 6; i++) g.add(leaf(0.35, 0.06, LEAF3, i * 1.05, 0.4, 0.02));
    const body = ball(0.15, 1, 0xf2a93b, 0, 0.35, 0);
    body.scale.set(1, 1.35, 1);
    g.add(body);
    for (let i = 0; i < 6; i++) {
      const spike = cone(0.04, 0.24, 4, LEAF, Math.cos(i) * 0.03, 0.52, Math.sin(i) * 0.03);
      spike.rotation.set(Math.sin(i) * 0.4, 0, Math.cos(i) * 0.4);
      g.add(spike);
    }
    return g;
  },
  kiwi() {
    const g = group();
    for (const s of [-1, 1]) g.add(cyl(0.03, 0.03, 1.0, 5, 0x8a5a36, s * 0.55, 0, 0));
    g.add(box(1.2, 0.05, 0.05, 0x8a5a36, 0, 0.98, 0));
    for (let i = 0; i < 7; i++) g.add(ball(0.16, 0, i % 2 ? LEAF : LEAF3, -0.5 + i * 0.17, 1.03, rnd(-0.08, 0.08)));
    for (let i = 0; i < 6; i++) {
      const k = ball(0.06, 1, 0x8b6a3e, -0.45 + i * 0.18, 0.84 + (i % 2) * 0.04, 0.06 * (i % 2 ? 1 : -1));
      k.scale.set(1, 1.25, 1);
      g.add(k);
    }
    return g;
  },
  mango() {
    const g = group(cyl(0.06, 0.09, 0.6, 6, 0x8a5a36));
    const c = ball(0.45, 1, 0x4fa83a, 0, 0.9, 0);
    c.scale.set(1, 0.8, 1);
    g.add(c, ball(0.3, 1, LEAF2, 0.2, 1.1, 0.1));
    for (const [x, y, z] of [[0.35, 0.72, 0.2], [-0.3, 0.7, 0.25], [0.1, 0.65, -0.38], [-0.2, 0.8, -0.3]]) {
      const f = ball(0.08, 3, 0xff9f2e, x, y, z);
      f.scale.set(1, 1.3, 0.9);
      f.material = smooth(0xffa53a, { emissive: 0x401000 });
      g.add(f);
    }
    return g;
  },
  coconut() {
    const g = group();
    let x = 0, y = 0;
    for (let i = 0; i < 6; i++) {
      const seg = cyl(0.07 - i * 0.004, 0.08 - i * 0.004, 0.25, 6, i % 2 ? 0x9a7048 : 0x8a6038, x, y, 0);
      seg.rotation.z = -0.05 * i;
      g.add(seg);
      x += 0.03 * i; y += 0.24;
    }
    for (let i = 0; i < 7; i++) {
      const fr = leaf(0.75, 0.16, i % 2 ? LEAF : LEAF3, (i / 7) * Math.PI * 2, -0.35, 0);
      fr.position.set(x, y + 0.05, 0);
      g.add(fr);
    }
    for (let i = 0; i < 3; i++) g.add(ball(0.08, 1, 0x6b4a2a, x + Math.cos(i * 2) * 0.09, y - 0.04, Math.sin(i * 2) * 0.09));
    return g;
  },
  starfruit() {
    const g = group(cyl(0.05, 0.08, 0.55, 6, 0x8a5a36));
    const c = ball(0.42, 1, 0x3f9f4a, 0, 0.88, 0);
    c.scale.set(1, 0.85, 1);
    g.add(c);
    for (const [x, y, z] of [[0.36, 0.75, 0.18], [-0.28, 0.72, 0.28], [0.05, 0.62, -0.38], [0.2, 1.15, 0.2]]) {
      const s = star(0.09, 0xffe14d);
      s.position.set(x, y, z);
      s.rotation.y = x * 3;
      g.add(s);
    }
    return g;
  },
  goldmelon() {
    const g = group();
    const m = new THREE.Mesh(geo('gm', () => new THREE.SphereGeometry(0.3, 20, 14)), GOLD);
    m.position.y = 0.27;
    m.scale.set(1.2, 0.9, 1);
    m.castShadow = true;
    g.add(m);
    for (let i = 0; i < 4; i++) g.add(leaf(0.35, 0.2, LEAF, i * 1.6 + 0.3, -0.1, 0.03));
    g.add(cyl(0.03, 0.04, 0.12, 5, 0x6b8a2e, 0, 0.52, 0));
    return g;
  },
};

export function sprout() {
  const g = group(cyl(0.015, 0.02, 0.12, 4, LEAF));
  g.add(leaf(0.1, 0.07, LEAF2, 0.3, 0.5, 0.1), leaf(0.1, 0.07, LEAF2, Math.PI + 0.3, 0.5, 0.1));
  return g;
}

export function cropModel(id) {
  return (CROP_MAKERS[id] || CROP_MAKERS.lettuce)();
}

// A tiny version for stall crates: one colourful lump per crop.
const CRATE_COLORS = {
  lettuce: 0x8fdc5a, carrot: 0xff8a1e, potato: 0xc49358, corn: 0xffd84a, tomato: 0xff3b30,
  strawberry: 0xff3355, eggplant: 0x6b2f8f, pumpkin: 0xff8c1a, watermelon: 0x2f8f3a,
  pineapple: 0xf2a93b, kiwi: 0x8b6a3e, mango: 0xffa53a, coconut: 0x6b4a2a, starfruit: 0xffe14d, goldmelon: 0xffc83a,
};
export function crate(cropId) {
  const g = group(box(0.42, 0.14, 0.32, 0xb98552));
  const col = CRATE_COLORS[cropId] || 0xffffff;
  const m = cropId === 'goldmelon' ? GOLD : smooth(col);
  for (let i = 0; i < 5; i++) {
    const b = ball(0.07, 3, col, -0.12 + (i % 3) * 0.12, 0.17 + (i > 2 ? 0.05 : 0), -0.06 + (i > 2 ? 0.08 : 0) + (i % 2) * 0.04, m);
    g.add(b);
  }
  return g;
}

// ------------------------------------------------------------------ plots

export function plotBed() {
  const g = group();
  const soil = box(1.62, 0.16, 1.62, 0x7a4b2a);
  soil.material = mat(0x7a4b2a);
  g.add(soil);
  // Furrows.
  for (let i = -1; i <= 1; i++) g.add(box(1.5, 0.04, 0.12, 0x5e3920, 0, 0.16, i * 0.45));
  // Wooden edging.
  for (const [w, d, x, z] of [[1.8, 0.1, 0, 0.85], [1.8, 0.1, 0, -0.85], [0.1, 1.6, 0.85, 0], [0.1, 1.6, -0.85, 0]]) {
    g.add(box(w, 0.22, d, 0xa8744a, x, 0, z));
  }
  return g;
}

export function forSalePlot() {
  const g = group();
  const turf = box(1.6, 0.06, 1.6, 0x79c255);
  g.add(turf);
  const post = cyl(0.03, 0.03, 0.55, 5, 0x8a5a36, 0.55, 0.05, 0.55);
  const tag = box(0.34, 0.2, 0.03, 0xfff3d0, 0.55, 0.45, 0.56);
  g.add(post, tag, box(0.26, 0.05, 0.035, 0xe0558a, 0.55, 0.52, 0.57));
  return g;
}

// ------------------------------------------------------------------ stalls

export function stall(awning = 0xff6b6b, awning2 = 0xffffff, wide = 1) {
  const g = group();
  const W = 2.2 * wide;
  g.add(box(W, 0.8, 0.9, 0xc68a54, 0, 0, 0));          // counter
  g.add(box(W + 0.1, 0.08, 1.0, 0xe0a86c, 0, 0.8, 0)); // counter top
  for (const x of [-W / 2 + 0.06, W / 2 - 0.06]) for (const z of [-0.4, 0.4]) {
    g.add(box(0.08, 1.9, 0.08, 0x9a6a3e, x, 0, z));
  }
  // Striped awning, sloping down to the front.
  const stripes = Math.round(6 * wide);
  const aw = new THREE.Group();
  for (let i = 0; i < stripes; i++) {
    aw.add(box(W / stripes + 0.01, 0.06, 1.3, i % 2 ? awning2 : awning, -W / 2 + (i + 0.5) * W / stripes, 0, 0));
  }
  // Scalloped front edge.
  for (let i = 0; i < stripes; i++) {
    const s = cone(W / stripes / 2, 0.18, 6, i % 2 ? awning2 : awning, -W / 2 + (i + 0.5) * W / stripes, -0.18, 0.66);
    s.rotation.x = Math.PI;
    s.position.y = -0.03;
    aw.add(s);
  }
  aw.position.y = 1.95;
  aw.rotation.x = 0.22;
  g.add(aw);
  g.userData.crates = new THREE.Group();
  g.userData.crates.position.y = 0.88;
  g.add(g.userData.crates);
  const sign = signBoard(1.8, 0.62);
  sign.position.set(0, 2.55, 0.1);
  g.add(sign);
  g.userData.sign = sign;
  return g;
}

// ------------------------------------------------------------------ rivals

function critter(color, belly) {
  const g = group();
  const body = ball(0.36, 3, color, 0, 0.4, 0);
  body.scale.set(1, 1, 0.92);
  g.add(body);
  const b = ball(0.25, 3, belly, 0, 0.33, 0.17);
  b.scale.set(1, 0.9, 0.7);
  g.add(b);
  for (const s of [-1, 1]) {
    g.add(ball(0.075, 3, 0xffffff, s * 0.13, 0.5, 0.3));
    g.add(ball(0.04, 3, 0x2b2233, s * 0.14, 0.5, 0.36));
    const f = ball(0.1, 1, belly, s * 0.15, 0.08, 0.08);
    f.scale.set(1, 0.6, 1.3);
    g.add(f);
  }
  return g;
}

export const RIVAL_LOOKS = {
  bramble: { awning: 0xffa050, awning2: 0xfff2e0 },
  mo:      { awning: 0x8a5a36, awning2: 0xf4e3c0 },
  posy:    { awning: 0xff8fc0, awning2: 0xffffff },
  hank:    { awning: 0x3aa6a0, awning2: 0xe8f4f2 },
};

// Rivals stand on a crate behind their counter so you can see them over it.
export function rival(id) {
  const g = rivalBody(id);
  g.scale.setScalar(1.35);
  g.position.y = 0.45;
  const w = group(box(0.7, 0.45, 0.6, 0xb98552), g);
  w.userData.body = g;
  return w;
}

function rivalBody(id) {
  let g;
  if (id === 'bramble') {
    g = critter(0xffa050, 0xfff2e0);
    for (const s of [-1, 1]) { const e = cone(0.11, 0.26, 4, 0xffa050, s * 0.2, 0.62, 0); e.rotation.z = -s * 0.3; g.add(e); }
    g.add(cone(0.07, 0.18, 5, 0xfff2e0, 0, 0.42, 0.34).rotateX(Math.PI / 2));
    g.add(ball(0.03, 3, 0x2b2233, 0, 0.42, 0.44));
    const tail = ball(0.16, 1, 0xffa050, 0, 0.3, -0.4); tail.scale.set(0.7, 0.7, 1.5); g.add(tail);
    g.add(ball(0.08, 1, 0xffffff, 0, 0.34, -0.6));
  } else if (id === 'mo') {
    g = critter(0x9a6a44, 0xe8c9a0);
    for (const s of [-1, 1]) g.add(ball(0.1, 3, 0x9a6a44, s * 0.24, 0.68, 0));
    const snout = ball(0.11, 3, 0xe8c9a0, 0, 0.4, 0.32); snout.scale.set(1.1, 0.8, 0.8); g.add(snout);
    g.add(ball(0.04, 3, 0x2b2233, 0, 0.44, 0.41));
    // Mo's flat cap.
    g.add(cyl(0.22, 0.24, 0.1, 12, 0x5a6b4a, 0, 0.7, 0), box(0.3, 0.03, 0.16, 0x5a6b4a, 0, 0.7, 0.25));
  } else if (id === 'posy') {
    g = critter(0xfdf3f6, 0xffffff);
    for (const s of [-1, 1]) {
      const e = ball(0.08, 3, 0xfdf3f6, s * 0.12, 0.9, -0.02); e.scale.set(0.8, 3, 0.6); e.rotation.z = -s * 0.15; g.add(e);
      const inner = ball(0.05, 3, 0xffb6c9, s * 0.12, 0.9, 0.02); inner.scale.set(0.6, 2.6, 0.4); inner.rotation.z = -s * 0.15; g.add(inner);
    }
    g.add(ball(0.035, 3, 0xff7fa7, 0, 0.44, 0.36));
    g.add(box(0.2, 0.08, 0.08, 0xff5fa2, 0.2, 0.7, 0.1));
  } else {
    g = critter(0x8d949c, 0xd8dde2);
    const mask = torus(0.12, 0.05, 0x2f3338, Math.PI * 2, 0, 0.5, 0.31); mask.scale.set(1.3, 0.55, 1); g.add(mask);
    for (const s of [-1, 1]) { const e = cone(0.09, 0.16, 5, 0x8d949c, s * 0.21, 0.66, 0); g.add(e); }
    g.add(ball(0.035, 3, 0x2b2233, 0, 0.42, 0.37));
    for (let i = 0; i < 4; i++) g.add(ball(0.1, 1, i % 2 ? 0x2f3338 : 0x8d949c, 0, 0.25 + i * 0.03, -0.35 - i * 0.12));
  }
  return g;
}

// A small milbil that wanders the market to shop.
export function shopper(color) {
  const g = critter(color, 0xfff6ee);
  g.scale.setScalar(0.72);
  g.add(cone(0.06, 0.14, 5, color, 0, 0.74, 0));
  g.add(box(0.2, 0.18, 0.12, 0xd9a86c, 0.3, 0.2, 0.05)); // basket
  return g;
}

// ------------------------------------------------------------------ buildings

function roofPrism(w, h, d, color) {
  const g = geo(`roof${w},${h},${d}`, () => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
    const eg = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    eg.translate(0, 0, -d / 2);
    return eg;
  });
  const m = new THREE.Mesh(g, mat(color));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function door(w, h, color, z) { return box(w, h, 0.06, color, 0, 0, z); }
function windowPane(w, h, x, y, z) {
  const f = box(w + 0.08, h + 0.08, 0.05, 0xffffff, x, y - 0.04, z);
  const p = box(w, h, 0.06, 0, x, y, z + 0.01, GLOW);
  return group(f, p);
}

export function shed() {
  const g = group(box(1.6, 1.2, 1.4, 0xb07a4a));
  for (let i = 0; i < 6; i++) g.add(box(0.03, 1.2, 0.02, 0x8a5a36, -0.7 + i * 0.28, 0, 0.71));
  const r = roofPrism(1.9, 0.7, 1.7, 0x6b8f5a); r.position.y = 1.2; g.add(r);
  g.add(door(0.5, 0.85, 0x7a4b2a, 0.72));
  g.add(ball(0.03, 1, 0xffd84a, 0.18, 0.45, 0.76));
  return g;
}

export function barn() {
  const g = group(box(3.4, 2.2, 3, 0xd64541));
  const r = roofPrism(3.9, 1.5, 3.3, 0x7a3d34); r.position.y = 2.2; g.add(r);
  g.add(box(1.3, 1.6, 0.06, 0xffffff, 0, 0, 1.51), box(1.1, 1.4, 0.07, 0xb33a36, 0, 0.1, 1.52));
  const x1 = box(0.08, 1.7, 0.08, 0xffffff, 0, 0.05, 1.56); x1.rotation.z = 0.68; g.add(x1);
  const x2 = box(0.08, 1.7, 0.08, 0xffffff, 0, 0.05, 1.56); x2.rotation.z = -0.68; g.add(x2);
  g.add(windowPane(0.5, 0.4, 0, 2.55, 1.52));
  for (const x of [-1.7, 1.7]) g.add(box(0.12, 2.2, 3.02, 0xffffff, x, 0, 0));
  return g;
}

export function cottage() {
  const g = group(box(3, 1.8, 2.4, 0xfff0d6));
  const r = roofPrism(3.5, 1.4, 2.8, 0xe0558a); r.position.y = 1.8; g.add(r);
  g.add(box(0.4, 1.2, 0.4, 0xb05a4a, 0.8, 2.2, -0.3));
  g.add(door(0.6, 1.1, 0x8a5a36, 1.21));
  g.add(windowPane(0.5, 0.45, -0.9, 0.9, 1.21), windowPane(0.5, 0.45, 0.9, 0.9, 1.21));
  for (let i = 0; i < 5; i++) g.add(ball(0.12, 0, [0xff7eb6, 0xffd44f, 0xb98cff][i % 3], -1.3 + i * 0.25, 0.12, 1.35));
  g.userData.chimney = new THREE.Vector3(0.8, 3.5, -0.3);
  return g;
}

export function scarecrow() {
  const g = group(cyl(0.05, 0.05, 1.6, 5, 0x8a5a36));
  g.add(box(1.2, 0.07, 0.07, 0x8a5a36, 0, 1.15, 0));
  g.add(box(0.5, 0.55, 0.28, 0x4f7fd1, 0, 0.8, 0));          // shirt
  for (const s of [-1, 1]) g.add(box(0.3, 0.16, 0.2, 0x4f7fd1, s * 0.4, 1.1, 0));
  for (const s of [-1, 1]) g.add(cone(0.08, 0.2, 5, 0xe6c86a, s * 0.6, 1.08, 0).rotateZ(s * Math.PI / 2));
  g.add(ball(0.22, 1, 0xf2dca0, 0, 1.55, 0));
  g.add(cyl(0.4, 0.4, 0.04, 12, 0xe2b04a, 0, 1.7, 0), cyl(0.16, 0.2, 0.22, 10, 0xe2b04a, 0, 1.72, 0));
  for (const s of [-1, 1]) g.add(box(0.06, 0.06, 0.03, 0x2b2233, s * 0.08, 1.58, 0.2));
  g.add(box(0.14, 0.03, 0.03, 0x2b2233, 0, 1.48, 0.21));
  return g;
}

export function sprinkler() {
  const g = group(cyl(0.05, 0.07, 0.4, 6, 0x9aa3ad));
  const head = new THREE.Group();
  head.position.y = 0.42;
  head.add(cyl(0.07, 0.07, 0.08, 8, 0x3b82c4));
  head.add(box(0.5, 0.04, 0.04, 0x3b82c4, 0, 0.05, 0));
  const spray = new THREE.Mesh(
    geo('spray', () => { const c = new THREE.ConeGeometry(1.1, 0.5, 16, 1, true); c.translate(0, -0.25, 0); c.rotateX(Math.PI); return c; }),
    new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
  spray.position.y = 0.05;
  head.add(spray);
  g.add(head);
  g.userData.head = head;
  return g;
}

export function paintedSign(text) {
  const g = group(cyl(0.04, 0.04, 1.3, 5, 0x8a5a36, -0.5), cyl(0.04, 0.04, 1.3, 5, 0x8a5a36, 0.5));
  const b = signBoard(1.4, 0.7, { bg: '#fff3a8', edge: '#e0558a' });
  b.position.y = 1.1;
  b.position.z = 0.05;
  g.add(b);
  g.userData.board = b;
  return g;
}

export function greenhouse() {
  const g = group(box(3.4, 0.25, 2.4, 0xffffff));
  const walls = new THREE.Mesh(geo('ghw', () => new THREE.BoxGeometry(3.3, 1.5, 2.3)), GLASS);
  walls.position.y = 1.0;
  g.add(walls);
  const r = roofPrism(3.3, 0.9, 2.3, 0xffffff);
  r.material = GLASS;
  r.rotation.y = Math.PI / 2;
  r.scale.set(2.3 / 3.3, 1, 3.3 / 2.3);
  r.position.y = 1.75;
  g.add(r);
  for (const x of [-1.65, -0.55, 0.55, 1.65]) for (const z of [-1.15, 1.15]) g.add(box(0.06, 1.5, 0.06, 0xffffff, x, 0.25, z));
  g.add(box(3.4, 0.06, 0.06, 0xffffff, 0, 2.62, 0));
  for (let i = 0; i < 5; i++) {
    const p = CROP_MAKERS[['pineapple', 'kiwi', 'mango', 'pineapple', 'strawberry'][i]]();
    p.scale.setScalar(i === 1 || i === 2 ? 0.5 : 0.9);
    p.position.set(-1.2 + i * 0.6, 0.25, (i % 2 ? 0.4 : -0.4));
    g.add(p);
  }
  return g;
}

export function dome() {
  const g = group(cyl(2.1, 2.2, 0.3, 20, 0xf4ecd8));
  const glass = new THREE.Mesh(geo('dome', () => new THREE.SphereGeometry(2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)), GLASS);
  glass.position.y = 0.3;
  g.add(glass);
  const frame = new THREE.LineSegments(
    geo('domeframe', () => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.01, 1), 1)),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
  frame.position.y = 0.3;
  // Keep only the top half of the frame.
  frame.material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3)];
  g.add(frame);
  const palm = CROP_MAKERS.coconut(); palm.scale.setScalar(1.3); palm.position.set(-0.5, 0.3, 0); g.add(palm);
  const star = CROP_MAKERS.starfruit(); star.scale.setScalar(0.9); star.position.set(0.8, 0.3, 0.4); g.add(star);
  const gm = CROP_MAKERS.goldmelon(); gm.position.set(0.3, 0.3, -0.8); g.add(gm);
  return g;
}

// ------------------------------------------------------------------ scenery

export function lamp() {
  const g = group(cyl(0.05, 0.07, 1.8, 6, 0x4a4a55));
  g.add(ball(0.16, 1, 0, 0, 1.9, 0, GLOW));
  g.add(cone(0.2, 0.15, 6, 0x4a4a55, 0, 2.0, 0));
  return g;
}

export function cloud() {
  const g = group();
  const m = mat(0xffffff, { emissive: 0x333333 });
  const n = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const b = ball(rnd(0.9, 1.6), 1, 0xffffff, i * 1.2 - n * 0.6, rnd(-0.2, 0.3), rnd(-0.4, 0.4), m);
    b.castShadow = false;
    g.add(b);
  }
  return g;
}

export function fence(length) {
  const g = group();
  const n = Math.max(2, Math.round(length / 1.1));
  for (let i = 0; i <= n; i++) g.add(box(0.1, 0.7, 0.1, 0xf4ecd8, -length / 2 + (i / n) * length, 0, 0));
  g.add(box(length, 0.08, 0.05, 0xf4ecd8, 0, 0.5, 0), box(length, 0.08, 0.05, 0xf4ecd8, 0, 0.25, 0));
  return g;
}

export function well() {
  const g = group(cyl(0.6, 0.65, 0.6, 10, 0xa8a29a));
  g.add(cyl(0.5, 0.5, 0.05, 10, 0x4aa0d8, 0, 0.5, 0));
  for (const s of [-1, 1]) g.add(box(0.08, 1.2, 0.08, 0x8a5a36, s * 0.55, 0.5, 0));
  const r = roofPrism(1.5, 0.5, 1.0, 0xe0558a); r.rotation.y = Math.PI / 2; r.position.y = 1.65; g.add(r);
  return g;
}
