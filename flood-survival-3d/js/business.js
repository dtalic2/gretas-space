// ---------- The business: benches that finish work, neighbours who buy it ----------
//
// The stall is the only source of real money, and it only earns while there is
// something finished sitting on it. That is the loop the whole game hangs off:
// gather, craft, come back and find money waiting.
import * as THREE from 'three';
import { PRODUCTS } from './econ.js';
import { makeVillager, animateFigure } from './world.js';
import { height } from './terrain.js';

// Where customers come from. Down the road, mostly.
const APPROACH = [[-16, 26], [-18, 8], [-4, 4], [6, 28], [-12, 32]];

export class Business {
  constructor(scene, state, audio){
    this.state = state;
    this.audio = audio;
    this.timer = 0;
    this.customers = [];

    const looks = [[0x7c6bb0, 0x8f4b3c], [0x4f8a6f, 0x2f3a44], [0xb0764f, 0x5a4030], [0x8a4f6f, 0x3a2f44]];
    for (let i = 0; i < 4; i++){
      const fig = makeVillager(...looks[i]);
      fig.visible = false;
      scene.add(fig);
      this.customers.push({ fig, phase: 'idle', t: 0, from: new THREE.Vector2(), bought: null });
    }
  }

  /** Craft benches tick even while you are away. */
  _tickCrafts(dt, onDone){
    const s = this.state;
    for (let i = s.crafts.length - 1; i >= 0; i--){
      const c = s.crafts[i];
      c.t += dt;
      if (c.t >= c.secs){
        s.crafts.splice(i, 1);
        s.shelf[c.id] = (s.shelf[c.id] || 0) + 1;
        onDone?.(PRODUCTS.find((p) => p.id === c.id));
      }
    }
  }

  /**
   * @param stall   the stall station { pos }
   * @param open    false when the stall is under water and shut
   * @param onSale  called with { id, paid, pos } so the HUD can pop a number
   */
  update(dt, stall, level, open, onSale, onCraft){
    this._tickCrafts(dt, onCraft);

    const s = this.state;
    const target = stall.pos;

    if (open && s.shelfCount() > 0){
      this.timer += dt;
      const every = s.tierInfo.custEvery;
      if (this.timer >= every){
        this.timer = 0;
        this._dispatch(target);
      }
    } else {
      // Nobody queues at a shut stall, but don't bank up a rush either.
      this.timer = Math.min(this.timer + dt, s.tierInfo.custEvery);
    }

    for (const c of this.customers) this._step(c, dt, target, level, onSale);
  }

  _dispatch(target){
    const c = this.customers.find((q) => q.phase === 'idle');
    if (!c) return;
    const [x, z] = APPROACH[Math.floor(Math.random() * APPROACH.length)];
    c.from.set(x, z);
    c.fig.position.set(x, height(x, z), z);
    c.fig.visible = true;
    c.phase = 'in';
    c.t = 0;
    void target;
  }

  _step(c, dt, target, level, onSale){
    if (c.phase === 'idle') return;
    const fig = c.fig;

    // Stand at the counter, not on it.
    const stand = new THREE.Vector3(target.x, 0, target.z + 1.6);
    const goal = c.phase === 'out' ? new THREE.Vector3(c.from.x, 0, c.from.y) : stand;

    const dx = goal.x - fig.position.x, dz = goal.z - fig.position.z;
    const d = Math.hypot(dx, dz);

    if (c.phase === 'buy'){
      c.t += dt;
      animateFigure(fig, dt, 0.12);
      if (c.t > 1.0){
        const sale = this.state.sellOne();
        if (sale){
          this.audio.cash();
          onSale?.({ ...sale, pos: fig.position.clone().setY(fig.position.y + 2.0) });
        }
        c.phase = 'out';
        c.t = 0;
      }
    } else if (d > 1.0){
      const sp = 3.0 * dt;
      fig.position.x += (dx / d) * sp;
      fig.position.z += (dz / d) * sp;
      fig.rotation.y = Math.atan2(dx, dz);
      animateFigure(fig, dt, 0.8);
    } else if (c.phase === 'in'){
      c.phase = 'buy';
      c.t = 0;
      fig.rotation.y = Math.atan2(target.x - fig.position.x, target.z - fig.position.z);
    } else {
      c.phase = 'idle';
      fig.visible = false;
    }

    // Wade or swim, same as everybody else.
    const ground = height(fig.position.x, fig.position.z);
    fig.position.y = Math.max(ground, level - 1.05);
  }
}
