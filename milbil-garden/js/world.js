// The 3D farm. Reads the game state every frame and makes the world match it:
// beds and crops, rival stalls and their prices, buildings, your milbil.
import * as THREE from 'three';
import { MAX_PLOTS, DAY_LENGTH, CROP, RIVALS, RIVAL } from './data.js';
import * as G from './game.js';
import { mat, box, cyl, ball, group, rnd } from './kit.js';
import * as M from './models3d.js';
import { makeMilbil, animateMilbil } from './milbil3d.js';
import { COLORS } from './milbil.js';
import { Rig } from './camera.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const geoRing = new THREE.RingGeometry(0.35, 0.5, 24);

// ------------------------------------------------------------------ layout

// 30 bed spots on a 6x5 grid, handed out nearest-the-middle first so the
// farm always grows outward in a tidy shape.
export const PLOT_POS = (() => {
  const out = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) out.push(V((c - 2.5) * 2, 0, (r - 2) * 2));
  const mid = V(0, 0, -1);
  return out.sort((a, b) => a.distanceTo(mid) - b.distanceTo(mid) || a.z - b.z || a.x - b.x).slice(0, MAX_PLOTS);
})();

const MARKET = V(15.5, 0, 0);
const RIVAL_STALLS = {
  bramble: { pos: V(11.4, 0, -3.6), rot: 0.25 },
  mo:      { pos: V(14.3, 0, -4.4), rot: 0.08 },
  posy:    { pos: V(17.2, 0, -4.4), rot: -0.08 },
  hank:    { pos: V(20.1, 0, -3.6), rot: -0.25 },
};
const MY_STALL = { pos: V(15.6, 0, 3.4), rot: 0 };

const BUILD_SPOTS = {
  shed: [V(-9.4, 0, 3.2), V(-9.4, 0, 0.9), V(-9.4, 0, -1.4), V(-11.6, 0, 3.2), V(-11.6, 0, 0.9), V(-11.6, 0, -1.4)],
  barn: V(-10.6, 0, -6.2),
  greenhouse: V(-3.6, 0, -9.4),
  dome: V(4.6, 0, -9.8),
  scarecrow: V(0, 0, -5.45),
  sprinkler: [V(-6.05, 0, -4.9), V(6.05, 0, -4.9), V(-6.05, 0, 4.9), V(6.05, 0, 4.9)],
  sign: V(13.2, 0, 4.6),
};

// ------------------------------------------------------------------ sky

const SKY_KEYS = [
  { t: 0.00, top: 0x7aa8f0, hor: 0xffc9b5, sun: 0xffc9a8, si: 2.0, hemi: 1.0 },
  { t: 0.12, top: 0x4fa3f5, hor: 0xd4f1ff, sun: 0xfff3dd, si: 2.7, hemi: 1.15 },
  { t: 0.68, top: 0x4fa3f5, hor: 0xd4f1ff, sun: 0xfff3dd, si: 2.7, hemi: 1.15 },
  { t: 0.84, top: 0x6c98e0, hor: 0xffd28f, sun: 0xffc27a, si: 2.3, hemi: 1.0 },
  { t: 1.00, top: 0x5b5fb8, hor: 0xffa0b4, sun: 0xff9f8a, si: 1.5, hemi: 0.8 },
];
const cA = new THREE.Color(), cB = new THREE.Color();
function skyAt(t) {
  let i = 0;
  while (i < SKY_KEYS.length - 2 && t > SKY_KEYS[i + 1].t) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
  const k = THREE.MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1);
  const mix = (x, y) => cA.setHex(x).lerp(cB.setHex(y), k).getHex();
  return { top: mix(a.top, b.top), hor: mix(a.hor, b.hor), sun: mix(a.sun, b.sun), si: a.si + (b.si - a.si) * k, hemi: a.hemi + (b.hemi - a.hemi) * k };
}

// ------------------------------------------------------------------ world

