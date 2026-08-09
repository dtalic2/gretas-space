// ---------- Third-person character + orbit camera ----------
import * as THREE from 'three';
import { GARDEN_Y, BED_HALF } from './world.js';

const lam = (c) => new THREE.MeshLambertMaterial({ color:c, flatShading:true });
const BOUND = 18.2;   // inside the fence, which now reaches +/-19
const SPEED = 6.2;

export class Player {
  constructor(world){
    this.world = world;
    this.velocity = new THREE.Vector3();
    this.heading = 0;
    this.walkPhase = 0;

    // Orbit camera state.
    this.camYaw = 0;
    this.camPitch = 0.42;
    this.camDist = 12;
    this.camTarget = new THREE.Vector3();

    this.keys = new Set();
    this.stick = { x:0, y:0 };

    this.root = this._build();
    this.root.position.set(0, 0, 9);
    world.scene.add(this.root);

    this._bindInput();
  }

  _build(){
    const g = new THREE.Group();

    const legMat = lam(0x3f5aa6);
    this.legs = [];
    for (const side of [-1, 1]){
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.62, 0.26), legMat);
      leg.position.set(side * 0.17, 0.31, 0);
      leg.castShadow = true;
      g.add(leg);
      this.legs.push(leg);
    }

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.78, 0.46), lam(0x4c9a2a));
    body.position.y = 1.0;
    body.castShadow = true;
    g.add(body);

    // Dungaree straps for a bit of character.
    for (const side of [-1, 1]){
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.05), lam(0x3f5aa6));
      strap.position.set(side * 0.2, 1.14, 0.245);
      g.add(strap);
    }

    this.arms = [];
    for (const side of [-1, 1]){
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), lam(0xe8c98a));
      arm.position.set(side * 0.48, 1.02, 0);
      arm.castShadow = true;
      g.add(arm);
      this.arms.push(arm);
    }

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.52, 0.5), lam(0xe8c98a));
    head.position.y = 1.66;
    head.castShadow = true;
    g.add(head);
    this.head = head;

    // Eyes so it reads as facing forward.
    for (const side of [-1, 1]){
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.05), lam(0x2b2016));
      eye.position.set(side * 0.14, 1.7, 0.255);
      g.add(eye);
    }

    // Straw hat.
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.07, 12), lam(0xd9a441));
    brim.position.y = 1.95; brim.castShadow = true; g.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.28, 12), lam(0xc79322));
    crown.position.y = 2.09; crown.castShadow = true; g.add(crown);

    return g;
  }

  _bindInput(){
    addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    // Camera control. One pointer orbits, two pinch to zoom. Tracking every
    // active pointer matters on touch: with a single-pointer model a second
    // finger fights the orbit instead of starting a pinch, and `touch-action:
    // none` means the browser won't zoom for us.
    const canvas = this.world.canvas;
    const active = new Map();     // pointerId -> {x, y}
    let lastX = 0, lastY = 0;
    let pinchDist = 0;

    /** Distance between the first two active pointers. */
    const spread = () => {
      const [a, b] = [...active.values()];
      return (a && b) ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };

    canvas.addEventListener('pointerdown', (e) => {
      active.set(e.pointerId, { x:e.clientX, y:e.clientY });
      // Capture is a nicety — it keeps a drag alive if the finger leaves the
      // canvas. It throws on an unknown pointer id, which must not take the
      // rest of this handler down with it.
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      if (active.size === 1){ lastX = e.clientX; lastY = e.clientY; }
      else if (active.size === 2){ pinchDist = spread(); }
      this.pinching = active.size >= 2;
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!active.has(e.pointerId)) return;
      active.set(e.pointerId, { x:e.clientX, y:e.clientY });

      if (active.size >= 2){
        // Pinch: the change in finger spread drives the camera distance.
        const d = spread();
        if (pinchDist > 0 && d > 0){
          this.camDist = THREE.MathUtils.clamp(this.camDist * (pinchDist / d), 5, 26);
        }
        pinchDist = d;
        return;
      }

      this.camYaw   -= (e.clientX - lastX) * 0.006;
      this.camPitch -= (e.clientY - lastY) * 0.004;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch, 0.08, 1.15);
      lastX = e.clientX; lastY = e.clientY;
    });

    const stop = (e) => {
      active.delete(e.pointerId);
      try {
        if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      } catch {}
      // Lifting one finger of a pinch hands control back to the one still down,
      // without it jumping the camera by the gap between them.
      if (active.size === 1){
        const [p] = [...active.values()];
        lastX = p.x; lastY = p.y;
      }
      pinchDist = active.size >= 2 ? spread() : 0;
      if (active.size === 0) this.pinching = false;
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.012, 5, 26);
    }, { passive:false });
  }

  /** Movement vector from keyboard + virtual stick, in camera space. */
  _inputVector(){
    const k = this.keys;
    let x = 0, z = 0;
    if (k.has('KeyW') || k.has('ArrowUp'))    z -= 1;
    if (k.has('KeyS') || k.has('ArrowDown'))  z += 1;
    if (k.has('KeyA') || k.has('ArrowLeft'))  x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    x += this.stick.x;
    z += this.stick.y;
    const v = new THREE.Vector2(x, z);
    if (v.lengthSq() > 1) v.normalize();
    return v;
  }

  update(dt, frozen){
    const input = frozen ? new THREE.Vector2(0, 0) : this._inputVector();
    const moving = input.lengthSq() > 0.001;

    if (moving){
      // Translate stick input into world space using the camera's yaw.
      const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
      const wx = input.x * cos - input.y * sin;
      const wz = input.x * sin + input.y * cos;

      this.velocity.x = wx * SPEED;
      this.velocity.z = wz * SPEED;
      this.heading = Math.atan2(wx, wz);
    } else {
      this.velocity.multiplyScalar(Math.max(0, 1 - dt * 14));
    }

    this.root.position.x = THREE.MathUtils.clamp(this.root.position.x + this.velocity.x * dt, -BOUND, BOUND);
    this.root.position.z = THREE.MathUtils.clamp(this.root.position.z + this.velocity.z * dt, -BOUND, BOUND);

    // Step up onto the raised garden bed.
    const onBed = Math.abs(this.root.position.x) < BED_HALF && Math.abs(this.root.position.z) < BED_HALF;
    const targetY = onBed ? GARDEN_Y : 0;
    this.root.position.y += (targetY - this.root.position.y) * Math.min(1, dt * 12);

    // Face the direction of travel.
    let diff = this.heading - this.root.rotation.y;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.root.rotation.y += diff * Math.min(1, dt * 12);

    // Walk cycle.
    const speedFrac = Math.min(1, this.velocity.length() / SPEED);
    this.walkPhase += dt * 11 * speedFrac;
    const swing = Math.sin(this.walkPhase) * 0.7 * speedFrac;
    this.legs[0].rotation.x =  swing;
    this.legs[1].rotation.x = -swing;
    this.arms[0].rotation.x = -swing * 0.8;
    this.arms[1].rotation.x =  swing * 0.8;
    this.head.position.y = 1.66 + Math.abs(Math.sin(this.walkPhase)) * 0.035 * speedFrac;

    this._updateCamera(dt);
  }

  _updateCamera(dt){
    const p = this.root.position;
    this.camTarget.lerp(new THREE.Vector3(p.x, p.y + 1.5, p.z), Math.min(1, dt * 8));

    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    const offset = new THREE.Vector3(
      Math.sin(this.camYaw) * cp * this.camDist,
      sp * this.camDist,
      Math.cos(this.camYaw) * cp * this.camDist
    );

    const cam = this.world.camera;
    cam.position.lerp(this.camTarget.clone().add(offset), Math.min(1, dt * 9));
    // Never let the camera dip below the ground.
    cam.position.y = Math.max(1.2, cam.position.y);
    cam.lookAt(this.camTarget);
  }

  get position(){ return this.root.position; }
}
