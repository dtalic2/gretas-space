// ---------- Things on the road: obstacles, coins, power-ups, answer gates ----------
// Builders make the meshes; the Spawner lays out rows of them ahead of the player and
// guarantees every row leaves a way through.

import * as THREE from 'three';
import { LANE_X, OBSTACLES, POWERUPS } from './data.js';
import { mergeGroup } from './world.js';

// ---------- shared resources ----------
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness:0.6, ...o });
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  wheel: new THREE.CylinderGeometry(0.36, 0.36, 0.28, 16),
  cone: new THREE.ConeGeometry(0.28, 0.75, 16),
  coin: coinGeometry(),
  sphere: new THREE.SphereGeometry(1, 20, 14),
  plane: new THREE.PlaneGeometry(1, 1),
};
const M = {
  stripeRW: std(0xffffff, { map: stripes('#e63946', '#ffffff') }),
  stripeYB: std(0xffffff, { map: stripes('#ffc933', '#1d1d1d') }),
  post: std(0xdddddd, { metalness:0.4, roughness:0.4 }),
  cone: std(0xff6b1a),
  coneBand: std(0xffffff),
  rubber: std(0x1d1d1d, { roughness:0.9 }),
  hub: std(0xcfd4da, { metalness:0.8, roughness:0.3 }),
  glass: std(0x1d2b3a, { roughness:0.1, metalness:0.5 }),
  head: new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0xfff6d5, emissiveIntensity:1.5 }),
  tail: new THREE.MeshStandardMaterial({ color:0xff2a2a, emissive:0xff0000, emissiveIntensity:1.2 }),
  coin: std(0xffcf2e, { metalness:0.55, roughness:0.28, emissive:0xb87400, emissiveIntensity:0.55 }),
  coinSky: std(0x7fe3ff, { metalness:0.6, roughness:0.2, emissive:0x1a6a9a, emissiveIntensity:0.8 }),
  chrome: std(0xe0e4ea, { metalness:0.9, roughness:0.2 }),
};
// A coin with a raised rim, lathed so it's a single mesh.
function coinGeometry(){
  const pts = [[0, 0.04], [0.3, 0.04], [0.33, 0.07], [0.43, 0.07], [0.46, 0.0], [0.43, -0.07], [0.33, -0.07], [0.3, -0.04], [0, -0.04]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 24);
}

const CAR_COLORS = [0xe63946, 0x3a86ff, 0x06d6a0, 0xff7b00, 0x8338ec, 0xf1f1f1, 0x2b2d42, 0xff4fa3];
const carMats = CAR_COLORS.map(c => std(c, { metalness:0.35, roughness:0.35 }));
const taxiMat = std(0xffc933, { metalness:0.3, roughness:0.35 });

function part(parent, geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0){
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}

