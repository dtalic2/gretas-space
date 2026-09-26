// ---------- The things on the island: what you gather and what you build ----------
import * as THREE from 'three';
import { height, slope, rng, fbm, noise, shorePoints, MEADOW, HILL, SEA } from './terrain.js';
import { makeTree, makeRock, makeBush, makeFishSpot, makeWreck, makeScaffold, mergeStatic, BUILDERS, MAT } from './models.js';
import { NODES, BUILDINGS, FARM } from './econ.js';

// Foundations. 'c' is round (radius), 'b' is a box (width, depth, z offset).
// The same shape is the building's collider, so you walk around the walls.
const PLINTH = {
  torch: ['c', 0.3], hut: ['c', 2.0], well: ['c', 1.4], windmill: ['c', 2.6],
  cottage: ['b', 5.4, 4.4, 0], blacksmith: ['b', 6.2, 5.2, 0], watchtower: ['b', 3.4, 3.4, 0],
  chapel: ['b', 5.2, 9.2, 0], castle: ['b', 11.6, 11.6, 0],
};
const NO_PLINTH = new Set(['campfire', 'torch', 'farm']);
const PLAYER_R = 0.45;
const LIGHTS = 6;

/** Where the sand meets the sea, walking in from the middle along a direction. */
export function shoreAt(dx, dz){
  const l = Math.hypot(dx, dz); dx /= l; dz /= l;
  let r = 20;
  while (r < 120 && height(dx * r, dz * r) > 0.45) r += 0.25;
  return { x: dx * r, z: dz * r };
}

export class World {
  constructor(scene, particles, audio){
    this.scene = scene;
    this.fx = particles;
    this.audio = audio;
    this.nodes = [];
    this.buildings = [];
    this.nextId = 1;
    this.clock = 0;

    this.wreckAt = shoreAt(-0.12, 1);
    const wreck = makeWreck();
    mergeStatic(wreck);
    wreck.position.set(this.wreckAt.x, height(this.wreckAt.x, this.wreckAt.z) - 0.1, this.wreckAt.z);
    wreck.rotation.y = 0.9;
    scene.add(wreck);
    this.spawnPoint = { x: this.wreckAt.x * 0.9 + 2, z: this.wreckAt.z * 0.9 };

    this._scatter();

    // A fixed pool of lights, handed each frame to whichever fires are nearest.
    // Adding lights one at a time would recompile every shader on the island.
    this.lightPool = [];
    for (let i = 0; i < LIGHTS; i++){
      const l = new THREE.PointLight(0xffa04a, 0, 14, 1.6);
      scene.add(l);
      this.lightPool.push(l);
    }
    this._smokeT = 0;
  }

  // ------------------------------------------------------------ nodes
  _addNode(type, x, z, obj, r){
    const y = height(x, z);
    obj.position.set(x, type === 'fish' ? SEA : y - 0.05, z);
    obj.rotation.y = (x * 13.1 + z * 7.7) % (Math.PI * 2);
    this.scene.add(obj);
    const n = { id: this.nodes.length, type, x, z, obj, r, hp: NODES[type].hp, spentUntil: 0, shake: 0, fall: 0, grow: 1 };
    this.nodes.push(n);
    return n;
  }

  _free(x, z, gap){
    for (const n of this.nodes) if ((n.x - x) ** 2 + (n.z - z) ** 2 < gap * gap) return false;
    const w = this.wreckAt;
    return (w.x - x) ** 2 + (w.z - z) ** 2 > 36;
  }

