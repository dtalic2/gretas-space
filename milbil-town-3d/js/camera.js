// ---------- Looking around the island, from orbit or from the grass ----------
//
// Two modes. Overview is the town-planner camera: drag the ground, pinch to
// zoom, twist to turn. Ground level drops you into the town at milbil height,
// where dragging looks around instead of shoving the island about.
//
// Every value is smoothed towards a wanted value rather than set directly,
// which is most of what makes the camera feel like a camera.
import * as THREE from 'three';

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const TAP_SLOP = 14;        // px of movement still counted as a tap
const TAP_TIME = 600;       // ms

const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

export const MODES = {
  overview: { pitch:0.82, dist:36, minDist:9,   maxDist:76, minPitch:0.25, maxPitch:1.35, eye:0 },
  ground:   { pitch:0.14, dist:5.2, minDist:2.6, maxDist:14, minPitch:-0.12, maxPitch:0.75, eye:1.25 },
};

export class CameraRig {
  constructor(world, canvas, hooks = {}){
    this.world = world;
    this.camera = world.camera;
    this.canvas = canvas;
    this.hooks = hooks;

    this.mode = 'overview';
    this.limits = MODES.overview;

    this.target = new THREE.Vector3(0, 0, 2);
    this.yaw = -0.62;
    this.pitch = 0.82;
    this.dist = 36;

    // What the camera is heading towards. Input writes here, never to the above.
    this.want = { yaw:this.yaw, pitch:this.pitch, dist:this.dist, target:this.target.clone() };
    this.rate = 14;                     // how hard it chases; lowered for fly-tos
    this.vel = new THREE.Vector3();     // pan inertia
    this.bob = 0;                       // footstep sway at ground level
    this.bound = 24;

    this.pointers = new Map();
    this.keys = new Set();
    this._gesture = null;
    this._raycaster = new THREE.Raycaster();

    this._bind();
    this.apply();
  }