export class World {
  constructor(canvas, { onPick, onArrive }) {
    this.onPick = onPick;
    this.onArrive = onArrive || (() => {});
    this.keys = new Set();
    this.bubbles = [];
    const coarse = matchMedia('(pointer: coarse)').matches;
    this.coarse = coarse;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse || devicePixelRatio < 2, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.75 : 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.localClippingEnabled = true;

    const scene = this.scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xd4f1ff, 55, 150);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 400);
    this.rig = new Rig(this.camera, canvas, (x, y) => this._tap(x, y));

    this.pickables = [];
    this.labels = document.getElementById('labels');
    this.time = 0;
    this.fx = [];

    this._lights(coarse);
    this._sky();
    this._ground();
    this._scenery();
    this._farm();
    this._market();
    this.pickables.push(this.ground);

    this.plots = [];
    this.forSale = [];
    this.built = {};
    this.lookKey = '';
    this.shift = 0;          // how far the view is nudged up while a sheet covers the bottom
    this.shiftWant = 0;

    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Pull back a little on tall phone screens so the farm fits.
    this.camera.fov = w < h ? 55 : 42;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- setup

  _lights(coarse) {
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6aa84f, 1.1);
    this.scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(0xfff3dd, 2.6);
    sun.castShadow = true;
    const s = coarse ? 1024 : 2048;
    sun.shadow.mapSize.set(s, s);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 24, bottom: -24, near: 1, far: 120 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    sun.target.position.set(4, 0, -1);
    this.scene.add(sun, sun.target);
  }

  _sky() {
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x4fa3f5) }, hor: { value: new THREE.Color(0xd4f1ff) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.05,0.0,1.0); gl_FragColor = vec4(mix(hor, top, pow(h,0.7)),1.0);\n#include <colorspace_fragment>\n}',
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), this.skyMat);
    this.scene.add(sky);
    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfff6d0, fog: false }));
    this.scene.add(this.sunDisc);

    this.clouds = [];
    for (let i = 0; i < 10; i++) {
      const c = M.cloud();
      c.position.set(rnd(-90, 90), rnd(20, 30), rnd(-80, 40));
      c.scale.setScalar(rnd(1.2, 2.2));
      c.userData.speed = rnd(0.4, 1.0);
      this.scene.add(c);
      this.clouds.push(c);
    }
  }

  _ground() {
    const g = new THREE.CircleGeometry(160, 64);
    g.rotateX(-Math.PI / 2);
    // A little colour noise in the grass.
    const col = [];
    const pos = g.attributes.position;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      c.setHex(0x86cc5c).offsetHSL(0, 0, Math.sin(x * 0.3) * Math.cos(z * 0.27) * 0.04);
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
    ground.receiveShadow = true;
    ground.userData.pick = { type: 'ground' };
    this.scene.add(ground);
    this.ground = ground;

    // Soft hills around the edge.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rnd(-0.1, 0.1);
      const d = rnd(55, 75);
      const h = ball(rnd(12, 20), 2, i % 2 ? 0x7cc255 : 0x6fb84b, Math.cos(a) * d, -4, Math.sin(a) * d);
      h.scale.y = rnd(0.35, 0.6);
      h.castShadow = false;
      this.scene.add(h);
    }

    // Paths: farm to market, farm to the buildings.
    const path = mat(0xe8d3a3);
    const strip = (w, d, x, z, rot = 0) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), path);
      p.rotation.set(-Math.PI / 2, 0, rot);
      p.position.set(x, 0.02, z);
      p.receiveShadow = true;
      this.scene.add(p);
    };
    strip(5, 2.2, 8.4, 0.2);
    strip(3.4, 2.2, -7.9, 0.9);
    strip(2.2, 3.6, 0, -7.3);
    // The market square.
    const sq = new THREE.Mesh(new THREE.CircleGeometry(8, 40), mat(0xdcc49a));
    sq.rotation.x = -Math.PI / 2;
    sq.position.set(MARKET.x, 0.025, MARKET.z);
    sq.receiveShadow = true;
    this.scene.add(sq);
    for (let i = 0; i < 40; i++) {
      const a = rnd(0, Math.PI * 2), d = rnd(0.5, 7.5);
      const st = box(rnd(0.3, 0.6), 0.03, rnd(0.3, 0.6), i % 2 ? 0xcdb488 : 0xe6d2a8, MARKET.x + Math.cos(a) * d, 0.02, MARKET.z + Math.sin(a) * d);
      st.rotation.y = rnd(0, 3);
      st.castShadow = false;
      this.scene.add(st);
    }
  }

  _clear(x, z) {
    // Keep scenery out of the farm, the market and the building yard.
    if (Math.abs(x) < 8 && z > -12 && z < 7.5) return false;
    if (Math.hypot(x - MARKET.x, z - MARKET.z) < 10) return false;
    if (x < -6 && x > -15 && z > -9.5 && z < 10) return false;
    if (Math.hypot(x - 4, z - 11) < 4.5) return false;
    return true;
  }

  _scenery() {
    const S = this.scene;
    // Trees as instanced meshes: two draw calls for the lot.
    const spots = [];
    let tries = 0;
    while (spots.length < 70 && tries++ < 2000) {
      const a = rnd(0, Math.PI * 2), d = rnd(14, 48);
      const x = Math.cos(a) * d + 3, z = Math.sin(a) * d - 2;
      if (!this._clear(x, z) || spots.some(s => Math.hypot(s.x - x, s.z - z) < 2.6)) continue;
      spots.push({ x, z, s: rnd(0.8, 1.5), pine: Math.random() < 0.35 });
    }
    const trunkG = new THREE.CylinderGeometry(0.18, 0.28, 1.6, 6); trunkG.translate(0, 0.8, 0);
    const roundG = new THREE.IcosahedronGeometry(1.2, 1); roundG.translate(0, 2.4, 0);
    const pineG = new THREE.ConeGeometry(1.1, 2.8, 7); pineG.translate(0, 2.6, 0);
    const trunks = new THREE.InstancedMesh(trunkG, mat(0x8a5a36), spots.length);
    const rounds = new THREE.InstancedMesh(roundG, mat(0xffffff), spots.filter(s => !s.pine).length);
    const pines = new THREE.InstancedMesh(pineG, mat(0x3f8f4a), spots.filter(s => s.pine).length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    const greens = [0x5fb83a, 0x4fa83a, 0x7fcf4f, 0x69b64a];
    let ri = 0, pi = 0;
    spots.forEach((s, i) => {
      q.setFromEuler(new THREE.Euler(0, rnd(0, 6), 0));
      m.compose(p.set(s.x, 0, s.z), q, sc.setScalar(s.s));
      trunks.setMatrixAt(i, m);
      if (s.pine) pines.setMatrixAt(pi++, m);
      else { rounds.setMatrixAt(ri, m); rounds.setColorAt(ri++, new THREE.Color(greens[i % 4])); }
    });
    for (const im of [trunks, rounds, pines]) { im.castShadow = true; im.receiveShadow = true; S.add(im); }

    // Grass tufts and flowers.
    const tuftG = new THREE.ConeGeometry(0.07, 0.35, 3); tuftG.translate(0, 0.17, 0);
    const tufts = new THREE.InstancedMesh(tuftG, mat(0x5fae3f), 1400);
    const flowerG = new THREE.IcosahedronGeometry(0.09, 0); flowerG.translate(0, 0.16, 0);
    const flowers = new THREE.InstancedMesh(flowerG, mat(0xffffff), 360);
    const fcol = [0xff7eb6, 0xffd44f, 0xffffff, 0xb98cff, 0xff6b6b];
    let n = 0, f = 0;
    while (n < 1400 || f < 360) {
      const x = rnd(-40, 45), z = rnd(-40, 40);
      if (!this._clear(x, z) && !(Math.abs(x) < 7.5 && Math.abs(z) > 5.6)) {
        // Allow a scatter just outside the fence.
        if (Math.abs(x) < 6.6 && z > -6 && z < 5.6) continue;
        if (Math.hypot(x - MARKET.x, z - MARKET.z) < 8.5) continue;
      }
      q.setFromEuler(new THREE.Euler(rnd(-0.2, 0.2), rnd(0, 6), rnd(-0.2, 0.2)));
      m.compose(p.set(x, 0, z), q, sc.setScalar(rnd(0.7, 1.4)));
      if (n < 1400) tufts.setMatrixAt(n++, m);
      else if (f < 360) { flowers.setMatrixAt(f, m); flowers.setColorAt(f, new THREE.Color(fcol[f % 5])); f++; }
    }
    S.add(tufts, flowers);

    // Pond with lily pads.
    const pond = new THREE.Mesh(new THREE.CircleGeometry(3.6, 32),
      new THREE.MeshPhongMaterial({ color: 0x4fb6e6, shininess: 120, specular: 0xffffff, transparent: true, opacity: 0.92 }));
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(4, 0.04, 11);
    pond.scale.set(1.3, 1, 1);
    S.add(pond);
    this.pond = pond;
    const rim = new THREE.Mesh(new THREE.RingGeometry(3.5, 4.0, 32), mat(0xbfb7a8));
    rim.rotation.x = -Math.PI / 2; rim.position.set(4, 0.03, 11); rim.scale.set(1.3, 1, 1);
    S.add(rim);
    for (let i = 0; i < 5; i++) {
      const pad = cyl(0.35, 0.35, 0.02, 10, 0x4f9f3a, 4 + rnd(-3, 3), 0.05, 11 + rnd(-2, 2));
      S.add(pad);
      if (i % 2) S.add(ball(0.1, 1, 0xff9fc8, pad.position.x, 0.12, pad.position.z));
    }

    const w = M.well(); w.position.set(-6.8, 0, 8); S.add(w);
    this.cottage = M.cottage(); this.cottage.position.set(-12.5, 0, 7.5); this.cottage.rotation.y = 0.7; S.add(this.cottage);
    this.smoke = [];
    for (let i = 0; i < 5; i++) {
      const s = ball(0.3, 1, 0xffffff, 0, 0, 0, new THREE.MeshLambertMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.6, flatShading: true }));
      s.castShadow = false;
      s.userData.t = i / 5;
      S.add(s);
      this.smoke.push(s);
    }

    // Lamps along the market path.
    for (const [x, z] of [[7.2, -1.5], [7.2, 1.9], [10, 5.5], [21, 4.5], [9.8, -6], [21.5, -6.5], [-7, -3], [-7, 4.6]]) {
      const l = M.lamp(); l.position.set(x, 0, z); S.add(l);
    }

    // Butterflies.
    this.butterflies = [];
    const wingG = new THREE.PlaneGeometry(0.22, 0.16); wingG.translate(0.11, 0, 0);
    for (let i = 0; i < 9; i++) {
      const b = new THREE.Group();
      const wm = new THREE.MeshBasicMaterial({ color: fcol[i % 5], side: THREE.DoubleSide });
      const l = new THREE.Mesh(wingG, wm), r2 = new THREE.Mesh(wingG, wm);
      r2.scale.x = -1;
      b.add(l, r2);
      b.userData = { l, r: r2, c: V(rnd(-12, 22), 0, rnd(-10, 10)), ph: rnd(0, 6), rad: rnd(1.5, 4) };
      S.add(b);
      this.butterflies.push(b);
    }
  }

  _farm() {
    const S = this.scene;
    // Fence with gaps for the paths east, west and north.
    const f = (len, x, z, rot = 0) => { const fe = M.fence(len); fe.position.set(x, 0, z); fe.rotation.y = rot; S.add(fe); };
    f(13, 0, 5.6);
    f(5.4, -3.8, -5.95); f(5.4, 3.8, -5.95);
    f(4.7, 6.5, -3.6, Math.PI / 2); f(4.7, 6.5, 3.25, Math.PI / 2);
    f(4.7, -6.5, -3.6, Math.PI / 2); f(4.7, -6.5, 3.25, Math.PI / 2);
    // Name board at the farm gate.
    this.farmSign = M.paintedSign();
    this.farmSign.position.set(7.4, 0, 1.9);
    this.farmSign.rotation.y = -0.6;
    this.farmSign.userData.board.userData.draw(['Welcome!', '🌻 Milbil Farm'], { title: 'bold 40px system-ui', font: 'bold 50px system-ui' });
    S.add(this.farmSign);

    this.me = null;
    this.meState = { pos: V(0, 0, 1), target: null, hop: 0, wave: 0, next: 3, face: 0 };
  }

  _market() {
    const S = this.scene;
    this.stalls = {};
    for (const r of RIVALS) {
      const L = M.RIVAL_LOOKS[r.id];
      const st = M.stall(L.awning, L.awning2);
      const spot = RIVAL_STALLS[r.id];
      st.position.copy(spot.pos);
      st.rotation.y = spot.rot;
      const who = M.rival(r.id);
      who.position.set(0, 0, -0.95);
      st.add(who);
      st.userData.who = who;
      st.userData.pick = { type: 'stall', id: r.id };
      S.add(st);
      this.pickables.push(st);
      this.stalls[r.id] = st;
    }
    this.myStallWide = -1;
    this._makeMyStall(1);
    this._syncHelper();

    this.shoppers = [];
    for (let i = 0; i < 9; i++) {
      const s = M.shopper(new THREE.Color(COLORS[i % COLORS.length]).getHex());
      s.position.set(MARKET.x + rnd(-5, 5), 0, MARKET.z + rnd(-1, 2));
      s.userData.target = null;
      s.userData.wait = rnd(0, 3);
      S.add(s);
      this.shoppers.push(s);
    }
  }

  _makeMyStall(wide) {
    if (this.myStall) { this.scene.remove(this.myStall); this.pickables.splice(this.pickables.indexOf(this.myStall), 1); }
    const col = new THREE.Color(G.S.farmer.color || '#ffb3c7').getHex();
    const st = M.myStall(col, wide);
    st.position.copy(MY_STALL.pos);
    st.rotation.y = MY_STALL.rot;
    st.userData.pick = { type: 'stall', id: 'you' };
    this.scene.add(st);
    this.pickables.push(st);
    this.myStall = st;
    this.myStallWide = wide;
    this.myStallColor = col;
    this.myStallKey = '';
    this.helperKey = '';
    this.stalls.you = st;
  }

  // The milbil who minds your stall, in their apron, standing on a crate.
  _syncHelper() {
    const h = G.S.helper;
    const key = h.color;
    if (key === this.helperKey && this.helper) return;
    this.helperKey = key;
    if (this.helper) this.helper.parent.remove(this.helper);
    const body = makeMilbil({ color: h.color, hat: 'none', eyes: 'happy', extra: 'none' });
    body.userData.bodyPivot.add(M.apron());
    body.scale.setScalar(1.15);
    body.position.y = 0.5;
    const w = group(box(0.7, 0.5, 0.6, 0xb98552), body);
    w.position.set(0.3, 0, -0.95);
    w.userData.body = body;
    w.userData.pick = { type: 'helper' };
    this.myStall.add(w);
    this.helper = w;
    this.helperState = { hop: 0, wave: 0, lastSay: -99 };
  }

  // ---------------------------------------------------------------- picking

  _tap(x, y) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), this.camera);
    const hits = ray.intersectObjects(this.pickables, true);
    const picks = [];
    let groundPoint = null;
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.pick) o = o.parent;
      if (!o) continue;
      if (o.userData.pick.type === 'ground') { groundPoint = groundPoint || h.point.clone(); continue; }
      if (!picks.includes(o.userData.pick)) picks.push(o.userData.pick);
    }
    // Your milbil often stands in front of a bed; the bed wins.
    const pick = picks.find(p => p.type === 'plot') || picks[0];
    if (pick) this.onPick(pick, x, y);
    else if (groundPoint) this.onPick({ type: 'ground', point: groundPoint }, x, y);
  }

  screenPos(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight, behind: p.z > 1 };
  }

  // On narrow screens the sheet covers the bottom of the view, so slide the
  // picture up to keep what you were looking at in sight.
  // On wide screens the sheet sits on the right, so slide the picture left.
  setSheet(open) {
    this.shiftWant = open && innerWidth < 900 ? 0.24 : 0;
    this.shiftXWant = open && innerWidth >= 900 ? 230 : 0;
  }

  focus(where) {
    const far = this.shiftWant > 0 ? 1.35 : 1;   // pull back while a sheet covers half the screen
    if (where === 'market') this.rig.flyTo(V(MARKET.x, 0, 0.3), 17 * far, -0.05);
    else if (where === 'build') this.rig.flyTo(V(-5, 0, -3), 22 * far, 0.9);
    else this.rig.flyTo(V(0, 0, 0), 20 * far, -0.35);
  }

  // ---------------------------------------------------------------- sync

  _syncPlots() {
    const S = G.S;
    while (this.plots.length < S.plots.length) {
      const i = this.plots.length;
      const bed = M.plotBed();
      bed.position.copy(PLOT_POS[i]);
      bed.userData.pick = { type: 'plot', i };
      this.scene.add(bed);
      this.pickables.push(bed);
      const label = document.createElement('div');
      label.className = 'plabel';
      this.labels.appendChild(label);
      this.plots.push({ bed, crop: null, models: [], label, labelKey: '', born: this.time });
      this.fxPuff(PLOT_POS[i], 0xb5e38a);
    }
    // Land you don't own yet: grass with a little for-sale peg.
    if (this.forSaleCount !== S.plots.length) {
      for (const f of this.forSale) { this.scene.remove(f); this.pickables.splice(this.pickables.indexOf(f), 1); }
      this.forSale = [];
      for (let i = S.plots.length; i < MAX_PLOTS; i++) {
        const f = M.forSalePlot();
        f.position.copy(PLOT_POS[i]);
        f.userData.pick = { type: 'forsale', i };
        this.scene.add(f);
        this.pickables.push(f);
        this.forSale.push(f);
      }
      this.forSaleCount = S.plots.length;
    }

    const now = Date.now();
    S.plots.forEach((p, i) => {
      const v = this.plots[i];
      if (v.crop !== p.crop) {
        for (const m of v.models) v.bed.remove(m);
        v.models = [];
        v.sprout = null;
        if (p.crop) {
          const n = M.CROP_LAYOUT[p.crop] || 1;
          const spots = n === 4 ? [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]] : n === 2 ? [[-0.38, 0.05], [0.38, -0.05]] : [[0, 0]];
          const sp = new THREE.Group();
          for (const [x, z] of spots) {
            const m = M.cropModel(p.crop);
            m.position.set(x, 0.18, z);
            m.rotation.y = (i * 7 + x * 13 + z * 5) % 6.28;
            v.bed.add(m);
            v.models.push(m);
            const s = M.sprout();
            s.position.set(x, 0.18, z);
            sp.add(s);
          }
          v.bed.add(sp);
          v.models.push(sp);
          v.sprout = sp;
        }
        v.crop = p.crop;
      }
      // Grow.
      const t = p.crop ? G.plotProgress(p, now) : 0;
      v.t = t;
      if (p.crop) {
        const early = t < 0.18;
        v.sprout.visible = early;
        const e = early ? 0 : (t - 0.18) / 0.82;
        const s = 0.28 + 0.72 * (1 - Math.pow(1 - e, 3));
        for (const m of v.models) {
          if (m === v.sprout) { m.scale.setScalar(0.6 + t * 3); continue; }
          m.visible = !early;
          m.scale.setScalar(s);
          if (t >= 1) m.rotation.z = Math.sin(this.time * 3 + i) * 0.05;
          else m.rotation.z = 0;
        }
      }
      // Floating label.
      let key, html;
      const c = p.crop && CROP[p.crop];
      if (!p.crop) { key = 'empty'; html = '<span class="plus">＋</span>'; }
      else if (t >= 1) { key = `ready${p.crop}`; html = `<span class="ready">✨${c.emoji}</span>`; }
      else {
        const left = Math.ceil((1 - t) * p.dur);
        key = `g${p.crop}${left}${Math.round(t * 20)}`;
        html = `<span class="grow">${c.emoji} ${left}s<i style="width:${Math.round(t * 100)}%"></i></span>`;
      }
      if (key !== v.labelKey) { v.label.innerHTML = html; v.labelKey = key; v.label.dataset.state = key.startsWith('ready') ? 'ready' : key === 'empty' ? 'empty' : 'grow'; }
    });
  }

  _syncBuildings() {
    const S = G.S;
    const place = (key, obj, pos, rot = 0, pick) => {
      obj.position.copy(pos);
      obj.rotation.y = rot;
      obj.userData.pick = pick || { type: 'building', id: key };
      this.scene.add(obj);
      this.pickables.push(obj);
      obj.userData.bornAt = this.time;
      obj.scale.setScalar(0.01);
      this.fxPuff(pos, 0xffffff, 12);
      return obj;
    };
    const want = (id, n, make) => {
      const have = this.built[id] || (this.built[id] = []);
      while (have.length < n) have.push(make(have.length));
    };
    const b = S.built;
    want('shed', b.shed, k => place('shed', M.shed(), BUILD_SPOTS.shed[k], Math.PI / 2));
    want('barn', b.barn, () => place('barn', M.barn(), BUILD_SPOTS.barn, Math.PI / 2));
    want('greenhouse', b.greenhouse, () => place('greenhouse', M.greenhouse(), BUILD_SPOTS.greenhouse, 0));
    want('dome', b.dome, () => place('dome', M.dome(), BUILD_SPOTS.dome, 0));
    want('scarecrow', b.scarecrow, () => place('scarecrow', M.scarecrow(), BUILD_SPOTS.scarecrow, 0));
    want('sprinkler', b.sprinkler ? 4 : 0, k => place('sprinkler', M.sprinkler(), BUILD_SPOTS.sprinkler[k], 0));
    want('sign', b.sign, () => {
      const s = place('sign', M.paintedSign(), BUILD_SPOTS.sign, 0.5);
      s.userData.pick = { type: 'stall', id: 'you' };
      return s;
    });
    const wide = 1 + b.stall * 0.15;
    if (Math.abs(wide - this.myStallWide) > 0.01) this._makeMyStall(wide);
    this._syncHelper();
  }

  _syncLook() {
    const f = G.S.farmer;
    const key = JSON.stringify(f);
    if (key === this.lookKey) return;
    this.lookKey = key;
    const pos = this.me ? this.me.position.clone() : this.meState.pos.clone();
    if (this.me) { this.scene.remove(this.me); this.pickables.splice(this.pickables.indexOf(this.me), 1); }
    this.me = makeMilbil(f);
    this.me.scale.setScalar(1.25);
    this.me.position.copy(pos);
    this.me.userData.pick = { type: 'me' };
    this.scene.add(this.me);
    this.pickables.push(this.me);
    const name = f.name || 'Milbil';
    this.farmSign.userData.board.userData.draw(['Welcome to', `🌻 ${name}'s Farm`], { title: 'bold 40px system-ui', font: 'bold 48px system-ui' });
    if (new THREE.Color(f.color).getHex() !== this.myStallColor) { this._makeMyStall(this.myStallWide); this._syncHelper(); }
  }

  _syncStalls() {
    const S = G.S;
    const items = book => Object.entries(book || {}).filter(([, l]) => l.qty > 0).sort((a, b) => CROP[a[0]].fair - CROP[b[0]].fair);
    const signLines = (title, list) => {
      const bits = list.map(([id, l]) => `${CROP[id].emoji}${l.price}`);
      const lines = [title];
      if (!bits.length) lines.push('sold out!');
      for (let i = 0; i < Math.min(bits.length, 6); i += 3) lines.push(bits.slice(i, i + 3).join('  '));
      return lines;
    };
    const crates = (st, list) => {
      const key = list.map(([id]) => id).join(',');
      if (st.userData.crateKey === key) return;
      st.userData.crateKey = key;
      const holder = st.userData.crates;
      while (holder.children.length) holder.remove(holder.children[0]);
      const w = st.userData.w || 2.2;
      list.slice(0, 4).forEach(([id], k, arr) => {
        const c = M.crate(id);
        c.position.set((k - (arr.length - 1) / 2) * 0.5, 0, 0.15);
        holder.add(c);
      });
    };
    for (const r of RIVALS) {
      const st = this.stalls[r.id];
      const list = items(S.rivals[r.id]);
      st.userData.sign.userData.draw(signLines(`${r.emoji} ${r.name}`, list), { title: 'bold 50px system-ui', font: 'bold 42px system-ui' });
      crates(st, list);
    }
    const mine = items(S.stall);
    const name = G.hasFarmer() ? S.farmer.name : 'You';
    this.myStall.userData.sign.userData.draw([`⭐ ${name}'s Stall`, G.hasHelper() ? `with ${S.helper.name}` : 'fresh & local'],
      { title: 'bold 54px system-ui', font: 'bold 40px system-ui', bg: '#fffbe6', edge: '#e0558a' });
    const chalk = mine.slice(0, 4).map(([id, l]) => `${CROP[id].emoji} ${l.price}`);
    this.myStall.userData.chalk.userData.draw(chalk.length ? ['TODAY', ...chalk] : ['TODAY', 'nothing', 'yet!'],
      { title: 'bold 40px system-ui', font: 'bold 44px system-ui', color: '#ffffff', bg: '#2f4a3a', edge: '#8a5a36' });
    crates(this.myStall, mine);
    if (this.built.sign && this.built.sign[0]) {
      this.built.sign[0].userData.board.userData.draw(['Fresh from', `${name}'s farm!`], { title: 'bold 44px system-ui', font: 'bold 50px system-ui' });
    }
  }

  sync() {
    this._syncLook();
    this._syncHelper();
    this._syncPlots();
    this._syncBuildings();
    this._syncStalls();
  }

  // ---------------------------------------------------------------- your milbil

  walkToPlot(i) {
    const p = PLOT_POS[i];
    if (!p || !this.me) return;
    const from = this.me.position;
    // Stand at the side of the bed nearest to where you are.
    const off = V(from.x - p.x, 0, from.z - p.z);
    if (off.lengthSq() < 0.01) off.set(0, 0, 1);
    off.normalize().multiplyScalar(1.1);
    this.runTo(p.clone().add(off), { look: p.clone(), follow: false });
  }

  // Where to stand to be served at a stall.
  stallFront(id) {
    const st = this.stalls[id];
    return V(0, 0, id === 'you' ? 1.75 : 1.5).applyAxisAngle(V(0, 1, 0), st.rotation.y).add(st.position);
  }

  // Run somewhere you tapped. `goal` is reported to onArrive when you get there.
  runTo(point, { goal = null, look = null, follow = true } = {}) {
    const st = this.meState;
    const r = Math.hypot(point.x, point.z);
    st.target = r > 40 ? point.clone().multiplyScalar(40 / r) : point.clone();
    st.target.y = 0;
    st.goal = goal;
    st.look = look;
    st.run = true;
    st.controlled = this.time;
    st.next = 8;
    if (follow) this.rig.follow = this.me;
    this.fxRing(st.target);
  }

  runToStall(id) {
    const st = this.stalls[id];
    this.runTo(this.stallFront(id), { goal: { type: 'stall', id }, look: st.position.clone() });
  }

  // Speech bubbles over a character's head.
  say(obj, text, secs = 3.5, y = 2.2) {
    let b = this.bubbles.find(x => x.obj === obj);
    if (!b) {
      const el = document.createElement('div');
      el.className = 'bubble';
      this.labels.appendChild(el);
      b = { el, obj, y };
      this.bubbles.push(b);
    }
    b.el.textContent = text;
    b.until = this.time + secs;
    b.y = y;
    b.el.classList.remove('pop'); void b.el.offsetWidth; b.el.classList.add('pop');
  }

  helperSay(text, secs) {
    if (!this.helper) return;
    this.say(this.helper.userData.body, text, secs, 1.3);
    this.helperState.lastSay = this.time;
  }

  rivalSay(id, text, secs) { this.say(this.stalls[id].userData.who.userData.body, text, secs, 1.6); }

  cheer() { this.meState.hop = 0.001; }

  _updateMe(dt) {
    const m = this.me;
    if (!m) return;
    const st = this.meState;
    let speed = 0;
    // Keyboard: WASD / arrows move relative to the camera.
    const k = this.keys;
    const kx = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    const kz = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
    if (kx || kz) {
      const yaw = this.rig.yaw;
      const fwd = V(Math.sin(yaw), 0, Math.cos(yaw));        // towards the camera
      const right = V(fwd.z, 0, -fwd.x);
      const d = right.multiplyScalar(kx).addScaledVector(fwd, kz).normalize();
      speed = k.has('shift') ? 4 : 7;
      m.position.addScaledVector(d, speed * dt);
      const r = Math.hypot(m.position.x, m.position.z);
      if (r > 40) m.position.multiplyScalar(40 / r);
      st.face = Math.atan2(d.x, d.z);
      st.target = null; st.goal = null;
      st.controlled = this.time;
      this.rig.follow = m;
      this._checkNear();
    } else if (st.target) {
      const d = V(st.target.x - m.position.x, 0, st.target.z - m.position.z);
      const len = d.length();
      if (len < 0.08) {
        st.target = null;
        st.run = false;
        if (st.look) { st.face = Math.atan2(st.look.x - m.position.x, st.look.z - m.position.z); st.look = null; }
        st.hop = 0.001;
        if (st.goal) { const g = st.goal; st.goal = null; this._arrive(g); }
      } else {
        speed = st.run ? Math.min(7.5, 2 + len * 3) : Math.min(5, 1.5 + len * 2);
        d.multiplyScalar(Math.min(1, (speed * dt) / len));
        m.position.add(d);
        st.face = Math.atan2(d.x, d.z);
      }
    } else {
      st.next -= dt;
      // After you've steered your milbil, it stays put for a while.
      if (st.next <= 0 && this.time - (st.controlled || -99) > 25) {
        // Wander: visit a ripe plot if there is one, otherwise somewhere nearby.
        const ripe = this.plots.map((v, i) => (v.t >= 1 ? i : -1)).filter(i => i >= 0);
        if (ripe.length && Math.random() < 0.7) this.walkToPlot(ripe[Math.floor(Math.random() * ripe.length)]);
        else {
          st.target = V(rnd(-5.5, 5.5), 0, [-5, -3, -1, 1, 3, 5][Math.floor(rnd(0, 6))] * 0.95);
        }
        st.next = rnd(4, 9);
      }
    }
    let da = st.face - m.rotation.y;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    m.rotation.y += da * Math.min(1, dt * 10);
    if (st.hop) { st.hop += dt * 2.4; if (st.hop >= 1) st.hop = 0; }
    animateMilbil(m, this.time, speed, { hop: st.hop, wave: st.wave > 0, dt });
    // Kick up little puffs of dust when running.
    if (speed > 4) {
      st.dust = (st.dust || 0) - dt;
      if (st.dust <= 0) { st.dust = 0.09; this.fxDust(m.position); }
    }
    if (st.wave > 0) st.wave -= dt;
  }

  wave() { this.meState.wave = 1.5; }

  _arrive(goal) {
    if (goal.type === 'stall') {
      this.meState.wave = 1.2;
      const id = goal.id;
      if (id === 'you') {
        this.helperState.wave = 1.5;
        this.helperState.hop = 0.001;
      }
      this.onArrive(goal);
    }
  }

  // Walking past your stall gets a hello, even without tapping it.
  _checkNear() {
    const d = this.me.position.distanceTo(this.stallFront('you'));
    if (d < 1.6 && this.time - this.helperState.lastSay > 12) this.onArrive({ type: 'stall', id: 'you', passing: true });
  }

  // ---------------------------------------------------------------- effects

  fxPuff(pos, color = 0xffffff, n = 8) {
    for (let i = 0; i < n; i++) {
      const b = ball(rnd(0.12, 0.25), 1, color, pos.x + rnd(-0.6, 0.6), 0.3, pos.z + rnd(-0.6, 0.6),
        new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.9, flatShading: true }));
      b.castShadow = false;
      this.scene.add(b);
      this.fx.push({ o: b, life: 0, max: rnd(0.6, 1), vel: V(rnd(-1, 1), rnd(1, 2.5), rnd(-1, 1)), kind: 'puff' });
    }
  }

  fxDust(pos) {
    const b = ball(rnd(0.08, 0.14), 0, 0xe8dcc0, pos.x + rnd(-0.15, 0.15), 0.1, pos.z + rnd(-0.15, 0.15),
      new THREE.MeshLambertMaterial({ color: 0xefe6d0, transparent: true, opacity: 0.8, flatShading: true }));
    b.castShadow = false;
    this.scene.add(b);
    this.fx.push({ o: b, life: 0, max: 0.5, vel: V(rnd(-0.4, 0.4), rnd(0.4, 0.9), rnd(-0.4, 0.4)), kind: 'puff' });
  }

  // A ring on the ground where you tapped.
  fxRing(pos) {
    const r = new THREE.Mesh(geoRing, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    r.rotation.x = -Math.PI / 2;
    r.position.set(pos.x, 0.06, pos.z);
    this.scene.add(r);
    this.fx.push({ o: r, life: 0, max: 0.6, vel: V(0, 0, 0), kind: 'ring' });
  }

  fxCoin(pos) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16), M.GOLD);
    c.rotation.x = Math.PI / 2;
    c.position.copy(pos).add(V(rnd(-0.3, 0.3), 1.2, rnd(-0.2, 0.2)));
    this.scene.add(c);
    this.fx.push({ o: c, life: 0, max: 1.1, vel: V(0, 2.4, 0), kind: 'coin' });
  }

  fxSparkle(pos, color = 0xfff3a0) {
    for (let i = 0; i < 10; i++) {
      const s = ball(0.06, 0, color, pos.x, 0.6, pos.z, new THREE.MeshBasicMaterial({ color, transparent: true }));
      s.castShadow = false;
      this.scene.add(s);
      const a = rnd(0, Math.PI * 2);
      this.fx.push({ o: s, life: 0, max: 0.8, vel: V(Math.cos(a) * 2, rnd(2, 4), Math.sin(a) * 2), kind: 'spark' });
    }
  }

  onSale(price, crop) {
    this.fxCoin(this.myStall.position);
    this.helperState.hop = 0.001;
    this.bellRing = 1;
    if (this.time - this.helperState.lastSay > 3) {
      const cheers = ['Sold! 🎉', `+${price}🪙!`, `One ${crop.emoji} sold!`, 'Ka-ching! 🔔', 'Thank you! 😊'];
      this.helperSay(cheers[Math.floor(Math.random() * cheers.length)], 2);
    }
    // Send a shopper over to your stall.
    const s = this.shoppers[Math.floor(Math.random() * this.shoppers.length)];
    const front = V(0, 0, 1.5).applyAxisAngle(V(0, 1, 0), this.myStall.rotation.y).add(this.myStall.position);
    s.userData.target = front.add(V(rnd(-0.8, 0.8), 0, 0));
    s.userData.wait = 2;
    return this.screenPos(this.myStall.position.clone().add(V(0, 2.6, 0)));
  }

  onHarvest(i) {
    const p = PLOT_POS[i];
    this.fxSparkle(p);
    this.walkToPlot(i);
    return this.screenPos(p.clone().add(V(0, 1.2, 0)));
  }

  onPlant(i) {
    this.fxPuff(PLOT_POS[i], 0x9b6841, 6);
    this.walkToPlot(i);
  }

  plotScreen(i) { return this.screenPos(PLOT_POS[i].clone().add(V(0, 1, 0))); }

  // ---------------------------------------------------------------- frame

  update(dt) {
    this.time += dt;
    const t = this.time;
    this.rig.update(dt);
    this.shift += (this.shiftWant - this.shift) * Math.min(1, dt * 8);
    this.shiftX = (this.shiftX || 0) + ((this.shiftXWant || 0) - (this.shiftX || 0)) * Math.min(1, dt * 8);
    if (Math.abs(this.shift) > 0.001 || Math.abs(this.shiftX) > 0.5) this.camera.setViewOffset(innerWidth, innerHeight, this.shiftX, this.shift * innerHeight, innerWidth, innerHeight);
    else if (this.camera.view && this.camera.view.enabled) this.camera.clearViewOffset();

    // Sky follows the market day.
    const dayK = G.S.dayT / DAY_LENGTH;
    const sky = skyAt(dayK);
    this.skyMat.uniforms.top.value.setHex(sky.top);
    this.skyMat.uniforms.hor.value.setHex(sky.hor);
    this.scene.fog.color.setHex(sky.hor);
    this.sun.color.setHex(sky.sun);
    this.sun.intensity = sky.si;
    this.hemi.intensity = sky.hemi;
    this.hemi.color.setHex(sky.top).lerp(new THREE.Color(0xffffff), 0.5);
    const sa = -0.9 + dayK * 1.8;          // east to west
    const sunPos = V(Math.sin(sa) * 40, 26 + Math.cos(sa) * 10 - dayK * dayK * 14, 18 + Math.cos(sa) * 6);
    this.sun.position.copy(sunPos).add(this.sun.target.position);
    this.sunDisc.position.copy(sunPos).multiplyScalar(5.5);
    this.sunDisc.material.color.setHex(sky.sun).lerp(new THREE.Color(0xffffff), 0.5);
    M.setDusk(THREE.MathUtils.smoothstep(dayK, 0.78, 0.98));

    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 110) c.position.x = -110;
    }
    for (const b of this.butterflies) {
      const u = b.userData;
      const a = t * 0.6 + u.ph;
      b.position.set(u.c.x + Math.cos(a) * u.rad, 0.8 + Math.sin(t * 2 + u.ph) * 0.3, u.c.z + Math.sin(a * 1.3) * u.rad);
      b.rotation.y = -a;
      const flap = Math.sin(t * 20 + u.ph) * 0.9;
      u.l.rotation.y = flap; u.r.rotation.y = -flap;
    }
    this.pond.material.color.setHSL(0.55, 0.7, 0.6 + Math.sin(t) * 0.02);
    const chim = this.cottage.localToWorld(this.cottage.userData.chimney.clone());
    for (const s of this.smoke) {
      s.userData.t = (s.userData.t + dt * 0.25) % 1;
      const k = s.userData.t;
      s.position.set(chim.x + Math.sin(k * 6) * 0.3 + k * 1.2, chim.y + k * 3, chim.z);
      s.scale.setScalar(0.5 + k * 1.6);
      s.material.opacity = 0.55 * (1 - k);
    }

    // Buildings pop in with a springy bounce.
    for (const list of Object.values(this.built)) for (const o of list) {
      const age = t - o.userData.bornAt;
      if (age < 1) {
        const k = Math.min(1, age / 0.7);
        o.scale.setScalar(Math.max(0.01, 1 - Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * 0.12));
      } else if (o.scale.x !== 1) o.scale.setScalar(1);
      if (o.userData.head) o.userData.head.rotation.y = t * 2.5;
    }

    // Rival farmers bob at their stalls; shoppers wander.
    for (const r of RIVALS) {
      const who = this.stalls[r.id].userData.who.userData.body;
      who.position.y = 0.45 + Math.abs(Math.sin(t * 2 + r.id.length)) * 0.05;
      who.rotation.y = Math.sin(t * 0.7 + r.id.length) * 0.4;
    }
    for (const s of this.shoppers) {
      const u = s.userData;
      if (!u.target) {
        u.wait -= dt;
        if (u.wait <= 0) {
          const spots = [...RIVALS.map(r => this.stalls[r.id]), this.myStall];
          const st = spots[Math.floor(Math.random() * spots.length)];
          u.target = V(0, 0, 1.4 + rnd(0, 0.6)).applyAxisAngle(V(0, 1, 0), st.rotation.y).add(st.position).add(V(rnd(-0.7, 0.7), 0, 0));
        }
        s.position.y = 0;
      } else {
        const d = V(u.target.x - s.position.x, 0, u.target.z - s.position.z);
        const len = d.length();
        if (len < 0.1) { u.target = null; u.wait = rnd(1.5, 4); }
        else {
          d.multiplyScalar(Math.min(1, (1.6 * dt) / len));
          s.position.add(d);
          s.rotation.y = Math.atan2(d.x, d.z);
          s.position.y = Math.abs(Math.sin(t * 10 + s.id)) * 0.08;
        }
      }
    }

    this._updateMe(dt);
    this._updateHelper(dt);
    this._placeBubbles();

    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.life += dt;
      const k = f.life / f.max;
      if (k >= 1) { this.scene.remove(f.o); this.fx.splice(i, 1); continue; }
      f.o.position.addScaledVector(f.vel, dt);
      if (f.kind === 'coin') { f.o.rotation.z += dt * 10; f.vel.y *= 0.96; }
      else if (f.kind === 'spark') { f.vel.y -= 9 * dt; f.o.material.opacity = 1 - k; }
      else if (f.kind === 'ring') { f.o.scale.setScalar(1 + k * 1.2); f.o.material.opacity = 0.9 * (1 - k); }
      else { f.vel.multiplyScalar(0.92); f.o.scale.setScalar(1 + k * 1.5); f.o.material.opacity = 0.9 * (1 - k); }
    }

    this.renderer.render(this.scene, this.camera);
    this._placeLabels();
  }

  _updateHelper(dt) {
    if (!this.helper) return;
    const hs = this.helperState;
    const body = this.helper.userData.body;
    // Face your milbil when it's close, otherwise watch the square.
    const me = this.me && this.me.position;
    const wp = this.helper.getWorldPosition(V(0, 0, 0));
    let face = 0;
    if (me && me.distanceTo(wp) < 7) face = Math.atan2(me.x - wp.x, me.z - wp.z) - this.myStall.rotation.y;
    else face = Math.sin(this.time * 0.6) * 0.5;
    let da = face - body.rotation.y;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    body.rotation.y += da * Math.min(1, dt * 6);
    if (hs.hop) { hs.hop += dt * 2.6; if (hs.hop >= 1) hs.hop = 0; }
    animateMilbil(body, this.time, 0, { hop: hs.hop, wave: hs.wave > 0, dt });
    if (hs.wave > 0) hs.wave -= dt;
    const bell = this.myStall.userData.bell;
    if (this.bellRing > 0) { this.bellRing -= dt * 1.5; bell.rotation.z = Math.sin(this.time * 30) * 0.4 * Math.max(0, this.bellRing); }
  }

  _placeBubbles() {
    const w = innerWidth, h = innerHeight;
    const v = new THREE.Vector3();
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (this.time > b.until || !b.obj.parent) { b.el.remove(); this.bubbles.splice(i, 1); continue; }
      b.obj.getWorldPosition(v);
      v.y += b.y;
      v.project(this.camera);
      if (v.z > 1) { b.el.style.display = 'none'; continue; }
      b.el.style.display = '';
      b.el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  _placeLabels() {
    const w = innerWidth, h = innerHeight;
    const v = new THREE.Vector3();
    this.plots.forEach((p, i) => {
      v.copy(PLOT_POS[i]);
      v.y = p.label.dataset.state === 'empty' ? 0.3 : p.label.dataset.state === 'ready' ? 1.5 : 1.25;
      v.project(this.camera);
      if (v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2) { p.label.style.display = 'none'; return; }
      p.label.style.display = '';
      const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h;
      p.label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${THREE.MathUtils.clamp(22 / this.rig.dist, 0.6, 1.2).toFixed(2)})`;
    });
  }
}