// ---------- obstacle builders (all centred on x=0, z=0, front faces +z) ----------
const BUILD = {
  barrierLow(){
    const g = new THREE.Group();
    for (const s of [-1, 1]){
      part(g, G.box, M.post, s * 0.9, 0.45, 0, 0.1, 0.9, 0.1);
      part(g, G.box, M.post, s * 0.9, 0.02, 0, 0.12, 0.04, 0.7);
    }
    part(g, G.box, M.stripeRW, 0, 0.72, 0, 2.0, 0.36, 0.12);
    part(g, G.box, M.stripeRW, 0, 0.3, 0, 2.0, 0.2, 0.1);
    const lamp = part(g, G.sphere, new THREE.MeshStandardMaterial({ color:0xff7b00, emissive:0xff7b00, emissiveIntensity:1.5 }),
      -0.9, 0.98, 0, 0.08, 0.08, 0.08);
    lamp.userData.blink = true;
    return { g, y0:0, y1:0.95, len:0.5, w:1.0 };
  },
  barrierHigh(){
    const g = new THREE.Group();
    for (const s of [-1, 1]){
      part(g, G.box, M.post, s * 1.05, 1.15, 0, 0.14, 2.3, 0.14);
      part(g, G.box, M.post, s * 1.05, 0.03, 0, 0.3, 0.06, 0.6);
    }
    part(g, G.box, M.stripeYB, 0, 1.75, 0, 2.2, 0.7, 0.14);
    // "duck!" arrow sign
    const sign = part(g, G.plane, new THREE.MeshBasicMaterial({ map: arrowTex(), transparent:true }), 0, 1.75, 0.08, 0.6, 0.6, 1);
    sign.castShadow = false;
    return { g, y0:1.2, y1:2.4, len:0.5, w:1.1 };
  },
  cone(){
    const g = new THREE.Group();
    for (const x of [-0.7, 0, 0.7]){
      part(g, G.cone, M.cone, x, 0.38, 0, 1, 1, 1);
      part(g, G.cyl, M.coneBand, x, 0.42, 0, 0.18, 0.1, 0.18);
      part(g, G.box, M.cone, x, 0.02, 0, 0.6, 0.04, 0.6);
    }
    part(g, G.box, M.stripeRW, 0, 0.62, 0, 1.6, 0.08, 0.06);
    return { g, y0:0, y1:0.8, len:0.6, w:1.0 };
  },
  car(opts = {}){
    const g = new THREE.Group();
    const paint = opts.taxi ? taxiMat : carMats[Math.floor(Math.random() * carMats.length)];
    part(g, G.box, paint, 0, 0.62, 0, 1.9, 0.62, 4.1);
    part(g, G.box, paint, 0, 1.18, 0.25, 1.7, 0.55, 2.2);
    part(g, G.box, M.glass, 0, 1.18, 0.25, 1.72, 0.45, 2.0);
    part(g, G.box, M.glass, 0, 1.18, 1.37, 1.5, 0.42, 0.04, -0.35);
    for (const [x, z] of [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]]){
      part(g, G.wheel, M.rubber, x, 0.36, z, 1, 1, 1, 0, 0, Math.PI / 2);
      part(g, G.wheel, M.hub, x * 1.02, 0.36, z, 0.55, 1.02, 0.55, 0, 0, Math.PI / 2);
    }
    for (const s of [-1, 1]){
      part(g, G.box, M.head, s * 0.65, 0.7, 2.06, 0.38, 0.16, 0.04);
      part(g, G.box, M.tail, s * 0.7, 0.72, -2.06, 0.3, 0.14, 0.04);
    }
    part(g, G.box, M.chrome, 0, 0.42, 2.07, 1.8, 0.14, 0.06);
    if (opts.taxi){
      part(g, G.box, new THREE.MeshStandardMaterial({ color:0xffffff, emissive:0xfff2a8, emissiveIntensity:0.9, map:textTex('TAXI', '#222', '#fff7c2') }),
        0, 1.55, 0.2, 0.7, 0.22, 0.35);
    }
    return { g, y0:0, y1:1.5, len:4.2, w:0.95, vehicle:true };
  },
  taxi(){ return BUILD.car({ taxi:true }); },
  bus(){
    const g = new THREE.Group();
    const color = [0xe63946, 0x3a86ff, 0xffc933, 0x06d6a0][Math.floor(Math.random() * 4)];
    const paint = std(color, { metalness:0.25, roughness:0.4 });
    part(g, G.box, paint, 0, 1.75, 0, 2.3, 2.9, 10);
    part(g, G.box, M.glass, 0, 2.3, 0, 2.32, 0.9, 9.4);
    part(g, G.box, M.glass, 0, 2.0, 5.01, 2.0, 1.6, 0.04);
    part(g, G.box, std(0xffffff), 0, 3.25, 0, 2.2, 0.08, 9.8);
    // destination board shows a times-table fact
    const facts = ['3×3=9', '7×8=56', '6×7=42', '9×9=81', '12×12=144', '8×4=32'];
    part(g, G.plane, new THREE.MeshBasicMaterial({ map:textTex(facts[Math.floor(Math.random() * facts.length)], '#ffb703', '#111') }),
      0, 3.0, 5.02, 1.8, 0.36, 1);
    for (const z of [3.4, -3.4]) for (const s of [-1, 1]){
      part(g, G.wheel, M.rubber, s * 1.05, 0.42, z, 1.25, 1.1, 1.25, 0, 0, Math.PI / 2);
    }
    for (const s of [-1, 1]){
      part(g, G.box, M.head, s * 0.8, 0.8, 5.02, 0.35, 0.2, 0.04);
      part(g, G.box, M.tail, s * 0.9, 0.8, -5.02, 0.3, 0.3, 0.04);
    }
    return { g, y0:0, y1:3.3, len:10, w:1.15, vehicle:true };
  },
  truck(){
    const g = new THREE.Group();
    const cab = std(CAR_COLORS[Math.floor(Math.random() * 5)], { metalness:0.3, roughness:0.4 });
    part(g, G.box, cab, 0, 1.4, 2.9, 2.2, 2.2, 2.0);
    part(g, G.box, M.glass, 0, 1.9, 3.91, 1.9, 0.8, 0.04);
    part(g, G.box, std(0xf1f1f1), 0, 1.85, -1.0, 2.35, 3.0, 5.8);
    part(g, G.plane, new THREE.MeshStandardMaterial({ map:textTex('MILO\'S MUNCHIES', '#e63946', '#ffffff') }),
      1.18, 2.0, -1.0, 5, 1.2, 1, 0, Math.PI / 2);
    part(g, G.plane, new THREE.MeshStandardMaterial({ map:textTex('MILO\'S MUNCHIES', '#e63946', '#ffffff') }),
      -1.18, 2.0, -1.0, 5, 1.2, 1, 0, -Math.PI / 2);
    for (const z of [3, 0.2, -3]) for (const s of [-1, 1]){
      part(g, G.wheel, M.rubber, s * 1.05, 0.42, z, 1.2, 1.1, 1.2, 0, 0, Math.PI / 2);
    }
    for (const s of [-1, 1]) part(g, G.box, M.head, s * 0.8, 0.9, 3.92, 0.35, 0.2, 0.04);
    return { g, y0:0, y1:3.4, len:8, w:1.15, vehicle:true };
  },
};