  // ------------------------------------------------------------- input ----
  _bind(){
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this._down(e));
    c.addEventListener('pointermove', (e) => this._move(e));
    c.addEventListener('pointerup', (e) => this._up(e));
    c.addEventListener('pointercancel', (e) => this._up(e, true));
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom(this.want.dist * (e.deltaY > 0 ? 0.12 : -0.12));
    }, { passive:false });

    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.pointers.clear(); });
  }

  _down(e){
    this.canvas.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, {
      x:e.clientX, y:e.clientY, x0:e.clientX, y0:e.clientY, t0:performance.now(), moved:0,
      orbit: e.button === 2 || e.shiftKey,
    });
    this.vel.set(0, 0, 0);
    this.rate = 14;
    if (this.pointers.size === 2) this._startPinch();
  }

  _startPinch(){
    const [a, b] = [...this.pointers.values()];
    this._gesture = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      yaw: this.want.yaw,
      d0: this.want.dist,
    };
  }

  _move(e){
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    p.moved += Math.abs(dx) + Math.abs(dy);

    if (this.pointers.size >= 2){
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      if (this._gesture){
        const scale = this._gesture.dist / Math.max(1, dist);
        this.want.dist = this._clampDist(this._gesture.d0 * scale);
        this.want.yaw = this._gesture.yaw - (angle - this._gesture.angle);
      }
      return;
    }

    if (this.hooks.placing && this.hooks.placing()){
      if (p.moved > TAP_SLOP) this.hooks.onPlaceDrag?.(e.clientX, e.clientY);
      return;
    }

    // Down in the town, a drag turns your head. From orbit, it moves the island.
    if (p.orbit || this.mode === 'ground'){
      this.look(-dx * 0.0055, dy * 0.0042);
    } else {
      this.panPixels(-dx, -dy);
    }
  }

  _up(e, cancelled){
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this._gesture = null;
    if (!p || cancelled) return;
    const quick = performance.now() - p.t0 < TAP_TIME;
    const still = Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < TAP_SLOP && p.moved < TAP_SLOP * 3;
    if (quick && still) this.hooks.onTap?.(e.clientX, e.clientY);
  }

  // -------------------------------------------------------------- moves ---
  _clampDist(d){ return Math.max(this.limits.minDist, Math.min(this.limits.maxDist, d)); }

  zoom(delta){ this.want.dist = this._clampDist(this.want.dist + delta); }

  look(dyaw, dpitch){
    this.want.yaw += dyaw;
    this.want.pitch = Math.max(this.limits.minPitch, Math.min(this.limits.maxPitch, this.want.pitch + dpitch));
  }

  /** Move the camera target by a screen-space drag, in pixels. */
  panPixels(px, py){
    const k = (2 * this.want.dist * Math.tan((this.camera.fov * Math.PI / 180) / 2)) / window.innerHeight;
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const move = right.multiplyScalar(px * k).add(fwd.multiplyScalar(py * k / Math.max(0.35, Math.sin(this.pitch))));
    this.want.target.add(move);
    this.vel.copy(move).multiplyScalar(6);
    this._clampTarget();
  }

  /** Walk the target forward/sideways — WASD, and the only way to move on foot. */
  walk(px, pz, speed){
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).multiplyScalar(px * speed);
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(pz * speed);
    this.want.target.add(right).add(fwd);
    this._clampTarget();
    this.vel.set(0, 0, 0);
    return px || pz;
  }

  _clampTarget(){
    const t = this.want.target;
    t.x = Math.max(-this.bound, Math.min(this.bound, t.x));
    t.z = Math.max(-this.bound, Math.min(this.bound, t.z));
    t.y = 0;
  }

  /** Swap between the planning view and standing in the grass. */
  setMode(mode){
    if (!MODES[mode] || mode === this.mode) return;
    this.mode = mode;
    this.limits = MODES[mode];
    this.want.pitch = this.limits.pitch;
    this.want.dist = this.limits.dist;
    this.rate = 3.2;                         // a slow, deliberate move in or out
    return mode;
  }

  focusOn(x, z, dist){
    this.want.target.set(x, 0, z);
    if (dist) this.want.dist = this._clampDist(dist);
    this.rate = 5;
    this._clampTarget();
  }

  /** Snap with no easing — used once at boot so the first frame is not a swoop. */
  settle(){
    this.yaw = this.want.yaw;
    this.pitch = this.want.pitch;
    this.dist = this.want.dist;
    this.target.copy(this.want.target);
    this.apply();
  }

  apply(){
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const eye = this.limits.eye + this.bobOffset();
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * cp * this.dist,
      this.target.y + eye + sp * this.dist,
      this.target.z + Math.cos(this.yaw) * cp * this.dist,
    );
    // Never let the lens dip under the island.
    this.camera.position.y = Math.max(this.camera.position.y, 0.55);
    this.camera.lookAt(this.target.x, this.target.y + eye + this.dist * 0.08, this.target.z);
  }

  bobOffset(){
    return this.mode === 'ground' ? Math.sin(this.bob) * 0.035 : 0;
  }

  update(dt){
    const k = this.keys;
    const speed = (this.mode === 'ground' ? 5.5 : 16 * (this.want.dist / 24)) * dt;
    let px = 0, pz = 0;
    if (k.has('a') || k.has('arrowleft')) px -= 1;
    if (k.has('d') || k.has('arrowright')) px += 1;
    if (k.has('w') || k.has('arrowup')) pz -= 1;
    if (k.has('s') || k.has('arrowdown')) pz += 1;
    const walking = this.walk(px, pz, speed);
    if (walking) this.bob += dt * 7;

    if (k.has('q')) this.want.yaw += dt * 1.1;
    if (k.has('e')) this.want.yaw -= dt * 1.1;
    if (k.has('=') || k.has('+')) this.zoom(-dt * 22);
    if (k.has('-') || k.has('_')) this.zoom(dt * 22);

    // Gentle glide after a flick.
    if (!this.pointers.size && this.vel.lengthSq() > 1e-5){
      this.want.target.addScaledVector(this.vel, dt);
      this.vel.multiplyScalar(Math.pow(0.0025, dt));
      this._clampTarget();
    }

    // Chase the wanted values. The rate creeps back up so a fly-to eases in
    // and then hands control straight back to the finger.
    const f = damp(this.rate, dt);
    this.yaw += (this.want.yaw - this.yaw) * f;
    this.pitch += (this.want.pitch - this.pitch) * f;
    this.dist += (this.want.dist - this.dist) * f;
    this.target.lerp(this.want.target, f);
    this.rate = Math.min(14, this.rate + dt * 9);

    this.apply();
  }

  // ------------------------------------------------------------ picking ---
  _ray(clientX, clientY){
    const ndc = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
    );
    this._raycaster.setFromCamera(ndc, this.camera);
    return this._raycaster;
  }

  /** Where a screen point lands on the ground plane, or null if it misses. */
  groundAt(clientX, clientY){
    const hit = new THREE.Vector3();
    return this._ray(clientX, clientY).ray.intersectPlane(GROUND, hit) ? hit : null;
  }

  /** Nearest thing in `objects` (groups are searched recursively) under a point. */
  pick(clientX, clientY, objects){
    const hits = this._ray(clientX, clientY).intersectObjects(objects, true);
    return hits.length ? hits[0] : null;
  }
}
