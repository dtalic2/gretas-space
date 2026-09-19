// ---------- Looking around the island: drag to pan, pinch to zoom ----------
//
// One finger drags the ground, two fingers pinch and twist, the wheel zooms and
// WASD/QE do the same on a keyboard. A short press that does not move is a tap,
// which is how you interact with everything in the town.
import * as THREE from 'three';

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const TAP_SLOP = 14;        // px of movement still counted as a tap
const TAP_TIME = 600;       // ms

export class CameraRig {
  constructor(world, canvas, hooks = {}){
    this.world = world;
    this.camera = world.camera;
    this.canvas = canvas;
    this.hooks = hooks;

    this.target = new THREE.Vector3(0, 0, 2);
    this.yaw = -0.62;
    this.pitch = 0.82;                    // radians above the horizon
    this.dist = 44;
    this.vel = new THREE.Vector3();       // pan inertia

    this.minDist = 9;
    this.maxDist = 76;
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
      this.zoom(this.dist * (e.deltaY > 0 ? 0.12 : -0.12));
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
    if (this.pointers.size === 2) this._startPinch();
  }

  _startPinch(){
    const [a, b] = [...this.pointers.values()];
    this._gesture = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      yaw: this.yaw,
      d0: this.dist,
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
        this.dist = this._clampDist(this._gesture.d0 * scale);
        this.yaw = this._gesture.yaw - (angle - this._gesture.angle);
      }
      this.apply();
      return;
    }

    // One finger: either nudging a building into place, orbiting, or panning.
    if (this.hooks.placing && this.hooks.placing()){
      if (p.moved > TAP_SLOP) this.hooks.onPlaceDrag?.(e.clientX, e.clientY);
      return;
    }
    if (p.orbit){
      this.yaw -= dx * 0.006;
      this.pitch = Math.max(0.25, Math.min(1.35, this.pitch + dy * 0.005));
    } else {
      this.panPixels(-dx, -dy);
    }
    this.apply();
  }

  _up(e, cancelled){
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    // Dropping below two fingers ends the pinch; it re-arms if a second returns.
    if (this.pointers.size < 2) this._gesture = null;
    if (!p || cancelled) return;
    const quick = performance.now() - p.t0 < TAP_TIME;
    const still = Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < TAP_SLOP && p.moved < TAP_SLOP * 3;
    if (quick && still) this.hooks.onTap?.(e.clientX, e.clientY);
  }

  // -------------------------------------------------------------- moves ---
  _clampDist(d){ return Math.max(this.minDist, Math.min(this.maxDist, d)); }

  zoom(delta){
    this.dist = this._clampDist(this.dist + delta);
    this.apply();
  }

  /** Move the camera target by a screen-space drag, in pixels. */
  panPixels(px, py){
    const k = (2 * this.dist * Math.tan((this.camera.fov * Math.PI / 180) / 2)) / window.innerHeight;
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const move = right.multiplyScalar(px * k).add(fwd.multiplyScalar(py * k / Math.max(0.35, Math.sin(this.pitch))));
    this.target.add(move);
    this.vel.copy(move).multiplyScalar(6);
    this._clampTarget();
  }

  _clampTarget(){
    this.target.x = Math.max(-this.bound, Math.min(this.bound, this.target.x));
    this.target.z = Math.max(-this.bound, Math.min(this.bound, this.target.z));
    this.target.y = 0;
  }

  focusOn(x, z, dist){
    this.target.set(x, 0, z);
    if (dist) this.dist = this._clampDist(dist);
    this._clampTarget();
    this.apply();
  }

  apply(){
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * cp * this.dist,
      this.target.y + sp * this.dist,
      this.target.z + Math.cos(this.yaw) * cp * this.dist,
    );
    this.camera.lookAt(this.target);
  }

  update(dt){
    const k = this.keys;
    const speed = 16 * dt * (this.dist / 24);
    let px = 0, py = 0;
    if (k.has('a') || k.has('arrowleft')) px -= 1;
    if (k.has('d') || k.has('arrowright')) px += 1;
    if (k.has('w') || k.has('arrowup')) py -= 1;
    if (k.has('s') || k.has('arrowdown')) py += 1;
    if (px || py){
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).multiplyScalar(px * speed);
      const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(py * speed);
      this.target.add(right).add(fwd);
      this._clampTarget();
      this.vel.set(0, 0, 0);
    }
    if (k.has('q')) this.yaw += dt * 1.1;
    if (k.has('e')) this.yaw -= dt * 1.1;
    if (k.has('=') || k.has('+')) this.zoom(-dt * 22);
    if (k.has('-') || k.has('_')) this.zoom(dt * 22);

    // Gentle glide after a flick.
    if (!this.pointers.size && this.vel.lengthSq() > 1e-5){
      this.target.addScaledVector(this.vel, dt);
      this.vel.multiplyScalar(Math.pow(0.0025, dt));
      this._clampTarget();
    }
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
