// ---------- The place ----------
//
// One biome at a time: a round patch of ground with your pen in the middle and
// three or four guarded nests around the rim. The pen is the only safe ground —
// a guardian will chase you to the gate and no further — so every raid is the
// same shape: out, steal, and the long run back.
//
// Props are not decoration only. Standing close to a tree or a rock halves the
// noise you make, which is the difference between creeping up on a guardian and
// waking it from across the clearing.

import * as THREE from 'three';
import { rollSpecies, rarityById } from './animals.js';

export const BIOMES = [
  {
    id: 'meadow', name: 'Meadow Hollow', blurb: 'Soft grass, sleepy giants.',
    cost: 0, icon: '🌳',
    sky: 0x9fd9ff, fog: 0xc9e9ff, ground: 0x6cc059, ground2: 0x58a647,
    prop: 'tree', propColor: 0x3f8f3a, trunk: 0x6b4a2f, rock: 0x9aa3ab,
    guard: 0xb06a4a, guardShirt: 0x7d4a33,
    nests: 3, speed: [5.2, 5.8, 6.4], wake: 1.0,
  },
  {
    id: 'dunes', name: 'Sun Dunes', blurb: 'No cover worth the name.',
    cost: 400, icon: '🏜️',
    sky: 0xffd9a0, fog: 0xffe6bd, ground: 0xe8c887, ground2: 0xd6b170,
    prop: 'cactus', propColor: 0x4f9a5a, trunk: 0x3f7a48, rock: 0xc2a071,
    guard: 0xd08a4a, guardShirt: 0x9b5f2e,
    nests: 4, speed: [6.0, 6.5, 7.0], wake: 1.25,
  },
  {
    id: 'frost', name: 'Frostpeak', blurb: 'Snow crunches. Be slow.',
    cost: 2200, icon: '🏔️',
    sky: 0xd6ecff, fog: 0xe8f4ff, ground: 0xeaf2f8, ground2: 0xd2e2ef,
    prop: 'pine', propColor: 0x2f6b55, trunk: 0x5a4432, rock: 0xb9c6d2,
    guard: 0x7fa6c8, guardShirt: 0x4b6f91,
    nests: 4, speed: [6.6, 7.2, 7.8], wake: 1.5,
  },
  {
    id: 'starfall', name: 'Starfall Station', blurb: 'They never fully sleep.',
    cost: 9000, icon: '🛰️',
    sky: 0x1b1038, fog: 0x2a1c52, ground: 0x3b2a66, ground2: 0x2f2154,
    prop: 'crystal', propColor: 0x8f6bff, trunk: 0x5b3fbf, rock: 0x4a3a7a,
    guard: 0x6f5fd0, guardShirt: 0x3f3290,
    nests: 4, speed: [7.2, 7.9, 8.6], wake: 1.8,
  },
];

export const WORLD_R = 56;       // the fence
export const PEN_R = 7.5;        // safe ground

const rand = (a, b) => a + Math.random() * (b - a);

// --------------------------------------------------------------------- eggs

export function makeEgg(species){
  const r = rarityById(species.rarity);
  const geo = new THREE.SphereGeometry(0.3, 14, 12);
  geo.scale(1, 1.32, 1);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
    color: species.belly,
    emissive: new THREE.Color(r.tint).multiplyScalar(species.shiny ? 0.5 : 0.18),
  }));
  mesh.castShadow = true;

  // Speckles, more of them the rarer the egg, so a prize egg is visible on the nest.
  const dots = RARITY_DOTS[species.rarity] || 0;
  for (let i = 0; i < dots; i++){
    const d = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 5),
      new THREE.MeshBasicMaterial({ color: species.accent }),
    );
    const th = Math.random() * Math.PI * 2, ph = Math.acos(rand(-0.8, 0.8));
    d.position.set(
      Math.sin(ph) * Math.cos(th) * 0.3,
      Math.cos(ph) * 0.38,
      Math.sin(ph) * Math.sin(th) * 0.3,
    );
    mesh.add(d);
  }
  mesh.userData.species = species;
  return mesh;
}

const RARITY_DOTS = { common: 0, uncommon: 3, rare: 6, epic: 10, legendary: 16 };

