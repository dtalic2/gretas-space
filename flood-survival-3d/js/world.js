// ---------- Props, buildings and the things that move ----------
//
// Everything here is built from boxes and cylinders with flat shading. That is a
// deliberate look — it stays readable in a downpour at night, which a
// photoreal valley would not, and it means the whole game is text in a folder.
//
// Anything that needs to sit on the ground reads terrain.height(); anything that
// needs to sit on the water reads the flood level each frame. Nothing hardcodes
// an altitude.
import * as THREE from 'three';
import { height, normalAt, riverX, SITES, DEPOT, WORLD, RIM_Y } from './terrain.js';
import { NODES, PROJECTS, TIERS } from './econ.js';

const lam = (color, flat = true) => new THREE.MeshLambertMaterial({ color, flatShading: flat });

// Shared materials. Module level so the signpost helper can use them too, and so
// the whole world runs on a handful of draw materials.
const POST = lam(0x5c4229);
const BOARD = lam(0xc9b48c);

// ---------------------------------------------------------------- small helpers

function box(w, h, d, mat, x = 0, y = 0, z = 0){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rt, rb, h, seg, mat, x = 0, y = 0, z = 0){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** A painted board with text on it, for signposts. */
function signTexture(title, sub){
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e6d6b0';
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = '#7a5a34'; g.lineWidth = 14;
  g.strokeRect(7, 7, 498, 242);
  g.fillStyle = '#3b2a17';
  g.textAlign = 'center';
  g.font = 'bold 62px Georgia, serif';
  g.fillText(title, 256, sub ? 112 : 148);
  if (sub){
    g.font = '40px Georgia, serif';
    g.fillStyle = '#6b5334';
    g.fillText(sub, 256, 178);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * A signpost. Indices 4 and 5 of a box's material array are its +Z and -Z faces,
 * so painting both means the sign reads whichever way you walk up to it — worth
 * it when the thing exists purely to stop you being lost.
 */
function signpost(title, sub, x = 0, z = 0){
  const g = new THREE.Group();
  g.add(cyl(0.09, 0.11, 2.6, 6, POST, 0, 1.3, 0));
  const painted = new THREE.MeshLambertMaterial({ map: signTexture(title, sub) });
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.1, 0.12),
    [BOARD, BOARD, BOARD, BOARD, painted, painted],
  );
  board.position.set(0, 2.35, 0.08);
  board.castShadow = true;
  g.add(board);
  g.position.set(x, height(x, z), z);
  return g;
}

/** A villager: same build as the player, different clothes. */
export function makeVillager(bodyColor = 0x7c6bb0, hatColor = 0x8f4b3c){
  const g = new THREE.Group();
  const skin = lam(0xd8a87c);
  const legs = [], arms = [];
  for (const s of [-1, 1]){
    const leg = box(0.22, 0.6, 0.22, lam(0x3d4457), s * 0.15, 0.3, 0);
    g.add(leg); legs.push(leg);
    const arm = box(0.18, 0.56, 0.18, skin, s * 0.42, 1.0, 0);
    g.add(arm); arms.push(arm);
  }
  g.add(box(0.66, 0.74, 0.42, lam(bodyColor), 0, 0.97, 0));
  const head = box(0.5, 0.48, 0.44, skin, 0, 1.58, 0);
  g.add(head);
  for (const s of [-1, 1]) g.add(box(0.08, 0.1, 0.04, lam(0x241a12), s * 0.12, 1.62, 0.225));
  g.add(cyl(0.34, 0.34, 0.07, 10, lam(hatColor), 0, 1.86, 0));
  g.add(cyl(0.22, 0.25, 0.24, 10, lam(hatColor), 0, 1.97, 0));
  g.userData = { legs, arms, head, phase: Math.random() * 6 };
  return g;
}

/** Drive a villager's walk cycle. `speed01` is 0 standing, 1 full stride. */
export function animateFigure(fig, dt, speed01){
  const u = fig.userData;
  u.phase += dt * 10 * Math.max(0.15, speed01);
  const sw = Math.sin(u.phase) * 0.7 * speed01;
  u.legs[0].rotation.x = sw;
  u.legs[1].rotation.x = -sw;
  u.arms[0].rotation.x = -sw * 0.8;
  u.arms[1].rotation.x = sw * 0.8;
  u.head.position.y = 1.58 + Math.abs(Math.sin(u.phase)) * 0.03 * speed01;
}

// ---------------------------------------------------------------- world

export class WorldProps {
  constructor(scene){
    this.scene = scene;
    this.stations = [];
    this.reeds = [];
    this.floaters = [];      // things that ride the water surface
    this.lamps = [];
    this.birds = [];
    this.t = 0;

    this._materials();
    this._homestead();
    this._depot();
    this._nodes();
    this._scenery();
    this._bridge();
    this._villagers();
    this._birds();
  }

  _materials(){
    this.m = {
      wood: lam(0x8a6540),
      dark: lam(0x5c4229),
      plank: lam(0xa87f4f),
      pale: lam(0xc7a878),
      canvasCloth: lam(0xd8cdb4),
      tarp: lam(0x4c6b4f),
      metal: lam(0x8d949c),
      rust: lam(0x8a5a3c),
      leaf: lam(0x3f6b34),
      leafDark: lam(0x2f5228),
      pine: lam(0x2c4a2a),
      rock: lam(0x7b7972),
      clay: lam(0xa4643c),
      reed: lam(0xa8985c),
      cloth: lam(0xb4402f),
      glass: new THREE.MeshBasicMaterial({ color: 0xffd79a }),
    };
  }

  /** Register an interaction point. y is sampled from the ground. */
  _station(id, x, z, radius, label, extra = {}){
    const st = { id, label, radius, pos: new THREE.Vector3(x, height(x, z), z), ...extra };
    this.stations.push(st);
    return st;
  }

  // -------------------------------------------------------------- homestead
  _homestead(){
    const g = new THREE.Group();
    this.scene.add(g);
    this.homestead = g;

    const put = (obj, x, z, yOff = 0) => {
      obj.position.set(x, height(x, z) + yOff, z);
      g.add(obj);
      return obj;
    };

    // --- tent you sleep in ---
    const tent = new THREE.Group();
    const cloth = new THREE.Mesh(new THREE.CylinderGeometry(0, 1.7, 2.0, 4, 1, true), this.m.canvasCloth);
    cloth.rotation.y = Math.PI / 4;
    cloth.position.y = 1.0;
    cloth.castShadow = true;
    tent.add(cloth);
    tent.add(box(0.1, 2.1, 0.1, this.m.dark, 0, 1.05, 0));
    tent.add(box(1.3, 0.14, 0.9, this.m.plank, 0, 0.07, 1.1));
    put(tent, -7, 21);
    this._station('bed', -7, 22.4, 2.6, 'Tent');

    // --- campfire ---
    const fire = new THREE.Group();
    for (let i = 0; i < 7; i++){
      const a = (i / 7) * Math.PI * 2;
      fire.add(cyl(0.11, 0.13, 0.28, 5, this.m.rock, Math.cos(a) * 0.62, 0.14, Math.sin(a) * 0.62));
    }
    for (let i = 0; i < 4; i++){
      const log = cyl(0.09, 0.11, 1.0, 5, this.m.dark, 0, 0.24, 0);
      log.rotation.set(Math.PI / 2.4, (i / 4) * Math.PI * 2, 0);
      fire.add(log);
    }
    this.flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 6), new THREE.MeshBasicMaterial({ color: 0xff8b2e, transparent: true, opacity: 0.92 }));
    this.flame.position.y = 0.55;
    fire.add(this.flame);
    this.fireLight = new THREE.PointLight(0xffa142, 2.4, 16, 2);
    this.fireLight.position.y = 1.0;
    fire.add(this.fireLight);
    this.fireGroup = put(fire, -4.4, 19.2);

    // --- your stall (three tiers of it) ---
    this.stallTiers = [this._stallT1(), this._stallT2(), this._stallT3()];
    this.stallHolder = new THREE.Group();
    this.stallTiers.forEach((s, i) => { s.visible = i === 0; this.stallHolder.add(s); });
    put(this.stallHolder, -9, 12);
    this._station('stall', -9, 13.8, 3.0, 'Your Business');
    g.add(signpost('Stall', 'your business', -11.8, 14.6));

    // --- house build plot ---
    this.houseGroup = new THREE.Group();
    put(this.houseGroup, 2, 17);
    this._buildHouseStages();
    // Sits at the foot of the ladder on the south face. Generous radius: this is
    // both the build spot and the only way up.
    this._station('house', 2, 12.6, 4.2, PROJECTS.house.name, { project: 'house' });

    // stakes and string marking the plot before anything is built
    this.plotMarks = new THREE.Group();
    for (let i = 0; i < 4; i++){
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = 2 + Math.cos(a) * 4.4, z = 17 + Math.sin(a) * 4.4;
      const stake = cyl(0.05, 0.06, 1.1, 5, this.m.dark, 0, 0, 0);
      stake.position.set(x, height(x, z) + 0.55, z);
      this.plotMarks.add(stake);
    }
    g.add(this.plotMarks);

    // --- boat slip, down the bank toward the river ---
    this.boatGroup = new THREE.Group();
    put(this.boatGroup, 12, 22);
    this._buildBoatStages();
    this._station('boat', 12, 19.4, 3.4, PROJECTS.boat.name, { project: 'boat' });
    for (const s of [-1, 1]){
      const rail = box(0.24, 0.2, 7.2, this.m.dark, 0, 0, 0);
      const rx = 12 + s * 1.5, rz = 22.6;
      rail.position.set(rx, height(rx, rz) + 0.1, rz);
      rail.rotation.x = -0.16;
      g.add(rail);
    }
    g.add(signpost('Slip', 'boat here', 15.6, 19.2));

    // --- clutter so it reads as somebody's yard ---
    for (const [x, z, w, h, d] of [[-2, 22, 1.1, 0.9, 0.8], [-1, 23.2, 0.9, 0.7, 0.9], [6, 21.5, 1.2, 1.0, 0.9]]){
      put(box(w, h, d, this.m.plank, 0, 0, 0), x, z, h / 2);
    }
    const barrow = new THREE.Group();
    barrow.add(box(1.1, 0.5, 0.7, this.m.metal, 0, 0.45, 0));
    const barrowWheel = cyl(0.28, 0.28, 0.1, 10, this.m.dark, 0, 0.28, 0.55);
    barrowWheel.rotation.x = Math.PI / 2;
    barrow.add(barrowWheel);
    barrow.add(box(0.08, 0.08, 1.1, this.m.wood, -0.4, 0.6, -0.85));
    barrow.add(box(0.08, 0.08, 1.1, this.m.wood, 0.4, 0.6, -0.85));
    put(barrow, 7.6, 19.4);

    // fence along the road edge
    for (let i = -5; i <= 5; i++){
      const x = -12 - i * 0.1, z = 16 + i * 1.9;
      put(cyl(0.07, 0.09, 1.2, 5, this.m.dark, 0, 0, 0), x, z, 0.6);
    }
  }

  _stallT1(){
    const g = new THREE.Group();
    for (const s of [-1, 1]) g.add(box(0.8, 0.8, 0.8, this.m.plank, s * 1.0, 0.4, 0));
    g.add(box(2.8, 0.14, 1.1, this.m.pale, 0, 0.87, 0));
    g.add(box(0.9, 0.6, 0.05, this.m.cloth, 0, 1.2, -0.5));
    return g;
  }

  _stallT2(){
    const g = new THREE.Group();
    g.add(box(3.0, 0.5, 1.5, this.m.plank, 0, 0.85, 0));
    g.add(box(3.0, 0.14, 1.5, this.m.pale, 0, 1.12, 0));
    for (const s of [-1, 1]){
      const wheel = cyl(0.55, 0.55, 0.14, 12, this.m.dark, s * 1.3, 0.55, 0.85);
      wheel.rotation.x = Math.PI / 2;
      g.add(wheel);
    }
    g.add(box(0.1, 1.6, 0.1, this.m.dark, -1.4, 1.9, 0));
    g.add(box(0.1, 1.6, 0.1, this.m.dark, 1.4, 1.9, 0));
    const awn = box(3.2, 0.1, 1.9, this.m.cloth, 0, 2.7, 0.2);
    awn.rotation.x = -0.12;
    g.add(awn);
    return g;
  }

  _stallT3(){
    const g = new THREE.Group();
    g.add(box(4.4, 2.6, 3.0, this.m.plank, 0, 1.3, -0.6));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0, 3.4, 1.5, 4), this.m.tarp);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, 3.3, -0.6);
    roof.castShadow = true;
    g.add(roof);
    g.add(box(4.0, 0.16, 1.2, this.m.pale, 0, 1.15, 1.1));
    for (const s of [-1, 1]) g.add(box(0.14, 1.15, 0.14, this.m.dark, s * 1.9, 0.58, 1.1));
    const awn = box(4.6, 0.1, 2.4, this.m.cloth, 0, 2.45, 1.0);
    awn.rotation.x = -0.16;
    g.add(awn);
    const lamp = new THREE.PointLight(0xffcf8a, 1.6, 11, 2);
    lamp.position.set(0, 2.3, 1.4);
    g.add(lamp);
    this.lamps.push(lamp);
    g.add(box(0.22, 0.3, 0.22, this.m.glass, 0, 2.28, 1.4));
    return g;
  }

  // -------------------------------------------------------------- house stages
  _buildHouseStages(){
    const g = this.houseGroup;
    const S = 5.0;           // half-width of the house footprint
    this.houseParts = [];

    // 1. stilts
    const stilts = new THREE.Group();
    for (let i = 0; i < 9; i++){
      const x = (i % 3 - 1) * (S - 0.6), z = (Math.floor(i / 3) - 1) * (S - 0.6);
      stilts.add(cyl(0.22, 0.26, 1.9, 6, this.m.dark, x, 0.95, z));
    }
    for (const s of [-1, 1]){
      stilts.add(box(S * 2, 0.24, 0.26, this.m.wood, 0, 1.85, s * (S - 0.6)));
      stilts.add(box(0.26, 0.24, S * 2, this.m.wood, s * (S - 0.6), 1.85, 0));
    }
    this.houseParts.push(stilts);

    // 2. deck
    const deck = new THREE.Group();
    for (let i = 0; i < 12; i++){
      deck.add(box(S * 2, 0.12, 0.78, i % 2 ? this.m.plank : this.m.pale, 0, 2.02, (i - 5.5) * 0.82));
    }
    // Ladder on the south face, the same side as the interaction point — so the
    // ladder you can see is the ladder you can actually climb.
    const ladder = new THREE.Group();
    for (const s of [-1, 1]) ladder.add(box(0.1, 2.3, 0.1, this.m.wood, s * 0.32, 1.15, 0));
    for (let i = 0; i < 6; i++) ladder.add(box(0.78, 0.08, 0.1, this.m.wood, 0, 0.3 + i * 0.36, 0));
    ladder.position.set(0, 0, -(S + 0.12));
    deck.add(ladder);
    this.houseParts.push(deck);

    // 3. walls
    const walls = new THREE.Group();
    const wallMat = this.m.pale;
    walls.add(box(S * 2, 2.6, 0.18, wallMat, 0, 3.4, -S));
    walls.add(box(0.18, 2.6, S * 2, wallMat, -S, 3.4, 0));
    walls.add(box(0.18, 2.6, S * 2, wallMat, S, 3.4, 0));
    // front wall with a doorway gap
    walls.add(box(3.1, 2.6, 0.18, wallMat, -3.45, 3.4, S));
    walls.add(box(3.1, 2.6, 0.18, wallMat, 3.45, 3.4, S));
    walls.add(box(3.8, 0.7, 0.18, wallMat, 0, 4.35, S));
    // window, lit at night
    walls.add(box(1.3, 1.0, 0.06, this.m.glass, -2.2, 3.6, -S + 0.02));
    const inner = new THREE.PointLight(0xffcf8a, 1.5, 13, 2);
    inner.position.set(0, 3.6, 0);
    walls.add(inner);
    this.lamps.push(inner);
    this.houseParts.push(walls);

    // 4. roof platform — the part that clears the surge
    const roof = new THREE.Group();
    const pitch = new THREE.Mesh(new THREE.CylinderGeometry(0, S * 1.5, 1.9, 4), this.m.tarp);
    pitch.rotation.y = Math.PI / 4;
    pitch.position.y = 5.7;
    pitch.castShadow = true;
    roof.add(pitch);
    this.roofPitch = pitch;
    // widow's walk on top, railed
    for (let i = 0; i < 6; i++) roof.add(box(3.0, 0.1, 0.44, this.m.plank, 0, 6.62, (i - 2.5) * 0.46));
    for (const s of [-1, 1]){
      roof.add(box(3.0, 0.09, 0.09, this.m.wood, 0, 7.3, s * 1.4));
      roof.add(box(0.09, 0.09, 2.9, this.m.wood, s * 1.4, 7.3, 0));
      for (const t of [-1, 1]) roof.add(cyl(0.06, 0.06, 0.7, 5, this.m.wood, s * 1.4, 6.97, t * 1.4));
    }
    const beacon = new THREE.PointLight(0xffd9a0, 1.8, 18, 2);
    beacon.position.set(0, 7.1, 0);
    roof.add(beacon);
    this.lamps.push(beacon);
    roof.add(box(0.3, 0.4, 0.3, this.m.glass, 0, 6.95, 0));
    this.houseParts.push(roof);

    for (const p of this.houseParts){ p.visible = false; g.add(p); }
  }

  // -------------------------------------------------------------- boat stages
  _buildBoatStages(){
    const g = this.boatGroup;
    this.boatParts = [];

    const keel = new THREE.Group();
    keel.add(box(0.4, 0.4, 8.4, this.m.dark, 0, 0.5, 0));
    keel.add(box(0.34, 1.5, 0.34, this.m.dark, 0, 1.1, -4.0));
    this.boatParts.push(keel);

    const ribs = new THREE.Group();
    for (let i = -3; i <= 3; i++){
      const t = 1 - Math.abs(i) / 4.2;
      const w = 1.1 + t * 1.5;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(w, 0.1, 6, 12, Math.PI), this.m.wood);
      rib.rotation.z = Math.PI;
      rib.rotation.y = Math.PI / 2;
      rib.position.set(0, 1.5, i * 1.2);
      rib.castShadow = true;
      ribs.add(rib);
    }
    this.boatParts.push(ribs);

    const hull = new THREE.Group();
    for (const s of [-1, 1]){
      for (let k = 0; k < 3; k++){
        const p = box(0.16, 0.52, 7.6, k % 2 ? this.m.plank : this.m.pale, s * (2.3 - k * 0.28), 1.05 + k * 0.5, 0);
        p.rotation.z = s * (0.20 - k * 0.06);
        hull.add(p);
      }
    }
    hull.add(box(4.2, 0.14, 7.6, this.m.plank, 0, 0.78, 0));
    // bow and stern caps
    for (const s of [-1, 1]){
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.0, 4), this.m.pale);
      cap.rotation.x = s * Math.PI / 2;
      cap.rotation.y = Math.PI / 4;
      cap.position.set(0, 1.3, s * 4.6);
      cap.scale.set(1, 1, 0.8);
      hull.add(cap);
    }
    for (let i = 0; i < 3; i++) hull.add(box(4.0, 0.14, 0.5, this.m.wood, 0, 1.6, (i - 1) * 2.2));
    this.boatParts.push(hull);

    const sail = new THREE.Group();
    sail.add(cyl(0.1, 0.16, 7.0, 8, this.m.wood, 0, 4.6, -0.4));
    const canvasSail = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.0), new THREE.MeshLambertMaterial({ color: 0xe8dfc8, side: THREE.DoubleSide, flatShading: true }));
    canvasSail.position.set(1.0, 4.9, -0.4);
    canvasSail.castShadow = true;
    sail.add(canvasSail);
    this.sailCloth = canvasSail;
    sail.add(box(0.12, 0.12, 3.0, this.m.wood, 0, 2.3, 1.0));
    const lamp = new THREE.PointLight(0xffd9a0, 1.4, 14, 2);
    lamp.position.set(0, 2.4, -3.6);
    sail.add(lamp);
    this.lamps.push(lamp);
    this.boatParts.push(sail);

    for (const p of this.boatParts){ p.visible = false; g.add(p); }
  }

  setHouseStage(n){
    this.houseShown = n;
    this.houseParts.forEach((p, i) => { p.visible = i < n; });
    this.plotMarks.visible = n === 0;
    this.setCutaway(this.cutaway);
  }

  /**
   * Take the walls and the roof pitch away while the player is inside, the way
   * every isometric building game does it. Otherwise standing on your own deck
   * means staring at the back of a wall.
   */
  setCutaway(on){
    this.cutaway = !!on;
    if (!this.houseParts) return;
    this.houseParts[2].visible = this.houseShown > 2 && !this.cutaway;
    this.roofPitch.visible = this.houseShown > 3 && !this.cutaway;
  }

  setBoatStage(n){
    this.boatParts.forEach((p, i) => { p.visible = i < n; });
  }

  setBusinessTier(n){
    this.stallTiers.forEach((s, i) => { s.visible = i === n; });
  }

  /**
   * Once the deck is up, the stall moves onto it and stays dry.
   *
   * The elevated stall goes on the *north* half of the deck on purpose. Stations
   * are picked by nearest centre, so two of them in the same place means one is
   * unreachable forever — and the one that loses here would be the house, which
   * is how you climb the ladder.
   */
  liftStall(onDeck){
    const x = onDeck ? 2 : -9;
    const z = onDeck ? 19.6 : 12;
    const y = onDeck ? height(2, 17) + 2.1 : height(-9, 12);
    this.stallHolder.position.set(x, y, z);
    const st = this.stations.find((s) => s.id === 'stall');
    st.pos.set(x, y, onDeck ? 21.0 : z + 1.8);
    st.radius = onDeck ? 2.8 : 3.0;
    // Once it's up there, you have to be up there too — otherwise you could
    // trade through the floorboards from underneath.
    st.vertical = onDeck ? 1.8 : undefined;
    st.onDeck = onDeck;
  }

  // -------------------------------------------------------------- depot barge
  _depot(){
    const g = new THREE.Group();
    const raft = new THREE.Group();
    for (let i = 0; i < 9; i++){
      const log = cyl(0.42, 0.42, 9.0, 8, this.m.dark, (i - 4) * 0.84, 0, 0);
      log.rotation.x = Math.PI / 2;
      raft.add(log);
    }
    raft.add(box(7.6, 0.16, 8.6, this.m.plank, 0, 0.44, 0));
    g.add(raft);

    // shed
    g.add(box(4.6, 2.6, 4.0, this.m.plank, -0.6, 1.8, -1.6));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0, 3.9, 1.5, 4), this.m.rust);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(-0.6, 3.7, -1.6);
    roof.castShadow = true;
    g.add(roof);
    g.add(box(3.4, 0.16, 1.2, this.m.pale, -0.6, 1.2, 0.7));

    // stock on deck
    for (const [x, z, r] of [[2.4, 1.6, 0], [2.4, 2.6, 0.3], [-2.6, 2.4, -0.2]]){
      const stack = new THREE.Group();
      for (let i = 0; i < 4; i++) stack.add(box(2.6, 0.16, 0.9, i % 2 ? this.m.plank : this.m.pale, 0, 0.6 + i * 0.18, 0));
      stack.position.set(x, 0, z);
      stack.rotation.y = r;
      g.add(stack);
    }
    for (const [x, z] of [[3.0, -2.4], [3.0, -1.2]]){
      g.add(cyl(0.52, 0.52, 1.2, 12, this.m.rust, x, 1.05, z));
    }

    // Marv
    this.marv = makeVillager(0x4f6f8a, 0x2f3a44);
    this.marv.position.set(-0.6, 0.52, 1.5);
    this.marv.rotation.y = Math.PI;
    g.add(this.marv);

    const lamp = new THREE.PointLight(0xffcf8a, 2.0, 15, 2);
    lamp.position.set(-0.6, 2.6, 0.9);
    g.add(lamp);
    this.lamps.push(lamp);
    g.add(box(0.26, 0.34, 0.26, this.m.glass, -0.6, 2.56, 0.9));

    // Child of the barge, so its position is local — override what signpost()
    // guessed from the ground.
    const dsign = signpost('Depot', 'timber & sundries');
    dsign.position.set(-3.5, 0.5, 2.4);
    g.add(dsign);

    g.position.set(DEPOT.x, 0, DEPOT.z);
    this.scene.add(g);
    this.depotGroup = g;
    this.floaters.push({ obj: g, draft: 0.35, bob: 0.09, rate: 0.7 });

    this._station('depot', DEPOT.x - 4.6, DEPOT.z + 2.0, 4.2, DEPOT.label, { floats: true });

    // Mooring post on the bank, with a rope that stays put as the barge lifts.
    const px = riverX(DEPOT.z) - 13, pz = DEPOT.z + 1;
    const post = cyl(0.2, 0.24, 2.2, 6, this.m.dark, px, height(px, pz) + 1.1, pz);
    this.scene.add(post);
    this.mooring = post;
  }

  // -------------------------------------------------------------- gather sites
  _nodes(){
    const build = {
      woods: (g) => {
        for (let i = 0; i < 16; i++){
          const a = (i / 16) * Math.PI * 2 + i * 0.7;
          const d = 2.6 + (i % 4) * 2.1;
          const x = SITES.woods.x + Math.cos(a) * d, z = SITES.woods.z + Math.sin(a) * d;
          g.add(this._pine(x, z, 3.4 + (i % 3) * 1.3));
        }
        // sawn logs and a stump with the axe in it
        const sx = SITES.woods.x + 1.4, sz = SITES.woods.z - 1.0;
        const stump = cyl(0.55, 0.62, 0.8, 9, this.m.dark, sx, height(sx, sz) + 0.4, sz);
        g.add(stump);
        const axe = new THREE.Group();
        axe.add(cyl(0.05, 0.05, 1.0, 5, this.m.wood, 0, 0.5, 0));
        axe.add(box(0.36, 0.26, 0.07, this.m.metal, 0.12, 1.0, 0));
        axe.position.set(sx, height(sx, sz) + 0.8, sz);
        axe.rotation.z = -0.5;
        g.add(axe);
        for (let i = 0; i < 5; i++){
          const lx = SITES.woods.x - 2.6 + i * 0.5, lz = SITES.woods.z + 2.4;
          const log = cyl(0.24, 0.24, 2.4, 7, this.m.wood, lx, height(lx, lz) + 0.25 + (i % 2) * 0.45, lz);
          log.rotation.z = Math.PI / 2;
          g.add(log);
        }
      },
      junkyard: (g) => {
        const S = SITES.junkyard;
        for (let i = 0; i < 26; i++){
          const a = i * 1.31, d = 1.2 + (i % 5) * 1.5;
          const x = S.x + Math.cos(a) * d, z = S.z + Math.sin(a) * d;
          const m = [this.m.metal, this.m.rust, this.m.dark][i % 3];
          const b = box(0.5 + (i % 3) * 0.4, 0.4 + (i % 4) * 0.3, 0.5 + (i % 2) * 0.5, m, 0, 0, 0);
          b.position.set(x, height(x, z) + 0.3 + (i % 3) * 0.35, z);
          b.rotation.set(Math.random() * 0.4, i * 0.7, Math.random() * 0.4);
          g.add(b);
        }
        // a dead truck
        const t = new THREE.Group();
        t.add(box(4.2, 1.1, 2.0, this.m.rust, 0, 0.9, 0));
        t.add(box(1.7, 1.1, 1.9, this.m.rust, -1.2, 1.9, 0));
        for (const [x, s] of [[1.4, -1], [1.4, 1], [-1.4, -1], [-1.4, 1]]){
          const w = cyl(0.5, 0.5, 0.3, 10, this.m.dark, x, 0.5, s * 1.0);
          w.rotation.x = Math.PI / 2;
          t.add(w);
        }
        t.position.set(S.x - 4.6, height(S.x - 4.6, S.z + 1.2), S.z + 1.2);
        t.rotation.y = 0.5;
        g.add(t);
        for (const [dx, dz] of [[3.4, -3.0], [4.2, -2.2]]){
          g.add(cyl(0.55, 0.55, 1.3, 12, this.m.rust, S.x + dx, height(S.x + dx, S.z + dz) + 0.65, S.z + dz));
        }
      },
      claypit: (g) => {
        const S = SITES.claypit;
        for (let i = 0; i < 12; i++){
          const a = i * 0.9, d = 1.6 + (i % 4) * 1.3;
          const x = S.x + Math.cos(a) * d, z = S.z + Math.sin(a) * d;
          const mound = new THREE.Mesh(new THREE.SphereGeometry(0.7 + (i % 3) * 0.3, 7, 5), this.m.clay);
          mound.position.set(x, height(x, z) + 0.1, z);
          mound.scale.y = 0.5;
          mound.castShadow = true;
          g.add(mound);
        }
        const sx = S.x + 2.0, sz = S.z + 1.6;
        const spade = new THREE.Group();
        spade.add(cyl(0.05, 0.05, 1.4, 5, this.m.wood, 0, 0.7, 0));
        spade.add(box(0.34, 0.5, 0.05, this.m.metal, 0, 0.1, 0));
        spade.position.set(sx, height(sx, sz), sz);
        spade.rotation.z = 0.35;
        g.add(spade);
        for (let i = 0; i < 3; i++){
          const bx = S.x - 2.2 + i * 0.9, bz = S.z - 2.0;
          g.add(cyl(0.34, 0.28, 0.5, 10, this.m.metal, bx, height(bx, bz) + 0.25, bz));
        }
      },
      marsh: (g) => {
        const S = SITES.marsh;
        for (let i = 0; i < 90; i++){
          const a = i * 2.399, d = Math.sqrt(i / 90) * 9.5;
          const x = S.x + Math.cos(a) * d, z = S.z + Math.sin(a) * d;
          const clump = new THREE.Group();
          const n = 3 + (i % 3);
          for (let k = 0; k < n; k++){
            const h = 1.2 + Math.random() * 1.1;
            const blade = box(0.07, h, 0.07, this.m.reed, (Math.random() - 0.5) * 0.4, h / 2, (Math.random() - 0.5) * 0.4);
            blade.rotation.z = (Math.random() - 0.5) * 0.3;
            clump.add(blade);
          }
          clump.position.set(x, height(x, z), z);
          g.add(clump);
          this.reeds.push({ obj: clump, phase: i * 0.7 });
        }
        // a rowboat rotting in the shallows
        const rb = new THREE.Group();
        rb.add(box(1.6, 0.5, 4.2, this.m.dark, 0, 0.3, 0));
        rb.add(box(1.3, 0.14, 3.6, this.m.wood, 0, 0.56, 0));
        rb.position.set(S.x - 5.4, height(S.x - 5.4, S.z + 4.0) + 0.1, S.z + 4.0);
        rb.rotation.set(0.1, 0.7, 0.14);
        g.add(rb);
      },
    };

    this.nodeGroups = {};
    for (const [site, spec] of Object.entries(NODES)){
      const S = SITES[site];
      const g = new THREE.Group();
      build[site](g);
      this.scene.add(g);
      this.nodeGroups[site] = g;

      this.scene.add(signpost(S.label, spec.verb.toLowerCase(), S.x, S.z + S.r * 0.55));

      this._station(site, S.x, S.z, S.r * 0.75, S.label, { node: site, groundY: S.y });
    }
  }

  _pine(x, z, h){
    const g = new THREE.Group();
    g.add(cyl(0.14, 0.22, h * 0.5, 6, this.m.dark, 0, h * 0.25, 0));
    for (let i = 0; i < 3; i++){
      const r = 1.5 - i * 0.42;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h * 0.42, 7), i % 2 ? this.m.pine : this.m.leafDark);
      cone.position.y = h * (0.42 + i * 0.24);
      cone.castShadow = true;
      g.add(cone);
    }
    g.position.set(x, height(x, z), z);
    g.rotation.y = x * 0.7;
    return g;
  }

  _oak(x, z, s){
    const g = new THREE.Group();
    g.add(cyl(0.2 * s, 0.32 * s, 2.2 * s, 6, this.m.dark, 0, 1.1 * s, 0));
    for (let i = 0; i < 4; i++){
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15 * s, 0), i % 2 ? this.m.leaf : this.m.leafDark);
      const a = (i / 4) * Math.PI * 2;
      blob.position.set(Math.cos(a) * 0.7 * s, (2.4 + (i % 2) * 0.6) * s, Math.sin(a) * 0.7 * s);
      blob.castShadow = true;
      g.add(blob);
    }
    g.position.set(x, height(x, z), z);
    return g;
  }

  // -------------------------------------------------------------- scenery
  _scenery(){
    const g = new THREE.Group();
    // Deterministic scatter: a hash walk rather than Math.random, so the valley
    // looks the same every time you load it.
    let seed = 1337;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const clearOf = [SITES.homestead, SITES.junkyard, SITES.claypit, SITES.marsh];
    const blocked = (x, z) => {
      if (Math.abs(x - riverX(z)) < 11) return true;              // keep the channel clear
      for (const s of clearOf) if (Math.hypot(x - s.x, z - s.z) < s.r + 2) return true;
      return false;
    };

    for (let i = 0; i < 260; i++){
      const x = (rnd() - 0.5) * (WORLD - 12);
      const z = (rnd() - 0.5) * (WORLD - 12);
      if (blocked(x, z)) continue;
      const y = height(x, z);
      if (y < 0.4) continue;
      const n = normalAt(x, z);
      if (n.y < 0.90) continue;                                    // no trees on cliffs
      const r = rnd();
      if (y > 6.6) g.add(this._pine(x, z, 3.0 + rnd() * 2.6));
      else if (r < 0.42) g.add(this._oak(x, z, 0.75 + rnd() * 0.6));
      else if (r < 0.62) g.add(this._pine(x, z, 2.6 + rnd() * 2.0));
      else if (r < 0.82){
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 + rnd() * 0.5, 0), this.m.leaf);
        bush.position.set(x, y + 0.3, z);
        bush.castShadow = true;
        g.add(bush);
      } else {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + rnd() * 0.9, 0), this.m.rock);
        rock.position.set(x, y + 0.2, z);
        rock.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
        rock.castShadow = true;
        g.add(rock);
      }
    }

    // Telegraph poles down the road, and the road itself as flat dirt patches.
    const road = [[-11, 30], [-8, 22], [-6, 14], [-4, 6], [-1, -2], [2, -12], [-6, -20], [-14, -26]];
    for (let i = 0; i < road.length; i++){
      const [x, z] = road[i];
      if (i % 2 === 0){
        const pole = new THREE.Group();
        pole.add(cyl(0.13, 0.17, 6.4, 6, this.m.dark, 0, 3.2, 0));
        pole.add(box(2.0, 0.14, 0.14, this.m.dark, 0, 5.9, 0));
        pole.position.set(x - 2.6, height(x - 2.6, z), z);
        g.add(pole);
      }
      const patch = new THREE.Mesh(new THREE.CircleGeometry(2.1, 10), lam(0x6b6046));
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(x, height(x, z) + 0.06, z);
      patch.receiveShadow = true;
      g.add(patch);
    }

    // Cedar ridge gets a marker so the highest ground is findable — and so the
    // player learns early that even the highest ground is not high enough.
    const R = SITES.ridge;
    g.add(signpost('Cedar Ridge', `${RIM_Y.toFixed(1)}m: not enough`, R.x, R.z + 5));
    for (let i = 0; i < 10; i++){
      const a = i * 1.7, d = 3 + (i % 3) * 2.4;
      g.add(this._pine(R.x + Math.cos(a) * d, R.z + Math.sin(a) * d, 4.4 + (i % 3)));
    }

    this.scene.add(g);
  }

  /** The road bridge, already half gone. Sells the story in one prop. */
  _bridge(){
    const g = new THREE.Group();
    const z = 6;
    const cx = riverX(z);
    for (const s of [-1, 1]){
      const px = cx + s * 9;
      g.add(cyl(0.7, 0.9, 4.6, 8, this.m.rock, px, height(px, z) + 2.3, z));
      const span = box(7.0, 0.4, 3.4, this.m.dark, px + s * 3.0, height(px, z) + 4.6, z);
      span.rotation.z = s * 0.06;
      g.add(span);
      for (let i = 0; i < 5; i++){
        g.add(cyl(0.08, 0.08, 1.0, 5, this.m.dark, px + s * (0.8 + i * 1.4), height(px, z) + 5.3, z + 1.6));
      }
    }
    // the collapsed middle, in the water
    const wreck = box(4.4, 0.4, 3.2, this.m.dark, cx, height(cx, z) + 0.6, z + 0.6);
    wreck.rotation.set(0.3, 0.2, 0.4);
    g.add(wreck);
    this.scene.add(g);
  }

  // -------------------------------------------------------------- life
  _villagers(){
    this.wanderers = [];
    const spots = [
      [-14, 26], [-5, 8], [4, 24], [-16, 12], [10, 30], [-24, 4],
    ];
    const colors = [[0x7c6bb0, 0x8f4b3c], [0x4f8a6f, 0x2f3a44], [0xb0764f, 0x5a4030],
                    [0x8a4f6f, 0x3a2f44], [0x4f6f8a, 0x44392f], [0x6f8a4f, 0x443a2f]];
    spots.forEach(([x, z], i) => {
      const v = makeVillager(...colors[i % colors.length]);
      v.position.set(x, height(x, z), z);
      v.userData.home = new THREE.Vector2(x, z);
      v.userData.target = new THREE.Vector2(x, z);
      v.userData.wait = i * 0.8;
      this.scene.add(v);
      this.wanderers.push(v);
    });
  }

  _birds(){
    const bmat = lam(0xe8eef2);
    for (let i = 0; i < 9; i++){
      const b = new THREE.Group();
      const wingL = box(0.9, 0.06, 0.3, bmat, -0.45, 0, 0);
      const wingR = box(0.9, 0.06, 0.3, bmat, 0.45, 0, 0);
      b.add(wingL, wingR, box(0.3, 0.14, 0.7, bmat, 0, 0, 0));
      b.userData = { wingL, wingR, a: i * 0.7, r: 26 + i * 4, y: 22 + (i % 4) * 5, sp: 0.13 + (i % 3) * 0.04 };
      this.scene.add(b);
      this.birds.push(b);
    }
  }

  // -------------------------------------------------------------- per frame
  update(dt, level, weather, playerPos){
    this.t += dt;

    // Floating things ride the surface with a slow bob.
    for (const f of this.floaters){
      f.obj.position.y = level - f.draft + Math.sin(this.t * f.rate) * f.bob;
      f.obj.rotation.z = Math.sin(this.t * f.rate * 0.8) * 0.014;
      f.obj.rotation.x = Math.cos(this.t * f.rate * 0.6) * 0.012;
    }
    // Keep Marv looking busy.
    animateFigure(this.marv, dt, 0.12);

    // Reeds bend with the wind and get pushed flat by the current when drowned.
    const bend = 0.1 + weather.rain * 0.28;
    for (const r of this.reeds){
      const sway = Math.sin(this.t * 1.8 + r.phase) * bend;
      r.obj.rotation.z = sway;
      r.obj.rotation.x = Math.cos(this.t * 1.5 + r.phase) * bend * 0.6;
      const sunk = level - r.obj.position.y;
      r.obj.visible = sunk < 2.4;
    }

    // Campfire: flickers, then dies when the water reaches it.
    const fireY = this.fireGroup.position.y;
    const drowned = level > fireY - 0.1;
    this.flame.visible = !drowned;
    this.fireLight.intensity = drowned ? 0 : 2.0 + Math.sin(this.t * 11) * 0.5 + Math.sin(this.t * 23) * 0.3;
    if (!drowned) this.flame.scale.setScalar(0.9 + Math.sin(this.t * 13) * 0.12);

    // Lanterns come on at dusk and in heavy rain, when they actually help.
    const lampLevel = Math.max(weather.night, weather.rain * 0.7);
    for (const l of this.lamps) l.intensity = (1.2 + lampLevel * 1.8) * lampLevel;

    if (this.sailCloth) this.sailCloth.rotation.y = Math.sin(this.t * 0.9) * 0.12;

    // Villagers potter about, and swim for the high ground if their feet get wet.
    for (const v of this.wanderers){
      const u = v.userData;
      u.wait -= dt;
      if (u.wait <= 0){
        u.wait = 3 + Math.random() * 5;
        u.target.set(
          u.home.x + (Math.random() - 0.5) * 14,
          u.home.y + (Math.random() - 0.5) * 14,
        );
      }
      const dx = u.target.x - v.position.x, dz = u.target.y - v.position.z;
      const d = Math.hypot(dx, dz);
      const ground = height(v.position.x, v.position.z);
      const wet = level > ground + 0.4;
      if (d > 0.6){
        const sp = (wet ? 3.4 : 2.1) * dt;
        v.position.x += (dx / d) * sp;
        v.position.z += (dz / d) * sp;
        v.rotation.y = Math.atan2(dx, dz);
        animateFigure(v, dt, wet ? 1 : 0.55);
      } else {
        animateFigure(v, dt, 0.1);
      }
      // Uphill, always, once it is rising around them.
      if (wet){
        const n = normalAt(v.position.x, v.position.z);
        u.target.set(v.position.x - n.x * 12, v.position.z - n.z * 12);
      }
      v.position.y = Math.max(height(v.position.x, v.position.z), level - 1.1);
    }

    // Birds, circling wide of the player.
    for (const b of this.birds){
      const u = b.userData;
      u.a += dt * u.sp;
      b.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(u.a * 2.3) * 1.5, Math.sin(u.a) * u.r);
      b.rotation.y = -u.a + Math.PI / 2;
      const flap = Math.sin(this.t * 7 + u.a * 5) * 0.5;
      u.wingL.rotation.z = flap;
      u.wingR.rotation.z = -flap;
    }

    void playerPos;
  }
}
