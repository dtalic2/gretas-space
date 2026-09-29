// ---------- A single run: the dog, physics, collisions, questions, power-ups, rivals ----------

import * as THREE from 'three';
import { LANE_X, RUN, POWERUPS, RIVALS, DOGS } from './data.js';
import { buildDog, animateDog } from './dog.js';
import { Spawner, revealGate, markGate } from './entities.js';
import { newRunStats } from './progress.js';

const HALF_W = 0.42, HALF_D = 0.45, STAND_H = 1.25, SLIDE_H = 0.55;
const ROCKET_Y = 7;

export class Run {
  constructor({ world, effects, engine, save, dog, hooks }){
    this.world = world;
    this.scene = world.scene;
    this.fx = effects;
    this.engine = engine;
    this.save = save;
    this.hooks = hooks;           // callbacks into main/ui
    this.dog = dog;               // built dog object (owned by main)
    this.spawner = new Spawner(this.scene);
    this.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 16),
      new THREE.MeshStandardMaterial({ color:0x4cc9f0, emissive:0x2aa6d6, emissiveIntensity:0.6,
        transparent:true, opacity:0.22, roughness:0.1, depthWrite:false }));
    this.shieldMesh.visible = false;
    this.scene.add(this.shieldMesh);
    this.magnetRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.04, 8, 40),
      new THREE.MeshBasicMaterial({ color:0xff3b5c, transparent:true, opacity:0.6 }));
    this.magnetRing.rotation.x = Math.PI / 2;
    this.magnetRing.visible = false;
    this.scene.add(this.magnetRing);
  }

  start({ startShield = false } = {}){
    const s = this.save;
    this.z = 0; this.prevZ = 0;
    this.lane = 1; this.x = LANE_X[1]; this.laneFrom = 1; this.laneT = 1;
    this.y = 0; this.vy = 0; this.ground = 0;
    this.slideT = 0; this.mode = 'run';
    this.speed = RUN.startSpeed;
    this.alive = true; this.paused = false;
    this.invuln = 0;
    this.time = 0;
    this.score = 0; this.coins = 0; this.streak = 0;
    this.mult = 1;
    this.stats = newRunStats();
    this.power = { magnet:0, double:0, rocket:0, shield:0 };
    this.shield = false;
    this.usedQuizRevive = false;
    this.revives = 0;
    this.crashReason = null;
    this.crashRes = null;
    this.activeGate = null;
    this.rival = null;
    this.rivalIdx = RIVALS.findIndex(r => r.score > 0);
    this.shake = 0;
    this.happyT = 0;

    this.spawner.reset(0, {
      leadTime: speed => Math.max(3.4, 6.2 - (speed - RUN.startSpeed) * 0.13),
      gateEvery: dist => {
        const [a, b] = dist > 2500 ? RUN.questionEveryLate : RUN.questionEvery;
        return a + Math.random() * (b - a);
      },
      makeQuestion: () => this.engine.next(this.tables(), Math.min(1, this.stats.distance / 3000)),
    });
    this.dog.root.position.set(this.x, 0, 0);
    this.dog.root.rotation.set(0, 0, 0);
    this.dog.pivot.rotation.set(0, 0, 0);
    if (startShield) this.giveShield(true);
  }

  tables(){ return this.save.tables.length ? this.save.tables : [2, 5, 10]; }

  duration(type){
    const p = POWERUPS[type];
    return p.base + p.perLevel * (this.save.upgrades[type] || 0);
  }

  // ---------- input ----------
  move(dir){
    if (!this.alive || this.paused) return;
    const target = Math.max(0, Math.min(2, this.lane + dir));
    if (target === this.lane){ this.hooks.bump?.(); return; }
    this.laneFrom = this.lane;
    this.lane = target;
    this.laneT = 0;
    this.laneStartX = this.x;
    this.hooks.sfx('lane');
  }

  jump(){
    if (!this.alive || this.paused || this.power.rocket > 0) return;
    if (this.y <= this.ground + 0.05){
      this.vy = RUN.jumpVel;
      this.slideT = 0;
      this.stats.jumps++;
      this.hooks.sfx('jump');
      this.fx.puff(this.x, 0.2, this.z + 0.4);
    }
  }

  slide(){
    if (!this.alive || this.paused || this.power.rocket > 0) return;
    if (this.y > this.ground + 0.05) this.vy = Math.min(this.vy, -RUN.jumpVel * 1.4);  // slam down
    if (this.slideT <= 0) { this.stats.slides++; this.hooks.sfx('slide'); }
    this.slideT = RUN.slideTime;
  }

  // ---------- power-ups ----------
  giveShield(silent = false){
    this.shield = true;
    this.power.shield = this.duration('shield');
    if (!silent) this.hooks.sfx('power');
  }

  startRocket(seconds, headstart = false){
    this.power.rocket = seconds;
    this.rocketHead = headstart;
    const travel = seconds * (Math.max(this.speed, 24) + 2) + 60;
    this.spawner.clearAhead(this.z - 20, this.z - travel);
    this.cancelQuestion();
    this.hooks.sfx('rocket');
  }

  cancelQuestion(){
    if (this.activeGate){ this.activeGate = null; this.hooks.questionHide(); }
  }

  // ---------- main update ----------
  update(dt){
    if (!this.alive || this.paused) return;
    this.time += dt;
    const P = this.power;
    const rocketing = P.rocket > 0;
    const speedTarget = Math.min(RUN.maxSpeed, RUN.startSpeed + this.time * RUN.accel);
    this.speed += ((rocketing ? Math.max(speedTarget, 24) : speedTarget) - this.speed) * Math.min(1, dt * 2);

    // forward
    this.prevZ = this.z;
    this.z -= this.speed * dt;
    const stepDist = this.speed * dt;
    this.stats.distance += stepDist;
    this.score += stepDist * RUN.scorePerMetre * this.mult;

    // lateral
    if (this.laneT < 1){
      this.laneT = Math.min(1, this.laneT + dt / RUN.laneSwitchTime);
      const e = 1 - Math.pow(1 - this.laneT, 3);
      this.x = this.laneStartX + (LANE_X[this.lane] - this.laneStartX) * e;
    } else this.x = LANE_X[this.lane];

    // vertical
    this.ground = rocketing ? 0 : this.groundHeight();
    if (rocketing){
      this.y += (ROCKET_Y - this.y) * Math.min(1, dt * 3);
      this.vy = 0;
      if (Math.random() < 0.8) this.fx.flame(this.x, this.y + 0.4, this.z + 0.8);
    } else {
      this.vy -= RUN.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= this.ground){
        if (this.vy < -8) this.fx.puff(this.x, this.ground + 0.1, this.z);
        this.y = this.ground; this.vy = 0;
      }
    }
    if (this.slideT > 0) this.slideT -= dt;

    // timers
    for (const k of ['magnet', 'double', 'rocket']){
      if (P[k] > 0){
        P[k] -= dt;
        if (P[k] <= 0){
          P[k] = 0;
          if (k === 'rocket'){ this.invuln = Math.max(this.invuln, 1.6); this.vy = 0; this.hooks.sfx('whoosh'); }
        }
      }
    }
    if (this.shield){ P.shield -= dt; if (P.shield <= 0){ this.shield = false; P.shield = 0; } }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.happyT > 0) this.happyT -= dt;

    this.mode = rocketing ? 'fly' : this.y > this.ground + 0.05 ? 'jump' : this.slideT > 0 ? 'slide' : 'run';

    // world content
    this.spawner.fill(this.z - 190, this.speed, this.stats.distance);
    this.spawner.update(dt, this.z, this.time);
    this.handleItems(dt);
    this.handleGates();
    this.handleRival(dt);

    // dog pose
    const d = this.dog;
    d.root.position.set(this.x, this.y, this.z);
    const lean = this.laneT < 1 ? (LANE_X[this.lane] - this.laneStartX) * -0.08 * (1 - this.laneT) : 0;
    d.pivot.rotation.z += (lean - d.pivot.rotation.z) * Math.min(1, dt * 12);
    d.pivot.rotation.y += ((this.laneT < 1 ? -lean * 2 : 0) - d.pivot.rotation.y) * Math.min(1, dt * 10);
    animateDog(d, dt, this.mode, this.speed, { vy:this.vy, happy:this.happyT > 0 });
    d.root.visible = this.invuln > 0 && P.rocket <= 0 ? Math.floor(this.time * 14) % 2 === 0 : true;

    this.shieldMesh.visible = this.shield;
    if (this.shield){
      this.shieldMesh.position.set(this.x, this.y + 0.8, this.z);
      const pulse = 1 + Math.sin(this.time * 6) * 0.04;
      this.shieldMesh.scale.setScalar(pulse);
      this.shieldMesh.material.opacity = P.shield < 2 ? (Math.floor(this.time * 8) % 2 ? 0.05 : 0.25) : 0.22;
    }
    this.magnetRing.visible = P.magnet > 0;
    if (P.magnet > 0){
      this.magnetRing.position.set(this.x, this.y + 0.1, this.z);
      const s = 1 + (this.time * 2 % 1) * 4;
      this.magnetRing.scale.setScalar(s);
      this.magnetRing.material.opacity = 0.6 * (1 - (s - 1) / 4);
    }

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.5);
  }

  groundHeight(){
    // stand on car roofs
    let g = 0;
    for (const it of this.spawner.items){
      if (it.dead || it.kind !== 'obstacle' || !it.vehicle || it.sinking) continue;
      if (Math.abs(it.z - this.z) > it.len / 2 + HALF_D) continue;
      if (Math.abs(it.x - this.x) > it.w + HALF_W - 0.2) continue;
      if (this.y >= it.y1 - 0.35) g = Math.max(g, it.y1);
    }
    return g;
  }

  handleItems(dt){
    const P = this.power;
    const top = this.y + (this.slideT > 0 && this.mode === 'slide' ? SLIDE_H : STAND_H);
    const magR = P.magnet > 0 ? 8 : 0;
    for (const it of this.spawner.items){
      if (it.dead || it.sinking) continue;
      const dz = it.z - this.z;
      if (dz < -60 || dz > 8) continue;

      if (it.kind === 'coin'){
        let dx = it.x - this.x, dy = it.mesh.position.y - (this.y + 0.7);
        if (magR && Math.abs(dz) < magR && Math.abs(dx) < 6 && !it.sky === (P.rocket <= 0) || magR && it.pulled){
          it.pulled = true;
          const m = it.mesh.position;
          const k = Math.min(1, dt * 14);
          m.x += (this.x - m.x) * k; m.y += (this.y + 0.7 - m.y) * k; m.z += (this.z - m.z) * k;
          it.x = m.x; it.z = m.z;
          dx = it.x - this.x; dy = m.y - (this.y + 0.7);
        }
        if (Math.abs(it.z - this.z) < 0.9 && Math.abs(dx) < 0.9 && Math.abs(dy) < 1.1){
          const v = P.double > 0 ? 2 : 1;
          this.coins += v; this.stats.coins += v;
          this.spawner.remove(it);
          this.fx.sparkle(it.mesh.position.x, it.mesh.position.y, it.mesh.position.z, it.sky ? 0x7fe3ff : 0xffd54a, 6, 2.5);
          this.hooks.coin(v);
        }
        continue;
      }

      if (it.kind === 'power'){
        if (Math.abs(dz) < 1.0 && Math.abs(it.x - this.x) < 1.0 && this.y < 3){
          this.spawner.remove(it);
          this.stats.powerups++;
          this.fx.sparkle(it.x, 1.2, it.z, POWERUPS[it.type].color, 30, 5);
          if (it.type === 'shield') this.giveShield();
          else if (it.type === 'rocket') this.startRocket(this.duration('rocket'));
          else { P[it.type] = this.duration(it.type); this.hooks.sfx('power'); }
          this.hooks.power(it.type);
        }
        continue;
      }

      if (it.kind === 'obstacle'){
        if (P.rocket > 0) continue;
        const ox = Math.abs(it.x - this.x) < it.w + HALF_W;
        const oz = Math.abs(dz) < it.len / 2 + HALF_D;
        const oy = this.y < it.y1 && top > it.y0;
        if (!(ox && oz && oy)) continue;
        if (it.vehicle && this.y >= it.y1 - 0.35) continue;    // on the roof
        if (this.invuln > 0) continue;
        // hit from the side while changing lanes → bounce back instead of crashing
        const wasBeside = Math.abs(it.z - this.prevZ) < it.len / 2 + HALF_D - 0.05 && !it.vz;
        if (wasBeside && this.laneT < 1){
          this.lane = this.laneFrom;
          this.laneStartX = this.x; this.laneT = 0;
          this.shake = 0.5;
          this.hooks.sfx('crash');
          this.fx.stars(this.x, this.y + 1, this.z);
          this.invuln = 0.4;
          continue;
        }
        this.hit(it, 'obstacle');
        if (!this.alive) return;
      }
    }
  }

  handleGates(){
    for (const it of this.spawner.items){
      if (it.kind !== 'gate' || it.dead || it.state === 'done') continue;
      if (it.sinking){ if (this.activeGate === it) this.cancelQuestion(); continue; }
      const dist = this.z - it.z;
      if (it.state === 'waiting' && dist < it.clearLen && !this.activeGate && this.power.rocket <= 0){
        it.state = 'active';
        it.q.shownAt = performance.now();
        this.activeGate = it;
        revealGate(it.gate);
        this.hooks.question(it.q, dist / this.speed);
      }
      if (it.state === 'active' && this.z <= it.z){
        it.state = 'done';
        this.activeGate = null;
        const lane = nearestLane(this.x);
        const picked = it.q.options[lane];
        const res = this.engine.grade(picked, it.q);
        markGate(it.gate, it.q.answer, picked);
        this.stats.asked++;
        if (res.ok){
          this.streak++;
          this.stats.correct++;
          this.stats.bestStreak = Math.max(this.stats.bestStreak, this.streak);
          this.stats.tableCorrect[res.table] = (this.stats.tableCorrect[res.table] || 0) + 1;
          if (res.b !== res.table) this.stats.tableCorrect[res.b] = (this.stats.tableCorrect[res.b] || 0) + 1;
          if (res.fast) this.stats.fast++;
          this.mult = 1 + Math.min(4, Math.floor(this.streak / 3));
          const pts = (RUN.scorePerCorrect + (res.fast ? RUN.fastBonus : 0)) * this.mult;
          this.score += pts;
          const bonusCoins = 5 + Math.min(10, this.streak);
          this.coins += bonusCoins; this.stats.coins += bonusCoins;
          this.happyT = 1.5;
          this.fx.burstConfetti(LANE_X[lane], 3, it.z - 2, 90, -this.speed * 0.6);
          this.hooks.answer(res, { pts, bonusCoins, streak:this.streak, mult:this.mult });
        } else {
          this.streak = 0;
          this.mult = 1;
          this.hooks.answer(res, { streak:0, mult:1 });
          if (this.power.rocket <= 0 && this.invuln <= 0) this.hit(null, 'wrong', res);
        }
      }
    }
  }

  hit(obstacle, reason, res = null){
    if (this.shield){
      this.shield = false; this.power.shield = 0;
      this.invuln = 1.5;
      this.shake = 0.6;
      this.hooks.sfx('shieldBreak');
      this.fx.sparkle(this.x, this.y + 1, this.z, 0x4cc9f0, 40, 7);
      if (obstacle){ obstacle.sinking = 0.001; }
      this.hooks.shieldSaved(reason);
      return;
    }
    this.alive = false;
    this.crashReason = reason;
    this.crashRes = res;
    this.shake = 1;
    this.fx.stars(this.x, this.y + 1.2, this.z);
    this.hooks.sfx(reason === 'wrong' ? 'wrong' : 'crash');
    this.cancelQuestion();
    this.hooks.crash(reason, res);
  }

  /** Bring the dog back after a crash. */
  revive(){
    this.alive = true;
    this.invuln = 2.2;
    this.speed = Math.max(RUN.startSpeed, this.speed * 0.85);
    this.time = Math.max(0, this.time - 20);
    this.revives++;
    this.y = 0; this.vy = 0;
    this.dog.pivot.rotation.set(0, 0, 0);
    // clear what's immediately ahead so there's room to get going
    for (const it of this.spawner.items){
      if (it.dead) continue;
      if ((it.kind === 'obstacle') && it.z < this.z + 5 && it.z > this.z - 45) it.sinking = 0.001;
    }
    this.fx.sparkle(this.x, 1, this.z, 0xff4fa3, 40, 6);
  }

  // ---------- rivals ----------
  handleRival(dt){
    const r = RIVALS[this.rivalIdx];
    if (!r) return;
    const gap = r.score - this.score;
    if (!this.rival && gap < 260 && gap > 0){
      const def = DOGS.find(d => d.id === r.dog);
      const dog = buildDog(def, { hat: this.rivalIdx >= 5 ? 'tophat' : null }, { tint:r.tint ?? undefined });
      dog.root.add(nameTag(r.name));
      this.scene.add(dog.root);
      this.rival = { dog, def:r, x: this.x < 0 ? 5.6 : -5.6, relZ:-40, passed:false };
      this.hooks.rival(r, 'taunt');
    }
    if (this.rival){
      const rv = this.rival;
      const target = Math.max(-40, Math.min(30, -gap * 0.13));
      rv.relZ += (target - rv.relZ) * Math.min(1, dt * 1.5);
      rv.dog.root.position.set(rv.x, 0.2, this.z + rv.relZ);
      animateDog(rv.dog, dt, 'run', this.speed * 0.95);
      if (!rv.passed && gap <= 0){
        rv.passed = true;
        this.hooks.rival(r, 'beaten');
      }
      if (rv.relZ > 25){
        this.scene.remove(rv.dog.root);
        this.rival = null;
        this.rivalIdx++;
      }
    }
  }

  dispose(){
    for (const it of this.spawner.items) this.scene.remove(it.mesh);
    this.spawner.items = [];
    if (this.rival) this.scene.remove(this.rival.dog.root);
    this.rival = null;
    this.shieldMesh.visible = false;
    this.magnetRing.visible = false;
  }
}

function nearestLane(x){
  let best = 0;
  for (let i = 1; i < 3; i++) if (Math.abs(LANE_X[i] - x) < Math.abs(LANE_X[best] - x)) best = i;
  return best;
}

function nameTag(text){
  const font = '800 44px system-ui, sans-serif';
  const c = document.createElement('canvas');
  let x = c.getContext('2d');
  x.font = font;
  const w = Math.ceil(x.measureText(text).width + 48);
  c.width = w; c.height = 96;
  x = c.getContext('2d');
  x.font = font;
  x.fillStyle = 'rgba(20,20,40,0.75)';
  x.beginPath(); x.roundRect(2, 14, w - 4, 68, 34); x.fill();
  x.fillStyle = '#ffd166'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, w / 2, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:t, depthTest:false, transparent:true }));
  s.scale.set(0.45 * w / 96, 0.45, 1);
  s.position.y = 1.55;
  return s;
}
