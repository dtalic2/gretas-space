// ---------- The hotel in 3D, kept in step with the saved state ----------
//
// A dollhouse: the front is open so you can see into every room. Floors stack
// up from the lobby, the lift runs up the left, and a corridor runs along the
// front of each floor so guests never walk through anybody's wall.

import * as THREE from 'three';
import { SLOTS, FLOOR_H, LIFT_X, CHARACTER, slotX } from './data.js';
import {
  box, cyl, cone, ball, mat, imat, textTexture, ROOM_MODELS, emptyRoom, lobby, milbil, suitcase,
  characterSprite, helicopter, bus, tree, flatten, disposeMerged, ROOM_H, BACK, FRONT, GLOW, NEON, WATER, GLASS, WINDOW,
} from './models.js';
import * as E from './econ.js';

const HALF = 7.15;                 // the building's outer walls, either side
const CORRIDOR = 1.8;              // z of the walkway along the front of each floor
const PAVE = 3.9;                  // z of the pavement outside
const DOOR_X = -1;                 // the lobby's front door
const LOBBY_SPOTS = [-3.4, -2.2, -1.0, 0.2, 1.4, 2.5];
const WALK = 4.2, LIFT_SPEED = 8;
const SPAWN = { street:new THREE.Vector3(19, 0, PAVE), bus:new THREE.Vector3(11, 0, PAVE), heli:new THREE.Vector3(-12, 0, 1.2) };

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

export class Hotel {
  constructor(scene, state){
    this.scene = scene;
    this.state = state;
    this.root = new THREE.Group();
    scene.add(this.root);

    this.frame = new THREE.Group();      // slabs, walls, lift shaft, roof
    this.root.add(this.frame);
    this.slots = new Map();              // key -> { group, type, hit }
    this.hits = [];                      // everything a tap can land on
    this.actors = new Map();             // guest uid -> actor
    this.extras = new Map();             // extra id -> group
    this.loader = new THREE.TextureLoader();
    this.textures = new Map();
    this.builtFloors = 0;
    this.roofKey = '';

    this.lobby = lobby();
    flatten(this.lobby, [this.lobby.userData.receptionist]);
    this.lobby.position.set(-1, 0, 0);
    this.root.add(this.lobby);
    const lobbyHit = this._hitBox(8, -1, 0, { lobby:true });
    this.root.add(lobbyHit);

    this.liftCar = this._liftCar();
    this.root.add(this.liftCar);
    this.liftY = 0;

    this.heli = null;
    this.heliAnim = null;
    this.busObj = null;
    this.busAnim = null;

    this.sync(true);
  }

  // ------------------------------------------------------------- helpers --

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

  _hitBox(width, x, y, data){
    const m = new THREE.Mesh(new THREE.BoxGeometry(width, ROOM_H, FRONT - BACK + 1.2),
                             new THREE.MeshBasicMaterial({ visible:false }));
    m.position.set(x, y + ROOM_H / 2, (BACK + FRONT) / 2 + 0.6);
    Object.assign(m.userData, data);
    this.hits.push(m);
    return m;
  }

  _dropHit(m){
    const i = this.hits.indexOf(m);
    if (i >= 0) this.hits.splice(i, 1);
    m.parent && m.parent.remove(m);
    m.geometry.dispose();
  }

  _liftCar(){
    const g = new THREE.Group();
    g.add(box(1.8, 0.1, 1.8, 0xb58a5c, 0, 0, -0.3));
    g.add(box(1.8, 0.1, 1.8, 0xb58a5c, 0, 2.45, -0.3));
    for (const sx of [-0.85, 0.85]) g.add(box(0.08, 2.45, 0.08, 0xf2b134, sx, 0.1, 0.55));
    g.add(box(1.7, 2.4, 0.05, 0, 0, 0.1, -1.18, GLASS));
    g.position.set(LIFT_X, 0, 0);
    return g;
  }

