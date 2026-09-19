// ---------- The visitors waiting on the helipad ----------
//
// Every order on the board is somebody: one of the drawn characters lands,
// stands about next to the pad until you mail them their goods, and then the
// helicopter takes them away again.

import * as THREE from 'three';
import { CHARACTERS } from './data.js';
import { characterSprite } from './models.js';
import * as E from './econ.js';

// Where visitors stand, in the helipad's own space. Front first, so a single
// visitor is always the one you can see.
const SLOTS = [[0, 4.0], [-2.7, 3.3], [2.7, 3.3], [-4.0, 0.6], [4.0, 0.6]];

export class Visitors {
  constructor(world, state, town){
    this.world = world;
    this.state = state;
    this.town = town;
    this.loader = new THREE.TextureLoader();
    this.textures = new Map();
    this.items = new Map();          // order uid -> visitor
    this.heli = { phase:'idle', t:0, spin:0 };
    this.sync();
  }

  _texture(c){
    let t = this.textures.get(c.id);
    if (!t){
      t = this.loader.load(c.art);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      this.textures.set(c.id, t);
    }
    return t;
  }

  pad(){
    const obj = this.state.objs.find(o => o.type === 'helipad');
    if (!obj) return null;
    const e = this.town.entry(obj.uid);
    return e ? { obj, entry:e } : null;
  }

  /** Match the crowd to the order board. */
  sync(){
    const pad = this.pad();
    if (!pad) return;
    const orders = this.state.orders.slice(0, SLOTS.length);

    orders.forEach((order, i) => {
      let v = this.items.get(order.uid);
      if (!v){
        const c = E.characterFor(order);
        const group = characterSprite(this._texture(c));
        group.userData.uid = pad.obj.uid;          // tapping one opens the board
        pad.entry.group.add(group);
        v = { group, c, phase: Math.random() * 6, born: 0, leaving: 0 };
        this.items.set(order.uid, v);
      }
      const [x, z] = SLOTS[i];
      v.group.position.x = x;
      v.group.position.z = z;
    });

    for (const [uid, v] of this.items){
      if (!orders.some(o => o.uid === uid) && !v.leaving) v.leaving = 0.001;
    }
  }

  /** Send the helicopter up with a delivery. */
  takeOff(){
    if (this.heli.phase === 'idle'){ this.heli.phase = 'up'; this.heli.t = 0; }
  }

  update(dt, t){
    const pad = this.pad();
    if (!pad) return;

    for (const [uid, v] of this.items){
      const sprite = v.group.userData.sprite;
      const h = sprite.scale.y;

      if (v.born < 1){
        v.born = Math.min(1, v.born + dt * 2);
        sprite.material.opacity = v.born;
        v.group.userData.shade.material.opacity = v.born * 0.22;
      }

      if (v.leaving){
        // A hop, then straight up after the helicopter.
        v.leaving += dt;
        const k = Math.min(1, v.leaving / 1.1);
        sprite.position.y = h / 2 + Math.sin(k * Math.PI) * 0.5 + k * k * 4;
        sprite.material.opacity = Math.max(0, 1 - k * 1.2);
        v.group.userData.shade.material.opacity = Math.max(0, 0.22 * (1 - k * 2));
        if (k >= 1){
          v.group.parent && v.group.parent.remove(v.group);
          sprite.material.dispose();
          this.items.delete(uid);
        }
        continue;
      }

      sprite.position.y = h / 2 + Math.sin(t * 1.5 + v.phase) * 0.07;
      sprite.material.rotation = Math.sin(t * 0.9 + v.phase) * 0.035;
    }

    this._heli(dt, pad.entry.group.userData.heli, pad.entry.group.userData.sock, t);
  }

  /** Idle on the pad, lift off on a delivery, come back a moment later. */
  _heli(dt, heli, sock, t){
    if (sock) sock.rotation.y = Math.sin(t * 0.4) * 0.7;
    if (!heli) return;
    const h = this.heli;
    const ease = (k) => k * k * (3 - 2 * k);

    if (h.phase === 'idle'){
      h.spin += (2 - h.spin) * Math.min(1, dt * 2);
      heli.position.set(0, 0.26, 0);
      heli.rotation.set(0, 0, 0);
      heli.visible = true;
    } else if (h.phase === 'up'){
      h.t += dt;
      const k = Math.min(1, h.t / 1.7);
      h.spin += (34 - h.spin) * Math.min(1, dt * 3);
      heli.position.set(-ease(k) * 13, 0.26 + ease(k) * 8, ease(k) * 4);
      heli.rotation.z = ease(k) * 0.22;
      heli.rotation.y = ease(k) * 0.5;
      if (k >= 1){ h.phase = 'away'; h.t = 0; heli.visible = false; }
    } else if (h.phase === 'away'){
      h.t += dt;
      if (h.t > 2.2){ h.phase = 'back'; h.t = 0; heli.visible = true; }
    } else if (h.phase === 'back'){
      h.t += dt;
      const k = Math.min(1, h.t / 1.9);
      h.spin += (14 - h.spin) * Math.min(1, dt * 2);
      const b = 1 - ease(k);
      heli.position.set(-b * 13, 0.26 + b * 8, b * 4);
      heli.rotation.z = b * 0.22;
      heli.rotation.y = b * 0.5;
      if (k >= 1){ h.phase = 'idle'; h.t = 0; }
    }

    const rotor = heli.userData.rotor;
    const tail = heli.userData.tailRotor;
    if (rotor) rotor.rotation.y += h.spin * dt;
    if (tail) tail.rotation.y += h.spin * 1.6 * dt;
  }
}
