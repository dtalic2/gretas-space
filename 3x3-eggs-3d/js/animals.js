// ---------- What is inside the eggs ----------
//
// Fifty-six animals across eight families. A family decides the shape — the
// ears, the shell, the horn — and the variant decides the colour and how rare it
// is, so a Pebble Chick and a Comet Chick are plainly the same kind of creature
// and plainly not the same prize.
//
// Rarity is rolled at the nest, not at the hatch: an egg knows what it is the
// moment you pick it up. Later biomes tilt the roll, which is the whole reason
// to unlock them.

import * as THREE from 'three';

export const RARITY = [
  { id: 'common',    name: 'Common',    tint: '#8fa6bb', coins: 1,  weight: 56 },
  { id: 'uncommon',  name: 'Uncommon',  tint: '#43cf8a', coins: 3,  weight: 27 },
  { id: 'rare',      name: 'Rare',      tint: '#3ca6ff', coins: 9,  weight: 12 },
  { id: 'epic',      name: 'Epic',      tint: '#b06bff', coins: 24, weight: 4 },
  { id: 'legendary', name: 'Legendary', tint: '#ffb12e', coins: 70, weight: 1 },
];

export const rarityById = (id) => RARITY.find((r) => r.id === id) || RARITY[0];

const FAMILIES = [
  { id: 'chick',  name: 'Chick',  build: 'bird',   hue: 48,  biomes: [0, 1] },
  { id: 'bunny',  name: 'Bunny',  build: 'bunny',  hue: 20,  biomes: [0, 2] },
  { id: 'cub',    name: 'Cub',    build: 'cub',    hue: 28,  biomes: [0, 2] },
  { id: 'pup',    name: 'Pup',    build: 'pup',    hue: 200, biomes: [0, 1] },
  { id: 'tortle', name: 'Tortle', build: 'turtle', hue: 140, biomes: [1, 3] },
  { id: 'hopper', name: 'Hopper', build: 'frog',   hue: 110, biomes: [1, 2] },
  { id: 'foal',   name: 'Foal',   build: 'foal',   hue: 320, biomes: [2, 3] },
  { id: 'drake',  name: 'Drake',  build: 'dragon', hue: 275, biomes: [3] },
];

// prefix, rarity, and how far the family hue is pushed for this variant
const VARIANTS = [
  { prefix: 'Meadow', rarity: 'common',    shift: 0,   sat: 0.52, light: 0.62 },
  { prefix: 'Pebble', rarity: 'common',    shift: 18,  sat: 0.28, light: 0.66 },
  { prefix: 'Clover', rarity: 'uncommon',  shift: -34, sat: 0.6,  light: 0.56 },
  { prefix: 'Dapple', rarity: 'uncommon',  shift: 44,  sat: 0.58, light: 0.7 },
  { prefix: 'Ember',  rarity: 'rare',      shift: 150, sat: 0.78, light: 0.56 },
  { prefix: 'Frost',  rarity: 'rare',      shift: 190, sat: 0.5,  light: 0.78 },
  { prefix: 'Starlit', rarity: 'epic',     shift: 240, sat: 0.72, light: 0.6 },
  { prefix: 'Comet',  rarity: 'legendary', shift: 300, sat: 0.9,  light: 0.62 },
];

function hsl(h, s, l){
  const c = new THREE.Color();
  c.setHSL((((h % 360) + 360) % 360) / 360, s, l);
  return c.getHex();
}

export const SPECIES = [];
for (const f of FAMILIES){
  VARIANTS.forEach((v, i) => {
    SPECIES.push({
      id: `${f.id}-${i}`,
      name: `${v.prefix} ${f.name}`,
      family: f.id,
      build: f.build,
      rarity: v.rarity,
      biomes: f.biomes,
      body: hsl(f.hue + v.shift, v.sat, v.light),
      belly: hsl(f.hue + v.shift + 12, v.sat * 0.5, Math.min(0.92, v.light + 0.22)),
      accent: hsl(f.hue + v.shift - 28, Math.min(1, v.sat + 0.2), Math.max(0.22, v.light - 0.3)),
      shiny: v.rarity === 'legendary',
    });
  });
}

export const speciesById = (id) => SPECIES.find((s) => s.id === id);

/**
 * Roll what is inside an egg.
 *
 * `tier` is the nest's own difficulty (0 easy … 2 hardest guardian in the
 * biome): the better guarded the nest, the further the roll leans rare. `luck`
 * comes from upgrades.
 */
