// ---------- You ----------
//
// Runs, sprints, creeps, jumps, and carries eggs over its head. The only number
// here that the rest of the game cares about is `noise`: it comes out of how
// fast you are moving, whether you are crouched, and whether you are standing
// next to something big enough to hide behind. Guardians listen to that one
// number and nothing else.

import * as THREE from 'three';
import { buildAvatar } from './profiles.js';
import { WORLD_R, PEN_R } from './world.js';

const BASE_SPEED = 7.0;
const GRAVITY = -20;

export class Player {
  constructor(scene, profile, loadout){
    this.loadout = loadout;
    this.pos = new THREE.Vector3(0, 0, PEN_R - 1.5);
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI;
    this.camYaw = Math.PI;
    this.camPitch = 0.38;
    this.camDist = 8.6;
    this.vy = 0;
    this.onGround = true;
    this.stamina = 1;
    this.stunT = 0;
    this.noise = 0;
    this.speed01 = 0;
    this.carry = [];
    this._focus = new THREE.Vector3();
    this._want = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._ray = new THREE.Raycaster();

    const avatar = buildAvatar(profile);
    this.avatar = avatar;
    this.group = avatar.group;
    scene.add(this.group);

    // the stolen eggs ride in the basket on your back
    this.hold = new THREE.Group();
    this.hold.position.set(0, 1.16, -0.28);
    this.group.add(this.hold);

    // a soft blob shadow, so you can tell where you are in the air
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.44, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    scene.add(this.shadow);
  }

  get inPen(){ return Math.hypot(this.pos.x, this.pos.z) < PEN_R; }
  get onStump(){ return Math.hypot(this.pos.x, this.pos.z) < 2.2; }
  get full(){ return this.carry.length >= this.loadout.carry; }

  setProfile(scene, profile, loadout){
    scene.remove(this.group);
    const carried = this.carry.map((c) => c.species);
    this.loadout = loadout;

    const avatar = buildAvatar(profile);
    this.avatar = avatar;
    this.group = avatar.group;
    scene.add(this.group);
    this.hold = new THREE.Group();
    this.hold.position.set(0, 1.16, -0.28);
    this.group.add(this.hold);

    this.carry = [];
    for (const sp of carried) this.take({ species: sp, mesh: null });
    this.group.position.copy(this.pos);
  }

  /** Put an egg in the basket. `egg` is what world.takeEgg handed back. */
  take(egg, makeEgg){
    const mesh = egg.mesh && !egg.mesh.parent ? egg.mesh : (makeEgg ? makeEgg(egg.species) : null);
    if (mesh){
      mesh.scale.setScalar(0.62);
      this.hold.add(mesh);
    }
    this.carry.push({ species: egg.species, mesh });
    this.layoutEggs();           // after the push, so the new egg gets a place
    return this.carry.length;
  }

  /** Lose everything you are holding — what happens when a guardian catches you. */
  dropAll(){
    const lost = [...this.carry];
    for (const c of this.carry) if (c.mesh) this.hold.remove(c.mesh);
    this.carry = [];
    return lost;
  }

  /** Hand one egg over to the stump. */
  handOver(){
    const c = this.carry.shift();
    if (!c) return null;
    if (c.mesh) this.hold.remove(c.mesh);
    this.layoutEggs();
    return c;
  }

  /** Sit the eggs side by side in the basket, however many there are. */
  layoutEggs(){
    const n = this.carry.filter((c) => c.mesh).length;
    let i = 0;
    for (const c of this.carry){
      if (!c.mesh) continue;
      const spread = n > 1 ? 0.15 : 0;
      c.mesh.position.set(-spread + (i % 2) * spread * 2, 0.06 + Math.floor(i / 2) * 0.3, 0);
      c.mesh.rotation.z = (i % 2 ? 0.12 : -0.12);
      i++;
    }
  }

  stun(t = 1.3){ this.stunT = Math.max(this.stunT, t); }