// --------------------------------------------------------------------- props

function makeProp(kind, c){
  const g = new THREE.Group();
  if (kind === 'tree'){
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.2, 7),
      new THREE.MeshLambertMaterial({ color: c.trunk }));
    t.position.y = 1.1;
    const top = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8),
      new THREE.MeshLambertMaterial({ color: c.propColor }));
    top.position.y = 2.9; top.scale.set(1, 0.9, 1);
    g.add(t, top);
    g.userData.cover = 1.6;
  } else if (kind === 'cactus'){
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 2.6, 8),
      new THREE.MeshLambertMaterial({ color: c.propColor }));
    b.position.y = 1.3;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 7),
      new THREE.MeshLambertMaterial({ color: c.propColor }));
    arm.position.set(0.55, 1.7, 0); arm.rotation.z = -0.5;
    g.add(b, arm);
    g.userData.cover = 1.1;
  } else if (kind === 'pine'){
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.4, 7),
      new THREE.MeshLambertMaterial({ color: c.trunk }));
    t.position.y = 0.7;
    g.add(t);
    for (let i = 0; i < 3; i++){
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4 - i * 0.35, 1.4, 9),
        new THREE.MeshLambertMaterial({ color: c.propColor }));
      cone.position.y = 1.5 + i * 0.85;
      g.add(cone);
    }
    g.userData.cover = 1.7;
  } else {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.6, 5),
      new THREE.MeshLambertMaterial({
        color: c.propColor, emissive: c.propColor, emissiveIntensity: 0.35,
      }));
    s.position.y = 1.3;
    const s2 = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.5, 5),
      new THREE.MeshLambertMaterial({
        color: c.propColor, emissive: c.propColor, emissiveIntensity: 0.35,
      }));
    s2.position.set(0.6, 0.75, 0.3);
    g.add(s, s2);
    g.userData.cover = 1.3;
  }
  g.traverse((m) => { if (m.isMesh){ m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

function makeRock(color){
  const g = new THREE.Mesh(
    new THREE.DodecahedronGeometry(rand(0.6, 1.3), 0),
    new THREE.MeshLambertMaterial({ color, flatShading: true }),
  );
  g.rotation.set(Math.random(), Math.random(), Math.random());
  g.castShadow = true; g.receiveShadow = true;
  g.userData.cover = 1.2;
  return g;
}

// --------------------------------------------------------------------- world

export class World {
  constructor(scene){
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.nests = [];
    this.covers = [];
    this.penCritters = [];
    this.biome = BIOMES[0];
  }

  clear(){
    this.group.traverse((o) => {
      if (o.isMesh){
        o.geometry?.dispose?.();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose?.()); else m?.dispose?.();
      }
    });
    this.group.clear();
    this.nests = [];
    this.covers = [];
    this.penCritters = [];
  }

  build(biomeIndex, luck = 0){
    this.clear();
    const c = this.biome = BIOMES[biomeIndex] || BIOMES[0];
    this.biomeIndex = biomeIndex;

    this.scene.background = new THREE.Color(c.sky);
    this.scene.fog = new THREE.Fog(c.fog, 42, 96);

    // ground, with a darker ring so the edge of the world reads
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(WORLD_R + 6, 64),
      new THREE.MeshLambertMaterial({ color: c.ground }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(WORLD_R, WORLD_R + 6, 64),
      new THREE.MeshLambertMaterial({ color: c.ground2, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this.group.add(ring);

    this.buildPen(c);

    // nests on the rim, spread evenly with a little jitter
    const n = c.nests;
    for (let i = 0; i < n; i++){
      const ang = (i / n) * Math.PI * 2 + rand(-0.18, 0.18);
      const dist = rand(WORLD_R * 0.56, WORLD_R * 0.8);
      this.buildNest(new THREE.Vector3(Math.cos(ang) * dist, 0, Math.sin(ang) * dist), i, c, luck);
    }

    this.scatter(c);
    return this;
  }

  // ------------------------------------------------------------------- pen
  buildPen(c){
    const pen = new THREE.Group();

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(PEN_R, 40),
      new THREE.MeshLambertMaterial({ color: 0xcaa36a }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.04;
    floor.receiveShadow = true;
    pen.add(floor);

    // posts all the way round, with a gap for the gate
    const postGeo = new THREE.CylinderGeometry(0.11, 0.13, 1.1, 6);
    const postMat = new THREE.MeshLambertMaterial({ color: 0x8a5f3a });
    for (let i = 0; i < 28; i++){
      const a = (i / 28) * Math.PI * 2;
      if (a > 1.1 && a < 1.75) continue;          // the way in
      const p = new THREE.Mesh(postGeo, postMat);
      p.position.set(Math.cos(a) * PEN_R, 0.55, Math.sin(a) * PEN_R);
      p.castShadow = true;
      pen.add(p);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 1.72), postMat);
      rail.position.set(Math.cos(a + 0.11) * PEN_R, 0.78, Math.sin(a + 0.11) * PEN_R);
      rail.rotation.y = -a;
      pen.add(rail);
    }

    // the hatching stump, dead centre — walk onto it with an egg
    const stump = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.15, 0.26, 12),
      new THREE.MeshLambertMaterial({ color: 0x9a6b42 }),
    );
    stump.position.y = 0.13;
    stump.castShadow = true; stump.receiveShadow = true;
    pen.add(stump);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(1.02, 1.02, 0.08, 12),
      new THREE.MeshLambertMaterial({ color: 0xd8b07a }),
    );
    top.position.y = 0.28;
    pen.add(top);

    // a ring of straw so the stump reads as a nest of your own
    const straw = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.18, 7, 20),
      new THREE.MeshLambertMaterial({ color: 0xe3c37a }),
    );
    straw.rotation.x = -Math.PI / 2;
    straw.position.y = 0.12;
    pen.add(straw);

    this.stumpTop = 0.32;
    this.group.add(pen);
    this.pen = pen;
  }

  /** Put one of every animal you own into the pen, up to a sensible crowd. */
  populatePen(animals, buildCritter, speciesById){
    for (const c of this.penCritters) this.pen.remove(c.mesh);
    this.penCritters = [];

    const ids = Object.keys(animals).slice(0, 26);
    ids.forEach((id, i) => {
      const sp = speciesById(id);
      if (!sp) return;
      const mesh = buildCritter(sp);
      const a = (i / Math.max(1, ids.length)) * Math.PI * 2 + rand(-0.2, 0.2);
      const d = rand(2.4, PEN_R - 1.2);
      mesh.position.set(Math.cos(a) * d, 0.05, Math.sin(a) * d);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      this.pen.add(mesh);
      this.penCritters.push({
        mesh, t: Math.random() * 10,
        home: mesh.position.clone(),
        speed: rand(0.3, 0.8),
        dir: Math.random() * Math.PI * 2,
      });
    });
  }

  // ------------------------------------------------------------------ nests
  buildNest(pos, index, c, luck){
    const g = new THREE.Group();
    g.position.copy(pos);

    const tier = Math.min(2, index % 3);

    const dish = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.0, 0.35, 16),
      new THREE.MeshLambertMaterial({ color: 0xbf9a5e }),
    );
    dish.position.y = 0.17;
    dish.receiveShadow = true;
    g.add(dish);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.3, 8, 22),
      new THREE.MeshLambertMaterial({ color: 0x8d6b3c }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.3;
    rim.castShadow = true;
    g.add(rim);

    // stones around it, which double as cover
    for (let i = 0; i < 5; i++){
      const a = (i / 5) * Math.PI * 2 + rand(-0.3, 0.3);
      const r = makeRock(c.rock);
      r.position.set(Math.cos(a) * 3.6, 0.3, Math.sin(a) * 3.6);
      g.add(r);
      this.covers.push({ x: pos.x + Math.cos(a) * 3.6, z: pos.z + Math.sin(a) * 3.6, r: 2.0 });
    }

    const nest = {
      index, tier, pos: pos.clone(), group: g,
      eggs: [], refill: 0,
      guardian: null,
    };
    this.group.add(g);
    this.nests.push(nest);

    for (let i = 0; i < 3; i++) this.spawnEgg(nest, i, luck);
    return nest;
  }

  spawnEgg(nest, slot, luck = 0){
    const sp = rollSpecies(this.biomeIndex, nest.tier, luck);
    const mesh = makeEgg(sp);
    const a = (slot / 3) * Math.PI * 2 + 0.4;
    mesh.position.set(Math.cos(a) * 0.9, 0.52, Math.sin(a) * 0.9);
    mesh.rotation.z = rand(-0.2, 0.2);
    nest.group.add(mesh);
    nest.eggs.push({ mesh, species: sp, slot });
  }

  /** Take the nearest egg off a nest. Returns { species, mesh } or null. */
  takeEgg(nest){
    const e = nest.eggs.pop();
    if (!e) return null;
    nest.group.remove(e.mesh);
    nest.refill = 9 + Math.random() * 6;
    return e;
  }

  // ------------------------------------------------------------------ props
  scatter(c){
    const blocked = (x, z) => {
      if (Math.hypot(x, z) < PEN_R + 4) return true;
      return this.nests.some((n) => Math.hypot(x - n.pos.x, z - n.pos.z) < 7);
    };

    const count = c.id === 'dunes' ? 26 : 54;
    for (let i = 0; i < count; i++){
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * (WORLD_R - 3);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (blocked(x, z)) continue;

      const p = Math.random() < 0.72 ? makeProp(c.prop, c) : makeRock(c.rock);
      p.position.set(x, p.userData.cover && p.isMesh ? 0.4 : 0, z);
      p.rotation.y = Math.random() * Math.PI * 2;
      const s = rand(0.8, 1.3);
      p.scale.setScalar(s);
      this.group.add(p);
      this.covers.push({ x, z, r: (p.userData.cover || 1) * s * 1.6 });
    }

    // the fence at the edge of the world
    const postGeo = new THREE.CylinderGeometry(0.14, 0.16, 1.5, 6);
    const postMat = new THREE.MeshLambertMaterial({ color: 0x6f5540 });
    for (let i = 0; i < 90; i++){
      const a = (i / 90) * Math.PI * 2;
      const p = new THREE.Mesh(postGeo, postMat);
      p.position.set(Math.cos(a) * WORLD_R, 0.75, Math.sin(a) * WORLD_R);
      this.group.add(p);
    }
  }

  /**
   * How hidden a spot is, 0 (out in the open) to 1 (right up against cover).
   * Noise is multiplied by 1 - 0.55 × this, so good cover roughly halves it.
   */
  coverAt(x, z){
    let best = 0;
    for (const c of this.covers){
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < c.r) best = Math.max(best, 1 - d / c.r);
    }
    return best;
  }

  nearestNest(pos, within = 3.4){
    let best = null, bestD = Infinity;
    for (const n of this.nests){
      if (!n.eggs.length) continue;
      const d = Math.hypot(pos.x - n.pos.x, pos.z - n.pos.z);
      if (d < within && d < bestD){ best = n; bestD = d; }
    }
    return best;
  }

  update(dt, t, luck){
    for (const n of this.nests){
      if (n.refill > 0){
        n.refill -= dt;
        if (n.refill <= 0 && n.eggs.length < 3) this.spawnEgg(n, n.eggs.length, luck);
      }
      n.eggs.forEach((e, i) => {
        e.mesh.position.y = 0.52 + Math.sin(t * 1.6 + i) * 0.03;
        e.mesh.rotation.y += dt * 0.4;
      });
    }

    // pen animals potter about
    for (const c of this.penCritters){
      c.t += dt;
      if (c.t > 2.4){
        c.t = 0;
        c.dir = Math.random() * Math.PI * 2;
      }
      const nx = c.mesh.position.x + Math.cos(c.dir) * c.speed * dt;
      const nz = c.mesh.position.z + Math.sin(c.dir) * c.speed * dt;
      if (Math.hypot(nx, nz) < PEN_R - 0.8 && Math.hypot(nx, nz) > 1.8){
        c.mesh.position.x = nx;
        c.mesh.position.z = nz;
        c.mesh.rotation.y = -c.dir + Math.PI / 2;
      } else {
        c.dir += 2.2;
      }
      c.mesh.position.y = 0.05 + Math.abs(Math.sin(c.t * 5 + c.speed)) * 0.08;
    }
  }
}
