// ---------- Your animal friends ----------
//
// Each animal has a home it hangs around, a favourite food, and something it
// does once you are best friends: the dog follows you from the start, the
// parrot rides on your shoulder, the monkey tags along, the turtle lets you
// ride it, the crab scuttles after you and the dolphin swims beside you.
import * as THREE from 'three';
import { height, LAGOON, SEA } from './terrain.js';
import { makeDog, makeParrot, makeMonkey, makeTurtle, makeCrab, makeDolphin, makeGull } from './models.js';
import { ANIMALS } from './econ.js';

const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

/** Turn toward `want` and move. `medium` is 'land', 'water' or 'any'. */
function step(o, want, speed, dt, world, medium = 'land', r = 0.4){
  const p = o.root.position;
  o.root.rotation.y += angDiff(want, o.root.rotation.y) * Math.min(1, dt * 7);
  const nx = p.x + Math.sin(o.root.rotation.y) * speed * dt;
  const nz = p.z + Math.cos(o.root.rotation.y) * speed * dt;
  const h = height(nx, nz);
  if (medium === 'land' && h < 0.1 && !world.platformAt(nx, nz)) return false;
  if (medium === 'water' && h > -0.7) return false;
  p.x = nx; p.z = nz;
  if (medium !== 'water') world.collide(p, r);
  return true;
}

const PARROT_TALK = ['Squawk! Pretty fish!', 'Mango? Mango!', 'Pip loves you!', 'Look, a shell! Squawk!', 'Hello, hello!', 'Kai has a snorkel! Squawk!'];

export class Animals {
  constructor(scene, world, fx, audio){
    this.scene = scene; this.world = world; this.fx = fx; this.audio = audio;
    this.list = {};
    const add = (key, m, x, z, extra = {}) => {
      m.root.position.set(x, Math.max(height(x, z), SEA), z);
      scene.add(m.root);
      this.list[key] = { key, ...m, home: { x, z }, target: null, wait: 0, phase: Math.random() * 6, dance: 0, ...extra };
    };
    const h = world.hut, sh = world.shack;
    add('dog', makeDog(), world.home.x + 1, world.home.z);
    add('parrot', makeParrot(), world.perch.x, world.perch.z, { mode: 'perch' });
    // The monkey lives among the bananas.
    const ban = world.nodes.find((n) => n.type === 'banana') ?? { x: -6, z: -8 };
    add('monkey', makeMonkey(), ban.x + 1.5, ban.z + 1.5);
    add('turtle', makeTurtle(), LAGOON.x + 8, LAGOON.z, { ang: 0 });
    add('crab', makeCrab(), sh.x + 5, sh.z + 4);
    // The dolphin plays out past the mouth of the lagoon.
    const bay = { x: LAGOON.x, z: LAGOON.z + LAGOON.r + 16 };
    add('dolphin', makeDolphin(), bay.x + 10, bay.z, { ang: 0, bay, jump: 0 });

    // Seagulls, just for the sky.
    this.gulls = [];
    for (let i = 0; i < 5; i++){
      const g = makeGull();
      scene.add(g.root);
      this.gulls.push({ ...g, a: i * 1.3, r: 20 + i * 8, y: 10 + i * 2, s: 0.25 + i * 0.05 });
    }
  }

  get(key){ return this.list[key]; }

  /** The friend closest to you that you could talk to. */
  /** The friend you are nearest to and facing, with a score to compare against other things. */
  nearest(p, facing){
    let best = null, bs = Infinity;
    for (const a of Object.values(this.list)){
      if (a.key === 'parrot' && a.mode === 'shoulder') continue;
      const reach = a.key === 'turtle' || a.key === 'dolphin' ? 3.6 : 2.4;
      const q = a.root.position;
      const d = Math.hypot(q.x - p.x, q.z - p.z) + Math.max(0, Math.abs(q.y - p.y) - 1.5);
      if (d > reach) continue;
      let da = Math.abs(Math.atan2(q.x - p.x, q.z - p.z) - facing); if (da > Math.PI) da = Math.PI * 2 - da;
      const score = d + da * 0.7 + (a.key === 'dog' ? 2 : 0);
      if (score < bs){ bs = score; best = { a, score }; }
    }
    return best;
  }