export function rollSpecies(biome, tier = 0, luck = 0){
  const pool = SPECIES.filter((s) => s.biomes.includes(biome));
  const use = pool.length ? pool : SPECIES;
  const lean = 1 + tier * 0.9 + luck;

  const weighted = use.map((s) => {
    const r = RARITY.findIndex((x) => x.id === s.rarity);
    // Common stays flat, everything above it is multiplied by the lean.
    const w = rarityById(s.rarity).weight * (r === 0 ? 1 / lean : Math.pow(lean, r));
    return { s, w };
  });

  let total = weighted.reduce((a, x) => a + x.w, 0) * Math.random();
  for (const x of weighted){ total -= x.w; if (total <= 0) return x.s; }
  return use[0];
}

// ---------------------------------------------------------------- the meshes
//
// Small creatures, built from spheres and boxes, about 0.5 units tall so a pen
// full of them still reads as a pen full of them.

const mat = (color, shiny = false) => new THREE.MeshLambertMaterial({
  color, emissive: shiny ? color : 0x000000, emissiveIntensity: shiny ? 0.25 : 0,
});
const ball = (r, color, shiny) => new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat(color, shiny));
const brick = (w, h, d, color, shiny) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, shiny));

export function buildCritter(sp){
  const g = new THREE.Group();
  const B = sp.body, L = sp.belly, A = sp.accent, sh = sp.shiny;

  const body = ball(0.22, B, sh);
  body.scale.set(1, 0.92, 1.1);
  body.position.y = 0.24;
  g.add(body);

  const head = ball(0.16, B, sh);
  head.position.set(0, 0.46, 0.1);
  g.add(head);

  const tummy = ball(0.14, L, false);
  tummy.scale.set(1, 0.8, 0.7);
  tummy.position.set(0, 0.22, 0.17);
  g.add(tummy);

  // eyes, the same on every family
  for (const x of [-0.07, 0.07]){
    const e = ball(0.032, 0x1a1a1a, false);
    e.position.set(x, 0.48, 0.23);
    g.add(e);
  }

  switch (sp.build){
    case 'bird': {
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 8), mat(A));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.44, 0.27);
      g.add(beak);
      for (const s of [-1, 1]){
        const wing = ball(0.1, L); wing.scale.set(0.4, 1, 1.1);
        wing.position.set(s * 0.2, 0.26, 0.02); g.add(wing);
      }
      const tuft = ball(0.05, A); tuft.position.set(0, 0.6, 0.06); g.add(tuft);
      break;
    }
    case 'bunny': {
      for (const s of [-1, 1]){
        const ear = brick(0.06, 0.26, 0.04, B, sh);
        ear.position.set(s * 0.07, 0.68, 0.06);
        ear.rotation.z = s * 0.16;
        g.add(ear);
        const inner = brick(0.03, 0.18, 0.02, L);
        inner.position.set(s * 0.07, 0.68, 0.085);
        inner.rotation.z = s * 0.16;
        g.add(inner);
      }
      const tail = ball(0.07, L); tail.position.set(0, 0.26, -0.22); g.add(tail);
      break;
    }
    case 'cub': {
      for (const s of [-1, 1]){
        const ear = ball(0.06, B, sh); ear.position.set(s * 0.1, 0.58, 0.08); g.add(ear);
        const inner = ball(0.032, A); inner.position.set(s * 0.1, 0.59, 0.12); g.add(inner);
      }
      const snout = ball(0.06, L); snout.scale.set(1, 0.8, 0.9);
      snout.position.set(0, 0.43, 0.24); g.add(snout);
      const nose = ball(0.025, 0x2a2020); nose.position.set(0, 0.45, 0.3); g.add(nose);
      break;
    }
    case 'pup': {
      for (const s of [-1, 1]){
        const ear = brick(0.05, 0.14, 0.03, A); ear.position.set(s * 0.12, 0.5, 0.06);
        ear.rotation.z = s * 0.4; g.add(ear);
      }
      const snout = brick(0.1, 0.07, 0.1, L); snout.position.set(0, 0.42, 0.24); g.add(snout);
      const tail = brick(0.05, 0.05, 0.16, B, sh); tail.position.set(0, 0.32, -0.24);
      tail.rotation.x = -0.6; g.add(tail);
      break;
    }
    case 'turtle': {
      const shell = ball(0.26, A, sh); shell.scale.set(1, 0.6, 1.1);
      shell.position.set(0, 0.3, -0.02); g.add(shell);
      for (let i = 0; i < 5; i++){
        const plate = ball(0.06, B, sh);
        const ang = (i / 5) * Math.PI * 2;
        plate.scale.set(1, 0.5, 1);
        plate.position.set(Math.cos(ang) * 0.13, 0.44, Math.sin(ang) * 0.14 - 0.02);
        g.add(plate);
      }
      head.position.set(0, 0.36, 0.26);
      break;
    }
    case 'frog': {
      body.scale.set(1.15, 0.72, 1);
      head.position.set(0, 0.36, 0.14);
      for (const s of [-1, 1]){
        const eye = ball(0.07, L); eye.position.set(s * 0.09, 0.5, 0.12); g.add(eye);
        const pupil = ball(0.03, 0x161616); pupil.position.set(s * 0.09, 0.52, 0.17); g.add(pupil);
        const foot = brick(0.14, 0.04, 0.12, A); foot.position.set(s * 0.18, 0.04, 0.12); g.add(foot);
      }
      break;
    }
    case 'foal': {
      body.scale.set(0.9, 0.9, 1.3);
      head.position.set(0, 0.56, 0.2);
      const neck = brick(0.1, 0.22, 0.12, B, sh); neck.position.set(0, 0.44, 0.16);
      neck.rotation.x = -0.3; g.add(neck);
      const mane = brick(0.05, 0.2, 0.14, A); mane.position.set(0, 0.52, 0.08); g.add(mane);
      for (const s of [-1, 1]) for (const z of [-1, 1]){
        const leg = brick(0.06, 0.2, 0.06, A);
        leg.position.set(s * 0.1, 0.1, z * 0.14); g.add(leg);
      }
      break;
    }
    case 'dragon': {
      for (const s of [-1, 1]){
        const wing = brick(0.03, 0.2, 0.26, A, sh);
        wing.position.set(s * 0.2, 0.36, -0.04);
        wing.rotation.z = s * 0.5; g.add(wing);
      }
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 8), mat(A, sh));
      horn.position.set(0, 0.62, 0.06); g.add(horn);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 8), mat(B, sh));
      tail.rotation.x = Math.PI / 2.2; tail.position.set(0, 0.26, -0.28); g.add(tail);
      break;
    }
  }

  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  g.userData.species = sp.id;
  return g;
}

