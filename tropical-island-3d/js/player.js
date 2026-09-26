// ---------- You: walking, jumping, swimming, diving, and the camera ----------
import * as THREE from 'three';
import { height, BOUND, SEA } from './terrain.js';
import { makePerson, makeRod, makeUkulele } from './models.js';
import { SPEED, BREATH } from './econ.js';

const SWIM_DEPTH = 1.05;      // water deeper than this and you swim
const FLOAT = SEA - 1.1;      // where your feet hang while swimming at the surface
const GRAVITY = 22;

/** Distance along `dir` (ignoring y) at which a ray from `o` enters box `b`, or null. */
function rayBox2D(o, dir, b, far){
  let tmin = 0, tmax = far;
  for (const [oa, da, c, h] of [[o.x, dir.x, b.x, b.hx], [o.z, dir.z, b.z, b.hz]]){
    if (Math.abs(da) < 1e-6){ if (Math.abs(oa - c) > h) return null; continue; }
    let t1 = (c - h - oa) / da, t2 = (c + h - oa) / da;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin > 0.05 ? tmin : null;
}

export class Player {
  constructor(scene, canvas, camera, world){
    this.scene = scene; this.canvas = canvas; this.camera = camera; this.world = world;
    this.velocity = new THREE.Vector3();
    this.vy = 0;
    this.heading = 0;
    this.phase = 0;
    this.swimming = false;
    this.diving = false;
    this.breath = BREATH;
    this.riding = null;
    this.holding = null;          // 'rod' | 'ukulele' | fish mesh
    this.wantDive = false;
    this.wantRun = false;

    this.camYaw = 0; this.camPitch = 0.38; this.camDist = 11;
    this.camTarget = new THREE.Vector3();

    this.keys = new Set();
    this.stick = { x: 0, y: 0 };

    this.root = new THREE.Group();
    this.rod = makeRod();
    this.uke = makeUkulele();
    this.setLook({});
    // A lantern glow at night, so you can see where you are going.
    this.lantern = new THREE.PointLight(0xffd8a0, 0, 10, 1.8);
    this.lantern.position.set(0, 2.2, 0.6);
    this.root.add(this.lantern);
    scene.add(this.root);
    this._bindInput();
  }

  /** Rebuild the body with what you are wearing: { hat, lei, glasses }. */
  setLook(look){
    if (this.body) this.root.remove(this.body);
    this.parts = makePerson({ shirt: 0xff6a5a, shirt2: 0xfff0a0, shorts: 0x2f8ae0, skin: 0xe3b48a, hair: 0x5a3a1a, ...look });
    this.body = this.parts.root;
    this.parts.hand.add(this.rod, this.uke);
    this.rod.visible = this.uke.visible = false;
    this.rod.rotation.x = -0.9;
    this.uke.position.set(-0.25, 0.15, 0.25);
    this.uke.rotation.set(-0.3, 0.9, 1.2);
    this.root.add(this.body);
  }

  /** Where a parrot sits, in world space. */
  shoulderWorld(){ return this.parts.shoulder.getWorldPosition(new THREE.Vector3()); }
  rodTip(){ return this.rod.userData.tip.getWorldPosition(new THREE.Vector3()); }

  spawn(x, z, facing = 0){
    const g = this.world.platformAt(x, z) ?? height(x, z);
    this.root.position.set(x, g, z);
    this.heading = this.root.rotation.y = facing;
    this.camYaw = facing + Math.PI;
    this.camTarget.set(x, g + 1.4, z);
  }

  _bindInput(){
    addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.keys.clear(); });

    const active = new Map();
    let lastX = 0, lastY = 0, pinch = 0;
    const spread = () => { const [a, b] = [...active.values()]; return (a && b) ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
    this.canvas.addEventListener('pointerdown', (e) => {
      active.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
      if (active.size === 1){ lastX = e.clientX; lastY = e.clientY; } else if (active.size === 2) pinch = spread();
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!active.has(e.pointerId)) return;
      active.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (active.size >= 2){
        const d = spread();
        if (pinch > 0 && d > 0) this.camDist = THREE.MathUtils.clamp(this.camDist * (pinch / d), 4, 30);
        pinch = d;
        return;
      }
      this.camYaw -= (e.clientX - lastX) * 0.006;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + (e.clientY - lastY) * 0.004, -0.3, 1.25);
      lastX = e.clientX; lastY = e.clientY;
    });
    const stop = (e) => {
      active.delete(e.pointerId);
      if (active.size === 1){ const [p] = [...active.values()]; lastX = p.x; lastY = p.y; }
      pinch = active.size >= 2 ? spread() : 0;
    };
    this.canvas.addEventListener('pointerup', stop);
    this.canvas.addEventListener('pointercancel', stop);
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.012, 4, 30);
    }, { passive: false });
  }

  _input(){
    const k = this.keys;
    let x = 0, z = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) z -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) z += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    x += this.stick.x; z += this.stick.y;
    const v = new THREE.Vector2(x, z);
    if (v.lengthSq() > 1) v.normalize();
    return v;
  }

  get moveInput(){ return this._input().lengthSq() > 0.01; }

  jump(){
    if (this.swimming || this.riding || !this.onGround) return false;
    this.vy = SPEED.jump;
    this.onGround = false;
    return true;
  }

  /**
   * @param frozen  a panel is open, or you are fishing / napping
   * @param gear    { snorkel }
   */
  update(dt, frozen, gear, night){
    const p = this.root.position;
    const input = frozen ? new THREE.Vector2() : this._input();
    const moving = input.lengthSq() > 0.001;
    const ground = this.world.platformAt(p.x, p.z) ?? height(p.x, p.z);
    const depth = SEA - ground;
    this.swimming = !!this.riding || depth > SWIM_DEPTH;
    this.running = moving && !this.swimming && (this.wantRun || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'));

    let speed = this.running ? SPEED.run : SPEED.walk;
    if (this.swimming) speed = this.riding ? SPEED.turtle : gear.snorkel ? SPEED.snorkel : SPEED.swim;
    if (this.diving) speed = SPEED.dive;
    if (!this.swimming && depth > 0.3) speed *= 0.7;            // wading

    if (moving){
      const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
      const wx = input.x * cos + input.y * sin;
      const wz = -input.x * sin + input.y * cos;
      this.velocity.set(wx * speed, 0, wz * speed);
      this.heading = Math.atan2(wx, wz);
    } else this.velocity.multiplyScalar(Math.max(0, 1 - dt * (this.swimming ? 3 : 12)));

    const nx = THREE.MathUtils.clamp(p.x + this.velocity.x * dt, -BOUND, BOUND);
    const nz = THREE.MathUtils.clamp(p.z + this.velocity.z * dt, -BOUND, BOUND);
    // A turtle won't swim up onto the beach.
    if (!this.riding || height(nx, nz) < -0.7){ p.x = nx; p.z = nz; }
    if (!this.swimming || this.diving) this.world.collide(p);

    // Diving: hold Dive with a snorkel to go under, and your breath runs down.
    const canDive = gear.snorkel && this.swimming && !this.riding;
    this.diving = canDive && this.wantDive && this.breath > 0;
    if (this.diving) this.breath = Math.max(0, this.breath - dt);
    else this.breath = Math.min(BREATH, this.breath + dt * (p.y > FLOAT - 0.3 ? 4 : 0));

    const g2 = this.world.platformAt(p.x, p.z) ?? height(p.x, p.z);
    if (this.swimming){
      const want = this.diving ? Math.max(g2 + 0.2, FLOAT - 6) : FLOAT + Math.sin(this.phase * 0.5) * 0.04;
      p.y += (want - p.y) * Math.min(1, dt * (this.diving ? 2.2 : 4));
      this.vy = 0;
      this.onGround = false;
    } else {
      this.vy -= GRAVITY * dt;
      p.y += this.vy * dt;
      if (p.y <= g2){ p.y = g2; this.vy = 0; this.onGround = true; }
      else if (p.y - g2 > 0.05 && this.vy === 0) p.y = g2;
    }

    let diff = this.heading - this.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.root.rotation.y += diff * Math.min(1, dt * 10);

    this._animate(dt, moving, speed, frozen);
    this.lantern.intensity = night * 2;
    this._camera(dt);
    this.moving = moving;
    this.depth = depth;
  }

  _animate(dt, moving, speed, frozen){
    const { legs, arms, head, body } = this.parts;
    const frac = moving ? Math.min(1, this.velocity.length() / SPEED.walk) : 0;
    this.rod.visible = this.holding === 'rod';
    this.uke.visible = this.holding === 'ukulele';

    if (this.riding){
      // Lying on the turtle's back, holding on.
      this.body.rotation.x = -1.3;
      this.body.position.y = 0.55;
      arms.forEach((a) => { a.rotation.x = -2.6; });
      legs.forEach((l, i) => { l.rotation.x = Math.sin(this.phase * 2 + i * Math.PI) * 0.2; });
      this.phase += dt * 4;
      return;
    }
    if (this.swimming){
      this.phase += dt * (moving ? 7 : 3);
      const lie = this.diving ? -1.2 : moving ? -1.05 : -0.15;
      this.body.rotation.x += (lie - this.body.rotation.x) * Math.min(1, dt * 5);
      // Lying flat, float up so your back is at the surface.
      this.body.position.y += ((this.diving ? 0.45 : moving ? 0.95 : 0) - this.body.position.y) * Math.min(1, dt * 5);
      if (moving || this.diving){
        arms[0].rotation.x = Math.sin(this.phase) * 2.4 - 1.2;
        arms[1].rotation.x = Math.sin(this.phase + Math.PI) * 2.4 - 1.2;
      } else {
        // Treading water.
        arms[0].rotation.x = -0.8 + Math.sin(this.phase * 2) * 0.3;
        arms[1].rotation.x = -0.8 - Math.sin(this.phase * 2) * 0.3;
        arms[0].rotation.z = 0.6; arms[1].rotation.z = -0.6;
      }
      legs[0].rotation.x = Math.sin(this.phase * 2) * 0.4;
      legs[1].rotation.x = -Math.sin(this.phase * 2) * 0.4;
      this.stroke = moving && Math.floor(this.phase / Math.PI) !== this._lastStroke;
      this._lastStroke = Math.floor(this.phase / Math.PI);
      return;
    }
    this.body.rotation.x += (0 - this.body.rotation.x) * Math.min(1, dt * 8);
    this.body.position.y *= 0.8;
    arms[0].rotation.z = arms[1].rotation.z = 0;

    if (this.holding === 'rod'){
      arms[1].rotation.x = -1.1;
      arms[0].rotation.x = -0.9;
      legs.forEach((l) => { l.rotation.x = 0; });
      return;
    }
    if (this.holding === 'ukulele'){
      this.phase += dt * 10;
      arms[1].rotation.x = -1.0 + Math.sin(this.phase) * 0.25;
      arms[0].rotation.x = -1.3;
      arms[0].rotation.z = 0.5;
      legs.forEach((l, i) => { l.rotation.x = Math.max(0, Math.sin(this.phase * 0.5 + i * Math.PI)) * 0.3; });
      head.rotation.z = Math.sin(this.phase * 0.5) * 0.15;
      return;
    }
    if (this.holding === 'fish'){
      arms.forEach((a) => { a.rotation.x = -2.9; });
      return;
    }
    head.rotation.z = 0;
    if (!this.onGround){
      arms.forEach((a) => { a.rotation.x = -2.2; });
      legs[0].rotation.x = 0.5; legs[1].rotation.x = -0.3;
      return;
    }
    this.phase += dt * (9 + speed * 0.6) * frac;
    const sw = Math.sin(this.phase) * 0.75 * frac;
    legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
    arms[0].rotation.x = -sw * 0.8; arms[1].rotation.x = sw * 0.8;
    head.position.y = 1.62 + Math.abs(Math.sin(this.phase)) * 0.04 * frac;
    const beat = Math.floor(this.phase / Math.PI);
    this.footstep = frac > 0.15 && beat !== this._step;
    this._step = beat;
  }

  _camera(dt){
    const p = this.root.position;
    this.camTarget.lerp(new THREE.Vector3(p.x, p.y + (this.swimming ? 1.0 : 1.5), p.z), Math.min(1, dt * 8));
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    const dir = new THREE.Vector3(Math.sin(this.camYaw) * cp, sp, Math.cos(this.camYaw) * cp);
    // Pull in rather than end up inside the hut or the shack.
    let dist = this.camDist;
    for (const b of this.world.boxes){
      const hit = rayBox2D(this.camTarget, dir, b, dist);
      if (hit !== null && this.camTarget.y + dir.y * hit < b.top) dist = Math.max(2.2, hit - 0.4);
    }
    const want = this.camTarget.clone().addScaledVector(dir, dist);
    const floor = height(want.x, want.z) + 0.8;
    // At the surface the camera stays above the water; diving, it follows you down.
    want.y = Math.max(want.y, floor, this.diving ? floor : SEA + 0.6);
    this.camera.position.lerp(want, Math.min(1, dt * 8));
    this.camera.lookAt(this.camTarget);
  }

  get position(){ return this.root.position; }
  get facing(){ return this.root.rotation.y; }
}