  /** Where a room's guest stands while they are staying. */
  roomSpot(k){
    const [f, s] = E.unkey(k);
    return v3(slotX(s) + 0.95, f * FLOOR_H, 0.35);
  }

  lobbySpot(i){ return v3(LOBBY_SPOTS[Math.min(i, LOBBY_SPOTS.length - 1)], 0, 0.55); }

  /** Where the markers over a slot sit, in world space. */
  slotTop(k){
    const [f, s] = E.unkey(k);
    return v3(slotX(s), f * FLOOR_H + ROOM_H - 0.2, FRONT);
  }
  roofTop(){ return v3(-1, this.state.floors * FLOOR_H + 2.6, 0); }
  roofY(){ return this.state.floors * FLOOR_H; }

  // --------------------------------------------------------------- sync ---

  sync(first = false){
    const st = this.state;
    this._first = first;
    if (this.builtFloors !== st.floors) this._frame();
    const roofKey = `${st.floors}|${!!st.extras.pool}|${!!st.extras.sign}`;
    if (roofKey !== this.roofKey){ this._roof(); this.roofKey = roofKey; }
    this._slots();
    this._extras();
    this._guests(first);
  }

  _frame(){
    const st = this.state;
    disposeMerged(this.frame);
    for (const c of [...this.frame.children]) this.frame.remove(c);
    const facade = imat(0xf4a58a), trim = 0xfff3e0;
    for (let f = 0; f < st.floors; f++){
      const y = f * FLOOR_H;
      // Floor slab and the cream edge you see from the front.
      this.frame.add(box(HALF * 2 + 0.3, 0.25, 4.9, 0xe9dcc4, 0, y - 0.25, 0.05));
      this.frame.add(box(HALF * 2 + 0.34, 0.28, 0.12, trim, 0, y - 0.27, 2.52));
      // Outer walls, with a window stripe, either side.
      for (const s of [-1, 1]){
        this.frame.add(box(0.3, ROOM_H, 4.9, 0, s * HALF, y, 0.05, facade));
        this.frame.add(box(0.34, 0.9, 1.6, 0, s * HALF, y + 1.0, -0.4, WINDOW));
      }
      // The lift shaft: a back wall, a side wall to the rooms, a door frame.
      this.frame.add(box(2, ROOM_H, 0.14, 0, LIFT_X, y, BACK - 0.07, imat(0xe8d5bd)));
      this.frame.add(box(0.1, ROOM_H, FRONT - BACK, 0, -5.0, y, (BACK + FRONT) / 2, imat(0xe8d5bd)));
      this.frame.add(box(0.12, ROOM_H, 0.12, 0, LIFT_X - 0.95, y, FRONT, mat(0xf2b134)));
      this.frame.add(box(0.12, ROOM_H, 0.12, 0, LIFT_X + 0.95, y, FRONT, mat(0xf2b134)));
      this.frame.add(box(2, 0.2, 0.14, 0xf2b134, LIFT_X, y + ROOM_H - 0.3, FRONT));
      // The floor number, over the lift door.
      const num = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3),
        new THREE.MeshBasicMaterial({ map:textTexture(f ? String(f) : 'G', { w:64, h:40, font:'bold 30px', bg:'#3b2f2a', fg:'#ffd86b' }) }));
      num.position.set(LIFT_X, y + ROOM_H - 0.2, FRONT + 0.09);
      this.frame.add(num);
      // A glass rail along the corridor upstairs, low enough to see over.
      if (f > 0){
        this.frame.add(box(HALF * 2 - 2.2, 0.06, 0.08, 0xf2b134, 1.0, y + 0.8, 2.42));
        const pane = box(HALF * 2 - 2.2, 0.75, 0.03, 0, 1.0, y + 0.05, 2.42, GLASS);
        pane.castShadow = false;
        this.frame.add(pane);
        for (let x = -5; x <= 7; x += 2) this.frame.add(box(0.06, 0.8, 0.06, 0xf2b134, x, y, 2.42));
      }
    }
    // The lift cables, all the way up.
    const h = st.floors * FLOOR_H;
    for (const dx of [-0.5, 0.5]) this.frame.add(box(0.03, h, 0.03, 0x555555, LIFT_X + dx, 0, -1.4));
    flatten(this.frame);
    this.builtFloors = st.floors;
  }

  _roof(){
    if (this.roof){ this.root.remove(this.roof); disposeMerged(this.roof); if (this.roofHit) this._dropHit(this.roofHit); }
    const st = this.state;
    const g = new THREE.Group();
    const y = this.roofY();
    g.add(box(HALF * 2 + 0.5, 0.3, 5.1, 0xd8cbb4, 0, y - 0.25, 0.05));
    g.add(box(HALF * 2 + 0.54, 0.34, 0.14, 0xfff3e0, 0, y - 0.29, 2.6));
    g.add(box(HALF * 2 + 0.5, 0.55, 0.2, 0xf4a58a, 0, y, -2.4));
    for (const s of [-1, 1]) g.add(box(0.2, 0.55, 5.0, 0xf4a58a, s * (HALF + 0.15), y, 0.05));
    g.add(box(HALF * 2 + 0.5, 0.3, 0.14, 0xf2b134, 0, y, 2.5));
    // The lift's winding house, and a water tank on legs.
    g.add(box(2.2, 1.3, 2.0, 0xe8d5bd, LIFT_X, y, -1.0));
    g.add(box(2.4, 0.15, 2.2, 0xd8663f, LIFT_X, y + 1.3, -1.0));
    for (const [dx, dz] of [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]])
      g.add(box(0.08, 0.7, 0.08, 0x8d6242, -3.4 + dx, y, -1.4 + dz));
    g.add(cyl(0.7, 0.7, 1.1, 10, 0xc49a6c, -3.4, y + 0.7, -1.4));
    g.add(cone(0.8, 0.4, 10, 0xd8663f, -3.4, y + 1.8, -1.4));

    // The hotel's name. Neon once you have bought the sign.
    const neon = !!st.extras.sign;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.3),
      new THREE.MeshLambertMaterial({
        map: textTexture('MILBIL HOTEL', { w:1024, h:208, font:'900 124px', ...(neon ? { bg:'#2a1c3a', fg:'#ff8fd0' } : {}) }),
        emissive: neon ? 0x9a5a9a : 0x000000, emissiveMap: null,
      }));
    board.position.set(1.2, y + 2.25, -1.9);
    g.add(board);
    g.add(box(6.6, 1.5, 0.12, neon ? 0xff6fb1 : 0x8d6242, 1.2, y + 1.5, -1.99));
    for (const x of [-1.6, 4.0]) g.add(box(0.12, 1.6, 0.12, 0x8d6242, x, y, -2.0));
    if (neon){
      board.material.emissive.setHex(0x442244);
      board.material.emissiveMap = board.material.map;
      this.neonBoard = board;
      for (let i = 0; i < 7; i++) g.add(ball(0.12, 0, 0, -1.8 + i * 1.0, y + 3.1, -1.9, NEON));
    } else this.neonBoard = null;

    if (st.extras.pool){
      g.add(box(4.8, 0.45, 2.9, 0xffffff, 3.6, y, 0.6));
      const water = box(4.4, 0.08, 2.5, 0, 3.6, y + 0.4, 0.6, WATER);
      water.castShadow = false;
      g.add(water);
      this.poolWater = water;
      for (const x of [-2.2, -0.6]){
        g.add(box(1.2, 0.2, 0.6, 0xff8fb1, x, y + 0.2, 1.4));
        g.add(box(0.1, 0.25, 0.5, 0xfff3e0, x - 0.5, y, 1.4));
        g.add(box(0.1, 0.25, 0.5, 0xfff3e0, x + 0.5, y, 1.4));
      }
      g.add(cyl(0.04, 0.04, 1.6, 6, 0xfff3e0, -1.4, y, 0.2));
      g.add(cone(0.9, 0.4, 8, 0x5cc8ef, -1.4, y + 1.6, 0.2));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 6, 12), mat(0xe2604f));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(4.5, y + 0.5, 0.8);
      g.add(ring);
      this.poolRing = ring;
    } else { this.poolWater = null; this.poolRing = null; }

    flatten(g, [this.poolRing]);
    this.roof = g;
    this.root.add(g);
    this.roofHit = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 2.4, 5), new THREE.MeshBasicMaterial({ visible:false }));
    this.roofHit.position.set(0, y + 1.1, 0);
    this.roofHit.userData.roof = true;
    this.hits.push(this.roofHit);
    this.root.add(this.roofHit);
  }

  _slots(){
    const st = this.state;
    const want = new Set(E.allSlots(st));
    for (const [k, s] of this.slots){
      if (!want.has(k)){ this.root.remove(s.group); disposeMerged(s.group); this._dropHit(s.hit); this.slots.delete(k); }
    }
    for (const k of want){
      const type = st.rooms[k] ? st.rooms[k].type : null;
      let s = this.slots.get(k);
      if (s && s.type === type) continue;
      if (s){ this.root.remove(s.group); disposeMerged(s.group); this._dropHit(s.hit); }
      const [f, i] = E.unkey(k);
      const group = type ? ROOM_MODELS[type]() : emptyRoom();
      const u = group.userData;
      flatten(group, [u.spin, u.bubbles, u.notes]);
      group.position.set(slotX(i), f * FLOOR_H, 0);
      this.root.add(group);
      const hit = this._hitBox(4, slotX(i), f * FLOOR_H, { slot:k });
      this.root.add(hit);
      s = { group, type, hit, pop:type && !this._first ? 0.001 : 0 };
      this.slots.set(k, s);
    }
  }

  _extras(){
    const st = this.state;
    const makers = {
      garden: () => this._garden(),
      bus: () => this._busStop(),
      helipad: () => this._helipad(),
    };
    for (const id of Object.keys(makers)){
      if (st.extras[id] && !this.extras.has(id)){
        const g = makers[id]();
        this.root.add(g);
        this.extras.set(id, g);
      }
      if (!st.extras[id] && this.extras.has(id)){
        this.root.remove(this.extras.get(id));
        this.extras.delete(id);
      }
    }
  }

  _garden(){
    const g = new THREE.Group();
    g.add(box(8, 0.12, 5.2, 0x76c95e, 12, -0.26, 0));
    for (const z of [-2.4, 2.3]) g.add(box(8, 0.6, 0.4, 0x3f8f38, 12, -0.2, z));
    g.add(box(0.4, 0.6, 4.8, 0x3f8f38, 15.9, -0.2, 0));
    const cols = [0xff8fb1, 0xffd86b, 0x9b6ede, 0xffffff, 0xe2604f];
    for (let i = 0; i < 22; i++){
      const x = 8.8 + (i % 11) * 0.6, z = i < 11 ? -1.7 : 1.5;
      g.add(cyl(0.02, 0.02, 0.3, 4, 0x3f8f38, x, -0.2, z));
      g.add(ball(0.13, 0, cols[i % cols.length], x, 0.18, z));
    }
    // A little fountain in the middle, and a bench beside it.
    g.add(cyl(1.0, 1.1, 0.4, 12, 0xd8d0c4, 12.2, -0.2, 0));
    const w = cyl(0.85, 0.85, 0.06, 12, 0, 12.2, 0.15, 0, WATER);
    g.add(w);
    g.add(cyl(0.12, 0.16, 0.9, 8, 0xd8d0c4, 12.2, 0.1, 0));
    g.add(ball(0.2, 1, 0, 12.2, 1.1, 0, WATER));
    g.add(box(1.6, 0.12, 0.5, 0x9a6a44, 9.4, 0.25, 0.2));
    g.add(box(1.6, 0.5, 0.1, 0x9a6a44, 9.4, 0.35, -0.05));
    for (const x of [8.8, 10.0]) g.add(box(0.1, 0.45, 0.4, 0x6b4b33, x, -0.2, 0.2));
    g.add(tree(14.8, -0.6, 0.8));
    return flatten(g);
  }

  _busStop(){
    const g = new THREE.Group();
    g.add(box(2.6, 0.08, 1.1, 0x9fd9f2, 11, 2.3, PAVE - 0.9, GLASS));
    g.add(box(2.8, 0.12, 1.3, 0xe2604f, 11, 2.3, PAVE - 0.9));
    for (const x of [9.8, 12.2]) g.add(box(0.08, 2.5, 0.08, 0xfff3e0, x, -0.2, PAVE - 1.4));
    g.add(box(2.4, 1.6, 0.04, 0, 11, 0.4, PAVE - 1.45, GLASS));
    g.add(box(1.8, 0.1, 0.4, 0x9a6a44, 11, 0.3, PAVE - 1.2));
    g.add(cyl(0.05, 0.05, 2.4, 6, 0x8d8d8d, 13, -0.2, PAVE + 0.8));
    const sign = new THREE.Mesh(new THREE.CircleGeometry(0.35, 14),
      new THREE.MeshLambertMaterial({ map:textTexture('🚌', { w:128, h:128, bg:'#ffd86b', font:'80px' }) }));
    sign.position.set(13, 2.3, PAVE + 0.84);
    g.add(sign);
    return flatten(g);
  }

  _helipad(){
    const g = new THREE.Group();
    g.add(cyl(2.6, 2.7, 0.2, 18, 0x6b6f7a, -12, -0.26, 1.2));
    const h = new THREE.Mesh(new THREE.CircleGeometry(2.2, 18),
      new THREE.MeshLambertMaterial({ map:textTexture('H', { w:128, h:128, bg:'#6b6f7a', fg:'#ffd86b', font:'900 96px' }) }));
    h.rotation.x = -Math.PI / 2;
    h.position.set(-12, -0.05, 1.2);
    g.add(h);
    for (let i = 0; i < 8; i++){
      const a = i / 8 * Math.PI * 2;
      g.add(ball(0.1, 0, 0, -12 + Math.cos(a) * 2.5, 0, 1.2 + Math.sin(a) * 2.5, GLOW));
    }
    this.heli = helicopter();
    this.heli.position.set(-12, -0.05, 1.2);
    g.add(this.heli);
    this.heliAnim = { phase:'idle', t:0, spin:1.5 };
    return g;
  }

  // ------------------------------------------------------------- guests ---

  _makeActor(guest){
    let obj;
    if (guest.who){
      obj = characterSprite(this._texture(CHARACTER[guest.who]), 1.8);
    } else {
      obj = new THREE.Group();
      const m = milbil(guest.color);
      m.scale.setScalar(1.35);
      obj.add(m);
      obj.userData.body = m;
    }
    const bag = suitcase([0xe2604f, 0x5cc8ef, 0x9b6ede, 0x63bb52][guest.uid % 4]);
    bag.position.set(guest.who ? 0.55 : 0.5, 0.05, 0.15);
    obj.add(bag);
    obj.userData.bag = bag;
    obj.traverse(o => { o.userData.guest = guest.uid; });
    this.root.add(obj);
    return { uid:guest.uid, guest, obj, path:[], mode:'lobby', wait:0, phase:Math.random() * 6, fade:1, gone:false };
  }

  /** Walk from here to a list of points. Points flagged `lift` ride the lift. */
  _go(a, pts){ a.path = pts; }

  _routeUp(from, k){
    const [f] = E.unkey(k);
    const spot = this.roomSpot(k);
    const y = f * FLOOR_H;
    // Checked in from the lobby list while still out on the pavement: come in the door first.
    const pts = from.z > 2.5
      ? [v3(from.x, 0, PAVE), v3(DOOR_X + 1, 0, PAVE), v3(DOOR_X, 0, 2.8), v3(DOOR_X, 0, CORRIDOR)]
      : [v3(from.x, from.y, CORRIDOR)];
    if (f === 0){
      pts.push(v3(spot.x - 0.6, 0, CORRIDOR));
    } else {
      pts.push(v3(LIFT_X, 0, CORRIDOR), v3(LIFT_X, 0, 0));
      const up = v3(LIFT_X, y, 0); up.lift = true; pts.push(up);
      pts.push(v3(LIFT_X, y, CORRIDOR), v3(spot.x - 0.6, y, CORRIDOR));
    }
    pts.push(spot);
    return pts;
  }

  _routeOut(from, fromRoom){
    const pts = [];
    if (fromRoom && from.y > 0.1){
      pts.push(v3(from.x - 0.6, from.y, CORRIDOR), v3(LIFT_X, from.y, CORRIDOR), v3(LIFT_X, from.y, 0));
      const down = v3(LIFT_X, 0, 0); down.lift = true; pts.push(down);
      pts.push(v3(LIFT_X, 0, CORRIDOR));
    } else {
      pts.push(v3(from.x, 0, CORRIDOR));
    }
    pts.push(v3(DOOR_X, 0, 2.8), v3(DOOR_X + 1, 0, PAVE), v3(24, 0, PAVE));
    return pts;
  }

  _guests(first){
    const st = this.state;
    const seen = new Set();

    st.lobby.forEach((g, i) => {
      seen.add(g.uid);
      let a = this.actors.get(g.uid);
      const spot = this.lobbySpot(i);
      if (!a){
        a = this._makeActor(g);
        this.actors.set(g.uid, a);
        if (first){
          a.obj.position.copy(spot);
        } else {
          const from = SPAWN[g.via] || SPAWN.street;
          a.obj.position.copy(from);
          if (g.via === 'heli' && this.heli){ a.wait = 2.6; this._heliLand(); }
          if (g.via === 'bus'){ a.wait = 3.4; this._busArrive(); }
          if (a.wait) a.obj.visible = false;
          this._go(a, [v3(DOOR_X + 1, 0, PAVE), v3(DOOR_X, 0, 2.8), spot]);
        }
        a.spot = i;
      } else if (a.mode === 'lobby' && a.spot !== i){
        // Somebody ahead was checked in: shuffle along.
        a.spot = i;
        this._go(a, [...a.path.slice(0, -1), spot]);
        if (!a.path.length) this._go(a, [spot]);
      }
    });

    for (const k of E.allSlots(st)){
      const r = st.rooms[k];
      if (!r || r.st !== 'busy' || !r.guest) continue;
      const g = r.guest;
      seen.add(g.uid);
      let a = this.actors.get(g.uid);
      if (!a){
        a = this._makeActor(g);
        this.actors.set(g.uid, a);
        a.obj.position.copy(this.roomSpot(k));
        a.mode = 'room';
        a.key = k;
        a.obj.userData.bag.visible = false;
      } else if (a.mode === 'lobby'){
        if (a.wait > 0){ a.wait = 0; a.obj.visible = true; a.obj.position.copy(this.lobbySpot(a.spot || 0)); }
        a.mode = 'room';
        a.key = k;
        this._go(a, this._routeUp(a.obj.position, k));
      }
    }

    for (const [uid, a] of this.actors){
      if (seen.has(uid) || a.mode === 'leaving') continue;
      const fromRoom = a.mode === 'room';
      a.mode = 'leaving';
      a.obj.userData.bag.visible = true;
      if (a.wait){ a.gone = true; continue; }
      this._go(a, this._routeOut(fromRoom ? this.roomSpot(a.key) : a.obj.position, fromRoom));
      if (fromRoom) a.obj.position.copy(this.roomSpot(a.key));
    }
  }

  actorFor(uid){ return this.actors.get(uid); }

  /** The world position of a guest's head, for the marker over them. */
  guestTop(uid){
    const a = this.actors.get(uid);
    if (!a || !a.obj.visible) return null;
    const p = a.obj.position.clone();
    p.y += a.guest.who ? 2.0 : 1.2;
    return p;
  }

  _heliLand(){
    if (this.heliAnim) { this.heliAnim.phase = 'in'; this.heliAnim.t = 0; }
  }

  _busArrive(){
    if (!this.busObj){
      this.busObj = bus();
      this.busObj.position.set(60, -0.26, 7.2);
      this.root.add(this.busObj);
    }
    if (!this.busAnim || this.busAnim.phase === 'gone') this.busAnim = { phase:'in', t:0 };
    else if (this.busAnim.phase === 'out') this.busAnim = { phase:'in', t:0 };
  }

  // ------------------------------------------------------------- update ---

  update(dt, t){
    // Rooms pop in when built; the fancy ones have something that turns.
    for (const s of this.slots.values()){
      if (s.pop){
        s.pop = Math.min(1, s.pop + dt * 2.5);
        const k = s.pop;
        s.group.scale.setScalar(0.6 + 0.4 * (1 - Math.pow(1 - k, 3)) + Math.sin(k * Math.PI) * 0.08);
        if (k >= 1){ s.pop = 0; s.group.scale.setScalar(1); }
      }
      const u = s.group.userData;
      if (u.spin) u.spin.rotation.y += dt * 0.8;
      if (u.bubbles) u.bubbles.children.forEach((b, i) => {
        b.position.y += dt * (0.2 + (i % 3) * 0.1);
        if (b.position.y > 2.5) b.position.y = 0.65;
      });
      if (u.notes) u.notes.children.forEach((n, i) => {
        n.position.y = 1.4 + ((t * 0.4 + i * 0.33) % 1) * 0.9;
      });
    }
    const rec = this.lobby.userData.receptionist;
    if (rec) rec.position.y = Math.abs(Math.sin(t * 2.2)) * 0.05;
    if (this.poolRing) this.poolRing.position.y = this.roofY() + 0.5 + Math.sin(t * 1.6) * 0.04;

    let liftTarget = null;
    for (const [uid, a] of this.actors){
      this._stepActor(a, dt, t);
      if (a.path.length && a.path[0].lift) liftTarget = a.obj.position.y;
      if (a.gone){
        a.obj.parent && a.obj.parent.remove(a.obj);
        if (a.guest.who) a.obj.userData.sprite.material.dispose();
        this.actors.delete(uid);
      }
    }
    if (liftTarget !== null) this.liftY = liftTarget;
    this.liftCar.position.y += (this.liftY - this.liftCar.position.y) * Math.min(1, dt * 8);

    this._heliStep(dt);
    this._busStep(dt);
  }

  _stepActor(a, dt, t){
    const o = a.obj;
    if (a.wait > 0){
      a.wait -= dt;
      if (a.wait <= 0){
        o.visible = true;
        if (a.guest.via === 'heli') o.position.copy(SPAWN.heli);
        if (a.guest.via === 'bus') o.position.copy(SPAWN.bus);
      }
      return;
    }
    let moving = false;
    let budget = dt;
    while (a.path.length && budget > 0){
      const target = a.path[0];
      const speed = target.lift ? LIFT_SPEED : WALK;
      const d = o.position.distanceTo(target);
      const step = speed * budget;
      if (d <= step){
        o.position.copy(target);
        budget -= d / speed;
        a.path.shift();
      } else {
        const dir = target.clone().sub(o.position).normalize();
        o.position.addScaledVector(dir, step);
        budget = 0;
        if (!target.lift && a.obj.userData.body) a.obj.userData.body.rotation.y = Math.atan2(dir.x, dir.z);
        moving = !target.lift;
      }
    }

    const body = o.userData.body, sprite = o.userData.sprite;
    const hop = moving ? Math.abs(Math.sin(t * 9 + a.phase)) * 0.12 : Math.sin(t * 1.6 + a.phase) * 0.03;
    if (body){
      body.position.y = hop;
      if (!moving) body.rotation.y += (0 - body.rotation.y) * Math.min(1, dt * 4);
      const feet = body.userData.feet;
      if (feet) feet.forEach((f, i) => { f.position.z = 0.05 + (moving ? Math.sin(t * 12 + i * Math.PI) * 0.1 : 0); });
    }
    if (sprite){
      const h = sprite.scale.y;
      sprite.position.y = h / 2 + hop;
      sprite.material.rotation = moving ? Math.sin(t * 9 + a.phase) * 0.08 : Math.sin(t * 0.9 + a.phase) * 0.03;
    }
    if (a.mode === 'room' && !a.path.length && o.userData.bag.visible) o.userData.bag.visible = false;

    if (a.mode === 'leaving' && !a.path.length) a.gone = true;
    if (a.mode === 'leaving' && o.position.x > 14){
      a.fade = Math.max(0, 1 - (o.position.x - 14) / 9);
      if (sprite) sprite.material.opacity = a.fade;
      else o.scale.setScalar(Math.max(0.01, a.fade));
    }
  }

  _heliStep(dt){
    const h = this.heliAnim, heli = this.heli;
    if (!h || !heli) return;
    const ease = (k) => k * k * (3 - 2 * k);
    h.t += dt;
    if (h.phase === 'in'){
      const k = Math.min(1, h.t / 2.4), b = 1 - ease(k);
      h.spin += (30 - h.spin) * Math.min(1, dt * 3);
      heli.position.set(-12 - b * 18, -0.05 + b * 14, 1.2 - b * 6);
      heli.rotation.z = -b * 0.2;
      if (k >= 1){ h.phase = 'wait'; h.t = 0; }
    } else if (h.phase === 'wait'){
      if (h.t > 2.5){ h.phase = 'idle'; h.t = 0; }
    } else {
      h.spin += (1.5 - h.spin) * Math.min(1, dt);
      heli.position.set(-12, -0.05, 1.2);
      heli.rotation.z = 0;
    }
    heli.userData.rotor.rotation.y += h.spin * dt;
  }

  _busStep(dt){
    const b = this.busAnim, obj = this.busObj;
    if (!b || !obj || b.phase === 'gone') return;
    b.t += dt;
    const ease = (k) => 1 - Math.pow(1 - k, 3);
    if (b.phase === 'in'){
      const k = Math.min(1, b.t / 3.2);
      obj.position.x = 60 - ease(k) * 47;
      if (k >= 1){ b.phase = 'stop'; b.t = 0; }
    } else if (b.phase === 'stop'){
      if (b.t > 2.2){ b.phase = 'out'; b.t = 0; }
    } else if (b.phase === 'out'){
      const k = Math.min(1, b.t / 4);
      obj.position.x = 13 - k * k * 80;
      if (k >= 1){ b.phase = 'gone'; obj.position.x = 60; }
    }
  }

  /** What a tap at this ray landed on: a guest, a slot, the roof, the lobby. */
  pick(raycaster){
    const guests = [];
    for (const a of this.actors.values()) if (a.mode === 'lobby' && a.obj.visible && a.path.length <= 1) guests.push(a.obj);
    const g = raycaster.intersectObjects(guests, true)[0];
    if (g) return { guest: g.object.userData.guest };
    const hit = raycaster.intersectObjects(this.hits, false)[0];
    if (!hit) return null;
    const u = hit.object.userData;
    if (u.slot) return { slot:u.slot };
    if (u.roof) return { roof:true };
    if (u.lobby) return { lobby:true };
    return null;
  }
}