/** A still picture of one animal, for the collection grid. */
export function critterSwatch(sp, size = 64){
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const hex = (v) => '#' + v.toString(16).padStart(6, '0');

  g.fillStyle = hex(sp.body);
  g.beginPath(); g.ellipse(size / 2, size * 0.64, size * 0.26, size * 0.22, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(size / 2, size * 0.38, size * 0.19, 0, Math.PI * 2); g.fill();

  g.fillStyle = hex(sp.belly);
  g.beginPath(); g.ellipse(size / 2, size * 0.68, size * 0.15, size * 0.13, 0, 0, Math.PI * 2); g.fill();

  g.fillStyle = hex(sp.accent);
  if (sp.build === 'bunny'){
    for (const s of [-1, 1]){
      g.beginPath();
      g.ellipse(size / 2 + s * size * 0.08, size * 0.18, size * 0.045, size * 0.12, s * 0.2, 0, Math.PI * 2);
      g.fill();
    }
  } else if (sp.build === 'dragon'){
    for (const s of [-1, 1]){
      g.beginPath();
      g.moveTo(size / 2, size * 0.56);
      g.lineTo(size / 2 + s * size * 0.3, size * 0.4);
      g.lineTo(size / 2 + s * size * 0.26, size * 0.7);
      g.closePath(); g.fill();
    }
  } else if (sp.build === 'turtle'){
    g.beginPath(); g.ellipse(size / 2, size * 0.6, size * 0.28, size * 0.2, 0, 0, Math.PI * 2); g.fill();
  } else {
    for (const s of [-1, 1]){
      g.beginPath(); g.arc(size / 2 + s * size * 0.15, size * 0.26, size * 0.06, 0, Math.PI * 2); g.fill();
    }
  }

  g.fillStyle = '#16181d';
  for (const s of [-1, 1]){
    g.beginPath(); g.arc(size / 2 + s * size * 0.07, size * 0.37, size * 0.025, 0, Math.PI * 2); g.fill();
  }
  return c;
}
