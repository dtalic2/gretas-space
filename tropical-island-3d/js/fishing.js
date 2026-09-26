// ---------- Fishing: cast, wait for the bite, then time the reel ----------
//
// idle → cast (the bobber flies out) → wait (it bobs; press to reel in early)
//      → bite (it dips: press now!) → reel (stop the needle in the green)
//      → caught (you hold the fish up) → idle
import * as THREE from 'three';
import { height, SEA } from './terrain.js';
import { inLagoon } from './world.js';
import { makeFish } from './models.js';
import { FISH, FISHING } from './econ.js';

export class Fishing {
  constructor(scene, fx, audio, ui){
    this.scene = scene; this.fx = fx; this.audio = audio; this.ui = ui;
    this.state = 'idle';
    const bob = new THREE.Group();
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xff3a2a }));
    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    bob.add(top, bot);
    bob.visible = false;
    scene.add(bob);
    this.bob = bob;
    this.lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9 * 3), 3));
    this.line = new THREE.Line(this.lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    this.line.frustumCulled = false;
    this.line.visible = false;
    scene.add(this.line);
  }

  get busy(){ return this.state !== 'idle'; }

  /** Where the bobber would land if you cast from here, or null if that isn't water. */
  target(player){
    const p = player.position, f = player.facing;
    const x = p.x + Math.sin(f) * FISHING.reach, z = p.z + Math.cos(f) * FISHING.reach;
    return height(x, z) < -0.5 ? { x, z } : null;
  }

  cast(player){
    const at = this.target(player);
    if (!at) return false;
    this.at = at;
    this.state = 'cast';
    this.t = 0;
    this.from = player.rodTip();
    this.bob.visible = this.line.visible = true;
    player.holding = 'rod';
    this.audio.cast();
    return true;
  }

  cancel(player){
    this.state = 'idle';
    this.bob.visible = this.line.visible = false;
    this.ui.reel(null);
    if (player.holding === 'rod') player.holding = null;
  }

  _choose(night, proRod){
    const where = inLagoon(this.at.x, this.at.z) > 0.5 ? 'shallow' : 'deep';
    const pool = FISH.filter((f) => (f.where === 'any' || f.where === where) && (!f.night || night));
    const w = (f) => f.weight * (proRod && (f.price >= 18 || f.legend) ? 2.5 : 1) * (proRod && f.key === 'boot' ? 0.4 : 1);
    let total = pool.reduce((s, f) => s + w(f), 0), r = Math.random() * total;
    for (const f of pool){ r -= w(f); if (r <= 0) return f; }
    return pool[0];
  }

  /**
   * @param press  E was just pressed this frame
   * @returns      a catch { def, size } on the frame you land one
   */
  update(dt, t, player, press, { night, proRod }){
    if (this.state === 'idle') return null;
    const tip = player.rodTip();
    const water = new THREE.Vector3(this.at.x, SEA + 0.05, this.at.z);
    let result = null;

    if (this.state === 'cast'){
      this.t += dt / FISHING.castTime;
      const f = Math.min(1, this.t);
      this.bob.position.lerpVectors(this.from, water, f);
      this.bob.position.y += Math.sin(f * Math.PI) * 2.5;
      if (f >= 1){
        this.state = 'wait';
        this.waitT = FISHING.wait[0] + Math.random() * (FISHING.wait[1] - FISHING.wait[0]);
        this.fx.burst(water, 10, 0xe8fbff, { up: 2, spread: 1, size: 0.15 });
        this.audio.plop();
      }
    } else if (this.state === 'wait'){
      this.waitT -= dt;
      const nibble = this.waitT < 1.2 && Math.sin(t * 20) > 0.7 ? -0.06 : 0;
      this.bob.position.set(water.x, water.y + Math.sin(t * 2) * 0.04 + nibble, water.z);
      if (press || player.moveInput){ this.cancel(player); this.ui.toast('You reel the line back in.'); return null; }
      if (this.waitT <= 0){
        this.state = 'bite';
        this.biteT = FISHING.bite;
        this.audio.bite();
        this.ui.bite(true);
      }
    } else if (this.state === 'bite'){
      this.biteT -= dt;
      this.bob.position.set(water.x, water.y - 0.18 + Math.sin(t * 30) * 0.05, water.z);
      if (Math.random() < dt * 20) this.fx.emit({ x: water.x, y: water.y, z: water.z, vx: (Math.random() - 0.5), vy: 1.5, vz: (Math.random() - 0.5), life: 0.5, color: 0xffffff, size: 0.12, gravity: 5 });
      if (press){
        this.ui.bite(false);
        this.fish = this._choose(night, proRod);
        const zone = Math.min(0.6, this.fish.zone * (proRod ? 1.4 : 1));
        this.zone = [0.12 + Math.random() * (0.76 - zone), 0];
        this.zone[1] = this.zone[0] + zone;
        this.needle = 0; this.dir = 1;
        this.reelT = 0;
        this.state = 'reel';
        this.audio.reel();
      } else if (this.biteT <= 0){
        this.ui.bite(false);
        this.cancel(player);
        this.ui.toast('🐟 Too slow! It swam away.');
        this.audio.miss();
      }
    } else if (this.state === 'reel'){
      this.reelT += dt;
      this.needle += this.dir * dt * 0.75 * this.fish.speed;
      if (this.needle > 1){ this.needle = 1; this.dir = -1; }
      if (this.needle < 0){ this.needle = 0; this.dir = 1; }
      this.bob.position.set(water.x + Math.sin(t * 7) * 0.3, water.y - 0.1, water.z + Math.cos(t * 5) * 0.3);
      if (Math.random() < dt * 12) this.fx.emit({ x: this.bob.position.x, y: water.y, z: this.bob.position.z, vy: 1.2, life: 0.4, color: 0xffffff, size: 0.14, gravity: 4 });
      this.ui.reel({ zone: this.zone, needle: this.needle, fish: this.fish });
      if (press){
        this.ui.reel(null);
        if (this.needle >= this.zone[0] && this.needle <= this.zone[1]){
          const [a, b] = this.fish.size;
          result = { def: this.fish, size: Math.round(a + Math.random() * (b - a)) };
          this._showCatch(player);
        } else {
          this.cancel(player);
          this.ui.toast('💦 Oh no, it got away!');
          this.audio.miss();
        }
      } else if (this.reelT > 7){
        this.ui.reel(null);
        this.cancel(player);
        this.ui.toast('💦 The line went slack. It got away!');
      }
    } else if (this.state === 'caught'){
      this.t -= dt;
      this.held.position.copy(player.position).add(new THREE.Vector3(0, 2.7 + Math.sin(t * 4) * 0.05, 0));
      this.held.rotation.y += dt * 2;
      this.held.rotation.z = Math.sin(t * 12) * 0.2;
      if (this.t <= 0){
        this.scene.remove(this.held);
        this.held = null;
        this.state = 'idle';
        player.holding = null;
      }
    }

    // The line, sagging from the rod tip to the bobber.
    if (this.line.visible){
      const a = this.lineGeo.attributes.position.array, b = this.bob.position;
      const slack = this.state === 'wait' ? 0.6 : 0.15;
      for (let i = 0; i < 9; i++){
        const f = i / 8;
        a[i * 3] = tip.x + (b.x - tip.x) * f;
        a[i * 3 + 1] = tip.y + (b.y - tip.y) * f - Math.sin(f * Math.PI) * slack;
        a[i * 3 + 2] = tip.z + (b.z - tip.z) * f;
      }
      this.lineGeo.attributes.position.needsUpdate = true;
    }
    return result;
  }

  _showCatch(player){
    this.bob.visible = this.line.visible = false;
    this.state = 'caught';
    this.t = 2.4;
    this.held = makeFish(this.fish);
    this.scene.add(this.held);
    player.holding = 'fish';
    const at = player.position.clone().add(new THREE.Vector3(0, 2.7, 0));
    this.fx.burst(at, 30, this.fish.legend ? 0xffd23a : 0xe8fbff, { up: 4, spread: 2, size: 0.22, life: 1, gravity: 4 });
    this.audio.catch(this.fish.legend);
  }
}
