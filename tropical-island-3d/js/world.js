// ---------- What is on the island: places, plants and things to pick up ----------
import * as THREE from 'three';
import { height, slope, rng, noise, shoreFrom, smooth, LAGOON, HILL, REEF, SEA } from './terrain.js';
import {
  makePalm, makeMangoTree, makeBanana, makeFlowers, makeRock, makeCoral, makeSeaweed, makeShell,
  makeDock, makeHut, makeShack, makeHammock, makeTorch, makeUmbrella, makeCanoe, makePerson, makeFish, MAT,
} from './models.js';
import { REGROW, ITEMS, FISH } from './econ.js';

const LIGHTS = 6;

/** How much of the lagoon a point is in: 1 inside, 0 outside. */
export function inLagoon(x, z){ return smooth(LAGOON.r + 2, LAGOON.r - 4, Math.hypot(x - LAGOON.x, z - LAGOON.z)); }

export class World {
  constructor(scene, fx, audio){
    this.scene = scene; this.fx = fx; this.audio = audio;
    this.nodes = [];         // things you can pick
    this.solids = [];        // circles you bump into: { x, z, r }
    this.boxes = [];         // boxes you bump into: { x, z, hx, hz }
    this.places = [];        // things you use: { kind, x, z, r, ... }
    this.torches = [];
    this.clock = 0;

    this._layout();
    this._scatter();
    this._schools();

    this.lightPool = [];
    for (let i = 0; i < LIGHTS; i++){
      const l = new THREE.PointLight(0xffa04a, 0, 14, 1.6);
      scene.add(l);
      this.lightPool.push(l);
    }
  }

  _add(obj, x, z, y = null, rot = 0){
    obj.position.set(x, y ?? height(x, z), z);
    obj.rotation.y = rot;
    this.scene.add(obj);
    return obj;
  }