// Obstacles are static, so each is baked into a few merged meshes. A handful of variants
// per type (random paint, bus boards) are built once and cloned, sharing geometry.
const TEMPLATES = {};
function template(type){
  const list = TEMPLATES[type] || (TEMPLATES[type] = []);
  let t;
  if (list.length < 4){
    const b = BUILD[type]();
    t = { ...b, g: mergeGroup(b.g) };
    list.push(t);
  } else t = list[Math.floor(Math.random() * list.length)];
  return { ...t, g: t.g.clone() };
}

// ---------- coins, power-ups ----------
export function buildCoin(sky = false){
  const g = new THREE.Group();
  const c = new THREE.Mesh(G.coin, sky ? M.coinSky : M.coin);
  c.rotation.x = Math.PI / 2;
  c.castShadow = true;
  g.add(c);
  return g;
}

const powerGlow = {};
export function buildPower(type){
  const g = new THREE.Group();
  const p = POWERUPS[type];
  const inner = new THREE.Group();
  g.add(inner);
  if (type === 'magnet'){
    const red = std(0xff3b5c, { emissive:0x550010, emissiveIntensity:0.6 });
    const u = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.13, 10, 20, Math.PI), red);
    u.rotation.z = Math.PI; inner.add(u);
    for (const s of [-1, 1]){
      part(inner, G.cyl, red, s * 0.34, 0.12, 0, 0.13, 0.25, 0.13);
      part(inner, G.cyl, M.chrome, s * 0.34, 0.32, 0, 0.135, 0.15, 0.135);
    }
  } else if (type === 'shield'){
    const s = new THREE.Mesh(G.sphere, new THREE.MeshStandardMaterial({ color:0x4cc9f0, emissive:0x1b6f9a,
      emissiveIntensity:0.8, transparent:true, opacity:0.55, roughness:0.1 }));
    s.scale.setScalar(0.45); inner.add(s);
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(0.25, 0.11), { depth:0.08, bevelEnabled:false }),
      std(0xffffff, { emissive:0xaaddff, emissiveIntensity:0.6 }));
    star.position.z = -0.04; inner.add(star);
  } else if (type === 'double'){
    const coin = buildCoin(); coin.scale.setScalar(1.15); inner.add(coin);
    const label = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map:textTex('×2', '#7a3b00', null, 128), transparent:true }));
    label.scale.setScalar(0.7); label.position.z = 0.07; inner.add(label);
    const back = label.clone(); back.rotation.y = Math.PI; back.position.z = -0.07; inner.add(back);
  } else if (type === 'rocket'){
    const body = std(0xffffff, { metalness:0.3, roughness:0.3 });
    const orange = std(0xff7b00, { emissive:0x551f00, emissiveIntensity:0.5 });
    part(inner, G.cyl, body, 0, 0, 0, 0.18, 0.6, 0.18);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 16), orange); nose.position.y = 0.45; inner.add(nose);
    for (let i = 0; i < 3; i++){
      const f = part(inner, G.box, orange, 0, -0.25, 0, 0.04, 0.25, 0.22, 0, i * Math.PI * 2 / 3, 0);
      f.position.set(Math.sin(i * 2.094) * 0.18, -0.25, Math.cos(i * 2.094) * 0.18);
    }
    part(inner, G.cyl, std(0x3a86ff, { emissive:0x0a2a6a, emissiveIntensity:0.5 }), 0, 0.12, 0.15, 0.08, 0.02, 0.08, Math.PI / 2);
    inner.rotation.z = -0.5;
  }
  // soft halo
  if (!powerGlow[type]) powerGlow[type] = new THREE.SpriteMaterial({ map:glowTex(), color:p.color,
    transparent:true, blending:THREE.AdditiveBlending, depthWrite:false });
  const halo = new THREE.Sprite(powerGlow[type]);
  halo.scale.setScalar(2.0);
  g.add(halo);
  g.userData.inner = inner;
  return g;
}

