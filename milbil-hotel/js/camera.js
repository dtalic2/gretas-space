// ---------- Looking at the hotel: drag to scroll, pinch or wheel to zoom ----------
//
// The camera always faces the open front of the building. Dragging moves it
// up, down and along; zoom moves it nearer. A press that barely moves is a tap.

import * as THREE from 'three';

const FOV_HALF = THREE.MathUtils.degToRad(19);

export class CameraRig {
  constructor(camera, canvas, { onTap } = {}){
    this.camera = camera;
    this.canvas = canvas;
    this.onTap = onTap;
    this.target = new THREE.Vector3(-1, 3, 0);
    this.goal = this.target.clone();
    this.dist = 30;
    this.goalDist = 30;
    this.yaw = 0.12;
    this.top = 6;                      // how high the view may go, set by the hotel
    this.pointers = new Map();
    this.keys = new Set();
    this._wire();
  }

  /** Pull back far enough that the hotel's width fits on screen. */
  fit(){
    const aspect = this.camera.aspect || 1;
    const need = 10.5 / (Math.tan(FOV_HALF) * aspect);
    this.goalDist = THREE.MathUtils.clamp(Math.max(24, need), 14, 90);
    this.dist = this.goalDist;
  }

  /** How high the view may go, and the middle of the building to rest on when zoomed out. */
  setTop(y, mid = y){ this.top = y; this.mid = mid; }

  lookAt(y){ this.goal.y = y; this._clamp(); }

  _wire(){
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x:e.clientX, y:e.clientY, sx:e.clientX, sy:e.clientY, t:performance.now() });
      if (this.pointers.size === 2) this._pinch = this._spread();
      this._moved = false;
    });
    c.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (Math.hypot(p.x - p.sx, p.y - p.sy) > 8) this._moved = true;
      if (this.pointers.size === 1){
        const k = this.dist * 2 * Math.tan(FOV_HALF) / c.clientHeight;
        this.goal.x -= dx * k;
        this.goal.y += dy * k;
        this._clamp();
      } else if (this.pointers.size === 2){
        const s = this._spread();
        if (this._pinch) this.goalDist = THREE.MathUtils.clamp(this.goalDist * this._pinch / s, 12, 95);
        this._pinch = s;
      }
    });
    const up = (e) => {
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this._pinch = null;
      if (p && !this._moved && this.pointers.size === 0 && performance.now() - p.t < 600){
        this.onTap && this.onTap(e.clientX, e.clientY);
      }
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', (e) => { this.pointers.delete(e.pointerId); this._moved = true; });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) * 1.5 && !e.shiftKey){
        this.goalDist = THREE.MathUtils.clamp(this.goalDist * Math.exp(e.deltaY * 0.0012), 12, 95);
      } else {
        this.goal.x += e.deltaX * 0.02;
      }
    }, { passive:false });
    window.addEventListener('keydown', (e) => { if (!e.target.closest('input,textarea')) this.keys.add(e.key.toLowerCase()); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  _spread(){
    const [a, b] = [...this.pointers.values()];
    return Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
  }

  _clamp(){
    this.goal.x = THREE.MathUtils.clamp(this.goal.x, -16, 16);
    // Zoomed right out, a view of the pavement is mostly grass: keep the hotel in frame.
    const low = Math.min(this.mid ?? this.top, 2 + Math.max(0, this.goalDist - 26) * 0.3);
    this.goal.y = THREE.MathUtils.clamp(this.goal.y, low, this.top);
  }

  update(dt){
    const k = this.keys, pan = 14 * dt;
    if (k.has('w') || k.has('arrowup')) this.goal.y += pan;
    if (k.has('s') || k.has('arrowdown')) this.goal.y -= pan;
    if (k.has('a') || k.has('arrowleft')) this.goal.x -= pan;
    if (k.has('d') || k.has('arrowright')) this.goal.x += pan;
    if (k.has('+') || k.has('=')) this.goalDist = Math.max(12, this.goalDist - 30 * dt);
    if (k.has('-') || k.has('_')) this.goalDist = Math.min(95, this.goalDist + 30 * dt);
    this._clamp();

    const s = Math.min(1, dt * 9);
    this.target.lerp(this.goal, s);
    this.dist += (this.goalDist - this.dist) * s;
    const cam = this.camera;
    cam.position.set(this.target.x + Math.sin(this.yaw) * this.dist,
                     this.target.y + this.dist * 0.1,
                     Math.cos(this.yaw) * this.dist);
    cam.lookAt(this.target.x, this.target.y, 0);
  }
}
