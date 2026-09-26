// ---------- You: a castaway in a hood, and the camera that follows ----------
import * as THREE from 'three';
import { height, BOUND } from './terrain.js';
import { makePerson, makeTools, MAT } from './models.js';
import { SPEED } from './econ.js';

const DEEP = -0.9;          // you wade in the shallows but won't walk out to sea

export class Player {
  constructor(scene, canvas, camera, world){
    this.scene = scene;
    this.canvas = canvas;
    this.camera = camera;
    this.world = world;

    this.velocity = new THREE.Vector3();
    this.heading = 0;
    this.phase = 0;
    this.swingT = 0;          // > 0 while an attack swing plays
    this.sleeping = false;

    this.camYaw = 0.35;
    this.camPitch = 0.42;
    this.camDist = 12;
    this.camTarget = new THREE.Vector3();

    this.keys = new Set();
    this.stick = { x: 0, y: 0 };
    this.wantRun = false;

    const m = makePerson({ tunic: 0x7a4e2c, pants: 0x3f3a33, hood: 0x3f6b3a, belt: 0x2a1c10 });
    this.parts = m;
    this.root = m.root;
    // Cape.
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.95, 0.06), new THREE.MeshLambertMaterial({ color: 0x3f6b3a, flatShading: true }));
    cape.position.set(0, 0.95, -0.24);
    cape.castShadow = true;
    this.root.add(cape);
    this.cape = cape;
    // A satchel on the hip.
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.3), MAT.plank);
    bag.position.set(-0.4, 0.78, 0.05);
    this.root.add(bag);

    this.tools = makeTools();
    this.tools.root.position.set(0, -0.6, 0.05);
    this.tools.root.rotation.x = -Math.PI / 2;
    m.arms[1].add(this.tools.root);
    this.showTool(null);

    // Lantern light at night so you can see where you are going.
    this.lantern = new THREE.PointLight(0xffc27a, 0, 11, 1.8);
    this.lantern.position.set(0, 2.2, 0.6);
    this.root.add(this.lantern);

    scene.add(this.root);
    this._bindInput();
  }

  showTool(name){
    for (const k of ['axe', 'pick', 'hammer', 'sword', 'rod', 'hand']) this.tools[k].visible = k === name;
    this.tool = name;
  }

  spawn(x, z, facing = Math.PI){
    this.root.position.set(x, height(x, z), z);
    this.velocity.set(0, 0, 0);
    this.heading = this.root.rotation.y = facing;
    this.camYaw = facing + Math.PI;
    this.camTarget.set(x, height(x, z) + 1.4, z);
  }

  _bindInput(){
    addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.keys.clear(); });

    // One pointer orbits, two pinch.
    const active = new Map();
    let lastX = 0, lastY = 0, pinch = 0;
    const spread = () => {
      const [a, b] = [...active.values()];
      return (a && b) ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      active.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
      if (active.size === 1){ lastX = e.clientX; lastY = e.clientY; }
      else if (active.size === 2) pinch = spread();
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!active.has(e.pointerId)) return;
      active.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (active.size >= 2){
        const d = spread();
        if (pinch > 0 && d > 0) this.camDist = THREE.MathUtils.clamp(this.camDist * (pinch / d), 5, 34);
        pinch = d;
        return;
      }
      this.camYaw -= (e.clientX - lastX) * 0.006;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + (e.clientY - lastY) * 0.004, 0.05, 1.25);
      lastX = e.clientX; lastY = e.clientY;
    });
    const stop = (e) => {
      active.delete(e.pointerId);
      try { if (this.canvas.hasPointerCapture?.(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId); } catch {}
      if (active.size === 1){ const [p] = [...active.values()]; lastX = p.x; lastY = p.y; }
      pinch = active.size >= 2 ? spread() : 0;
    };
    this.canvas.addEventListener('pointerup', stop);
    this.canvas.addEventListener('pointercancel', stop);
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.012, 5, 34);
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

  swing(){
    if (this.swingT > 0) return false;
    this.swingT = 0.42;
    return true;
  }

  /**
   * @param frozen   a panel is open, or you are asleep
   * @param working  holding E on something, which pins you in place
   */
  update(dt, frozen, working, night, faceAt){
    const p = this.root.position;
    const input = (frozen || working) ? new THREE.Vector2() : this._input();
    const moving = input.lengthSq() > 0.001;
    const run = moving && (this.wantRun || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'));
    const wet = height(p.x, p.z) < 0.05;
    let speed = run ? SPEED.run : SPEED.walk;
    if (wet) speed *= 0.6;

    if (moving){
      const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
      const wx = input.x * cos + input.y * sin;
      const wz = -input.x * sin + input.y * cos;
      this.velocity.set(wx * speed, 0, wz * speed);
      this.heading = Math.atan2(wx, wz);
    } else {
      this.velocity.multiplyScalar(Math.max(0, 1 - dt * 12));
    }
    if (working && faceAt) this.heading = Math.atan2(faceAt.x - p.x, faceAt.z - p.z);

    const nx = THREE.MathUtils.clamp(p.x + this.velocity.x * dt, -BOUND, BOUND);
    const nz = THREE.MathUtils.clamp(p.z + this.velocity.z * dt, -BOUND, BOUND);
    if (height(nx, nz) > DEEP){ p.x = nx; p.z = nz; }
    else if (height(nx, p.z) > DEEP) p.x = nx;
    else if (height(p.x, nz) > DEEP) p.z = nz;
    this.world.collide(p);

    const ground = Math.max(height(p.x, p.z), -0.55);
    p.y += (ground - p.y) * Math.min(1, dt * 14);

    let diff = this.heading - this.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.root.rotation.y += diff * Math.min(1, dt * 12);

    this._animate(dt, moving, speed, working);
    this.lantern.intensity = night * 2.2;
    this._camera(dt);
    this.moving = moving;
    this.running = run;
  }

  _animate(dt, moving, speed, working){
    const { legs, arms, head } = this.parts;
    const frac = moving ? Math.min(1, this.velocity.length() / SPEED.walk) : 0;

    if (this.swingT > 0){
      this.swingT = Math.max(0, this.swingT - dt);
      const f = 1 - this.swingT / 0.42;
      arms[1].rotation.x = -2.6 + Math.sin(f * Math.PI) * 0.4 + f * 2.2;
      arms[1].rotation.z = 0.4 - f * 0.8;
    } else if (working){
      this.phase += dt * 9;
      const sw = Math.max(0, Math.sin(this.phase));
      if (this.tool === 'rod'){
        arms[1].rotation.x = -1.2 + Math.sin(this.phase * 0.3) * 0.1;
      } else if (this.tool === 'hand'){
        arms[0].rotation.x = -1.2 - sw * 0.4;
        arms[1].rotation.x = -1.2 - Math.max(0, Math.sin(this.phase + 1.5)) * 0.4;
      } else {
        arms[1].rotation.x = -1.4 - sw * 1.3;
        arms[0].rotation.x = -0.9 - sw * 0.3;
      }
      arms[1].rotation.z = 0;
      legs[0].rotation.x = 0.15; legs[1].rotation.x = -0.15;
      return;
    } else {
      arms[1].rotation.z *= 0.8;
    }

    this.phase += dt * (9 + speed * 0.6) * frac;
    const sw = Math.sin(this.phase) * 0.75 * frac;
    legs[0].rotation.x = sw;
    legs[1].rotation.x = -sw;
    arms[0].rotation.x = -sw * 0.8;
    if (this.swingT <= 0) arms[1].rotation.x = sw * 0.8;
    head.position.y = 1.62 + Math.abs(Math.sin(this.phase)) * 0.04 * frac;
    this.cape.rotation.x = -0.1 - frac * 0.35 - Math.abs(Math.sin(this.phase)) * 0.06 * frac;
    this.cape.position.z = -0.24 - frac * 0.12;
    this._step = this._step ?? 0;
    const beat = Math.floor(this.phase / Math.PI);
    this.footstep = frac > 0.15 && beat !== this._step;
    if (this.footstep) this._step = beat;
  }

  _camera(dt){
    const p = this.root.position;
    this.camTarget.lerp(new THREE.Vector3(p.x, p.y + 1.5, p.z), Math.min(1, dt * 8));
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    const dir = new THREE.Vector3(Math.sin(this.camYaw) * cp, sp, Math.cos(this.camYaw) * cp);
    // Pull in if a building stands between the camera and you.
    let dist = this.camDist;
    for (const o of this.world.obstacles()){
      const ox = this.camTarget.x - o.x, oz = this.camTarget.z - o.z;
      const hx = dir.x, hz = dir.z, hl = Math.hypot(hx, hz) || 1;
      const ux = hx / hl, uz = hz / hl;
      const bq = ox * ux + oz * uz, c = ox * ox + oz * oz - o.r * o.r;
      if (c < 0) continue;                          // you are standing in it
      const disc = bq * bq - c;
      if (disc < 0) continue;
      const hit = (-bq - Math.sqrt(disc)) / hl;     // along the 3D ray
      if (hit <= 0 || hit >= dist) continue;
      if (this.camTarget.y + dir.y * hit > o.top) continue;
      dist = Math.max(2.5, hit - 0.4);
    }
    const want = this.camTarget.clone().addScaledVector(dir, dist);
    want.y = Math.max(want.y, height(want.x, want.z) + 1.2, 0.8);
    this.camera.position.lerp(want, Math.min(1, dt * 9));
    this.camera.lookAt(this.camTarget);
  }

  get position(){ return this.root.position; }
  get facing(){ return this.root.rotation.y; }
}
