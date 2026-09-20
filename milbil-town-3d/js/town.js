// ---------- Keeping the 3D town in step with the saved state ----------
//
// state.objs is the truth. This module owns one Group per object, rebuilds the
// bits that change (a growing crop, a finished shelf), runs the small idle
// animations, and handles the ghost you drag around when placing something.

import * as THREE from 'three';
import { TILE, GRID } from './data.js';
import { footCentre, CENTRE } from './island.js';
import { makeModel, cropMesh, ghostify, tilePad } from './models.js';
import * as E from './econ.js';

/** A pool of soft puffs used for chimneys, steam and harvest poofs. */
class Puffs {
  constructor(scene, n = 30){
    this.items = [];
    const geo = new THREE.IcosahedronGeometry(0.28, 0);
    for (let i = 0; i < n; i++){
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
        color:0xffffff, flatShading:true, transparent:true, opacity:0 }));
      m.visible = false;
      scene.add(m);
      this.items.push({ mesh:m, life:0, max:1, vy:0, drift:new THREE.Vector3() });
    }
    this.next = 0;
  }

  spawn(pos, color = 0xffffff, up = 0.7, spread = 0.25, life = 1.6){
    const p = this.items[this.next = (this.next + 1) % this.items.length];
    p.mesh.position.copy(pos);
    p.mesh.position.x += (Math.random() - 0.5) * spread;
    p.mesh.position.z += (Math.random() - 0.5) * spread;
    p.mesh.material.color.setHex(color);
    p.mesh.scale.setScalar(0.5 + Math.random() * 0.5);
    p.mesh.visible = true;
    p.life = p.max = life;
    p.vy = up * (0.7 + Math.random() * 0.6);
    p.drift.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4);
  }

  update(dt){
    for (const p of this.items){
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0){ p.mesh.visible = false; continue; }
      const k = p.life / p.max;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.addScaledVector(p.drift, dt);
      p.mesh.material.opacity = k * 0.75;
      p.mesh.scale.setScalar((0.5 + (1 - k) * 0.9));
    }
  }
}

export class Town {
  constructor(world, state){
    this.world = world;
    this.state = state;
    this.group = world.town;
    this.entries = new Map();          // uid -> { obj, group, top, crop }
    this.puffs = new Puffs(world.scene);
    this.place = null;                 // active ghost, if any
    this.t = 0;
    this.sync();
  }

  // ------------------------------------------------------------- syncing --
  sync(){
    const seen = new Set();
    for (const obj of this.state.objs){
      seen.add(obj.uid);
      let e = this.entries.get(obj.uid);
      if (!e){
        const group = makeModel(obj.type);
        group.userData.uid = obj.uid;
        this.group.add(group);
        e = { obj, group, crop:null, top:2 };
        this.entries.set(obj.uid, e);
        const box = new THREE.Box3().setFromObject(group);
        e.top = Math.max(0.8, box.max.y);
        e.smokeAt = group.userData.smokeAt || null;
        e.bob = group.userData.bob || null;
        e.spin = group.userData.spin || null;
        e.bobbers = group.userData.bobbers || null;
        e.spout = group.userData.spout || null;
        e.born = performance.now();
      }
      e.obj = obj;
      const { w, d } = E.footprint(obj);
      const c = footCentre(obj.x, obj.z, w, d);
      e.group.position.set(c.x, 0, c.z);
      e.home = new THREE.Vector3(c.x, 0, c.z);
      this.refresh(obj);
    }
    for (const [uid, e] of this.entries){
      if (seen.has(uid)) continue;
      this.group.remove(e.group);
      this.entries.delete(uid);
    }
  }

  /** Rebuild the parts of one object that depend on its state. */
  refresh(obj){
    const e = this.entries.get(obj.uid);
    if (!e) return;
    if (obj.type !== 'field') return;

    const now = Date.now();
    const stage = !obj.crop ? -1
      : E.cropReady(obj, now) ? 2
      : E.cropProgress(obj, now) > 0.45 ? 1 : 0;

    if (e.crop && (e.crop.id !== obj.crop || e.crop.stage !== stage)){
      e.group.remove(e.crop.mesh);
      e.crop = null;
    }
    if (obj.crop && !e.crop){
      const mesh = cropMesh(E.crop(obj.crop), stage);
      mesh.position.y = 0.22;
      e.group.add(mesh);
      e.crop = { id:obj.crop, stage, mesh };
      e.cropPop = 0.001;
    }
  }

  entry(uid){ return this.entries.get(uid); }

  /** World position of an object's centre, and how high its bubble should float. */
  anchor(uid){
    const e = this.entries.get(uid);
    if (!e) return null;
    return new THREE.Vector3(e.group.position.x, e.top + 0.5, e.group.position.z);
  }

  pickables(){
    const out = [];
    for (const e of this.entries.values()) out.push(e.group);
    return out;
  }

  /** Turn a raycast hit into the uid of the thing that was tapped. */
  uidOf(hit){
    let n = hit && hit.object;
    while (n){
      if (n.userData && n.userData.uid != null) return n.userData.uid;
      n = n.parent;
    }
    return null;
  }