  // ------------------------------------------------------------ the fixed places
  _layout(){
    // The dock runs south from the lagoon's north beach, out over the water.
    const ds = shoreFrom(-5, 10, 0, 1, 0.25);
    this.dock = { x: ds.x, z: ds.z - 2, len: 16, w: 2.2, deck: 0.85 };
    this._add(makeDock(this.dock.len), this.dock.x, this.dock.z, 0);
    this.places.push({ kind: 'dockEnd', x: this.dock.x, z: this.dock.z + this.dock.len - 1, r: 2.2 });

    // Your hut, up the beach to the east of the dock, porch facing the lagoon.
    const hs = shoreFrom(15, 4, 0.1, 1, 0.9);
    this.hut = { x: hs.x, z: hs.z - 5 };
    const hut = makeHut();
    this._add(hut.group, this.hut.x, this.hut.z);
    this.boxes.push({ x: this.hut.x, z: this.hut.z + 0.7, hx: 2.5, hz: 3.4, top: height(this.hut.x, this.hut.z) + 6.5 });
    this.places.push({ kind: 'hut', x: this.hut.x, z: this.hut.z + 4.6, r: 2.0 });
    // Pip's perch and your front door: the first dry spots beside the hut.
    const dry = (cands) => cands.map(([dx, dz]) => ({ x: this.hut.x + dx, z: this.hut.z + dz })).find((q) => height(q.x, q.z) > 0.9) ?? { x: this.hut.x - 4, z: this.hut.z - 3 };
    this.perch = dry([[-3.8, 3.2], [-4, 1], [-4, -1.5], [4, 1], [4, -1.5], [0, -4.5]]);
    this.home = dry([[0, 6.5], [-1.5, 6], [-3, 5], [-3.5, 3], [3.5, 3], [-4, 0]]);
    const perch = new THREE.Group();
    perch.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.7, 6), MAT.bambooDark));
    perch.children[0].position.y = 0.85;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 5), MAT.bambooDark);
    bar.rotation.z = Math.PI / 2; bar.position.y = 1.7;
    perch.add(bar);
    this._add(perch, this.perch.x, this.perch.z);
    this.perch.y = height(this.perch.x, this.perch.z) + 1.75;

    // Kai's Tiki Shack, on the beach to the west.
    const ss = shoreFrom(-20, 4, -0.15, 1, 0.9);
    this.shack = { x: ss.x, z: ss.z - 4.5 };
    this._add(makeShack(), this.shack.x, this.shack.z);
    this.boxes.push({ x: this.shack.x, z: this.shack.z - 0.1, hx: 2.4, hz: 1.9, top: height(this.shack.x, this.shack.z) + 4 });
    const kai = makePerson({ shirt: 0x2ab0d0, shirt2: 0xffffff, shorts: 0xe0442a, skin: 0x9a6a44, hair: 0x1d1a18, hat: true, lei: true });
    this._add(kai.root, this.shack.x, this.shack.z + 0.4);
    this.kai = kai;
    this.places.push({ kind: 'shop', x: this.shack.x, z: this.shack.z + 2.4, r: 2.3 });

    // A hammock between the hut and the dock.
    this.hammock = { x: (this.hut.x + this.dock.x) / 2 + 1, z: this.hut.z + 1 };
    this._add(makeHammock(), this.hammock.x, this.hammock.z, null, 0.2);
    this.solids.push({ x: this.hammock.x - 1.8, z: this.hammock.z, r: 0.3 }, { x: this.hammock.x + 1.8, z: this.hammock.z, r: 0.3 });
    this.places.push({ kind: 'hammock', x: this.hammock.x, z: this.hammock.z + 0.9, r: 2.0 });

    // Umbrellas, a canoe and tiki torches.
    for (const [dx, dz, rot] of [[-9, 2, 0.3], [9, 1, -0.4]]){
      const p = shoreFrom(this.dock.x + dx, this.dock.z - 6, 0, 1, 0.6);
      this._add(makeUmbrella(), p.x, p.z - 1.5, null, rot);
    }
    const cp = shoreFrom(this.shack.x + 6, this.shack.z, 0, 1, 0.4);
    this._add(makeCanoe(), cp.x, cp.z - 1, null, 0.8);
    this.solids.push({ x: cp.x, z: cp.z - 1, r: 1.0 });
    for (const [x, z] of [
      [this.hut.x - 2.8, this.hut.z + 5.5], [this.hut.x + 2.8, this.hut.z + 5.5],
      [this.shack.x - 3, this.shack.z + 3], [this.shack.x + 3, this.shack.z + 3],
      [this.dock.x - 1.6, this.dock.z - 0.5], [this.dock.x + 1.6, this.dock.z - 0.5],
    ]){
      const t = makeTorch();
      this._add(t, x, z);
      this.torches.push({ obj: t, at: t.localToWorld(t.userData.lightAt.clone()) });
      this.solids.push({ x, z, r: 0.2 });
    }
  }

  _clear(x, z, gap){
    for (const n of this.nodes) if ((n.x - x) ** 2 + (n.z - z) ** 2 < gap * gap) return false;
    for (const s of this.solids) if ((s.x - x) ** 2 + (s.z - z) ** 2 < (gap + s.r) ** 2) return false;
    for (const b of this.boxes) if (Math.abs(b.x - x) < b.hx + gap && Math.abs(b.z - z) < b.hz + gap) return false;
    for (const p of this.places) if ((p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + 1) ** 2) return false;
    const d = this.dock;
    if (Math.abs(x - d.x) < 2.5 && z > d.z - 3 && z < d.z + d.len + 1) return false;
    return true;
  }

  _node(type, x, z, obj, { solid = 0, y = null } = {}){
    this._add(obj, x, z, y, (x * 7.3 + z * 3.1) % 6.28);
    const n = { type, x, z, obj, ready: true, regrowAt: 0, solid };
    this.nodes.push(n);
    if (solid) this.solids.push({ x, z, r: solid, node: n });
    return n;
  }

  // ------------------------------------------------------------ plants, shells, coral
  _scatter(){
    const r = rng(771);
    const tries = (n, fn) => { for (let i = 0; i < n; i++) fn(); };

    // Palms line the beaches; some carry coconuts you can knock down.
    let palms = 0;
    tries(3000, () => {
      if (palms > 80) return;
      const a = r() * Math.PI * 2, d = 20 + r() * 40;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const h = height(x, z);
      if (h < 0.7 || h > 5 || !this._clear(x, z, 3)) return;
      const nuts = r() < 0.45;
      const palm = makePalm(r, nuts);
      // Lean them out toward the sea, the way palms grow.
      this._node(nuts ? 'coconut' : 'palm', x, z, palm, { solid: 0.35 });
      palm.rotation.y = -Math.atan2(z, x);
      this.nodes.at(-1).ready = nuts;
      palms++;
    });
    // Mango trees on the grass; bananas up in the jungle by the hill.
    let mangos = 0, bananas = 0;
    tries(2000, () => {
      const x = (r() - 0.5) * 70, z = (r() - 0.5) * 70;
      const h = height(x, z);
      if (mangos < 9 && h > 1.9 && h < 5 && slope(x, z) < 0.5 && this._clear(x, z, 4)){ this._node('mango', x, z, makeMangoTree(r), { solid: 0.4 }); mangos++; return; }
      const hd = Math.hypot(x - HILL.x, z - HILL.z);
      if (bananas < 12 && hd < 20 && h > 2.5 && h < 11 && slope(x, z) < 0.8 && this._clear(x, z, 3)){ this._node('banana', x, z, makeBanana(r), { solid: 0.3 }); bananas++; }
    });
    // Flowers and rocks, just to look at.
    tries(600, () => {
      const x = (r() - 0.5) * 90, z = (r() - 0.5) * 90;
      const h = height(x, z);
      if (h > 1.6 && h < 9 && this._clear(x, z, 2.5) && r() < 0.5){
        this._add(makeFlowers(r), x, z);
        this.solids.push({ x, z, r: 0.55 });
      } else if (h > 0.3 && h < 12 && slope(x, z) > 0.5 && this._clear(x, z, 3) && r() < 0.3){
        const rock = makeRock(r);
        this._add(rock, x, z, height(x, z) - 0.2);
        this.solids.push({ x, z, r: 0.9 * rock.userData.scale });
      }
    });

    // Shells on the sand, starfish in the shallows.
    let shells = 0, stars = 0;
    tries(4000, () => {
      const a = r() * Math.PI * 2, d = 25 + r() * 35;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const h = height(x, z);
      if (shells < 22 && h > 0.15 && h < 0.9 && this._clear(x, z, 3)){ this._node('shell', x, z, makeShell(r)); shells++; }
      else if (stars < 8 && h > -0.6 && h < 0.05 && this._clear(x, z, 4)){ this._node('star', x, z, makeShell(r, 'star')); stars++; }
    });
    // Seaweed and oysters on the lagoon floor; coral in the lagoon and out on the reef.
    let weed = 0, pearls = 0, corals = 0;
    tries(3000, () => {
      const a = r() * Math.PI * 2, d = r() * (LAGOON.r - 3);
      const x = LAGOON.x + Math.cos(a) * d, z = LAGOON.z + Math.sin(a) * d;
      const h = height(x, z);
      if (h > -0.6) return;
      if (weed < 16 && this._clear(x, z, 2.5)){ this._node('seaweed', x, z, makeSeaweed(r)); weed++; }
      else if (pearls < 7 && this._clear(x, z, 3)){ this._node('pearl', x, z, makeShell(r, 'pearl')); pearls++; }
      else if (corals < 12 && r() < 0.1 && this._clear(x, z, 3)){ this._add(makeCoral(r), x, z).scale.setScalar(0.7); corals++; }
    });
    tries(160, () => {
      const a = r() * Math.PI * 2, d = REEF + (r() - 0.5) * 6;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (height(x, z) < -0.4) this._add(makeCoral(r), x, z);
      if (pearls < 12 && r() < 0.05 && height(x, z) < -0.5 && this._clear(x, z, 3)){ this._node('pearl', x, z, makeShell(r, 'pearl')); pearls++; }
    });
  }

  /** Little schools of fish circling in the lagoon and out on the reef. */
  _schools(){
    this.schools = [];
    const r = rng(42);
    const spots = [];
    for (let i = 0; i < 4; i++){ const a = r() * 6.28, d = r() * 10; spots.push([LAGOON.x + Math.cos(a) * d, LAGOON.z + Math.sin(a) * d, -1.1]); }
    for (let i = 0; i < 6; i++){ const a = r() * 6.28; spots.push([Math.cos(a) * REEF, Math.sin(a) * REEF, -0.6]); }
    for (const [x, z, y] of spots){
      const def = FISH[Math.floor(r() * 6)];
      const g = new THREE.Group();
      for (let k = 0; k < 7; k++){
        const f = makeFish(def);
        f.scale.multiplyScalar(0.45);
        f.userData.off = [r() * 6.28, (r() - 0.5) * 0.6, 1.5 + r() * 1.5];
        g.add(f);
      }
      g.position.set(x, Math.max(y, height(x, z) + 0.5), z);
      this.scene.add(g);
      this.schools.push({ g, speed: 0.4 + r() * 0.4 });
    }
  }

  // ------------------------------------------------------------ questions the rest of the game asks
  /** A wooden surface to stand on here (the dock), or null. */
  platformAt(x, z){
    const d = this.dock;
    if (Math.abs(x - d.x) < d.w / 2 + 0.1 && z > d.z - 0.2 && z < d.z + d.len) return d.deck;
    return null;
  }

  /** Hide trees standing between the camera and you, so they never block the view. */
  clearView(cam, target){
    const ax = cam.x, az = cam.z, dx = target.x - ax, dz = target.z - az, len2 = dx * dx + dz * dz || 1;
    for (const n of this.nodes){
      if (!['palm', 'coconut', 'mango', 'banana'].includes(n.type)) continue;
      const t = ((n.x - ax) * dx + (n.z - az) * dz) / len2;
      let hide = false;
      if (t > -0.2 && t < 0.95){
        const c = THREE.MathUtils.clamp(t, 0, 1);
        const d = Math.hypot(n.x - (ax + dx * c), n.z - (az + dz * c));
        const y = cam.y + (target.y - cam.y) * c;
        // Palm crowns reach out sideways, so give them a wider berth.
        hide = d < (n.type === 'banana' ? 2.2 : 3.2) && y < height(n.x, n.z) + 7.5;
      }
      n.obj.visible = !hide && !(n.hiddenPick);
    }
  }

  collide(p, r = 0.4){
    for (const s of this.solids){
      if (s.node && s.node.hidden) continue;
      const dx = p.x - s.x, dz = p.z - s.z, dd = Math.hypot(dx, dz), m = s.r + r;
      if (dd < m && dd > 1e-4){ p.x = s.x + dx / dd * m; p.z = s.z + dz / dd * m; }
    }
    for (const b of this.boxes){
      const lx = p.x - b.x, lz = p.z - b.z, hx = b.hx + r, hz = b.hz + r;
      if (Math.abs(lx) < hx && Math.abs(lz) < hz){
        if (hx - Math.abs(lx) < hz - Math.abs(lz)) p.x = b.x + Math.sign(lx || 1) * hx;
        else p.z = b.z + Math.sign(lz || 1) * hz;
      }
    }
  }

  /** Pick something up. Returns the item key, or null. */
  pick(n){
    if (!n.ready) return null;
    n.ready = false;
    n.regrowAt = this.clock + REGROW[n.type];
    const u = n.obj.userData;
    if (u.fruit) u.fruit.visible = false;
    else n.obj.visible = false;
    const at = new THREE.Vector3(n.x, height(n.x, n.z) + (n.type === 'coconut' ? 4 : 1), n.z);
    const col = { coconut: 0x8a6a3a, mango: 0xff9a2a, banana: 0xf4d64a, shell: 0xffffff, star: 0xff8a2a, seaweed: 0x3fae4a, pearl: 0xffffff }[n.type];
    this.fx.burst(at, 14, col, { up: 3, spread: 1.4, size: 0.18, life: 0.7 });
    return n.type;
  }

  /** The nearest thing you could pick or use. */
  nearest(p, facing, swimming){
    let best = null, bestScore = Infinity;
    const consider = (kind, ref, x, z, reach) => {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d > reach) return;
      const ang = Math.atan2(x - p.x, z - p.z);
      let da = Math.abs(ang - facing); if (da > Math.PI) da = Math.PI * 2 - da;
      const score = d + da * 0.7;
      if (score < bestScore){ bestScore = score; best = { kind, ref, d, score }; }
    };
    for (const n of this.nodes){
      if (!n.ready || n.type === 'palm') continue;
      const underwater = n.type === 'seaweed' || n.type === 'pearl';
      // Seaweed and oysters are only in reach once you are out in the water.
      if (underwater && height(p.x, p.z) > -0.5) continue;
      consider('node', n, n.x, n.z, n.type === 'coconut' ? 2.2 : underwater ? 2.4 : 1.8);
    }
    if (!swimming) for (const pl of this.places) if (pl.kind !== 'dockEnd') consider('place', pl, pl.x, pl.z, pl.r);
    return best;
  }

  update(dt, t, night, focus){
    this.clock += dt;
    for (const n of this.nodes){
      const u = n.obj.userData;
      if (!n.ready && n.type !== 'palm' && this.clock >= n.regrowAt){
        n.ready = true;
        if (u.fruit) u.fruit.visible = true; else n.obj.visible = true;
      }
      if (n.type === 'seaweed') u.top.rotation.z = Math.sin(t * 1.3 + u.sway) * 0.12;
      if (n.type === 'coconut' || n.type === 'palm') u.top.rotation.z = Math.sin(t * 0.8 + n.x) * 0.02;
      if (n.type === 'pearl' && n.ready && Math.random() < dt * 0.6) this.fx.emit({ x: n.x, y: height(n.x, n.z) + 0.3, z: n.z, vy: 0.8, life: 1.5, color: 0xffffff, size: 0.12, alpha: 0.7 });
    }
    for (const s of this.schools){
      s.g.children.forEach((f, i) => {
        const [ph, dy, rr] = f.userData.off;
        const a = t * s.speed + ph;
        f.position.set(Math.cos(a) * rr, dy + Math.sin(t * 2 + ph) * 0.1, Math.sin(a) * rr);
        f.rotation.y = -a;
      });
    }
    // Kai looks around behind the counter.
    this.kai.head.rotation.y = Math.sin(t * 0.5) * 0.5;
    this.kai.arms[0].rotation.z = Math.max(0, Math.sin(t * 0.7)) * -0.5;

    MAT.window.emissiveIntensity = night * 1.5;
    for (const tc of this.torches) tc.obj.userData.flame.userData.flick(t, tc.at.x);
    const sources = this.torches.map((tc) => ({ p: tc.at, d: tc.at.distanceToSquared(focus) })).sort((a, b) => a.d - b.d);
    this.lightPool.forEach((l, i) => {
      const s = sources[i];
      if (!s){ l.intensity = 0; return; }
      l.position.copy(s.p);
      l.intensity = (0.2 + night * 3.2) * (0.9 + Math.sin(t * 17 + i) * 0.08);
      if (night > 0.2 && Math.random() < dt * 4) this.fx.spark(s.p.x, s.p.y - 0.2, s.p.z);
    });
  }
}