  _scatter(){
    const r = rng(20260926);
    const md = (x, z) => Math.hypot(x - MEADOW.x, z - MEADOW.z);
    const hd = (x, z) => Math.hypot(x - HILL.x, z - HILL.z);

    // Groves you are sure to walk past between the beach and the meadow.
    const groves = [[-15, 30, 7], [15, 28, 6], [-30, 4, 8], [28, -12, 7], [-22, -20, 9]];
    for (const [gx, gz, n] of groves){
      for (let i = 0; i < n * 3 && n > 0; i++){
        const x = gx + (r() - 0.5) * 12, z = gz + (r() - 0.5) * 12;
        const h = height(x, z);
        if (h < 1.3 || slope(x, z) > 0.9 || md(x, z) < MEADOW.r - 3 || !this._free(x, z, 2.6)) continue;
        this._addNode('tree', x, z, makeTree(r() < 0.45 ? 'pine' : 'oak', r), 0.5);
      }
    }
    for (let i = 0; i < 1400 && this.nodes.length < 190; i++){
      const x = (r() - 0.5) * 140, z = (r() - 0.5) * 140;
      const h = height(x, z);
      if (h < 1.3 || h > 11 || slope(x, z) > 0.9) continue;
      if (md(x, z) < MEADOW.r - 1) continue;
      const woods = fbm(x * 0.035 + 20, z * 0.035 - 9);
      if (woods < 0.47 && r() > 0.07) continue;
      if (!this._free(x, z, 2.5)) continue;
      const pine = h > 5 || noise(x * 0.1, z * 0.1) > 0.62;
      this._addNode('tree', x, z, makeTree(pine ? 'pine' : 'oak', r), 0.5);
    }
    let rocks = 0;
    for (let i = 0; i < 1500 && rocks < 46; i++){
      const near = r() < 0.75;
      const x = near ? HILL.x + (r() - 0.5) * 50 : (r() - 0.5) * 120;
      const z = near ? HILL.z + (r() - 0.5) * 44 : (r() - 0.5) * 120;
      const h = height(x, z);
      if (h < 1.4 || md(x, z) < MEADOW.r - 2 || !this._free(x, z, 2.8)) continue;
      if (!near && r() > 0.5) continue;
      const rock = makeRock('rock', r);
      this._addNode('rock', x, z, rock, 0.95 * rock.userData.scale);
      rocks++;
    }
    let iron = 0;
    for (let i = 0; i < 1500 && iron < 13; i++){
      const x = HILL.x + (r() - 0.5) * 30, z = HILL.z + (r() - 0.5) * 30;
      if (height(x, z) < 8.5 || hd(x, z) > 16 || !this._free(x, z, 3)) continue;
      const rock = makeRock('iron', r);
      this._addNode('iron', x, z, rock, 0.9 * rock.userData.scale);
      iron++;
    }
    let bushes = 0;
    for (let i = 0; i < 1500 && bushes < 28; i++){
      const a = r() * Math.PI * 2, d = MEADOW.r - 4 + r() * 18;
      const x = MEADOW.x + Math.cos(a) * d, z = MEADOW.z + Math.sin(a) * d;
      if (height(x, z) < 1.3 || slope(x, z) > 0.7 || !this._free(x, z, 2.4)) continue;
      this._addNode('bush', x, z, makeBush(r), 0.55);
      bushes++;
    }
    for (const p of shorePoints(12, 99)){
      const n = this._addNode('fish', p.x, p.z, makeFishSpot(), 0);
      n.standX = p.standX; n.standZ = p.standZ;
      n.phase = r() * 10;
    }
  }

  alive(n){ return n.hp > 0; }

  /** One swing at a node. Returns how much it gave. */
  hit(n, amount){
    if (n.hp <= 0) return 0;
    n.hp -= 1;
    n.shake = 1;
    const y = height(n.x, n.z);
    const at = new THREE.Vector3(n.x, n.type === 'fish' ? SEA + 0.3 : y + 1.0, n.z);
    const col = { tree: 0xc49a62, rock: 0xa9a399, iron: 0xd08a4a, bush: 0x5fa845, fish: 0xdff4ff }[n.type];
    this.fx.burst(at, 10, col, { up: 3.5, spread: 1.4, size: 0.18, life: 0.7 });
    if (n.hp <= 0){
      n.spentUntil = this.clock + NODES[n.type].regrow;
      n.fall = 0.0001;
      if (n.type === 'tree') this.audio.timber();
    }
    return amount;
  }

