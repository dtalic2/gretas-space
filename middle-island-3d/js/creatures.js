// ---------- Wolves at night, sheep in the meadow, settlers in the village ----------
import * as THREE from 'three';
import { height, MEADOW } from './terrain.js';
import { makeWolf, makeSheep, makePerson } from './models.js';
import { WOLF, BUILDINGS } from './econ.js';

const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

/** Turn toward `want` and step along the ground, refusing to walk into the sea. */
function stepTo(o, want, speed, dt, world, r = 0.5){
  const p = o.root.position;
  let d = angDiff(want, o.root.rotation.y);
  o.root.rotation.y += d * Math.min(1, dt * 8);
  const nx = p.x + Math.sin(o.root.rotation.y) * speed * dt;
  const nz = p.z + Math.cos(o.root.rotation.y) * speed * dt;
  if (height(nx, nz) < 0.35) return false;
  p.x = nx; p.z = nz;
  world.collide(p, r);
  p.y += (height(p.x, p.z) - p.y) * Math.min(1, dt * 12);
  return true;
}

function legSwing(legs, phase, amt, quad = false){
  legs.forEach((l, i) => {
    const s = quad ? (i === 0 || i === 3 ? 1 : -1) : (i === 0 ? 1 : -1);
    l.rotation.x = Math.sin(phase) * amt * s;
  });
}

// ------------------------------------------------------------ wolves
export class Wolves {
  constructor(scene, world, fx, audio){
    this.scene = scene; this.world = world; this.fx = fx; this.audio = audio;
    this.list = [];
    this.spawnT = 3;
    this.chasedOff = 0;
  }

  get count(){ return this.list.filter((w) => w.mode !== 'leave').length; }

  _spawn(player, day){
    const p = player.position;
    for (let tries = 0; tries < 30; tries++){
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 14;
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (height(x, z) < 1.2 || Math.hypot(x, z) > 60) continue;
      if (this.world.litAt(x, z)) continue;
      const m = makeWolf();
      m.root.position.set(x, height(x, z), z);
      m.root.rotation.y = Math.atan2(p.x - x, p.z - z);
      this.scene.add(m.root);
      this.list.push({ ...m, mode: 'prowl', hp: WOLF.hits, biteT: 0, phase: 0, target: null, fleeT: 0, hurtT: 0, life: 0 });
      if (Math.random() < 0.6) this.audio.howl();
      return;
    }
  }

  /** A sword swing from `p` facing `facing`. Returns how many wolves it hit. */
  strike(p, facing, damage){
    let hit = 0;
    for (const w of this.list){
      if (w.mode === 'leave') continue;
      const wp = w.root.position;
      const d = Math.hypot(wp.x - p.x, wp.z - p.z);
      if (d > 2.6) continue;
      const a = Math.atan2(wp.x - p.x, wp.z - p.z);
      if (Math.abs(angDiff(a, facing)) > 1.3) continue;
      w.hp -= damage;
      w.hurtT = 0.3;
      wp.x += Math.sin(a) * 1.2; wp.z += Math.cos(a) * 1.2;
      this.fx.burst(wp.clone().setY(wp.y + 0.9), 12, 0xdddddd, { up: 2.5, spread: 1.5, size: 0.2 });
      hit++;
      if (w.hp <= 0){ w.mode = 'leave'; w.fleeT = 0; this.chasedOff++; this.audio.yelp(); }
      else { w.mode = 'flee'; w.fleeT = 1.2; this.audio.yelp(); }
    }
    return hit;
  }