  // ------------------------------------------------------------ placing ---
  /** Start dragging a ghost: either a new `type`, or an existing object by uid. */
  beginPlace(type, movingUid = null){
    this.cancelPlace();
    const model = ghostify(makeModel(type), true);
    const holder = new THREE.Group();
    holder.add(model);
    const d = E.def(type);
    const pad = tilePad(d.w, d.d, true);
    holder.add(pad);
    this.world.scene.add(holder);

    const start = movingUid != null ? this.state.objs.find(o => o.uid === movingUid) : null;
    this.place = { type, uid:movingUid, holder, model, pad, ok:false, w:d.w, d:d.d,
                   x: start ? start.x : Math.round(CENTRE), z: start ? start.z : Math.round(CENTRE) };
    if (movingUid != null){
      const e = this.entries.get(movingUid);
      if (e) e.group.visible = false;      // you are holding it, so it leaves its spot
    }
    this.setGhost(this.place.x, this.place.z);
    return this.place;
  }

  /** Move the ghost onto tile (ix,iz), clamped so it never leaves the grid. */
  setGhost(ix, iz){
    const p = this.place;
    if (!p) return;
    p.x = ix; p.z = iz;
    const c = footCentre(ix, iz, p.w, p.d);
    p.holder.position.set(c.x, 0, c.z);
    const check = E.canPlace(this.state, p.type, ix, iz, p.uid == null ? undefined : p.uid);
    p.ok = check.ok;
    p.why = check.why;
    ghostify(p.model, p.ok);
    p.pad.material.color.setHex(p.ok ? 0x6ee08a : 0xff7a66);
  }

  /** Point the ghost at a world position (from a drag or a tap on the ground). */
  ghostToWorld(point){
    const p = this.place;
    if (!p || !point) return;
    // The pointer sits in the middle of the footprint, so even footprints need
    // the half-tile nudge to land on a sensible anchor.
    const ix = Math.round((point.x / TILE) + CENTRE - (p.w - 1) / 2);
    const iz = Math.round((point.z / TILE) + CENTRE - (p.d - 1) / 2);
    const max = GRID - 1;
    this.setGhost(Math.max(0, Math.min(max, ix)), Math.max(0, Math.min(max, iz)));
  }

  cancelPlace(){
    if (!this.place) return;
    this.world.scene.remove(this.place.holder);
    if (this.place.uid != null){
      const e = this.entries.get(this.place.uid);
      if (e) e.group.visible = true;
    }
    this.place = null;
  }

  // ---------------------------------------------------------- animation ---
  update(dt, now){
    this.t += dt;
    const t = this.t;
    this.puffs.update(dt);

    for (const e of this.entries.values()){
      const obj = e.obj;

      // Ready things bounce: a field you can harvest, a shelf you can empty.
      let ready = false;
      if (obj.type === 'field') ready = E.cropReady(obj, now);
      else if (obj.ready && obj.ready.length) ready = true;
      const wobble = ready ? Math.abs(Math.sin(t * 3.2 + obj.uid)) * 0.12 : 0;
      e.group.position.y = wobble;

      // A new building drops in with a small squash. It stays close to full
      // size throughout, so a tap in that first half second still lands on it.
      if (e.born){
        const age = (performance.now() - e.born) / 1000;
        if (age < 0.5){
          const k = age / 0.5;
          e.group.scale.setScalar(0.88 + 0.12 * k + Math.sin(k * Math.PI) * 0.1);
        } else if (e.group.scale.x !== 1){
          e.group.scale.setScalar(1);
          e.born = null;
        }
      }

      if (e.crop && e.cropPop != null && e.cropPop < 1){
        e.cropPop = Math.min(1, e.cropPop + dt * 3);
        const k = e.cropPop;
        e.crop.mesh.scale.set(1, 0.4 + 0.6 * k + Math.sin(k * Math.PI) * 0.2, 1);
      }

      if (e.bob) e.bob.position.y = 1.1 + Math.sin(t * 0.9 + obj.uid) * 0.18;
      if (e.spin) e.spin.rotation.y += dt * (obj.queue && obj.queue.length ? 1.6 : 0.25);
      if (e.spout) e.spout.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
      if (e.bobbers){
        e.bobbers.forEach((b, i) => {
          b.position.y = 0.12 + Math.abs(Math.sin(t * 1.4 + i * 2)) * 0.12;
          b.rotation.y = Math.sin(t * 0.6 + i) * 0.5;
        });
      }

      // Chimneys and pots only smoke when something is actually cooking.
      if (e.smokeAt){
        const busy = obj.type === 'cottage' ? true : !!(obj.queue && obj.queue.length);
        e.smokeTimer = (e.smokeTimer || 0) - dt;
        if (busy && e.smokeTimer <= 0){
          e.smokeTimer = obj.type === 'cottage' ? 2.2 : 0.55;
          const p = e.smokeAt.clone().add(e.group.position);
          this.puffs.spawn(p, obj.type === 'cottage' ? 0xe9e4dc : 0xfff4e0, 0.8, 0.2, 2.2);
        }
      }
    }
  }

  /** A little burst of colour over a building — harvests, deliveries, level-ups. */
  poof(uid, color, n = 8){
    const a = this.anchor(uid);
    if (!a) return;
    for (let i = 0; i < n; i++) this.puffs.spawn(a, color, 1.1, 0.9, 1.1);
  }
}