// ---------- answer gates ----------
const GATE_COLORS = [0xff4fa3, 0x3a86ff, 0xffb703];
export function buildGate(q){
  const g = new THREE.Group();
  const lanes = [];
  // big overhead sign spanning the road showing the question
  const qTex = new THREE.CanvasTexture(document.createElement('canvas'));
  const board = new THREE.Group();
  const frame = std(0x2b2d42, { metalness:0.4, roughness:0.4 });
  part(board, G.box, frame, 0, 0, -0.06, 7.8, 1.5, 0.12);
  const qMesh = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map:qTex, toneMapped:false }));
  qMesh.scale.set(7.5, 1.3, 1);
  board.add(qMesh);
  board.position.set(0, 6.3, -0.8);
  g.add(board);
  for (const s of [-1, 1]) part(g, G.box, frame, s * 3.95, 3.5, -0.8, 0.22, 7.1, 0.22);
  setCanvasText(qTex, `${q.text} = ?`.replace('? = ?', '?'), '#ffffff', '#2b2d42', 1024, 180);

  for (let i = 0; i < 3; i++){
    const lg = new THREE.Group();
    lg.position.x = LANE_X[i];
    const col = GATE_COLORS[i];
    const pm = std(col, { emissive:col, emissiveIntensity:0.35, metalness:0.2, roughness:0.4 });
    for (const s of [-1, 1]) part(lg, G.box, pm, s * 1.08, 1.85, 0, 0.18, 3.7, 0.25);
    part(lg, G.box, pm, 0, 3.75, 0, 2.34, 0.22, 0.28);
    // number panel
    const t = new THREE.CanvasTexture(document.createElement('canvas'));
    setCanvasText(t, '?', '#ffffff', '#' + col.toString(16).padStart(6, '0'), 256, 180);
    const panel = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ map:t, toneMapped:false }));
    // the number hangs inside the arch, low enough to stay under the HUD question card
    panel.scale.set(1.85, 1.2, 1);
    panel.position.set(0, 3.0, 0.02);
    lg.add(panel);
    const back = part(lg, G.box, pm, 0, 3.0, -0.06, 1.95, 1.3, 0.1);
    back.castShadow = false;
    // shimmering curtain to run through
    const curtainMat = new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:0.22,
      blending:THREE.AdditiveBlending, side:THREE.DoubleSide, depthWrite:false });
    const curtain = new THREE.Mesh(G.plane, curtainMat);
    curtain.scale.set(1.98, 2.35, 1); curtain.position.y = 1.18;
    lg.add(curtain);
    g.add(lg);
    lanes.push({ group:lg, panel, tex:t, curtain, pm, value:q.options[i], color:col });
  }
  return { g, lanes, qTex };
}