  /** Returns how much the player got bitten this frame. */
  update(dt, t, night, player, day){
    let damage = 0;
    const want = night > 0.6 ? Math.min(WOLF.max, 1 + Math.floor(day / 2)) : 0;
    this.spawnT -= dt;
    if (this.count < want && this.spawnT <= 0){ this._spawn(player, day); this.spawnT = 9 + Math.random() * 8; }

    const pp = player.position;
    const safe = this.world.litAt(pp.x, pp.z) || player.sleeping;

    for (const w of this.list){
      const p = w.root.position;
      w.life += dt;
      const dx = pp.x - p.x, dz = pp.z - p.z;
      const d = Math.hypot(dx, dz);
      const toPlayer = Math.atan2(dx, dz);
      if (night < 0.35 && w.mode !== 'leave'){ w.mode = 'leave'; }
      const lit = this.world.litAt(p.x, p.z);
      if (lit && w.mode !== 'leave'){ w.mode = 'flee'; w.fleeT = 1.5; w.from = lit; }

      let speed = 0;
      if (w.mode === 'leave'){
        speed = WOLF.speed * 1.2;
        stepTo(w, toPlayer + Math.PI, speed, dt, this.world);
        if (d > 50 || w.life > 200){ w.gone = true; }
        w.fade = (w.fade ?? 0) + dt;
        if (w.fade > 6){ w.gone = true; }
      } else if (w.mode === 'flee'){
        speed = WOLF.speed * 1.1;
        const from = w.from ? Math.atan2(p.x - w.from.x, p.z - w.from.z) : toPlayer + Math.PI;
        stepTo(w, from, speed, dt, this.world);
        w.fleeT -= dt;
        if (w.fleeT <= 0){ w.mode = 'prowl'; w.from = null; }
      } else if (d < WOLF.sense && !safe){
        w.mode = 'chase';
        if (d > 1.3){ speed = WOLF.speed; stepTo(w, toPlayer, speed, dt, this.world); }
        else {
          w.root.rotation.y += angDiff(toPlayer, w.root.rotation.y) * Math.min(1, dt * 10);
          w.biteT -= dt;
          if (w.biteT <= 0){
            w.biteT = WOLF.biteEvery; damage += WOLF.bite; this.audio.growl(); w.lunge = 0.25;
            // Hit and run: back off for a moment before coming in again.
            w.mode = 'flee'; w.fleeT = 1.4 + Math.random(); w.from = { x: pp.x, z: pp.z };
          }
        }
      } else {
        w.mode = 'prowl';
        if (!w.target || Math.hypot(w.target.x - p.x, w.target.z - p.z) < 1.5 || Math.random() < dt * 0.1){
          // Close in on the player bit by bit, or circle at a wary distance
          // while they stand in the light.
          const a = Math.random() * Math.PI * 2, r = safe ? 18 + Math.random() * 6 : 5 + Math.random() * 8;
          w.target = { x: pp.x + Math.cos(a) * r, z: pp.z + Math.sin(a) * r };
        }
        speed = WOLF.speed * 0.45;
        if (!stepTo(w, Math.atan2(w.target.x - p.x, w.target.z - p.z), speed, dt, this.world)) w.target = null;
      }

      w.phase += dt * speed * 2.4;
      legSwing(w.legs, w.phase, speed > 0.1 ? 0.7 : 0, true);
      w.tail.rotation.y = Math.sin(t * (w.mode === 'chase' ? 14 : 4)) * 0.4;
      w.lunge = Math.max(0, (w.lunge ?? 0) - dt);
      w.head.position.z = 0.75 + w.lunge * 1.2;
      w.root.position.y += Math.abs(Math.sin(w.phase)) * 0.05;
      w.root.rotation.z = w.hurtT > 0 ? Math.sin(t * 40) * 0.2 : 0;
      w.hurtT = Math.max(0, w.hurtT - dt);
    }
    for (const w of this.list.filter((q) => q.gone)) this.scene.remove(w.root);
    this.list = this.list.filter((q) => !q.gone);
    return damage;
  }

  nearestDist(p){
    let best = Infinity;
    for (const w of this.list) if (w.mode !== 'leave') best = Math.min(best, w.root.position.distanceTo(p));
    return best;
  }
}

// ------------------------------------------------------------ sheep
export class Flock {
  constructor(scene, world){
    this.world = world;
    this.list = [];
    for (let i = 0; i < 6; i++){
      const m = makeSheep();
      const a = i * 1.1, r = 6 + i * 1.5;
      const x = MEADOW.x + Math.cos(a) * r - 10, z = MEADOW.z + Math.sin(a) * r + 6;
      m.root.position.set(x, height(x, z), z);
      m.root.rotation.y = a;
      scene.add(m.root);
      this.list.push({ ...m, target: null, wait: Math.random() * 4, phase: 0, graze: 0 });
    }
  }

  update(dt, t){
    for (const s of this.list){
      const p = s.root.position;
      let speed = 0;
      if (s.wait > 0){
        s.wait -= dt;
        s.graze += dt;
        s.head.rotation.x = 0.6 + Math.sin(s.graze * 3) * 0.08;
      } else {
        if (!s.target){
          const a = Math.random() * Math.PI * 2, r = Math.random() * 16;
          s.target = { x: MEADOW.x - 8 + Math.cos(a) * r, z: MEADOW.z + 8 + Math.sin(a) * r };
        }
        speed = 1.3;
        s.head.rotation.x = 0;
        const ok = stepTo(s, Math.atan2(s.target.x - p.x, s.target.z - p.z), speed, dt, this.world, 0.55);
        if (!ok || Math.hypot(s.target.x - p.x, s.target.z - p.z) < 0.8){ s.target = null; s.wait = 3 + Math.random() * 6; }
      }
      s.phase += dt * speed * 5;
      legSwing(s.legs, s.phase, speed > 0 ? 0.5 : 0, true);
    }
  }
}

// ------------------------------------------------------------ settlers
const TUNICS = [0xa8423a, 0x3f7d3a, 0x6a4ea0, 0xc28a2e, 0x2f6aa0, 0x8a5a3a, 0x3a8a86, 0xa0506e];
const HAIR = [0x3a2616, 0x8a5a2a, 0xd8b060, 0x1d1a18, 0xa8401e, 0xcfcfcf];