  _updateNodes(dt, t){
    for (const n of this.nodes){
      if (n.removed) continue;
      const u = n.obj.userData;
      if (n.hp <= 0 && this.clock >= n.spentUntil){
        n.hp = NODES[n.type].hp;
        n.fall = 0;
        n.grow = 0;
        if (u.stump) u.stump.visible = false;
        u.top.visible = true;
        u.top.rotation.set(0, 0, 0);
        u.top.position.set(0, 0, 0);
      }
      if (n.grow < 1){
        n.grow = Math.min(1, n.grow + dt * 0.8);
        const s = THREE.MathUtils.smootherstep(n.grow, 0, 1);
        u.top.scale.setScalar(Math.max(0.01, s));
      }
      if (n.shake > 0){
        n.shake = Math.max(0, n.shake - dt * 5);
        if (n.hp > 0 && n.type !== 'fish'){
          u.top.rotation.z = Math.sin(t * 60) * 0.04 * n.shake;
          if (u.body) u.body.rotation.z = u.top.rotation.z;
        }
      }
      if (n.fall > 0){
        n.fall += dt;
        if (n.type === 'tree'){
          const f = Math.min(1, n.fall / 1.1);
          u.top.rotation.x = (f * f) * (Math.PI / 2 - 0.1);
          if (u.stump) u.stump.visible = true;
          if (n.fall > 1.1 && n.fall - dt <= 1.1){
            this.fx.burst(new THREE.Vector3(n.x, height(n.x, n.z) + 0.3, n.z), 26, 0x8c7a5a, { up: 2, spread: 3, size: 0.4, life: 1.2, gravity: 2 });
            this.audio.thud();
          }
          if (n.fall > 1.8){
            const s = Math.max(0, 1 - (n.fall - 1.8) * 2);
            u.top.scale.setScalar(Math.max(0.001, s));
            if (s <= 0){ u.top.visible = false; n.fall = 0; }
          }
        } else {
          const s = Math.max(0, 1 - n.fall * 3);
          u.top.scale.setScalar(Math.max(0.001, s));
          if (u.stump) u.stump.visible = true;
          if (s <= 0){ u.top.visible = false; n.fall = 0; }
        }
      }
      if (n.type === 'fish'){
        const k = n.hp > 0;
        u.rings.forEach((ring, i) => {
          const p = ((t * 0.5 + n.phase + i / 3) % 1);
          ring.visible = k;
          ring.scale.setScalar(0.5 + p * 1.6);
          ring.material.opacity = (1 - p) * 0.55;
        });
        const jump = (t * 0.6 + n.phase) % 5;
        u.fish.visible = k && jump < 0.8;
        if (u.fish.visible){
          const f = jump / 0.8;
          u.fish.position.set(Math.cos(n.phase) * (f - 0.5) * 1.6, Math.sin(f * Math.PI) * 1.1, Math.sin(n.phase) * (f - 0.5) * 1.6);
          u.fish.rotation.set(-(f - 0.5) * 2.4, n.phase, 0);
          u.fish.rotation.order = 'YXZ';
        }
      }
    }
  }

  // ------------------------------------------------------------ buildings
  /** Can this building go here? Returns { ok, reason, y }. */
  canPlace(type, x, z){
    const def = BUILDINGS[type];
    const r = def.r;
    let min = Infinity, max = -Infinity;
    const pts = [[0, 0]];
    for (let i = 0; i < 12; i++){
      const a = (i / 12) * Math.PI * 2;
      pts.push([Math.cos(a) * r, Math.sin(a) * r], [Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5]);
    }
    for (const [dx, dz] of pts){
      const h = height(x + dx, z + dz);
      min = Math.min(min, h); max = Math.max(max, h);
    }
    if (min < 0.6) return { ok: false, reason: 'Too close to the water', y: max };
    const limit = type === 'farm' ? 0.9 : type === 'castle' ? 4.0 : 2.0;
    if (max - min > limit) return { ok: false, reason: 'The ground is too steep', y: max };
    for (const b of this.buildings){
      const gap = BUILDINGS[b.type].r + r + 0.4;
      if ((b.x - x) ** 2 + (b.z - z) ** 2 < gap * gap) return { ok: false, reason: `Too close to your ${BUILDINGS[b.type].name}`, y: max };
    }
    const w = this.wreckAt;
    if ((w.x - x) ** 2 + (w.z - z) ** 2 < (r + 4) ** 2) return { ok: false, reason: 'The shipwreck is in the way', y: max };
    return { ok: true, y: type === 'farm' ? (min + max) / 2 : max, min, clears: this.under(type, x, z) };
  }

  /**
   * Trees, bushes and rocks standing where a building would go. Building over
   * them clears them for good and hands you what they held, so you never have
   * to hunt for an empty patch of forest.
   */
  under(type, x, z){
    const r = BUILDINGS[type].r;
    return this.nodes.filter((n) => n.type !== 'fish' && !n.removed && (n.x - x) ** 2 + (n.z - z) ** 2 < (r + n.r + 0.2) ** 2);
  }