export function revealGate(gate){
  gate.lanes.forEach(l => setCanvasText(l.tex, String(l.value), '#ffffff',
    '#' + l.color.toString(16).padStart(6, '0'), 256, 180));
}

export function markGate(gate, answer, picked){
  for (const l of gate.lanes){
    const right = l.value === answer;
    const col = right ? 0x2ecc71 : (l.value === picked ? 0xff3344 : 0x777777);
    l.pm.color.setHex(col); l.pm.emissive.setHex(col); l.pm.emissiveIntensity = right ? 0.9 : 0.3;
    l.curtain.material.color.setHex(col);
    l.curtain.material.opacity = right ? 0.45 : 0.12;
    setCanvasText(l.tex, (right ? '✔ ' : '') + l.value, '#ffffff', '#' + col.toString(16).padStart(6, '0'), 256, 180);
  }
}

// ---------- the Spawner ----------
const TYPES_EARLY = ['barrierLow', 'barrierLow', 'cone', 'barrierHigh', 'car', 'taxi'];
const TYPES_MID = ['barrierLow', 'cone', 'barrierHigh', 'barrierHigh', 'car', 'taxi', 'bus', 'truck'];

export class Spawner {
  constructor(scene){
    this.scene = scene;
    this.items = [];
  }

  reset(startZ, opts){
    for (const it of this.items) this.scene.remove(it.mesh);
    this.items = [];
    this.nextRowZ = startZ - 45;
    this.opts = opts;               // { gateEvery(dist), makeQuestion(), leadTime(speed) }
    this.nextGateZ = startZ - 230;
    this.gateClear = 0;
    this.reserved = [0, 0, 0];      // lanes held for oncoming traffic, until this z
    this.lastFree = 1;
    this.powerCooldown = 5;
    this.pauseUntil = Infinity;     // no obstacles while z > pauseUntil (rocket)
  }

  /** Generate content out to `limitZ` (negative, ahead of the player). */
  fill(limitZ, speed, dist){
    let guard = 0;
    while (this.nextRowZ > limitZ && guard++ < 50){
      const z = this.nextRowZ;
      const gap = Math.max(13, speed * (1.05 - Math.min(0.25, dist / 12000))) + Math.random() * 8;

      // During rocket flight: sky coins only, no obstacles or gates.
      if (z > this.pauseUntil){
        // the zone runs on past the landing as a safety margin; keep coins where we can fly
        if (z > this.pauseUntil + 70) this.coinLine(this.lastFree, z, 8, 2.2, 7.0, true);
        if (Math.random() < 0.35) this.lastFree = Math.max(0, Math.min(2, this.lastFree + (Math.random() < 0.5 ? -1 : 1)));
        this.nextRowZ -= 18;
        if (this.nextGateZ > this.pauseUntil - 60) this.nextGateZ = this.pauseUntil - 120;
        continue;
      }

      const clearLen = speed * this.opts.leadTime(speed) + 15;
      if (z <= this.nextGateZ + 4){
        this.spawnGate(this.nextGateZ, clearLen);
        this.nextRowZ = this.nextGateZ - 26;
        this.nextGateZ -= this.opts.gateEvery(dist);
        continue;
      }
      if (z < this.nextGateZ + clearLen){
        // run-up to a gate: coins only, in a gentle wave across lanes
        this.coinLine(this.lastFree, z, 5, 2.2);
        this.nextRowZ -= 14;
        continue;
      }
      this.spawnRow(z, speed, dist);
      this.nextRowZ -= gap;
    }
  }