export class Village {
  constructor(scene, world){
    this.scene = scene; this.world = world;
    this.people = [];
  }

  /** Make sure there is one walking person for every settler. */
  sync(count){
    while (this.people.length < count){
      const i = this.people.length;
      const m = makePerson({
        tunic: TUNICS[i % TUNICS.length], hair: HAIR[(i * 3) % HAIR.length],
        pants: i % 2 ? 0x4a3c30 : 0x5d5040, skin: [0xe3b48a, 0xc98f62, 0x9a6a44, 0xf0c8a0][i % 4],
        hat: i % 3 === 1 ? 0x7a5a2a : null, hood: i % 3 === 2 ? 0x6d5a40 : null,
      });
      const home = this._homes()[i % Math.max(1, this._homes().length)];
      const x = (home?.x ?? MEADOW.x) + (Math.random() - 0.5) * 4, z = (home?.z ?? MEADOW.z) + 3 + Math.random() * 2;
      m.root.position.set(x, height(x, z), z);
      m.root.scale.setScalar(0.94 + Math.random() * 0.1);
      this.scene.add(m.root);
      this.people.push({ ...m, home, target: null, wait: 1 + Math.random() * 3, phase: Math.random() * 6, work: 0 });
    }
  }

  _homes(){
    return this.world.buildings.filter((b) => b.progress >= 1 && BUILDINGS[b.type].settlers);
  }

  _pickTarget(v, night){
    const homes = this._homes();
    if (!v.home || !homes.includes(v.home)) v.home = homes[this.people.indexOf(v) % Math.max(1, homes.length)];
    const h = v.home ?? { x: MEADOW.x, z: MEADOW.z };
    if (night){
      // Head indoors: stand at the front door, then disappear inside.
      const r = BUILDINGS[h.type]?.r ?? 2;
      return { x: h.x + Math.sin(h.rot ?? 0) * (r + 0.6), z: h.z + Math.cos(h.rot ?? 0) * (r + 0.6), indoors: true };
    }
    // By day: go and work at something nearby, or potter about the village.
    const jobs = [];
    for (const n of this.world.nodes){
      if (n.type === 'fish' || n.hp <= 0) continue;
      const d = Math.hypot(n.x - h.x, n.z - h.z);
      if (d < 26) jobs.push(n);
    }
    for (const b of this.world.buildings) if (b.type === 'farm' || b.progress < 1) jobs.push(b);
    if (jobs.length && Math.random() < 0.7){
      const j = jobs[Math.floor(Math.random() * jobs.length)];
      const r = (j.r ?? BUILDINGS[j.type]?.r ?? 1) + 0.7;
      const a = Math.random() * Math.PI * 2;
      return { x: j.x + Math.cos(a) * r, z: j.z + Math.sin(a) * r, work: true, face: { x: j.x, z: j.z } };
    }
    const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 10;
    return { x: h.x + Math.cos(a) * r, z: h.z + Math.sin(a) * r };
  }

  update(dt, t, night){
    const dark = night > 0.6;
    for (const v of this.people){
      const p = v.root.position;
      if (dark !== v.dark){ v.dark = dark; v.target = null; v.wait = Math.random() * 2; if (!dark) v.root.visible = true; }
      let speed = 0;
      if (v.wait > 0){
        v.wait -= dt;
        if (v.work > 0){
          v.work -= dt;
          v.phase += dt * 9;
          const sw = Math.max(0, Math.sin(v.phase));
          v.arms[1].rotation.x = -1.4 - sw * 1.0;
          v.arms[0].rotation.x = -0.4;
        } else {
          v.arms[0].rotation.x *= 0.9; v.arms[1].rotation.x *= 0.9;
        }
        legSwing(v.legs, 0, 0);
      } else {
        if (!v.target) v.target = this._pickTarget(v, dark);
        speed = 2.4;
        const ok = stepTo(v, Math.atan2(v.target.x - p.x, v.target.z - p.z), speed, dt, this.world, 0.35);
        if (!ok || Math.hypot(v.target.x - p.x, v.target.z - p.z) < 0.6){
          if (v.target.indoors) v.root.visible = false;
          if (v.target.work){
            v.work = 4 + Math.random() * 4;
            if (v.target.face) v.root.rotation.y = Math.atan2(v.target.face.x - p.x, v.target.face.z - p.z);
          }
          v.wait = v.target.indoors ? 999 : (v.work > 0 ? v.work : 1 + Math.random() * 4);
          v.target = null;
        }
        v.phase += dt * 10;
        legSwing(v.legs, v.phase, 0.6);
        v.arms[0].rotation.x = -Math.sin(v.phase) * 0.5;
        v.arms[1].rotation.x = Math.sin(v.phase) * 0.5;
      }
      if (!dark && v.wait > 100) v.wait = 0;
    }
  }
}
