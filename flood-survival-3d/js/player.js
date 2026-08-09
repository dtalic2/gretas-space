// ---------- The character, the camera, and getting wet ----------
import * as THREE from 'three';
import { height, BOUND } from './terrain.js';
import { SPEED, STAMINA, SATCHEL } from './econ.js';

const lam = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });

// How deep the water has to be before it changes what you are doing.
const WADE = 0.35;
const SWIM = 1.25;

/**
 * Distance along `dir` at which a ray from `origin` enters an axis-aligned box,
 * or null if it misses, starts inside, or only enters beyond `far`. Standard
 * slab method — used to keep buildings from swallowing the camera.
 */
function rayBox(origin, dir, box, far){
  let tmin = 0, tmax = far;
  for (const axis of ['x', 'y', 'z']){
    const d = dir[axis];
    if (Math.abs(d) < 1e-6){
      if (origin[axis] < box.min[axis] || origin[axis] > box.max[axis]) return null;
      continue;
    }
    let t1 = (box.min[axis] - origin[axis]) / d;
    let t2 = (box.max[axis] - origin[axis]) / d;
    if (t1 > t2){ const s = t1; t1 = t2; t2 = s; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin > 0.05 ? tmin : null;      // <= 0 means the camera target is inside
}

export class Player {
  constructor(scene, canvas, camera, audio){
    this.scene = scene;
    this.canvas = canvas;
    this.camera = camera;
    this.audio = audio;

    this.velocity = new THREE.Vector3();
    this.heading = 0;
    this.walkPhase = 0;
    this.stamina = STAMINA.max;
    this.depth = 0;
    this.swimming = false;
    this.wading = false;
    this.sprinting = false;
    this.carried = 0;
    this._lastStroke = 0;
    this._beat = -1;
    this._wasWet = false;

    this.camYaw = Math.PI;
    this.camPitch = 0.36;
    this.camDist = 11;
    this.camTarget = new THREE.Vector3();

    this.keys = new Set();
    this.stick = { x: 0, y: 0 };
    this.wantSprint = false;
    this.platformY = null;

    this.root = this._build();
    scene.add(this.root);
    this.spawn(-4, 22);

    this._splashes(scene);
    this._bindInput();
  }

  spawn(x, z){
    this.root.position.set(x, height(x, z), z);
    this.velocity.set(0, 0, 0);
  }

  _build(){
    const g = new THREE.Group();
    const skin = lam(0xe0b083);
    const coat = lam(0xc8b14b);          // oilskin, so you can find yourself in the rain

    this.legs = [];
    for (const s of [-1, 1]){
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.24), lam(0x3a4a63));
      leg.position.set(s * 0.16, 0.31, 0);
      leg.castShadow = true;
      g.add(leg);
      this.legs.push(leg);
    }
    const bootMat = lam(0x2b2b30);
    for (const s of [-1, 1]){
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.36), bootMat);
      boot.position.set(s * 0.16, 0.08, 0.05);
      g.add(boot);
    }

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.8, 0.46), coat);
    body.position.y = 1.02;
    body.castShadow = true;
    g.add(body);

    this.arms = [];
    for (const s of [-1, 1]){
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.2), coat);
      arm.position.set(s * 0.47, 1.02, 0);
      arm.castShadow = true;
      g.add(arm);
      this.arms.push(arm);
    }
    for (const s of [-1, 1]){
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.16, 0.19), skin);
      hand.position.set(s * 0.47, 0.68, 0);
      g.add(hand);
    }

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.5, 0.46), skin);
    head.position.y = 1.66;
    head.castShadow = true;
    g.add(head);
    this.head = head;
    for (const s of [-1, 1]){
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.05), lam(0x241a12));
      eye.position.set(s * 0.13, 1.70, 0.235);
      g.add(eye);
    }

    // Sou'wester hat, because it never stops raining.
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 12), lam(0xe0c341));
    brim.position.y = 1.92; brim.castShadow = true; g.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.26, 12), lam(0xe0c341));
    crown.position.y = 2.05; crown.castShadow = true; g.add(crown);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.3), lam(0xe0c341));
    tail.position.set(0, 1.90, -0.34); g.add(tail);

    // Satchel on the back — it visibly swells as you fill it, so you can feel
    // how loaded you are without reading the HUD.
    this.sack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.3), lam(0x8a7350));
    this.sack.position.set(0, 1.06, -0.36);
    this.sack.castShadow = true;
    this.sack.visible = false;
    g.add(this.sack);

    // Lantern, hooked on the satchel strap.
    this.lantern = new THREE.PointLight(0xffd08a, 0, 12, 2);
    this.lantern.position.set(0.5, 1.1, 0.2);
    g.add(this.lantern);
    this.lanternGlass = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), new THREE.MeshBasicMaterial({ color: 0xffcf8a }));
    this.lanternGlass.position.copy(this.lantern.position);
    this.lanternGlass.visible = false;
    g.add(this.lanternGlass);

    return g;
  }

  /** A small pool of particles reused for splashes and dig dust. */
  _splashes(scene){
    const N = 160;
    this.pool = [];
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.16, transparent: true, opacity: 0.85, depthWrite: false });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    for (let i = 0; i < N; i++){
      this.pool.push({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3() });
      pos[i * 3 + 1] = -999;
    }
    this.pointsGeo = geo;
    this.pointsMat = mat;
  }

  burst(at, count, color, up = 3.4, spread = 1.6){
    this.pointsMat.color.set(color);
    let made = 0;
    for (const p of this.pool){
      if (p.life > 0) continue;
      p.life = 0.5 + Math.random() * 0.5;
      p.p.copy(at);
      p.v.set((Math.random() - 0.5) * spread, up * (0.5 + Math.random() * 0.7), (Math.random() - 0.5) * spread);
      if (++made >= count) break;
    }
  }

  _bindInput(){
    addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      this.keys.add(e.code);
      // Arrows and space scroll the page otherwise, and a swallowed keyup leaves
      // the key stuck down — which reads as the character walking off on its own.
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    // Alt-tabbing away mid-stride is the usual way a key gets stuck.
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.keys.clear(); });

    // One pointer orbits, two pinch. Tracking every pointer matters on touch:
    // with a single-pointer model the second finger fights the orbit.
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
        if (pinch > 0 && d > 0) this.camDist = THREE.MathUtils.clamp(this.camDist * (pinch / d), 4, 30);
        pinch = d;
        return;
      }
      this.camYaw -= (e.clientX - lastX) * 0.006;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch - (e.clientY - lastY) * 0.004, -0.12, 1.2);
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
      this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.012, 4, 30);
    }, { passive: false });
  }

  _inputVector(){
    const k = this.keys;
    let x = 0, z = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) z -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) z += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    x += this.stick.x;
    z += this.stick.y;
    const v = new THREE.Vector2(x, z);
    if (v.lengthSq() > 1) v.normalize();
    return v;
  }

  /**
   * @param frozen  true while a panel is open or the day is turning over
   * @param working true while holding an action, which costs stamina and pins you
   */
  update(dt, level, frozen, working, nightness){
    const p = this.root.position;
    // A deck, a roof platform or a boat deck stands in for the ground while you
    // are on it — which is the whole point of building one.
    const ground = this.platformY ?? height(p.x, p.z);
    this.groundY = ground;
    this.depth = level - ground;
    this.swimming = this.depth > SWIM;
    this.wading = !this.swimming && this.depth > WADE;

    const input = (frozen || working) ? new THREE.Vector2(0, 0) : this._inputVector();
    const moving = input.lengthSq() > 0.001;

    this.sprinting = moving && !this.swimming
      && (this.wantSprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'))
      && this.stamina > 1;

    let speed = this.swimming ? SPEED.swim : this.wading ? SPEED.wade : SPEED.walk;
    if (this.sprinting) speed = SPEED.sprint;
    // A full satchel slows you down. It is the reason to make two trips.
    speed *= 1 - 0.18 * (this.carried / SATCHEL);
    if (this.stamina <= 0) speed *= 0.55;

    if (moving){
      const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
      const wx = input.x * cos - input.y * sin;
      const wz = input.x * sin + input.y * cos;
      this.velocity.x = wx * speed;
      this.velocity.z = wz * speed;
      this.heading = Math.atan2(wx, wz);
    } else {
      this.velocity.multiplyScalar(Math.max(0, 1 - dt * 12));
    }

    p.x = THREE.MathUtils.clamp(p.x + this.velocity.x * dt, -BOUND, BOUND);
    p.z = THREE.MathUtils.clamp(p.z + this.velocity.z * dt, -BOUND, BOUND);

    // Feet on the ground, or floating with your head out.
    const newGround = this.platformY ?? height(p.x, p.z);
    const targetY = (level - newGround > SWIM) ? level - 1.05 : newGround;
    p.y += (targetY - p.y) * Math.min(1, dt * (this.swimming ? 4 : 14));

    // Stamina: everything costs something except standing on dry land.
    let drain = 0;
    if (this.swimming) drain = STAMINA.swim;
    else if (this.sprinting) drain = STAMINA.sprint;
    else if (working) drain = STAMINA.work;
    else if (this.wading && moving) drain = STAMINA.gather;
    if (drain) this.stamina = Math.max(0, this.stamina - drain * dt);
    else this.stamina = Math.min(STAMINA.max, this.stamina + (moving ? STAMINA.regenWalk : STAMINA.regen) * dt);

    // Face where you are going.
    let diff = this.heading - this.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.root.rotation.y += diff * Math.min(1, dt * 12);

    this._animate(dt, moving, speed, working);
    this._effects(dt, level, nightness);
    this._camera(dt, level);
  }

  _animate(dt, moving, speed, working){
    const frac = moving ? Math.min(1, this.velocity.length() / SPEED.walk) : 0;

    if (working){
      // Swing a hammer, or dig.
      this.walkPhase += dt * 9;
      const sw = Math.max(0, Math.sin(this.walkPhase));
      this.arms[0].rotation.x = -1.5 - sw * 1.1;
      this.arms[1].rotation.x = -1.5 - sw * 1.1;
      this.legs[0].rotation.x = 0.1;
      this.legs[1].rotation.x = -0.1;
      return;
    }

    if (this.swimming){
      // Front crawl: arms windmill, legs flutter, body lies back a touch.
      this.walkPhase += dt * 7;
      this.arms[0].rotation.x = Math.sin(this.walkPhase) * 2.4 - 1.0;
      this.arms[1].rotation.x = Math.sin(this.walkPhase + Math.PI) * 2.4 - 1.0;
      this.legs[0].rotation.x = Math.sin(this.walkPhase * 2) * 0.35;
      this.legs[1].rotation.x = -Math.sin(this.walkPhase * 2) * 0.35;
      this.root.rotation.x = -0.35;
      this._lastStroke += dt;
      if (this._lastStroke > 0.9 && frac > 0.1){ this._lastStroke = 0; this.audio.swim(); }
      return;
    }

    this.root.rotation.x += (0 - this.root.rotation.x) * Math.min(1, dt * 8);
    this.walkPhase += dt * (11 + speed * 0.5) * frac;
    const sw = Math.sin(this.walkPhase) * 0.72 * frac;
    this.legs[0].rotation.x = sw;
    this.legs[1].rotation.x = -sw;
    this.arms[0].rotation.x = -sw * 0.85;
    this.arms[1].rotation.x = sw * 0.85;
    this.head.position.y = 1.66 + Math.abs(Math.sin(this.walkPhase)) * 0.035 * frac;

    // Footsteps on the beat of the stride.
    const beat = Math.floor(this.walkPhase / Math.PI);
    if (frac > 0.15 && beat !== this._beat){
      this._beat = beat;
      this.audio.step(this.depth > WADE * 0.6);
      if (this.wading){
        this.burst(this.root.position.clone().setY(this.root.position.y + this.depth * 0.5), 4, 0xcfe4ea, 1.6, 0.9);
      }
    }
  }

  _effects(dt, level, nightness){
    // Splash when you first go in, and again when you come out.
    const inWater = this.depth > WADE;
    if (inWater !== this._wasWet){
      this._wasWet = inWater;
      this.audio.splash();
      this.burst(this.root.position.clone().setY(level), 22, 0xdff0f5, 4.2, 2.2);
    }

    this.lantern.intensity = nightness * 2.6;
    this.lanternGlass.visible = nightness > 0.25;

    // Advance the particle pool.
    const arr = this.pointsGeo.attributes.position.array;
    let i = 0;
    for (const q of this.pool){
      if (q.life > 0){
        q.life -= dt;
        q.v.y -= 9.8 * dt;
        q.p.addScaledVector(q.v, dt);
        arr[i] = q.p.x; arr[i + 1] = q.p.y; arr[i + 2] = q.p.z;
      } else {
        arr[i + 1] = -999;
      }
      i += 3;
    }
    this.pointsGeo.attributes.position.needsUpdate = true;
  }

  _camera(dt, level){
    const p = this.root.position;
    this.camTarget.lerp(new THREE.Vector3(p.x, p.y + 1.4, p.z), Math.min(1, dt * 8));

    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    const dir = new THREE.Vector3(
      Math.sin(this.camYaw) * cp,
      sp,
      Math.cos(this.camYaw) * cp,
    ).normalize();

    // Pull in if a building stands between the camera and the player. Without
    // this you can orbit the camera inside the house and see nothing but roof.
    let dist = this.camDist;
    const box = this.obstacle?.();
    if (box){
      const hit = rayBox(this.camTarget, dir, box, dist);
      if (hit !== null) dist = Math.max(2.4, hit - 0.5);
    }

    const want = this.camTarget.clone().addScaledVector(dir, dist);

    // Don't let the camera bury itself in a bank; ride over the terrain instead.
    const floor = height(want.x, want.z) + 1.3;
    want.y = Math.max(want.y, floor, level > this.groundY ? level + 0.35 : 0.6);

    this.camera.position.lerp(want, Math.min(1, dt * 9));
    this.camera.lookAt(this.camTarget);
  }

  setCarried(n){
    this.carried = n;
    this.sack.visible = n > 0;
    const s = 0.5 + (n / SATCHEL) * 0.9;
    this.sack.scale.set(s, s, s);
    this.sack.position.set(0, 1.06, -0.3 - s * 0.16);
  }

  get position(){ return this.root.position; }
}