  /** Hearts and a sound. */
  love(a){
    const p = a.root.position;
    this.fx.burst(new THREE.Vector3(p.x, p.y + 1.2, p.z), 16, 0xff5a8a, { up: 3, spread: 1, size: 0.25, life: 1, gravity: 1 });
    ({ dog: () => this.audio.bark(), parrot: () => this.audio.squawk(), monkey: () => this.audio.ooh(), crab: () => this.audio.click(),
      turtle: () => this.audio.heart(), dolphin: () => this.audio.dolphin() })[a.key]();
    a.dance = 1.2;
  }

  parrotTalk(){ return PARROT_TALK[Math.floor(Math.random() * PARROT_TALK.length)]; }

  /** Everyone within earshot of the ukulele dances. */
  dance(p, seconds){
    let n = 0;
    for (const a of Object.values(this.list)) if (a.root.position.distanceTo(p) < 14){ a.dance = seconds; n++; }
    return n;
  }

  update(dt, t, player, friends, night){
    const pp = player.position;
    const best = (k) => (friends[k]?.hearts ?? 0) >= ANIMALS[k].hearts;
    const W = this.world;

    // ---- Coco the dog: always at your heels, swimming too.
    {
      const a = this.list.dog, p = a.root.position;
      const behind = { x: pp.x - Math.sin(player.facing) * 1.8 + 0.8, z: pp.z - Math.cos(player.facing) * 1.8 };
      const d = Math.hypot(behind.x - p.x, behind.z - p.z);
      let speed = 0;
      if (d > 1.2){ speed = d > 6 ? 8.5 : d > 3 ? 6 : 3; step(a, Math.atan2(behind.x - p.x, behind.z - p.z), speed, dt, W, 'any', 0.35); }
      else a.root.rotation.y += angDiff(Math.atan2(pp.x - p.x, pp.z - p.z), a.root.rotation.y) * dt * 4;
      if (d > 30){ p.x = pp.x - 2; p.z = pp.z - 2; }                // never gets lost
      this._walk(a, dt, speed, t);
      a.tail.rotation.y = Math.sin(t * (speed ? 10 : 16)) * 0.6;
      this._float(a, dt, 0.55);
    }

    // ---- Pip the parrot: on its perch, out flying, or on your shoulder.
    {
      const a = this.list.parrot, p = a.root.position;
      if (best('parrot') && a.mode !== 'shoulder' && a.mode !== 'toShoulder') a.mode = 'toShoulder';
      if (a.mode === 'perch'){
        p.set(W.perch.x, W.perch.y, W.perch.z);
        a.wings.forEach((w) => { w.rotation.z *= 0.8; });
        a.head.rotation.y = Math.sin(t * 1.3) * 0.6;
        a.wait -= dt;
        if (a.wait <= 0){ a.wait = 12 + Math.random() * 16; a.mode = 'fly'; a.flyT = 0; }
      } else if (a.mode === 'fly'){
        a.flyT += dt;
        const ang = a.flyT * 0.9;
        p.set(W.perch.x + Math.cos(ang) * 6 - 6, W.perch.y + 3 + Math.sin(ang * 2) * 1, W.perch.z + Math.sin(ang) * 6);
        a.root.rotation.y = -ang;
        a.wings.forEach((w, i) => { w.rotation.z = Math.sin(t * 18) * 0.9 * (i ? -1 : 1); });
        if (a.flyT > Math.PI * 2 / 0.9){ a.mode = 'perch'; }
      } else {
        // Flying to you, then sitting on your shoulder.
        const sp = player.shoulderWorld();
        if (a.mode === 'toShoulder'){
          p.lerp(sp, Math.min(1, dt * 3));
          a.wings.forEach((w, i) => { w.rotation.z = Math.sin(t * 18) * 0.9 * (i ? -1 : 1); });
          if (p.distanceTo(sp) < 0.15) a.mode = 'shoulder';
        } else {
          p.copy(sp);
          a.root.rotation.y = player.facing;
          a.wings.forEach((w) => { w.rotation.z *= 0.8; });
          a.head.rotation.y = Math.sin(t * 0.9) * 0.8;
        }
      }
      if (a.dance > 0){ a.root.position.y += Math.abs(Math.sin(t * 10)) * 0.15; a.head.rotation.z = Math.sin(t * 10) * 0.4; }
      a.dance = Math.max(0, a.dance - dt);
    }

    // ---- Momo the monkey: hops about the banana grove, or follows a friend.
    {
      const a = this.list.monkey, p = a.root.position;
      let speed = 0;
      if (best('monkey') && !player.swimming){
        const d = pp.distanceTo(p);
        if (d > 2.6){ speed = d > 8 ? 7 : 4.5; step(a, Math.atan2(pp.x - p.x, pp.z - p.z), speed, dt, W); }
        if (d > 40){ p.x = pp.x + 2; p.z = pp.z; }
      } else speed = this._wander(a, dt, 8, 2.2, 'land');
      this._walk(a, dt, speed, t);
      a.arms.forEach((arm, i) => { arm.rotation.x = speed ? Math.sin(a.phase + i * Math.PI) * 0.8 : -0.3; arm.rotation.z = 0; });
      a.tail.rotation.x = Math.sin(t * 2) * 0.2;
      if (a.dance > 0){ a.arms.forEach((arm, i) => { arm.rotation.z = (i ? -1 : 1) * (2.4 + Math.sin(t * 12) * 0.4); }); }
      this._ground(a, dt);
    }

    // ---- Shelly the turtle: paddles round the lagoon; a best friend you can ride.
    {
      const a = this.list.turtle, p = a.root.position;
      if (player.riding === a){
        // You steer; see Player.update. The turtle just carries you.
        p.set(pp.x, SEA - 0.35, pp.z);
        a.root.rotation.y = player.facing;
      } else {
        a.ang += dt * 0.12;
        const tx = LAGOON.x + Math.cos(a.ang) * 9, tz = LAGOON.z + Math.sin(a.ang) * 7;
        if (!step(a, Math.atan2(tx - p.x, tz - p.z), 1.6, dt, W, 'water')){ p.x += (tx - p.x) * dt; p.z += (tz - p.z) * dt; }
        p.y += (SEA - 0.35 + Math.sin(t * 1.2) * 0.05 - p.y) * Math.min(1, dt * 3);
      }
      a.flippers.forEach((f, i) => { f.rotation.y = Math.sin(t * 2.5 + (i % 2) * Math.PI) * 0.5; });
      a.head.rotation.y = Math.sin(t * 0.7) * 0.4;
      if (a.dance > 0) a.root.rotation.z = Math.sin(t * 8) * 0.2; else a.root.rotation.z = 0;
      a.dance = Math.max(0, a.dance - dt);
    }

    // ---- Pinch the crab: scuttles sideways on the sand; shy of running feet.
    {
      const a = this.list.crab, p = a.root.position;
      let speed = 0;
      const d = pp.distanceTo(p);
      if (best('crab') && !player.swimming){
        if (d > 2){ speed = 4; this._sidestep(a, Math.atan2(pp.x - p.x, pp.z - p.z), speed, dt); }
      } else if (player.running && d < 5){
        speed = 5; this._sidestep(a, Math.atan2(p.x - pp.x, p.z - pp.z), speed, dt);
      } else speed = this._wander(a, dt, 7, 1.6, 'land', true);
      a.legs.forEach((l, i) => { l.rotation.y = speed ? Math.sin(t * 25 + i) * 0.4 : 0; });
      a.claws.forEach((c, i) => { c.userData.top.rotation.z = (i ? -1 : 1) * Math.max(0, Math.sin(t * (a.dance > 0 ? 14 : 3) + i)) * 0.5; });
      if (a.dance > 0) a.root.position.y += Math.abs(Math.sin(t * 12)) * 0.1;
      a.dance = Math.max(0, a.dance - dt);
      this._ground(a, dt);
    }

    // ---- Splash the dolphin: loops the bay and leaps; a best friend swims with you.
    {
      const a = this.list.dolphin, p = a.root.position;
      let tx, tz, ty = SEA - 0.3;
      if (best('dolphin') && player.swimming && pp.distanceTo(p) < 60){
        a.ang += dt * 1.2;
        tx = pp.x + Math.cos(a.ang) * 3.5; tz = pp.z + Math.sin(a.ang) * 3.5;
      } else {
        a.ang += dt * 0.35;
        tx = a.bay.x + Math.cos(a.ang) * 12; tz = a.bay.z + Math.sin(a.ang) * 8;
      }
      const dx = tx - p.x, dz = tz - p.z;
      a.root.rotation.y += angDiff(Math.atan2(dx, dz), a.root.rotation.y) * Math.min(1, dt * 3);
      const sp = Math.min(9, Math.hypot(dx, dz) * 1.5 + 3);
      p.x += Math.sin(a.root.rotation.y) * sp * dt; p.z += Math.cos(a.root.rotation.y) * sp * dt;
      // Leap every so often, and whenever it is happy.
      a.jump -= dt;
      if (a.jump < -6 - Math.random() * 6 || (a.dance > 0 && a.jump < -1)) a.jump = 1.2;
      const j = a.jump > 0 ? Math.sin((1 - a.jump / 1.2) * Math.PI) : 0;
      p.y = ty + j * 2.2 - (1 - j) * 0.2;
      a.root.rotation.x = a.jump > 0 ? -Math.cos((1 - a.jump / 1.2) * Math.PI) * 0.7 : 0;
      if (a.jump > 0 && a.jump - dt <= 0) this.fx.burst(new THREE.Vector3(p.x, SEA, p.z), 20, 0xe8fbff, { up: 4, spread: 2, size: 0.25 });
      a.tail.rotation.x = Math.sin(t * 6) * 0.3;
      a.dance = Math.max(0, a.dance - dt);
    }

    for (const g of this.gulls){
      g.a += dt * g.s;
      g.root.position.set(Math.cos(g.a) * g.r, g.y + Math.sin(g.a * 3) * 1.5, Math.sin(g.a) * g.r + 10);
      g.root.rotation.y = -g.a;
      g.wings.forEach((w, i) => { w.rotation.z = Math.sin(t * 5 + g.a) * 0.4 * (i ? -1 : 1); });
      g.root.visible = night < 0.6;
    }
  }