  /** What clearing `nodes` would give you, as { res: amount }. */
  clearGain(nodes){
    const got = {};
    for (const n of nodes) if (n.hp > 0){ const d = NODES[n.type]; got[d.res] = (got[d.res] ?? 0) + n.hp * d.yield; }
    return got;
  }

  _remove(n, quiet = false){
    n.removed = true;
    n.hp = 0;
    n.obj.visible = false;
    if (!quiet) this.fx.burst(new THREE.Vector3(n.x, height(n.x, n.z) + 1, n.z), 14, 0x9c8a62, { up: 3, spread: 2, size: 0.3, life: 0.9 });
  }

  /** Put a building down. `saved` restores one from a save. */
  place(type, x, z, rot, saved = null){
    const check = this.canPlace(type, x, z);
    const y = saved?.y ?? check.y;
    const min = saved?.min ?? check.min ?? y;
    const variant = saved?.variant ?? this.buildings.filter((b) => b.type === type).length;
    const model = BUILDERS[type](variant);

    const root = new THREE.Group();
    root.position.set(x, y, z);
    root.rotation.y = rot;
    root.add(model.group);

    if (!NO_PLINTH.has(type) && PLINTH[type]){
      const p = PLINTH[type];
      const depth = y - min + 0.4;
      const geo = p[0] === 'c' ? new THREE.CylinderGeometry(p[1], p[1] + 0.15, depth, 12) : new THREE.BoxGeometry(p[1], depth, p[2]);
      const pl = new THREE.Mesh(geo, MAT.stoneDark);
      pl.position.set(0, -depth / 2 + 0.05, p[0] === 'b' ? p[3] : 0);
      pl.receiveShadow = true;
      root.add(pl);
    }
    this.scene.add(root);

    for (const n of this.under(type, x, z)) this._remove(n, !!saved);

    const b = {
      id: saved?.id ?? this.nextId++, type, x, z, rot, y, min, variant,
      root, model, progress: saved?.progress ?? 0, growth: saved?.growth ?? 0,
      emitters: [],
    };
    this.nextId = Math.max(this.nextId, b.id + 1);
    root.updateMatrixWorld(true);
    const toWorld = (v) => model.group.localToWorld(v.clone());
    for (const v of model.smoke ?? []) b.emitters.push({ kind: model.smokeDark ? 'smokeDark' : 'smoke', p: toWorld(v) });
    for (const v of model.sparks ?? []) b.emitters.push({ kind: 'spark', p: toWorld(v) });
    b.lightsAt = (model.lights ?? []).map(toWorld);
    if (model.setGrowth) model.setGrowth(b.growth);

    if (b.progress < 1) this._startConstruction(b);
    else mergeStatic(model.group);
    this.buildings.push(b);
    return b;
  }

