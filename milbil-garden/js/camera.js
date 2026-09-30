// Orbit camera. One finger (or left mouse) spins around, two fingers pinch to
// zoom and drag to pan, right mouse pans, the wheel zooms. A short press that
// barely moves counts as a tap and is handed to onTap.
import * as THREE from 'three';

const TAP_SLOP = 12;
const TAP_TIME = 500;
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);

export class Rig {
  constructor(camera, el, onTap) {
    this.camera = camera;
    this.el = el;
    this.onTap = onTap;
    this.target = new THREE.Vector3(2.5, 0, 0.5);
    this.yaw = -0.35;
    this.pitch = 0.78;
    this.dist = 24;
    this.want = { yaw: this.yaw, pitch: this.pitch, dist: this.dist, target: this.target.clone() };
    this.rate = 10;
    this.limits = { minDist: 7, maxDist: 48, minPitch: 0.22, maxPitch: 1.35, bound: 26 };
    this.pointers = new Map();
    this.gesture = null;
    this.idle = 0;
    this.follow = null;      // an Object3D to keep in the middle of the view
    this._bind();
    this.update(1);
  }

  _bind() {
    const el = this.el;
    el.addEventListener('pointerdown', e => this._down(e));
    el.addEventListener('pointermove', e => this._move(e));
    el.addEventListener('pointerup', e => this._up(e));
    el.addEventListener('pointercancel', e => this._up(e, true));
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('wheel', e => {
      e.preventDefault();
      this.zoom(e.deltaY > 0 ? 1.12 : 0.89);
    }, { passive: false });
  }

  _down(e) {
    el_capture(this.el, e);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: 0, pan: e.button === 2 || e.shiftKey });
    this.gesture = null;
    this.idle = 0;
  }

  _move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    p.moved = Math.max(p.moved, Math.hypot(e.clientX - p.x0, e.clientY - p.y0));
    this.idle = 0;
    if (this.pointers.size === 1) {
      if (p.moved < TAP_SLOP) return;
      if (p.pan) this.pan(dx, dy);
      else {
        this.want.yaw -= dx * 0.006;
        this.want.pitch += dy * 0.005;
        this._clamp();
      }
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (this.gesture) {
        if (this.gesture.d > 0 && d > 0) this.zoom(this.gesture.d / d);
        this.pan(mx - this.gesture.mx, my - this.gesture.my);
      }
      this.gesture = { d, mx, my };
      for (const q of this.pointers.values()) q.moved = 99;
    }
  }

  _up(e, cancelled) {
    const p = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.gesture = null;
    if (!p || cancelled) return;
    if (this.pointers.size === 0 && p.moved < TAP_SLOP && performance.now() - p.t0 < TAP_TIME) {
      this.onTap(e.clientX, e.clientY);
    }
  }

  zoom(f) {
    this.want.dist *= f;
    this._clamp();
  }

  pan(dx, dy) {
    this.follow = null;      // moving the view yourself lets go of your milbil
    const s = this.dist * 0.0022;
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    this.want.target.addScaledVector(right, -dx * s).addScaledVector(fwd, -dy * s);
    this._clamp();
  }

  flyTo(target, dist, yaw) {
    this.follow = null;
    this.want.target.copy(target);
    if (dist) this.want.dist = dist;
    if (yaw != null) this.want.yaw = yaw;
    this._clamp();
  }

  _clamp() {
    const L = this.limits;
    this.want.dist = THREE.MathUtils.clamp(this.want.dist, L.minDist, L.maxDist);
    this.want.pitch = THREE.MathUtils.clamp(this.want.pitch, L.minPitch, L.maxPitch);
    const t = this.want.target;
    const r = Math.hypot(t.x, t.z);
    if (r > L.bound) t.multiplyScalar(L.bound / r);
    t.y = 0;
  }

  update(dt) {
    this.idle += dt;
    if (this.follow) {
      this.want.target.set(this.follow.position.x, 0, this.follow.position.z);
      this._clamp();
    }
    const k = damp(this.rate, dt);
    this.yaw += (this.want.yaw - this.yaw) * k;
    this.pitch += (this.want.pitch - this.pitch) * k;
    this.dist += (this.want.dist - this.dist) * k;
    this.target.lerp(this.want.target, k);
    const c = Math.cos(this.pitch);
    this.camera.position.set(
      this.target.x + Math.sin(this.yaw) * c * this.dist,
      this.target.y + Math.sin(this.pitch) * this.dist,
      this.target.z + Math.cos(this.yaw) * c * this.dist);
    this.camera.lookAt(this.target.x, this.target.y + 1, this.target.z);
  }
}

function el_capture(el, e) {
  try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
}
