// ---------- The milbils: small, round, permanently busy ----------
//
// One creature per resident (up to a cap), wandering between free tiles and
// stopping to look at things. They are decoration with opinions: the count is
// driven by how many homes you have built.

import * as THREE from 'three';
import { MILBIL_COLORS, MILBIL_NAMES, MAX_WANDERERS } from './data.js';
import { worldX, worldZ, landTiles } from './island.js';
import { MODELS } from './models.js';
import * as E from './econ.js';

const SPEED = 1.45;

export class Milbils {
  constructor(world, state){
    this.world = world;
    this.state = state;
    this.group = new THREE.Group();
    world.scene.add(this.group);
    this.list = [];
    this.tilesByIsle = new Map();       // island id -> walkable tiles
    this.refreshTaken();
    this.sync();
  }

  /** Match the crowd to the population, and spread it over the islands you own. */
  sync(){
    const isles = E.myIsles(this.state).map(i => i.id);
    for (const id of isles) if (!this.tilesByIsle.has(id)) this.tilesByIsle.set(id, landTiles(id));
    this.isles = isles;

    const want = Math.min(MAX_WANDERERS, E.population(this.state).total);
    while (this.list.length > want){
      const m = this.list.pop();
      this.group.remove(m.mesh);
    }
    while (this.list.length < want) this.list.push(this._make(this.list.length));

    // Claiming an island sends some of them over to have a look at it.
    this.list.forEach((m, i) => {
      const home = isles[i % isles.length];
      if (m.isle === home) return;
      m.isle = home;
      const spot = this._freeSpot(home);
      m.mesh.position.set(spot.x, 0, spot.z);
      m.target.set(spot.x, 0, spot.z);
      m.born = 0;                        // pops back into view on the new island
      m.wait = Math.random() * 2;
    });
  }

  _make(i){
    const color = MILBIL_COLORS[i % MILBIL_COLORS.length];
    const mesh = MODELS.milbil(color);
    const isle = this.isles[i % this.isles.length];
    const spot = this._freeSpot(isle);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.scale.setScalar(0.001);
    this.group.add(mesh);
    return {
      mesh, color, isle,
      name: MILBIL_NAMES[(i * 7 + 3) % MILBIL_NAMES.length],
      target: new THREE.Vector3(spot.x, 0, spot.z),
      phase: Math.random() * 6,
      wait: Math.random() * 3,
      born: 0,
      hop: 0,
    };
  }

  /** A walkable spot on one island: land, and not underneath a building. */
  _freeSpot(isleId){
    const taken = this._taken;
    const tiles = this.tilesByIsle.get(isleId) || this.tilesByIsle.get(0) || [];
    if (!tiles.length) return { x:0, z:2 };
    for (let tries = 0; tries < 24; tries++){
      const [ix, iz] = tiles[Math.floor(Math.random() * tiles.length)];
      if (taken.has(ix + ',' + iz)) continue;
      return { x: worldX(ix) + (Math.random() - 0.5) * 0.9, z: worldZ(iz) + (Math.random() - 0.5) * 0.9 };
    }
    return { x:0, z:2 };
  }

  /** Recomputed when the town changes so nobody stands inside a wall. */
  refreshTaken(){
    this._taken = E.occupied(this.state);
  }

  /** Everyone nearby turns, hops and looks pleased. */
  cheer(x, z){
    for (const m of this.list){
      if (m.mesh.position.distanceTo(new THREE.Vector3(x, 0, z)) > 7) continue;
      m.hop = 0.8;
      m.lookAt = new THREE.Vector3(x, 0, z);
      m.wait = Math.max(m.wait, 0.9);
    }
  }

  update(dt, t){
    for (const m of this.list){
      const mesh = m.mesh;

      if (m.born < 1){
        m.born = Math.min(1, m.born + dt * 2.2);
        mesh.scale.setScalar(m.born * (1 + Math.sin(m.born * Math.PI) * 0.25));
      }

      if (m.hop > 0){
        m.hop -= dt;
        mesh.position.y = Math.abs(Math.sin(m.hop * 12)) * 0.28;
        if (m.lookAt){
          const dx = m.lookAt.x - mesh.position.x, dz = m.lookAt.z - mesh.position.z;
          mesh.rotation.y = Math.atan2(dx, dz);
        }
        continue;
      }

      const dx = m.target.x - mesh.position.x;
      const dz = m.target.z - mesh.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.18){
        // Arrived: stand about, then pick somewhere new.
        m.wait -= dt;
        mesh.position.y = 0;
        const breathe = 1 + Math.sin(t * 2 + m.phase) * 0.03;
        mesh.scale.set(1, breathe, 1);
        if (m.wait <= 0){
          const spot = this._freeSpot(m.isle);
          m.target.set(spot.x, 0, spot.z);
          m.wait = 1.5 + Math.random() * 4;
          m.lookAt = null;
        }
        continue;
      }

      const step = Math.min(dist, SPEED * dt);
      mesh.position.x += (dx / dist) * step;
      mesh.position.z += (dz / dist) * step;
      mesh.rotation.y = Math.atan2(dx, dz);

      m.phase += dt * 9;
      mesh.position.y = Math.abs(Math.sin(m.phase)) * 0.09;
      mesh.scale.set(1, 1 - Math.abs(Math.sin(m.phase)) * 0.06, 1);
      const feet = mesh.userData.feet;
      if (feet){
        feet[0].position.z = 0.05 + Math.sin(m.phase) * 0.11;
        feet[1].position.z = 0.05 - Math.sin(m.phase) * 0.11;
      }
      const ears = mesh.userData.ears;
      if (ears){
        ears[0].rotation.z = -0.45 - Math.sin(m.phase * 0.5) * 0.18;
        ears[1].rotation.z = 0.45 + Math.sin(m.phase * 0.5) * 0.18;
      }
    }
  }
}