  _startConstruction(b){
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), b.y);
    const clones = new Map();
    b.model.group.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.mat = o.material;
      if (!clones.has(o.material)){
        const c = o.material.clone();
        c.clippingPlanes = [plane];
        c.clipShadows = true;
        clones.set(o.material, c);
      }
      o.material = clones.get(o.material);
    });
    b.clip = { plane, clones };
    b.scaffold = makeScaffold(BUILDINGS[b.type].r, Math.min(b.model.height * 0.8, 10));
    b.root.add(b.scaffold);
    this._setClip(b);
  }

  _setClip(b){
    if (!b.clip) return;
    const f = THREE.MathUtils.smoothstep(b.progress, 0, 1) * 0.7 + b.progress * 0.3;
    b.clip.plane.constant = b.y + 0.02 + f * (b.model.height + 0.5);
  }

  /** Hammer at a site. Returns true when it finishes. */
  build(b, amount){
    if (b.progress >= 1) return false;
    b.progress = Math.min(1, b.progress + amount / BUILDINGS[b.type].time);
    this._setClip(b);
    if (Math.random() < 0.3){
      const a = Math.random() * Math.PI * 2, r = BUILDINGS[b.type].r * 0.8;
      this.fx.burst(new THREE.Vector3(b.x + Math.cos(a) * r, b.y + 0.3 + Math.random() * 2, b.z + Math.sin(a) * r), 4, 0xd2b68a, { up: 2, spread: 1, size: 0.15, life: 0.6 });
    }
    if (b.progress >= 1){ this._finish(b); return true; }
    return false;
  }

  _finish(b){
    if (b.clip){
      b.model.group.traverse((o) => { if (o.isMesh && o.userData.mat){ o.material = o.userData.mat; delete o.userData.mat; } });
      for (const c of b.clip.clones.values()) c.dispose();
      b.clip = null;
    }
    if (b.scaffold){ b.root.remove(b.scaffold); b.scaffold = null; }
    mergeStatic(b.model.group);
    const at = new THREE.Vector3(b.x, b.y + b.model.height * 0.6, b.z);
    this.fx.burst(at, 50, 0xffe08a, { up: 6, spread: 4, size: 0.3, life: 1.4, gravity: 5 });
    this.fx.burst(at, 30, 0xffffff, { up: 5, spread: 3, size: 0.22, life: 1.2, gravity: 5 });
  }

  done(type){ return this.buildings.filter((b) => b.type === type && b.progress >= 1).length; }
  has(type){ return this.done(type) > 0; }

  // ------------------------------------------------------------ what the rest of the game asks
  /** Is there a completed fire or house keeping this spot warm? */
  warmAt(x, z){
    for (const b of this.buildings){
      const w = BUILDINGS[b.type].warm;
      if (!w || b.progress < 1) continue;
      if ((b.x - x) ** 2 + (b.z - z) ** 2 < (w + BUILDINGS[b.type].r) ** 2) return b;
    }
    return null;
  }

  /** Is this spot lit well enough to scare a wolf off? */
  litAt(x, z){
    for (const b of this.buildings){
      const l = BUILDINGS[b.type].light;
      if (!l || b.progress < 1) continue;
      if ((b.x - x) ** 2 + (b.z - z) ** 2 < l * l) return b;
    }
    return null;
  }

  /**
   * Hide trees standing between the camera and the player, so a forest never
   * swallows the view. Returns nothing; toggles each tree's visibility.
   */
  clearView(cam, target){
    const ax = cam.x, az = cam.z, bx = target.x, bz = target.z;
    const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1;
    for (const n of this.nodes){
      if (n.type !== 'tree' || n.removed) continue;
      const t = ((n.x - ax) * dx + (n.z - az) * dz) / len2;
      let hide = false;
      if (t > -0.15 && t < 0.92){
        const px = ax + dx * THREE.MathUtils.clamp(t, 0, 1), pz = az + dz * THREE.MathUtils.clamp(t, 0, 1);
        const d = Math.hypot(n.x - px, n.z - pz);
        // Only if the sight line passes low enough to hit the canopy.
        const y = cam.y + (target.y - cam.y) * THREE.MathUtils.clamp(t, 0, 1);
        hide = d < 2.1 && y < height(n.x, n.z) + (n.obj.userData.canopy ?? 4) + 0.5;
      }
      n.obj.visible = !hide;
    }
  }

  /** Building footprints the camera should not pass through. */
  obstacles(){
    return this.buildings.filter((b) => BUILDINGS[b.type].solid).map((b) => ({ x: b.x, z: b.z, r: BUILDINGS[b.type].r * 0.85, top: b.y + b.model.height * 0.8 }));
  }

  /** Push a circle of radius `r` at `p` out of anything solid. */
  collide(p, r = PLAYER_R){
    for (const n of this.nodes){
      if (n.hp <= 0 || !n.r) continue;
      const dx = p.x - n.x, dz = p.z - n.z, d = Math.hypot(dx, dz), m = n.r + r;
      if (d < m && d > 1e-4){ p.x = n.x + dx / d * m; p.z = n.z + dz / d * m; }
    }
    for (const b of this.buildings){
      const def = BUILDINGS[b.type];
      if (!def.solid) continue;
      const pl = PLINTH[b.type];
      if (!pl || pl[0] === 'c'){
        const m = (pl ? pl[1] : def.r * 0.8) + r;
        const dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
        if (d < m && d > 1e-4){ p.x = b.x + dx / d * m; p.z = b.z + dz / d * m; }
        continue;
      }
      // Box collider in the building's own frame.
      const c = Math.cos(b.rot), s = Math.sin(b.rot);
      const wx = p.x - b.x, wz = p.z - b.z;
      let lx = wx * c - wz * s, lz = wx * s + wz * c - pl[3];
      const hx = pl[1] / 2 + r, hz = pl[2] / 2 + r;
      if (Math.abs(lx) < hx && Math.abs(lz) < hz){
        const px = hx - Math.abs(lx), pz = hz - Math.abs(lz);
        if (px < pz) lx = Math.sign(lx || 1) * hx; else lz = Math.sign(lz || 1) * hz;
        lz += pl[3];
        p.x = b.x + lx * c + lz * s;
        p.z = b.z - lx * s + lz * c;
      }
    }
  }

  /** The nearest thing you could use from where you stand, or null. */
  nearest(p, facing){
    let best = null, bestScore = Infinity;
    const consider = (kind, ref, x, z, reach) => {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d > reach) return;
      // Prefer what you are facing.
      const ang = Math.atan2(x - p.x, z - p.z);
      let da = Math.abs(ang - facing); if (da > Math.PI) da = Math.PI * 2 - da;
      const score = d + da * 0.8;
      if (score < bestScore){ bestScore = score; best = { kind, ref, d }; }
    };
    for (const n of this.nodes){
      if (n.hp <= 0) continue;
      if (n.type === 'fish') consider('node', n, n.x, n.z, 5.2);
      else consider('node', n, n.x, n.z, n.r + 1.7);
    }
    for (const b of this.buildings){
      const reach = BUILDINGS[b.type].r + 1.9;
      consider('building', b, b.x, b.z, reach);
    }
    return best;
  }

  update(dt, t, night, focus){
    this.clock += dt;
    this._updateNodes(dt, t);

    MAT.window.emissiveIntensity = night * 1.5;
    MAT.stained.emissiveIntensity = night * 1.2;

    this._smokeT += dt;
    const puff = this._smokeT > 0.22;
    if (puff) this._smokeT = 0;

    const sources = [];
    for (const b of this.buildings){
      const m = b.model;
      if (b.progress >= 1){
        m.tick?.(t);
        if (m.flags) for (const f of m.flags) f.userData.wave(t + b.id);
        const near = (b.x - focus.x) ** 2 + (b.z - focus.z) ** 2 < 90 * 90;
        for (const e of b.emitters){
          if (!near) break;
          if (e.kind === 'spark'){ if (Math.random() < dt * 5) this.fx.spark(e.p.x, e.p.y, e.p.z); }
          else if (puff) this.fx.smoke(e.p.x, e.p.y, e.p.z, e.kind === 'smokeDark');
        }
        for (const lp of b.lightsAt) sources.push({ p: lp, b, d: lp.distanceToSquared(focus) });
      }
      if (b.type === 'farm' && b.progress >= 1 && b.growth < 1){
        b.growth = Math.min(1, b.growth + dt / (this.has('well') ? FARM.growWell : FARM.grow));
        m.setGrowth(b.growth);
      }
    }

    sources.sort((a, b) => a.d - b.d);
    for (let i = 0; i < LIGHTS; i++){
      const l = this.lightPool[i], s = sources[i];
      if (!s){ l.intensity = 0; continue; }
      l.position.copy(s.p);
      const big = s.b.type === 'watchtower' || s.b.type === 'castle';
      l.distance = big ? 26 : 14;
      l.intensity = (0.4 + night * 3.6) * (big ? 1.6 : 1) * (0.88 + Math.sin(t * 17 + i) * 0.06 + Math.sin(t * 7.3 + i * 2) * 0.06);
    }
  }

  serialize(){
    return {
      buildings: this.buildings.map((b) => ({ id: b.id, type: b.type, x: b.x, z: b.z, rot: b.rot, y: b.y, min: b.min, variant: b.variant, progress: b.progress, growth: b.growth })),
      nodes: this.nodes.filter((n) => !n.removed && n.hp < NODES[n.type].hp).map((n) => [n.id, n.hp, Math.max(0, n.spentUntil - this.clock)]),
    };
  }

  restore(data){
    for (const s of data.buildings ?? []){
      if (!BUILDINGS[s.type]) continue;
      const b = this.place(s.type, s.x, s.z, s.rot, s);
      if (b.progress >= 1 && b.clip) this._finish(b);
    }
    for (const [id, hp, left] of data.nodes ?? []){
      const n = this.nodes[id];
      if (!n || n.removed) continue;
      n.hp = hp;
      if (hp <= 0){
        n.spentUntil = this.clock + left;
        const u = n.obj.userData;
        u.top.visible = false;
        if (u.stump) u.stump.visible = true;
      }
    }
  }
}