  spawnRow(z, speed, dist){
    const d = Math.min(1, dist / 3500);
    const types = d < 0.25 ? TYPES_EARLY : TYPES_MID;
    const r = Math.random();
    let blockedCount = r < 0.45 - d * 0.2 ? 1 : r < 0.92 ? 2 : 3;

    // lanes unavailable for stationary obstacles (reserved for oncoming traffic)
    const reservedLane = [0, 1, 2].filter(i => this.reserved[i] < z);
    const lanes = shuffleArr([0, 1, 2]);
    // prefer keeping a free lane near the last one, so the path flows
    let free = Math.random() < 0.6 ? this.lastFree : lanes[0];
    if (reservedLane.includes(free) === false && reservedLane.length) free = reservedLane[0];
    const blocked = [0, 1, 2].filter(i => i !== free && !reservedLane.includes(i)).slice(0, blockedCount);

    let passable = false;   // does the triple still leave a jump/slide route?
    for (const lane of blocked){
      let type = types[Math.floor(Math.random() * types.length)];
      if (blockedCount === 3 && !passable && lane === blocked[blocked.length - 1]) type = Math.random() < 0.5 ? 'barrierLow' : 'barrierHigh';
      if (OBSTACLES[type].action !== 'dodge') passable = true;
      this.addObstacle(type, lane, z);
      if (type === 'barrierLow' || type === 'cone') this.coinArc(lane, z);
    }
    if (blockedCount === 3){
      // one lane must stay passable: put a jump/slide barrier in `free` too
      const t = Math.random() < 0.5 ? 'barrierLow' : 'barrierHigh';
      this.addObstacle(t, free, z);
      if (t === 'barrierLow') this.coinArc(free, z);
    } else if (Math.random() < 0.7){
      this.coinLine(free, z + 8, 6, 2.2);
    }

    // oncoming traffic in the free-est lane
    if (d > 0.12 && Math.random() < 0.18 + d * 0.25){
      const lane = [0, 1, 2].find(i => i !== free && !blocked.includes(i) && this.reserved[i] >= z)
        ?? null;
      if (lane !== null){
        const vz = 5 + Math.random() * 5;
        const travel = vz * (180 / speed);       // how far it drives before meeting us
        const spawnZ = z - travel;
        if (!(spawnZ < this.nextGateZ + 60 && z > this.nextGateZ - 30)){
          const type = Math.random() < 0.7 ? 'car' : 'taxi';
          const it = this.addObstacle(type, lane, spawnZ);
          it.vz = vz;
          it.meetZ = z;
          this.reserved[lane] = spawnZ - 10;
        }
      }
    }

    // power-ups
    this.powerCooldown -= 1;
    if (this.powerCooldown <= 0 && Math.random() < 0.3){
      const types = ['magnet', 'magnet', 'double', 'shield', 'rocket'];
      this.addPower(types[Math.floor(Math.random() * types.length)], free, z + 6);
      this.powerCooldown = 7 + Math.floor(Math.random() * 7);
    }
    this.lastFree = free;
  }

  addObstacle(type, lane, z){
    const b = template(type);
    b.g.position.set(LANE_X[lane], 0, z);
    this.scene.add(b.g);
    const it = { kind:'obstacle', type, lane, x:LANE_X[lane], z, len:b.len, w:b.w, y0:b.y0, y1:b.y1,
      vehicle:!!b.vehicle, mesh:b.g, vz:0, action:OBSTACLES[type].action };
    this.items.push(it);
    return it;
  }

  addCoin(lane, z, y = 0.9, sky = false, x = null){
    const m = buildCoin(sky);
    const px = x ?? LANE_X[lane];
    m.position.set(px, y, z);
    this.scene.add(m);
    this.items.push({ kind:'coin', lane, x:px, y, z, mesh:m, sky });
  }

  coinLine(lane, z, n, spacing, y = 0.9, sky = false){
    for (let i = 0; i < n; i++) this.addCoin(lane, z - i * spacing, y, sky);
  }

  coinArc(lane, z){
    for (let i = -3; i <= 3; i++){
      const y = 0.9 + 2.0 * (1 - (i / 3.5) ** 2);
      this.addCoin(lane, z + i * 1.6, y);
    }
  }

  addPower(type, lane, z){
    const m = buildPower(type);
    m.position.set(LANE_X[lane], 1.2, z);
    this.scene.add(m);
    this.items.push({ kind:'power', type, lane, x:LANE_X[lane], y:1.2, z, mesh:m });
  }

  spawnGate(z, clearLen){
    const q = this.opts.makeQuestion();
    const gate = buildGate(q);
    gate.g.position.set(0, 0, z);
    this.scene.add(gate.g);
    this.items.push({ kind:'gate', z, mesh:gate.g, gate, q, clearLen, state:'waiting' });
  }