  _wander(a, dt, radius, speed, medium, sideways = false){
    const p = a.root.position;
    if (a.wait > 0){ a.wait -= dt; return 0; }
    if (!a.target){
      const ang = Math.random() * Math.PI * 2, r = Math.random() * radius;
      a.target = { x: a.home.x + Math.cos(ang) * r, z: a.home.z + Math.sin(ang) * r };
    }
    const want = Math.atan2(a.target.x - p.x, a.target.z - p.z);
    const ok = sideways ? this._sidestep(a, want, speed, dt) : step(a, want, speed, dt, this.world, medium);
    if (!ok || Math.hypot(a.target.x - p.x, a.target.z - p.z) < 0.5){ a.target = null; a.wait = 1 + Math.random() * 4; }
    return speed;
  }

  /** Crabs walk sideways: face 90° off the way they are going. */
  _sidestep(a, want, speed, dt){
    const p = a.root.position;
    const nx = p.x + Math.sin(want) * speed * dt, nz = p.z + Math.cos(want) * speed * dt;
    if (height(nx, nz) < 0.05) return false;
    p.x = nx; p.z = nz;
    this.world.collide(p, 0.3);
    a.root.rotation.y += angDiff(want + Math.PI / 2, a.root.rotation.y) * Math.min(1, dt * 6);
    return true;
  }

  _walk(a, dt, speed, t){
    a.phase += dt * speed * 2.6;
    if (a.legs) a.legs.forEach((l, i) => {
      const s = a.legs.length === 4 ? (i === 0 || i === 3 ? 1 : -1) : (i ? 1 : -1);
      l.rotation.x = speed ? Math.sin(a.phase) * 0.7 * s : 0;
    });
    if (a.dance > 0){
      a.root.rotation.y += dt * 6;
      a.root.position.y += Math.abs(Math.sin(t * 9)) * 0.25;
    }
    a.dance = Math.max(0, a.dance - dt);
  }

  _ground(a, dt){
    const p = a.root.position;
    const g = this.world.platformAt(p.x, p.z) ?? height(p.x, p.z);
    p.y += (g - p.y) * Math.min(1, dt * 12);
  }

  /** On land stand on the ground; in deep water paddle at the surface. */
  _float(a, dt, depth){
    const p = a.root.position;
    const g = this.world.platformAt(p.x, p.z) ?? height(p.x, p.z);
    const target = SEA - g > depth + 0.3 ? SEA - depth : g;
    p.y += (target - p.y) * Math.min(1, dt * 10);
  }
}