  update(dt, input, world){
    if (this.stunT > 0) this.stunT -= dt;
    const stunned = this.stunT > 0;

    // ---- look
    this.camYaw -= input.lookDx * 0.0045;
    this.camPitch = Math.max(0.08, Math.min(1.05, this.camPitch + input.lookDy * 0.0035));

    // ---- what the sticks are asking for, turned into world directions
    let mx = input.x, mz = input.y;
    const mag = Math.hypot(mx, mz);
    if (mag > 1){ mx /= mag; mz /= mag; }
    if (stunned){ mx = 0; mz = 0; }

    // Screen up (-y) runs away from the camera; screen right (+x) is the
    // camera's right hand. Anything else and the stick fights the player.
    const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
    const wantX = -mz * sin - mx * cos;
    const wantZ = -mz * cos + mx * sin;
    const asking = Math.hypot(wantX, wantZ);

    // ---- speed, and what it costs
    const crouch = input.crouch && this.onGround;
    const sprint = input.sprint && !crouch && this.stamina > 0.02 && asking > 0.1;

    let speed = BASE_SPEED * this.loadout.speed;
    if (crouch) speed *= 0.44;
    if (sprint) speed *= 1.52;
    speed *= 1 - Math.min(0.28, this.carry.length * 0.07);

    if (sprint) this.stamina = Math.max(0, this.stamina - dt * (0.42 / this.loadout.stamina));
    else this.stamina = Math.min(1, this.stamina + dt * 0.3);

    // ---- move, with a little weight behind it
    const targetX = wantX * speed, targetZ = wantZ * speed;
    const grip = asking > 0.05 ? 11 : 15;
    this.vel.x += (targetX - this.vel.x) * Math.min(1, dt * grip);
    this.vel.z += (targetZ - this.vel.z) * Math.min(1, dt * grip);

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    // ---- jump
    if (input.jump && this.onGround && !stunned){
      this.vy = 7.2;
      this.onGround = false;
    }
    if (!this.onGround){
      this.vy += GRAVITY * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= 0){ this.pos.y = 0; this.vy = 0; this.onGround = true; }
    }

    // ---- the fence at the edge of the world
    const d = Math.hypot(this.pos.x, this.pos.z);
    if (d > WORLD_R - 1.5){
      const k = (WORLD_R - 1.5) / d;
      this.pos.x *= k; this.pos.z *= k;
      this.vel.multiplyScalar(0.4);
    }

    // ---- face where you are going
    const moving = Math.hypot(this.vel.x, this.vel.z);
    if (moving > 0.6){
      const want = Math.atan2(this.vel.x, this.vel.z);
      this.yaw += Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw)) * Math.min(1, dt * 12);
    }

    // ---- how loud all that was
    const cover = world.coverAt(this.pos.x, this.pos.z);
    this.speed01 = Math.min(1, moving / (BASE_SPEED * 1.5));
    let noise = 0.05 + this.speed01 * 0.95;
    if (crouch) noise *= 0.28;
    if (sprint) noise *= 1.45;
    if (!this.onGround) noise *= 0.75;
    noise *= this.loadout.quiet;
    noise *= 1 - cover * 0.55;
    this.noise = Math.max(0, noise);
    this.cover = cover;
    this.crouching = crouch;
    this.sprinting = sprint;

    // ---- draw
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.yaw;
    this.avatar.animate(dt, {
      speed: this.speed01 * (sprint ? 1.4 : 1),
      crouch, carrying: this.carry.length, stunned,
    });
    if (this.avatar.billboard) this.group.rotation.y = this.camYaw + Math.PI;

    this.shadow.position.set(this.pos.x, 0.03, this.pos.z);
    this.shadow.scale.setScalar(1 - Math.min(0.5, this.pos.y * 0.12));
    this.shadow.material.opacity = 0.22 - Math.min(0.14, this.pos.y * 0.03);

    // the carried eggs bob with the run
    this.hold.rotation.z = Math.sin(performance.now() / 160) * 0.05 * this.speed01;
  }

  /**
   * Third person, and `blockers` keeps it honest: a giant right behind you used
   * to swallow the camera whole, so the view is pulled in to just in front of
   * anything standing between the lens and your head.
   */
  updateCamera(camera, dt, blockers = []){
    const focus = this._focus.set(this.pos.x, this.pos.y + 1.3, this.pos.z);
    const r = this.camDist * Math.cos(this.camPitch);
    const want = this._want.set(
      this.pos.x - Math.sin(this.camYaw) * r,
      this.pos.y + 1.4 + this.camDist * Math.sin(this.camPitch),
      this.pos.z - Math.cos(this.camYaw) * r,
    );

    const dir = this._dir.copy(want).sub(focus);
    let dist = dir.length() || 0.001;
    dir.divideScalar(dist);

    if (blockers.length){
      this._ray.set(focus, dir);
      this._ray.far = dist;
      const hit = this._ray.intersectObjects(blockers, false)[0];
      if (hit) dist = Math.max(2.6, hit.distance - 0.6);
    }

    want.copy(focus).addScaledVector(dir, dist);
    camera.position.lerp(want, Math.min(1, dt * 9));
    camera.lookAt(focus);
  }
}