  /** Rocket: sink everything ahead and hold off new obstacles until `untilZ`. */
  clearAhead(fromZ, untilZ){
    for (const it of this.items){
      if (it.z < fromZ && !it.sky) it.sinking = 0.001;
    }
    this.pauseUntil = untilZ;
    this.nextRowZ = fromZ - 6;
  }

  remove(it){
    this.scene.remove(it.mesh);
    it.dead = true;
  }

  /** Move traffic, spin coins, animate sinks, and drop what's behind the camera. */
  update(dt, playerZ, t){
    for (const it of this.items){
      if (it.dead) continue;
      if (it.vz){ it.z += it.vz * dt; it.mesh.position.z = it.z; }
      if (it.kind === 'coin'){
        it.mesh.rotation.y += dt * 4;
      } else if (it.kind === 'power'){
        it.mesh.userData.inner.rotation.y += dt * 2.5;
        it.mesh.position.y = it.y + Math.sin(t * 3 + it.z) * 0.15;
      } else if (it.kind === 'gate'){
        for (const l of it.gate.lanes){
          l.curtain.material.opacity = (it.state === 'done' ? l.curtain.material.opacity :
            0.18 + Math.sin(t * 5 + l.group.position.x) * 0.06);
        }
      }
      if (it.sinking){
        it.sinking += dt * 2.5;
        it.mesh.scale.y = Math.max(0.001, 1 - it.sinking);
        if (it.sinking >= 1){ this.remove(it); continue; }
      }
      if (it.z - (it.len || 0) / 2 > playerZ + 12) this.remove(it);
    }
    if (this.items.length > 40 && Math.random() < 0.1) this.items = this.items.filter(i => !i.dead);
  }
}

// ---------- canvas helpers ----------
function stripes(a, b){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = b; x.fillRect(0, 0, 128, 128);
  x.fillStyle = a;
  for (let i = -128; i < 256; i += 48){
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 24, 0); x.lineTo(i + 24 + 128, 128); x.lineTo(i + 128, 128); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1);
  return t;
}

function arrowTex(){
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(64, 64, 58, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#e63946'; x.beginPath(); x.arc(64, 64, 50, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#ffffff';
  x.beginPath(); x.moveTo(64, 104); x.lineTo(30, 62); x.lineTo(50, 62); x.lineTo(50, 26);
  x.lineTo(78, 26); x.lineTo(78, 62); x.lineTo(98, 62); x.closePath(); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function glowTex(){
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function textTex(text, fg, bg, size = 256){
  const t = new THREE.CanvasTexture(document.createElement('canvas'));
  setCanvasText(t, text, fg, bg, size * 2, size / 2);
  return t;
}

function setCanvasText(texture, text, fg, bg, w, h){
  const c = texture.image;
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.clearRect(0, 0, w, h);
  if (bg){
    x.fillStyle = bg;
    roundRect(x, 4, 4, w - 8, h - 8, Math.min(w, h) * 0.18); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = Math.max(4, h * 0.05);
    roundRect(x, h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12, Math.min(w, h) * 0.14); x.stroke();
  }
  let fs = h * 0.68;
  x.font = `900 ${fs}px "Baloo 2", "Arial Rounded MT Bold", system-ui, sans-serif`;
  while (x.measureText(text).width > w * 0.88 && fs > 10){ fs -= 4; x.font = `900 ${fs}px "Baloo 2", "Arial Rounded MT Bold", system-ui, sans-serif`; }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = fs * 0.12; x.strokeStyle = 'rgba(0,0,0,0.35)';
  x.strokeText(text, w / 2, h / 2 + fs * 0.05);
  x.fillStyle = fg; x.fillText(text, w / 2, h / 2 + fs * 0.05);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
}

function roundRect(x, px, py, w, h, r){
  x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
}

function starShape(R, r){
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++){
    const a = i / 10 * Math.PI * 2 + Math.PI / 2;
    const rad = i % 2 ? r : R;
    i ? s.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : s.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  s.closePath(); return s;
}

function shuffleArr(a){
  for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
