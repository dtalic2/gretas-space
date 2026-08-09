// ---------- Scene, terrain, props, ambience ----------
import * as THREE from 'three';
import { GRID } from './data.js';
import { skyAt } from './sky.js';

export const PLOT_SPACING = 2.3;
export const GARDEN_Y = 0.32;          // top surface of the raised bed
export const BED_HALF = 8.4;           // half-width of the raised bed, for the step-up test

// Interaction stations, pushed clear of the 5x5 bed so standing on a corner
// plot never steals focus from the plot you're on.
export const STATIONS = {
  seedshop:  { pos:new THREE.Vector3(-11.5, 0, -7.2), label:'SEED SHOP',  color:'#4c9a2a', radius:2.6 },
  animals:   { pos:new THREE.Vector3( 11.5, 0, -7.2), label:'ANIMAL PEN', color:'#c98a12', radius:2.6 },
  carpenter: { pos:new THREE.Vector3(-11.5, 0,  7.2), label:'CARPENTER',  color:'#8b5e34', radius:2.6 },
  market:    { pos:new THREE.Vector3( 11.5, 0,  7.2), label:'MARKET',     color:'#e0575b', radius:2.6 },
  magictree: { pos:new THREE.Vector3( 0,    0, -14.0),label:'MAGIC TREE', color:'#b46bff', radius:3.2 },
  magicmarket:{pos:new THREE.Vector3( 11.5, 0,  0   ),label:'MAGIC MARKET', color:'#c08cff', radius:2.6 },
  supermarket:{pos:new THREE.Vector3( -6.5, 0, 12.8),label:'SUPER MAGIC MARKET', color:'#ff7ad0', radius:2.6 },
  dragoncave:{ pos:new THREE.Vector3(  7.0, 0, 12.8),label:'DRAGON CAVE', color:'#ff6a2b', radius:3.0 },
  mansion:   { pos:new THREE.Vector3(-16.5, 0, -3.5),label:'MAGIC MANSION', color:'#b98cff', radius:3.4 },
  voidgate:  { pos:new THREE.Vector3( 16.5, 0, -3.5),label:'INFINITY VOID',  color:'#c9b6ff', radius:3.2 },
  supertree: { pos:new THREE.Vector3(-11.0, 0, -14.0),label:'SUPER TREE', color:'#ff7ad0', radius:3.4 },
  realm:     { pos:new THREE.Vector3( 11.0, 0, -14.0),label:'ENCHANTED REALM', color:'#8ee6ff', radius:3.0 },
  // Only reachable once you've bought the sapling.
  owntree:   { pos:new THREE.Vector3(-11.5, 0,  0   ),label:'YOUR TREE',  color:'#7bd88f', radius:2.6, owned:true },
};

const lam = (color, flat = true) => new THREE.MeshLambertMaterial({ color, flatShading: flat });

// The four moods the sky blends between. Grouped here so the whole look of the
// garden is legible in one place instead of scattered through the frame loop.
// sunI/hemiI are light intensities; everything else is a colour.
const PALETTE = {
  day:   { top:0x2e8bd6, mid:0x8ecae6, bottom:0xdff3f8, fog:0xbfe3f2,
           sun:0xfff3d6, hemiSky:0xcfe8ff, hemiGround:0x5a7a3a, sunI:1.60, hemiI:0.85 },
  dusk:  { top:0x2b3f7a, mid:0xff9e6b, bottom:0xffd7a3, fog:0xe6a079,
           sun:0xff9a5c, hemiSky:0xffb98a, hemiGround:0x4a4030, sunI:1.15, hemiI:0.55 },
  // Night is lifted off true black on purpose: it has to read as night without
  // making the plots you're trying to tend guesswork.
  night: { top:0x080d24, mid:0x141e44, bottom:0x243057, fog:0x18213c,
           sun:0xa8c2ff, hemiSky:0x3c5090, hemiGround:0x1c2a1e, sunI:0.50, hemiI:0.44 },
  rain:  { top:0x46525e, mid:0x78838f, bottom:0x9aa4ac, fog:0x828c95,
           sun:0xc8d4e0, hemiSky:0x8d99a5, hemiGround:0x3d4a3a, sunI:0.55, hemiI:0.50 },
};

// Scales all background motion (clouds, butterflies, livestock, magic motes).
let ambient = 1;
export function setWorldMotion(style){ ambient = style?.ambient ?? 1; }

export class World {
  constructor(canvas){
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.decorNodes = {};
    this.animalNodes = [];
    this.mixers = [];

    this._initRenderer();
    this._initScene();
    this._initLights();
    this._buildGround();
    this._buildGardenBed();
    this._buildFence();
    this._buildStations();
    this._buildScenery();
    this._buildAmbience();
    this._buildRain();
    this._applyWeather(Date.now(), 0);   // start on the right palette, don't fade in from noon
  }

  // ---------------- core ----------------
  _initRenderer(){
    const r = new THREE.WebGLRenderer({ canvas:this.canvas, antialias:true, powerPreference:'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    this.renderer = r;
  }

  _initScene(){
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xbfe3f2, 34, 78);

    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400);
    this.camera.position.set(0, 9, 14);

    // Gradient sky dome.
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        top:    { value: new THREE.Color(0x2e8bd6) },
        mid:    { value: new THREE.Color(0x8ecae6) },
        bottom: { value: new THREE.Color(0xdff3f8) },
      },
      vertexShader: `
        varying vec3 vP;
        void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
        varying vec3 vP;
        void main(){
          float h = normalize(vP).y;
          vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.75)) : mix(mid, bottom, pow(-h, 0.5));
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 20), skyMat);
    this.skyUniforms = skyMat.uniforms;
    this.scene.add(this.sky);
  }

  _initLights(){
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5a7a3a, 0.85);
    this.scene.add(this.hemi);

    const sun = new THREE.DirectionalLight(0xfff3d6, 1.6);
    sun.position.set(14, 22, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 70;
    const s = 24;
    Object.assign(sun.shadow.camera, { left:-s, right:s, top:s, bottom:-s });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  // ---------------- terrain ----------------
  _buildGround(){
    // Rolling meadow: a big plane with gentle noise so it isn't a flat card.
    const geo = new THREE.PlaneGeometry(160, 160, 60, 60);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++){
      const x = pos.getX(i), z = pos.getZ(i);
      const d = Math.hypot(x, z);
      // Keep the play area flat; only the distance rolls.
      const falloff = THREE.MathUtils.smoothstep(d, 18, 46);
      const h = (Math.sin(x * 0.12) * Math.cos(z * 0.1) * 1.6 + Math.sin(x * 0.05 + z * 0.07) * 2.2) * falloff;
      pos.setY(i, h);
    }
    geo.computeVertexNormals();

    const ground = new THREE.Mesh(geo, lam(0x6db33f, false));
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Dirt path from the spawn point up to the garden.
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 12), lam(0xc7a26a, false));
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.02, 11);
    path.receiveShadow = true;
    this.scene.add(path);
  }

  _buildGardenBed(){
    const g = new THREE.Group();
    const span = BED_HALF * 2;

    // Raised soil bed.
    const bed = new THREE.Mesh(new THREE.BoxGeometry(span, GARDEN_Y, span), lam(0x6b4a2f));
    bed.position.y = GARDEN_Y / 2;
    bed.castShadow = bed.receiveShadow = true;
    g.add(bed);

    // Wooden frame.
    const frameMat = lam(0x8b5e34);
    const rail = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.46, d), frameMat);
      m.position.set(x, 0.23, z);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    };
    const edge = BED_HALF - 0.2;
    rail(span + 0.6, 0.42, 0, -edge);
    rail(span + 0.6, 0.42, 0,  edge);
    rail(0.42, span + 0.6, -edge, 0);
    rail(0.42, span + 0.6,  edge, 0);

    // A GRID x GRID field of tilled plots. Locked ones are turfed over until bought.
    this.plotAnchors = [];
    this.plotTiles = [];
    this.pickTiles = [];
    const mid = (GRID - 1) / 2;
    for (let r = 0; r < GRID; r++){
      for (let c = 0; c < GRID; c++){
        const x = (c - mid) * PLOT_SPACING;
        const z = (r - mid) * PLOT_SPACING;

        const tile = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.14, 1.95), lam(0x4a3320));
        tile.userData.plotIndex = r * GRID + c;
        tile.position.set(x, GARDEN_Y + 0.02, z);
        tile.receiveShadow = true;
        g.add(tile);

        // Furrow ridges, hidden while the plot is locked.
        const ridges = new THREE.Group();
        for (let f = -1; f <= 1; f++){
          const ridge = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.18), lam(0x5b4028));
          ridge.position.set(x, GARDEN_Y + 0.11, z + f * 0.54);
          ridge.receiveShadow = true;
          ridges.add(ridge);
        }
        g.add(ridges);

        // Little "for sale" peg shown on locked plots.
        const peg = new THREE.Group();
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.6, 5), lam(0x8b5e34));
        post.position.set(x, GARDEN_Y + 0.3, z);
        peg.add(post);
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.05), lam(0xd9c39a));
        board.position.set(x, GARDEN_Y + 0.62, z);
        board.rotation.y = 0.3;
        peg.add(board);
        g.add(peg);

        this.plotAnchors.push(new THREE.Vector3(x, GARDEN_Y + 0.09, z));
        this.plotTiles.push({ tile, ridges, peg });
        this.pickTiles.push(tile);
      }
    }

    this.scene.add(g);
    this.gardenGroup = g;
  }

  /** Turf a plot over, or till it ready for planting. */
  setPlotUnlocked(index, on){
    const p = this.plotTiles[index];
    if (!p) return;
    p.ridges.visible = on;
    p.peg.visible = !on;
    p.tile.material.color.setHex(on ? 0x4a3320 : 0x5f8a3a);   // soil vs turf
    p.tile.position.y = GARDEN_Y + (on ? 0.02 : 0.0);
  }

  _buildFence(){
    const g = new THREE.Group();
    const postMat = lam(0xa87e4f);
    const half = 19;
    const step = 2.5;
    for (let i = -half; i <= half; i += step){
      for (const [x, z] of [[i, -half], [i, half], [-half, i], [half, i]]){
        // Leave a gate gap on the south side and a lane to the magic tree.
        if (z === half && Math.abs(x) < 2.6) continue;
        if (z === -half && Math.abs(x) < 2.6) continue;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.22), postMat);
        post.position.set(x, 0.75, z);
        post.castShadow = true;
        g.add(post);
      }
    }
    // Horizontal rails.
    const railMat = lam(0x8b5e34);
    for (const y of [0.55, 1.1]){
      for (const [w, d, x, z] of [[half*2,0.14,0,-half],[half*2,0.14,0,half],[0.14,half*2,-half,0],[0.14,half*2,half,0]]){
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), railMat);
        rail.position.set(x, y, z);
        rail.castShadow = true;
        g.add(rail);
      }
    }
    this.scene.add(g);
  }

  // ---------------- stations ----------------
  _buildStations(){
    this.stationGroups = [];
    const tag = (group, key) => { group.userData.stationKey = key; this.stationGroups.push(group); };
    tag(this._stall(STATIONS.seedshop.pos,  0x4c9a2a, '🌱', STATIONS.seedshop.label), 'seedshop');
    tag(this._stall(STATIONS.animals.pos,   0xd9a441, '🐔', STATIONS.animals.label), 'animals');
    tag(this._stall(STATIONS.carpenter.pos, 0x9a6a3c, '🔨', STATIONS.carpenter.label), 'carpenter');
    tag(this._stall(STATIONS.market.pos,    0xe0575b, '🧺', STATIONS.market.label), 'market');
    tag(this._magicTree(STATIONS.magictree.pos), 'magictree');
    tag(this._stall(STATIONS.magicmarket.pos, 0x9b5de5, '🔮', STATIONS.magicmarket.label), 'magicmarket');
    tag(this._stall(STATIONS.supermarket.pos,  0xff7ad0, '💫', STATIONS.supermarket.label), 'supermarket');
    tag(this._superTree(STATIONS.supertree.pos), 'supertree');
    tag(this._realmPortal(STATIONS.realm.pos), 'realm');
    tag(this._dragonCave(STATIONS.dragoncave.pos), 'dragoncave');
    tag(this._mansion(STATIONS.mansion.pos), 'mansion');
    tag(this._voidGate(STATIONS.voidgate.pos), 'voidgate');
  }

  _stall(pos, awning, emoji, label){
    const g = new THREE.Group();
    g.position.copy(pos);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.05, 1.5), lam(0x8b5e34));
    counter.position.y = 0.52;
    counter.castShadow = counter.receiveShadow = true;
    g.add(counter);

    const top = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.16, 1.8), lam(0xc79a63));
    top.position.y = 1.12;
    top.castShadow = true;
    g.add(top);

    // Four corner posts holding the canopy up.
    const postMat = lam(0x6b4a2f);
    for (const x of [-1.7, 1.7]){
      for (const z of [-0.75, 0.75]){
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.16), postMat);
        p.position.set(x, 1.35, z);
        p.castShadow = true;
        g.add(p);
      }
    }

    // Striped canopy: a proper pitched roof, thick enough to read from any angle.
    const roof = new THREE.Group();
    for (let i = 0; i < 6; i++){
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.64, 0.22, 2.5),
        lam(i % 2 ? 0xfffaf0 : awning)
      );
      strip.position.set(-1.6 + i * 0.64, 0, 0);
      strip.castShadow = true;
      roof.add(strip);
    }
    roof.rotation.x = -0.34;
    roof.position.set(0, 2.78, 0.12);
    g.add(roof);

    // Ridge beam along the top so the pitch is obvious.
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.16, 0.22), lam(0x6b4a2f));
    ridge.position.set(0, 3.22, -0.72);
    ridge.castShadow = true;
    g.add(ridge);

    // Scalloped valance hanging off the front edge.
    for (let i = 0; i < 7; i++){
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.34, 4), lam(i % 2 ? 0xfffaf0 : awning));
      tooth.rotation.x = Math.PI;
      tooth.position.set(-1.8 + i * 0.6, 2.44, 1.32);
      g.add(tooth);
    }

    // Emoji sign board.
    const sign = makeLabelSprite(`${emoji}  ${label}`, '#2b2016', '#fffaf0');
    sign.position.set(0, 3.5, 0);
    sign.scale.set(4.6, 1.15, 1);
    g.add(sign);

    this.scene.add(g);
    return g;
  }

  _magicTree(pos){
    const g = new THREE.Group();
    g.position.copy(pos);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 5.2, 8), lam(0x5b3f6e));
    trunk.position.y = 2.6;
    trunk.castShadow = true;
    g.add(trunk);

    this.magicFoliage = [];
    const blobs = [
      [0, 6.1, 0, 2.9], [-1.9, 5.3, 0.7, 1.9], [1.9, 5.5, -0.6, 2.0],
      [0.5, 7.4, 1.3, 1.6], [-0.8, 7.2, -1.2, 1.5],
    ];
    for (const [x, y, z, r] of blobs){
      const m = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r, 0),
        new THREE.MeshLambertMaterial({ color:0x9b5de5, emissive:0x4a1f8a, emissiveIntensity:0.55, flatShading:true })
      );
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      this.magicFoliage.push(m);
    }

    const glow = new THREE.PointLight(0xc08cff, 3.2, 18, 2);
    glow.position.set(0, 6, 0);
    g.add(glow);
    this.magicGlow = glow;

    // Floating motes.
    const moteGeo = new THREE.BufferGeometry();
    const n = 90, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++){
      arr[i*3]   = (Math.random() - 0.5) * 9;
      arr[i*3+1] = 1.5 + Math.random() * 8;
      arr[i*3+2] = (Math.random() - 0.5) * 9;
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
      color:0xdcb6ff, size:0.22, transparent:true, opacity:0.9,
      depthWrite:false, blending:THREE.AdditiveBlending,
    }));
    g.add(this.motes);

    const sign = makeLabelSprite('✨  MAGIC TREE', '#ffffff', '#6a2fb5');
    sign.position.set(0, 9.6, 0);
    sign.scale.set(5.2, 1.3, 1);
    g.add(sign);

    this.scene.add(g);
    this.magicTreeGroup = g;
    this.magicShake = 0;
    return g;
  }

  /** Kick off the wobble + mote burst when the player shakes the tree. */
  shakeMagicTree(){
    this.magicShake = 1;
  }

  /** A far bigger, hotter-coloured sibling of the magic tree. */
  _superTree(pos){
    const g = new THREE.Group();
    g.position.copy(pos);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.5, 7.5, 9), lam(0x4a2b56));
    trunk.position.y = 3.75; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 5; i++){
      const a = (i / 5) * Math.PI * 2;
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 1.6, 6), lam(0x3d2246));
      root.position.set(Math.cos(a) * 0.9, 0.6, Math.sin(a) * 0.9);
      root.rotation.set(Math.cos(a) * 0.42, 0, -Math.sin(a) * 0.42);
      root.castShadow = true;
      g.add(root);
    }

    this.superFoliage = [];
    const blobs = [[0, 9.2, 0, 4.2], [-3.1, 8.0, 1.2, 2.6], [3.2, 8.2, -1.0, 2.7],
                   [0.9, 11.4, 1.9, 2.2], [-1.3, 11.2, -1.8, 2.0], [0, 13.0, 0, 1.5]];
    blobs.forEach(([x, y, z, r], i) => {
      const m = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r, 0),
        new THREE.MeshLambertMaterial({
          color: i % 2 ? 0xff7ad0 : 0xd05de5,
          emissive: 0x8a1f6a, emissiveIntensity:0.6, flatShading:true,
        })
      );
      m.position.set(x, y, z); m.castShadow = true;
      g.add(m);
      this.superFoliage.push(m);
    });

    this.superGlow = new THREE.PointLight(0xff9ee0, 5, 30, 2);
    this.superGlow.position.set(0, 9, 0);
    g.add(this.superGlow);

    const n = 200, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++){
      arr[i*3] = (Math.random()-0.5)*15; arr[i*3+1] = 2 + Math.random()*14; arr[i*3+2] = (Math.random()-0.5)*15;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.superMotes = new THREE.Points(geo, new THREE.PointsMaterial({
      color:0xffd0f2, size:0.3, transparent:true, opacity:0.9,
      depthWrite:false, blending:THREE.AdditiveBlending,
    }));
    g.add(this.superMotes);

    const sign = makeLabelSprite('🌟  SUPER TREE', '#ffffff', '#a01f7a');
    sign.position.set(0, 16.2, 0);
    sign.scale.set(6.4, 1.6, 1);
    g.add(sign);

    this.scene.add(g);
    return g;
  }

  /** A standing stone arch with a shimmering gate — the Enchanted Realm. */
  _realmPortal(pos){
    const g = new THREE.Group();
    g.position.copy(pos);

    const stone = lam(0x6f7b8c);
    for (const side of [-1, 1]){
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.85, 5.4, 0.85), stone);
      leg.position.set(side * 2.0, 2.7, 0);
      leg.rotation.z = side * -0.04;
      leg.castShadow = true;
      g.add(leg);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.95, 1.0), stone);
    lintel.position.y = 5.75; lintel.castShadow = true; g.add(lintel);

    const gate = new THREE.Mesh(
      new THREE.PlaneGeometry(3.3, 5.0),
      new THREE.MeshBasicMaterial({ color:0x8ee6ff, transparent:true, opacity:0.42, side:THREE.DoubleSide })
    );
    gate.position.y = 2.8;
    g.add(gate);
    this.realmGate = gate;

    this.realmRings = [];
    for (let i = 0; i < 3; i++){
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.0 + i * 0.5, 0.055, 6, 24),
        new THREE.MeshLambertMaterial({ color:0xbff2ff, emissive:0x2f9fd0, emissiveIntensity:1.0, flatShading:true })
      );
      ring.position.y = 2.8;
      g.add(ring);
      this.realmRings.push(ring);
    }

    this.realmGlow = new THREE.PointLight(0x8ee6ff, 4, 20, 2);
    this.realmGlow.position.set(0, 3, 0);
    g.add(this.realmGlow);

    const sign = makeLabelSprite('🌌  ENCHANTED REALM', '#ffffff', '#1f6f9c');
    sign.position.set(0, 7.4, 0);
    sign.scale.set(6.6, 1.5, 1);
    g.add(sign);

    this.scene.add(g);
    return g;
  }

  /** A rocky mound with a fire-lit mouth and a spill of treasure. */
  _dragonCave(pos){
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = -0.25;

    // Boulder shell, hollow at the front so the mouth reads as an opening.
    const rock = lam(0x5c5750);
    const lumps = [[0, 1.9, -1.2, 3.0], [-2.4, 1.4, -0.3, 2.0], [2.5, 1.5, -0.4, 2.1],
                   [-1.3, 3.0, -1.6, 1.7], [1.4, 3.1, -1.5, 1.6], [0, 3.9, -2.0, 1.4]];
    for (const [x, y, z, r] of lumps){
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rock);
      m.position.set(x, y, z);
      m.rotation.set(Math.random(), Math.random(), Math.random());
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    }

    // The mouth: a dark arch with a hot glow inside.
    const mouth = new THREE.Mesh(
      new THREE.CircleGeometry(1.25, 16, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color:0x140a06, side:THREE.DoubleSide })
    );
    mouth.position.set(0, 0.05, 1.15);
    g.add(mouth);

    this.caveFire = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 16, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color:0xff6a2b, transparent:true, opacity:0.55, side:THREE.DoubleSide })
    );
    this.caveFire.position.set(0, 0.05, 1.05);
    g.add(this.caveFire);

    this.caveGlow = new THREE.PointLight(0xff7a33, 4, 16, 2);
    this.caveGlow.position.set(0, 1.1, 1.4);
    g.add(this.caveGlow);

    // A pair of eyes back in the dark.
    this.caveEyes = [];
    for (const side of [-1, 1]){
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 8, 6),
        new THREE.MeshBasicMaterial({ color:0xffe066 })
      );
      eye.position.set(side * 0.34, 0.95, 0.6);
      g.add(eye);
      this.caveEyes.push(eye);
    }

    // Treasure spilling out of the mouth.
    const goldMat = new THREE.MeshLambertMaterial({ color:0xffd166, emissive:0xa8730c, emissiveIntensity:0.5, flatShading:true });
    for (let i = 0; i < 16; i++){
      const a = (i / 16) * Math.PI - 0.1;
      const r = 1.5 + (i % 4) * 0.42;
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 8), goldMat);
      coin.position.set(Math.cos(a) * r * 0.8, 0.05 + (i % 3) * 0.05, 1.2 + Math.sin(a) * r * 0.5);
      coin.rotation.set(Math.PI / 2 * (i % 2), i, 0.2 * i);
      coin.castShadow = true;
      g.add(coin);
    }
    for (const [x, z] of [[-1.0, 2.0], [1.1, 2.1], [0.2, 2.6]]){
      const pile = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.42, 8), goldMat);
      pile.position.set(x, 0.2, z);
      pile.castShadow = true;
      g.add(pile);
    }

    const sign = makeLabelSprite('🐲  DRAGON CAVE', '#ffffff', '#a33712');
    sign.position.set(0, 6.6, 0);
    sign.scale.set(5.6, 1.4, 1);
    g.add(sign);

    this.scene.add(g);
    return g;
  }

  /** A tall lamp-lit house. Every window is a plant room. */
  _mansion(pos){
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = Math.PI / 2;          // face the garden

    const wall = lam(0x5b4a86), trim = lam(0x3d3160);
    const body = new THREE.Mesh(new THREE.BoxGeometry(6.4, 6.0, 4.6), wall);
    body.position.y = 3.0; body.castShadow = body.receiveShadow = true; g.add(body);

    // Pitched roof from two slabs, plus a ridge.
    for (const side of [-1, 1]){
      const slope = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.34, 5.2), trim);
      slope.position.set(side * 1.7, 7.2, 0);
      slope.rotation.z = side * -0.62;
      slope.castShadow = true;
      g.add(slope);
    }
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 5.4), trim);
    ridge.position.y = 8.05; ridge.castShadow = true; g.add(ridge);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.9), trim);
    chimney.position.set(-2.0, 7.8, 1.3); chimney.castShadow = true; g.add(chimney);

    // Warm windows on two floors.
    this.mansionWindows = [];
    const glass = () => new THREE.MeshLambertMaterial({
      color:0xffe6a8, emissive:0xffb43c, emissiveIntensity:0.9, flatShading:true });
    for (const y of [2.0, 4.6]){
      for (const x of [-2.0, 0, 2.0]){
        const w = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.12), glass());
        w.position.set(x, y, 2.34);
        g.add(w);
        this.mansionWindows.push(w);
      }
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.2, 0.16), lam(0x2a2145));
    door.position.set(0, 1.1, 2.36); g.add(door);

    // Planters either side of the door.
    for (const side of [-1, 1]){
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.5, 8), lam(0x8b5e34));
      pot.position.set(side * 1.9, 0.25, 2.9); pot.castShadow = true; g.add(pot);
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.44, 0), lam(0x4c9a2a));
      bush.position.set(side * 1.9, 0.78, 2.9); bush.castShadow = true; g.add(bush);
    }

    this.mansionGlow = new THREE.PointLight(0xffc46a, 3, 18, 2);
    this.mansionGlow.position.set(0, 3.4, 3.4);
    g.add(this.mansionGlow);

    const sign = makeLabelSprite('🏰  MAGIC MANSION', '#ffffff', '#4b3a86');
    sign.position.set(0, 9.6, 0);
    sign.scale.set(6.6, 1.6, 1);
    g.add(sign);

    this.scene.add(g);
    return g;
  }

  /** A tear in the world: a black sphere inside slowly turning rings. */
  _voidGate(pos){
    const g = new THREE.Group();
    g.position.copy(pos);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.9, 0.7, 10), lam(0x2b2740));
    plinth.position.y = 0.35; plinth.receiveShadow = true; g.add(plinth);

    this.voidCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.7, 24, 18),
      new THREE.MeshBasicMaterial({ color:0x05030d })
    );
    this.voidCore.position.y = 3.4;
    g.add(this.voidCore);

    // A bright rim so the black sphere still reads against a dark sky.
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.82, 24, 18),
      new THREE.MeshBasicMaterial({ color:0xc9b6ff, transparent:true, opacity:0.25, side:THREE.BackSide })
    );
    halo.position.y = 3.4;
    g.add(halo);

    this.voidRings = [];
    for (let i = 0; i < 3; i++){
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.3 + i * 0.55, 0.07, 6, 32),
        new THREE.MeshLambertMaterial({ color:0xd8c9ff, emissive:0x6a49c9, emissiveIntensity:1.1, flatShading:true })
      );
      ring.position.y = 3.4;
      ring.rotation.set(i * 0.6, i * 1.1, i * 0.4);
      g.add(ring);
      this.voidRings.push(ring);
    }

    // A little galaxy of motes falling inward.
    const n = 260, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++){
      const a = Math.random() * Math.PI * 2, r = 2.2 + Math.random() * 4;
      arr[i*3] = Math.cos(a) * r;
      arr[i*3+1] = 1.2 + Math.random() * 5.5;
      arr[i*3+2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.voidMotes = new THREE.Points(geo, new THREE.PointsMaterial({
      color:0xe8dcff, size:0.16, transparent:true, opacity:0.95,
      depthWrite:false, blending:THREE.AdditiveBlending,
    }));
    g.add(this.voidMotes);

    this.voidGlow = new THREE.PointLight(0x9a7aff, 3.5, 20, 2);
    this.voidGlow.position.set(0, 3.4, 0);
    g.add(this.voidGlow);

    const sign = makeLabelSprite('♾️  INFINITY VOID', '#ffffff', '#3b2a70');
    sign.position.set(0, 7.8, 0);
    sign.scale.set(6.4, 1.5, 1);
    g.add(sign);

    this.scene.add(g);
    return g;
  }

  // ---------------- the player's own magic tree ----------------
  /** Plant (or remove) the sapling the player buys. */
  setOwnTree(on){
    if (!on){
      if (this.ownTreeGroup){ this.scene.remove(this.ownTreeGroup); this.ownTreeGroup = null; }
      return;
    }
    if (this.ownTreeGroup) return;

    const g = new THREE.Group();
    g.position.copy(STATIONS.owntree.pos);
    g.userData.stationKey = 'owntree';

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.6, 3.2, 8), lam(0x5b3f6e));
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    g.add(trunk);

    this.ownFoliage = [];
    for (const [x, y, z, r] of [[0, 3.9, 0, 1.7], [-1.1, 3.3, 0.4, 1.1], [1.1, 3.4, -0.35, 1.15], [0.3, 4.7, 0.7, 0.9]]){
      const m = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r, 0),
        new THREE.MeshLambertMaterial({ color:0x7bd88f, emissive:0x1f7a4a, emissiveIntensity:0.4, flatShading:true })
      );
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      this.ownFoliage.push(m);
    }

    this.ownGlow = new THREE.PointLight(0x9cf0b4, 1.4, 11, 2);
    this.ownGlow.position.set(0, 3.8, 0);
    g.add(this.ownGlow);

    // Gift baubles hanging in the canopy: one per item waiting to be collected.
    this.ownGifts = [];
    const giftMat = new THREE.MeshLambertMaterial({ color:0xffe066, emissive:0xc98a12, emissiveIntensity:0.9, flatShading:true });
    for (let i = 0; i < 6; i++){
      const a = (i / 6) * Math.PI * 2;
      const gift = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), giftMat);
      gift.position.set(Math.cos(a) * 1.25, 3.0 + (i % 2) * 0.5, Math.sin(a) * 1.25);
      gift.castShadow = true;
      gift.visible = false;
      g.add(gift);
      this.ownGifts.push(gift);
    }

    const sign = makeLabelSprite('🌳  YOUR TREE', '#ffffff', '#2f8f5a');
    sign.position.set(0, 6.4, 0);
    sign.scale.set(4.8, 1.2, 1);
    g.add(sign);

    this.scene.add(g);
    this.ownTreeGroup = g;
    this.stationGroups.push(g);
    this.ownStock = 0;
  }

  /** Show how many gifts are waiting: baubles appear and the tree brightens. */
  setOwnTreeStock(n){
    if (!this.ownTreeGroup) return;
    this.ownStock = n;
    this.ownGifts.forEach((gift, i) => { gift.visible = i < Math.min(n, this.ownGifts.length); });
    this.ownGlow.intensity = n > 0 ? 3.0 : 1.1;
    for (const f of this.ownFoliage) f.material.emissiveIntensity = n > 0 ? 0.75 : 0.32;
  }

  // ---------------- scenery ----------------
  _buildScenery(){
    // Trees outside the fence.
    const spots = [
      [-22,-20],[-26,-6],[-24,9],[-19,20],[-6,-25],[7,-26],[20,-21],
      [25,-8],[26,7],[21,19],[8,25],[-8,24],[-30,15],[31,-16],[-33,-14],[33,12],
    ];
    for (const [x, z] of spots) this._tree(x, z, 0.8 + Math.random() * 0.7);

    // Rocks + flower clusters inside the fence.
    for (let i = 0; i < 22; i++){
      const a = Math.random() * Math.PI * 2;
      const r = 7 + Math.random() * 6.5;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 6 && Math.abs(z) < 6) continue;
      if (Math.random() < 0.4) this._rock(x, z);
      else this._flowers(x, z);
    }

    // Grass tufts (instanced for cheapness).
    const tuftGeo = new THREE.ConeGeometry(0.11, 0.5, 4);
    tuftGeo.translate(0, 0.25, 0);
    const tufts = new THREE.InstancedMesh(tuftGeo, lam(0x5da032), 420);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    let placed = 0;
    while (placed < 420){
      const x = (Math.random() - 0.5) * 56;
      const z = (Math.random() - 0.5) * 56;
      if (Math.abs(x) < 5.6 && Math.abs(z) < 5.6) continue; // not on the bed
      q.setFromAxisAngle(new THREE.Vector3(0,1,0), Math.random() * Math.PI);
      sc.setScalar(0.6 + Math.random() * 0.9);
      m4.compose(new THREE.Vector3(x, 0, z), q, sc);
      tufts.setMatrixAt(placed++, m4);
    }
    tufts.instanceMatrix.needsUpdate = true;
    tufts.castShadow = true;
    this.scene.add(tufts);
  }

  _tree(x, z, scale){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    g.rotation.y = Math.random() * Math.PI;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 3.4, 7), lam(0x7a5230));
    trunk.position.y = 1.7;
    trunk.castShadow = true;
    g.add(trunk);

    const greens = [0x3f8f22, 0x4c9a2a, 0x357a1e];
    for (let i = 0; i < 3; i++){
      const r = 1.9 - i * 0.42;
      const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), lam(greens[i % 3]));
      f.position.set((Math.random()-0.5)*0.7, 3.4 + i * 1.15, (Math.random()-0.5)*0.7);
      f.castShadow = true;
      g.add(f);
    }
    this.scene.add(g);
  }

  _rock(x, z){
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.45, 0), lam(0x9a9a92));
    r.position.set(x, 0.15, z);
    r.rotation.set(Math.random(), Math.random(), Math.random());
    r.castShadow = r.receiveShadow = true;
    this.scene.add(r);
  }

  _flowers(x, z){
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const colors = [0xff6b8a, 0xffd93d, 0xffffff, 0xb46bff, 0xff9f45];
    for (let i = 0; i < 3 + Math.floor(Math.random()*3); i++){
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4), lam(0x4c9a2a));
      const ox = (Math.random()-0.5)*0.8, oz = (Math.random()-0.5)*0.8;
      stem.position.set(ox, 0.25, oz);
      g.add(stem);
      const head = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.14, 0),
        lam(colors[Math.floor(Math.random()*colors.length)])
      );
      head.position.set(ox, 0.55, oz);
      head.castShadow = true;
      g.add(head);
    }
    this.scene.add(g);
  }

  _buildAmbience(){
    // Drifting clouds.
    this.clouds = new THREE.Group();
    for (let i = 0; i < 14; i++){
      const c = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < n; j++){
        const puff = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.6 + Math.random() * 1.6, 0),
          new THREE.MeshLambertMaterial({ color:0xffffff, flatShading:true, transparent:true, opacity:0.92 })
        );
        puff.position.set(j * 2 - n, Math.random() * 0.7, Math.random() * 1.4);
        puff.scale.y = 0.62;
        c.add(puff);
      }
      c.position.set((Math.random()-0.5)*130, 26 + Math.random() * 12, (Math.random()-0.5)*130);
      c.userData.speed = 0.35 + Math.random() * 0.5;
      this.clouds.add(c);
    }
    this.scene.add(this.clouds);

    // Butterflies looping over the garden — two hinged wings so they read in profile.
    this.butterflies = [];
    for (let i = 0; i < 7; i++){
      const b = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({
        color:[0xffd93d, 0xff8ad0, 0x8ecae6][i % 3],
        side:THREE.DoubleSide, transparent:true, opacity:0.95,
      });
      const wings = [];
      for (const side of [-1, 1]){
        const wing = new THREE.Mesh(new THREE.CircleGeometry(0.12, 6), mat);
        wing.position.x = side * 0.055;
        wing.rotation.y = Math.PI / 2;
        b.add(wing);
        wings.push(wing);
      }
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.09, 3, 5), lam(0x2b2016));
      body.rotation.z = Math.PI / 2;
      b.add(body);

      b.userData = {
        wings,
        r: 3.5 + Math.random() * 6,
        h: 1.2 + Math.random() * 2.2,
        speed: 0.35 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
      };
      this.scene.add(b);
      this.butterflies.push(b);
    }
  }

  // ---------------- purchasable decor ----------------
  setDecor(key, on){
    if (!on){
      const node = this.decorNodes[key];
      if (node){ this.scene.remove(node); this.decorNodes[key] = null; }
      return;
    }
    if (this.decorNodes[key]) return;

    // Each decoration has its own reserved spot just outside the bed, so they
    // never land on top of each other however many you own.
    const V = (x, z) => new THREE.Vector3(x, 0, z);
    const build = {
      pond:      () => this._pond(V(-10.2, 3.2)),
      scare:     () => this._scarecrow(V(6.2, -9.6)),
      lantern:   () => this._lanterns(),
      tractor:   () => this._tractor(V(9.6, 3.4)),
      toadstool: () => this._toadstools(V(-6.0, -10.2)),
      bench:     () => this._bench(V(-2.2, 10.0)),
      birdbath:  () => this._birdBath(V(2.6, -10.2)),
      sundial:   () => this._sundial(V(-9.8, -3.0)),
      parasol:   () => this._parasol(V(3.4, 10.2)),
      statue:    () => this._statue(V(-9.9, 9.9)),
      marquee:   () => this._marquee(V(9.9, 9.9)),
      fountain:  () => this._fountain(V(0, -10.6)),
    };
    const node = build[key]?.() || null;
    if (node){ this.scene.add(node); this.decorNodes[key] = node; }
  }

  _pond(pos){
    const g = new THREE.Group();
    g.position.copy(pos);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.24, 20), lam(0x9a9a92));
    rim.position.y = 0.1;
    rim.receiveShadow = true;
    g.add(rim);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(2.25, 24),
      new THREE.MeshLambertMaterial({ color:0x3fa9d6, transparent:true, opacity:0.86 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.24;
    g.add(water);
    this.pondWater = water;
    for (let i = 0; i < 4; i++){
      const lily = new THREE.Mesh(new THREE.CircleGeometry(0.3, 8), lam(0x3f8f22));
      lily.rotation.x = -Math.PI / 2;
      const a = Math.random() * 6.28, r = Math.random() * 1.5;
      lily.position.set(Math.cos(a)*r, 0.26, Math.sin(a)*r);
      g.add(lily);
    }
    return g;
  }

  _scarecrow(pos){
    const g = new THREE.Group();
    g.position.copy(pos);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), lam(0x8b5e34));
    pole.position.y = 1.2; pole.castShadow = true; g.add(pole);
    const arms = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.12), lam(0x8b5e34));
    arms.position.y = 1.7; arms.castShadow = true; g.add(arms);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.4), lam(0xe0575b));
    body.position.y = 1.5; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), lam(0xe8c98a));
    head.position.y = 2.25; head.castShadow = true; g.add(head);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.5, 10), lam(0xd9a441));
    hat.position.y = 2.6; hat.castShadow = true; g.add(hat);
    return g;
  }

  _lanterns(){
    const g = new THREE.Group();
    this.lanternLights = [];
    const posts = [[-5.6,-5.6],[5.6,-5.6],[-5.6,5.6],[5.6,5.6]];
    for (const [x, z] of posts){
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.4, 6), lam(0x5f3f22));
      pole.position.set(x, 1.2, z); pole.castShadow = true; g.add(pole);
      const lamp = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.28, 0),
        new THREE.MeshLambertMaterial({ color:0xffd98a, emissive:0xffae2b, emissiveIntensity:0.9, flatShading:true })
      );
      lamp.position.set(x, 2.5, z); g.add(lamp);
      const l = new THREE.PointLight(0xffb347, 1.5, 9, 2);
      l.position.set(x, 2.5, z); g.add(l);
      this.lanternLights.push(lamp);
      (this.lanternGlows ||= []).push(l);
    }
    return g;
  }

  _toadstools(pos){
    const g = new THREE.Group(); g.position.copy(pos);
    for (let i = 0; i < 9; i++){
      const a = (i / 9) * Math.PI * 2;
      const r = 1.5 + (i % 2) * 0.28;
      const h = 0.22 + (i % 3) * 0.1;
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, h * 2, 6), lam(0xf4ead6));
      stalk.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
      stalk.castShadow = true; g.add(stalk);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 9, 6, 0, Math.PI*2, 0, Math.PI/2), lam(0xd23b3b));
      cap.position.set(Math.cos(a) * r, h * 2, Math.sin(a) * r);
      cap.castShadow = true; g.add(cap);
    }
    return g;
  }

  _bench(pos){
    const g = new THREE.Group(); g.position.copy(pos);
    const wood = lam(0x9a6a3c);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.7), wood);
    seat.position.y = 0.55; seat.castShadow = true; g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.12), wood);
    back.position.set(0, 0.92, -0.3); back.castShadow = true; g.add(back);
    for (const x of [-1.0, 1.0]){
      for (const z of [-0.26, 0.26]){
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), lam(0x6b4a2f));
        leg.position.set(x, 0.27, z); leg.castShadow = true; g.add(leg);
      }
    }
    return g;
  }

  _birdBath(pos){
    const g = new THREE.Group(); g.position.copy(pos);
    const stone = lam(0xb8b3a8);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.2, 10), stone);
    base.position.y = 0.1; base.receiveShadow = true; g.add(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 1.0, 8), stone);
    post.position.y = 0.7; post.castShadow = true; g.add(post);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.42, 0.26, 12), stone);
    bowl.position.y = 1.32; bowl.castShadow = true; g.add(bowl);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.62, 12),
      new THREE.MeshLambertMaterial({ color:0x5fb6de, transparent:true, opacity:0.85 }));
    water.rotation.x = -Math.PI / 2; water.position.y = 1.44; g.add(water);
    return g;
  }

  _sundial(pos){
    const g = new THREE.Group(); g.position.copy(pos);
    const stone = lam(0xa8a49a);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 1.0, 8), stone);
    plinth.position.y = 0.5; plinth.castShadow = true; g.add(plinth);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 14), lam(0xd9d3c4));
    face.position.y = 1.05; face.castShadow = true; g.add(face);
    const gnomon = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.55), lam(0xc98a12));
    gnomon.position.y = 1.32; gnomon.rotation.x = -0.5; gnomon.castShadow = true; g.add(gnomon);
    return g;
  }

  _parasol(pos){
    const g = new THREE.Group(); g.position.copy(pos);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 12), lam(0xd9c39a));
    top.position.y = 0.85; top.castShadow = true; g.add(top);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 8), lam(0x8b5e34));
    stem.position.y = 1.3; stem.castShadow = true; g.add(stem);
    for (let i = 0; i < 8; i++){
      const wedge = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.6, 4), lam(i % 2 ? 0xfffaf0 : 0xe0575b));
      const a = (i / 8) * Math.PI * 2;
      wedge.position.set(Math.cos(a) * 0.72, 2.4, Math.sin(a) * 0.72);
      wedge.rotation.set(Math.sin(a) * 0.5, -a, -Math.cos(a) * 0.5);
      wedge.castShadow = true; g.add(wedge);
    }
    for (const [x, z] of [[-1.3, 0.4], [1.3, -0.4]]){
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.55), lam(0x9a6a3c));
      chair.position.set(x, 0.5, z); chair.castShadow = true; g.add(chair);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), lam(0x6b4a2f));
      leg.position.set(x, 0.25, z); g.add(leg);
    }
    return g;
  }

  _statue(pos){
    const g = new THREE.Group(); g.position.copy(pos);
    const stone = lam(0xc4c0b4);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 1.5), lam(0x9a968c));
    plinth.position.y = 0.5; plinth.castShadow = plinth.receiveShadow = true; g.add(plinth);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.5, 1.7, 8), stone);
    body.position.y = 1.85; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), stone);
    head.position.y = 2.9; head.castShadow = true; g.add(head);
    for (const side of [-1, 1]){
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.7, 4, 6), stone);
      arm.position.set(side * 0.5, 2.1, 0);
      arm.rotation.z = side * -0.55;
      arm.castShadow = true; g.add(arm);
    }
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.08, 12), stone);
    hat.position.y = 3.2; g.add(hat);
    return g;
  }

  _marquee(pos){
    const g = new THREE.Group(); g.position.copy(pos);
    for (const [x, z] of [[-1.7,-1.7],[1.7,-1.7],[-1.7,1.7],[1.7,1.7]]){
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6), lam(0xd9c39a));
      pole.position.set(x, 1.3, z); pole.castShadow = true; g.add(pole);
    }
    for (let i = 0; i < 10; i++){
      const a = (i / 10) * Math.PI * 2;
      const panel = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.5, 4), lam(i % 2 ? 0xfffaf0 : 0x4c9a2a));
      panel.position.set(Math.cos(a) * 1.35, 3.1, Math.sin(a) * 1.35);
      panel.rotation.set(Math.sin(a) * 0.6, -a, -Math.cos(a) * 0.6);
      panel.castShadow = true; g.add(panel);
    }
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 8), lam(0xf6c453));
    finial.position.y = 4.1; finial.castShadow = true; g.add(finial);
    return g;
  }

  _fountain(pos){
    const g = new THREE.Group(); g.position.copy(pos);
    const stone = lam(0xcfcabc);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.6, 16), stone);
    basin.position.y = 0.3; basin.castShadow = basin.receiveShadow = true; g.add(basin);
    const water = new THREE.Mesh(new THREE.CircleGeometry(2.35, 20),
      new THREE.MeshLambertMaterial({ color:0x4fb0dd, transparent:true, opacity:0.88 }));
    water.rotation.x = -Math.PI / 2; water.position.y = 0.62; g.add(water);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 1.3, 10), stone);
    stem.position.y = 1.2; stem.castShadow = true; g.add(stem);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.6, 0.28, 14), stone);
    dish.position.y = 1.95; dish.castShadow = true; g.add(dish);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.9, 8), stone);
    spout.position.y = 2.5; g.add(spout);
    this.fountainJets = [];
    for (let i = 0; i < 8; i++){
      const a = (i / 8) * Math.PI * 2;
      const jet = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.7, 4, 6),
        new THREE.MeshLambertMaterial({ color:0x9fe0f5, transparent:true, opacity:0.8 }));
      jet.position.set(Math.cos(a) * 0.7, 2.6, Math.sin(a) * 0.7);
      jet.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7);
      g.add(jet);
      this.fountainJets.push(jet);
    }
    return g;
  }

  _tractor(pos){
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = -0.5;
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 1.1), lam(0xe0575b));
    body.position.y = 0.85; body.castShadow = true; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 1.0), lam(0x2b2016));
    cab.position.set(-0.4, 1.6, 0); cab.castShadow = true; g.add(cab);
    const wheel = (x, r) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 12), lam(0x27221c));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, r, 0.62); w.castShadow = true; g.add(w);
      const w2 = w.clone(); w2.position.z = -0.62; g.add(w2);
    };
    wheel(0.66, 0.42); wheel(-0.62, 0.72);
    return g;
  }

  // ---------------- animals ----------------
  syncAnimals(counts){
    // Rebuild only when the total changes — animals are pure decoration + a growth buff.
    const want = Object.entries(counts).flatMap(([k, n]) => Array(n).fill(k));
    if (want.length === this.animalNodes.length) return;

    for (const a of this.animalNodes) this.scene.remove(a);
    this.animalNodes = [];

    want.forEach((kind, i) => {
      const node = this._animal(kind);
      const a = (i / Math.max(1, want.length)) * Math.PI * 2;
      const r = 7.5 + (i % 3) * 1.4;
      node.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      node.userData = { angle:a, radius:r, speed:0.18 + Math.random() * 0.22, bob:Math.random() * 6 };
      this.scene.add(node);
      this.animalNodes.push(node);
    });
  }

  _animal(kind){
    const g = new THREE.Group();
    const spec = {
      rabbit:  { body:0xe8e0d4, accent:0xd8a0a8, s:0.34 },
      chicken: { body:0xfffaf0, accent:0xe0575b, s:0.45 },
      duck:    { body:0xf7f3e6, accent:0xf5a623, s:0.42 },
      beehive: { body:0xe0a640, accent:0x6b4a2f, s:0.5  },
      goat:    { body:0xd9d2c4, accent:0x6b5b48, s:0.62 },
      cat:     { body:0xd9873f, accent:0x3b2a1c, s:0.42 },
      donkey:  { body:0x9c8b7a, accent:0x5f4f42, s:0.85 },
      sheepdog:{ body:0x6b5340, accent:0xfffaf0, s:0.6  },
      sheep:   { body:0xf4f0e6, accent:0x3b3128, s:0.7  },
      cow:     { body:0xfffaf0, accent:0x2b2016, s:1.0  },
      llama:   { body:0xd8c39a, accent:0x7a5a3a, s:0.9  },
      owl:     { body:0xb08a5a, accent:0xffd166, s:0.44 },
      peacock: { body:0x2f8fbf, accent:0x2fbf8f, s:0.72 },
      unicorn: { body:0xfff2fb, accent:0xff9ec4, s:0.95 },
      dragon:  { body:0x7a2f3f, accent:0xff6a2b, s:1.25 },
    }[kind] || { body:0xffffff, accent:0x333333, s:0.6 };

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2*spec.s, 0.8*spec.s, 0.75*spec.s), lam(spec.body));
    body.position.y = 0.75 * spec.s; body.castShadow = true; g.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5*spec.s, 0.5*spec.s, 0.45*spec.s), lam(spec.body));
    head.position.set(0.72*spec.s, 1.05*spec.s, 0); head.castShadow = true; g.add(head);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12*spec.s, 0.26*spec.s, 6), lam(spec.accent));
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(1.02*spec.s, 1.03*spec.s, 0); g.add(beak);

    for (const [dx, dz] of [[0.35,0.26],[0.35,-0.26],[-0.35,0.26],[-0.35,-0.26]]){
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13*spec.s, 0.45*spec.s, 0.13*spec.s), lam(spec.accent));
      leg.position.set(dx*spec.s, 0.22*spec.s, dz*spec.s); leg.castShadow = true; g.add(leg);
    }
    return g;
  }

  // ---------------- loop ----------------
  // ---------------- weather ----------------
  /**
   * A column of falling streaks that stays centred on the camera, so it always
   * rains where you're standing without simulating the whole meadow.
   */
  _buildRain(){
    const N = 1100;
    const pos = new Float32Array(N * 6);      // each streak is two endpoints
    this.rainSpeed = new Float32Array(N);
    for (let i = 0; i < N; i++){
      const x = (Math.random() - 0.5) * 62, y = Math.random() * 30, z = (Math.random() - 0.5) * 62;
      const len = 0.45 + Math.random() * 0.5;
      pos[i*6]   = x; pos[i*6+1] = y;       pos[i*6+2] = z;
      pos[i*6+3] = x; pos[i*6+4] = y + len; pos[i*6+5] = z;
      this.rainSpeed[i] = 26 + Math.random() * 16;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color:0xbdd9ee, transparent:true, opacity:0, depthWrite:false,
    }));
    this.rain.frustumCulled = false;   // the streaks are recycled around the camera
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  _updateRain(dt, amount){
    this.rain.visible = amount > 0.01;
    if (!this.rain.visible) return;
    this.rain.material.opacity = 0.55 * amount;

    const a = this.rain.geometry.attributes.position.array;
    const cam = this.camera.position;
    const top = cam.y + 22, bottom = cam.y - 6;
    for (let i = 0; i < this.rainSpeed.length; i++){
      const k = i * 6;
      const fall = this.rainSpeed[i] * dt;
      a[k+1] -= fall; a[k+4] -= fall;
      if (a[k+1] < bottom){                       // recycle to the top, near the camera
        const len = a[k+4] - a[k+1];
        const x = cam.x + (Math.random() - 0.5) * 62;
        const z = cam.z + (Math.random() - 0.5) * 62;
        a[k] = x; a[k+2] = z; a[k+3] = x; a[k+5] = z;
        a[k+1] = top; a[k+4] = top + len;
      }
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Drive sky, fog and lights from the clock. Blends night -> day, warms the
   * edges of the day, then washes the whole thing grey while it rains.
   */
  _applyWeather(now){
    const s = skyAt(now);
    const w = (this._wx ||= { c:new THREE.Color(), t:new THREE.Color() });

    const col = (key) => {
      w.c.setHex(PALETTE.night[key]).lerp(w.t.setHex(PALETTE.day[key]), s.day);
      w.c.lerp(w.t.setHex(PALETTE.dusk[key]), s.dusk);
      w.c.lerp(w.t.setHex(PALETTE.rain[key]), s.rain * 0.85);
      return w.c;
    };
    const num = (key) => {
      let v = PALETTE.night[key] + (PALETTE.day[key] - PALETTE.night[key]) * s.day;
      v += (PALETTE.dusk[key] - v) * s.dusk;
      v += (PALETTE.rain[key] - v) * s.rain * 0.85;
      return v;
    };

    this.skyUniforms.top.value.copy(col('top'));
    this.skyUniforms.mid.value.copy(col('mid'));
    this.skyUniforms.bottom.value.copy(col('bottom'));
    this.scene.fog.color.copy(col('fog'));
    this.sun.color.copy(col('sun'));
    this.hemi.color.copy(col('hemiSky'));
    this.hemi.groundColor.copy(col('hemiGround'));
    this.sun.intensity = num('sunI');
    this.hemi.intensity = num('hemiI');

    // The light swings east to west and comes from the far side after dark, so
    // shadows keep moving rather than freezing the moment the sun dims.
    const ang = s.phase * Math.PI * 2;
    this.sun.position.set(Math.cos(ang) * 24, 9 + Math.abs(s.elev) * 19, 11 + Math.sin(ang) * 8);

    // Lanterns earn their keep after dark. The flicker stays in update().
    this.lanternNight = 0.4 + s.night * 1.6;
    if (this.lanternGlows) for (const l of this.lanternGlows) l.intensity = 0.2 + s.night * 3.4;

    return s;
  }

  update(dt, elapsed){
    const s = this._applyWeather(Date.now());
    this._updateRain(dt, s.rain);

    const t = elapsed * ambient;
    for (const c of this.clouds.children){
      c.position.x += c.userData.speed * dt * ambient;
      if (c.position.x > 80) c.position.x = -80;
    }

    this.butterflies.forEach((b, i) => {
      const u = b.userData;
      const a = t * u.speed + u.phase;
      b.position.set(Math.cos(a) * u.r, u.h + Math.sin(t * 2.4 + i) * 0.34 * ambient, Math.sin(a) * u.r);
      b.rotation.y = -a;
      const flap = 0.5 + Math.sin(t * 16 + i) * 0.5; // 0..1
      u.wings[0].rotation.z =  flap * 1.15;
      u.wings[1].rotation.z = -flap * 1.15;
    });

    if (this.magicFoliage){
      // A shake decays over ~1.2s, brightening the tree and rocking the canopy.
      if (this.magicShake > 0) this.magicShake = Math.max(0, this.magicShake - dt / 1.2);
      const shake = this.magicShake;

      const pulse = 0.45 + Math.sin(elapsed * 1.6) * 0.18 + shake * 0.9;
      for (const f of this.magicFoliage) f.material.emissiveIntensity = pulse;
      this.magicGlow.intensity = 2.6 + Math.sin(elapsed * 1.6) * 0.9 + shake * 6;

      this.magicTreeGroup.rotation.z = Math.sin(elapsed * 26) * 0.05 * shake;
      this.motes.rotation.y = t * (0.16 + shake * 3);
      this.motes.position.y = Math.sin(elapsed * 0.7) * 0.4 - shake * 1.4;
      this.motes.material.opacity = 0.9 + shake * 0.1;
      this.motes.material.size = 0.22 + shake * 0.22;
    }

    if (this.fountainJets){
      this.fountainJets.forEach((j, i) => {
        j.scale.y = 1 + Math.sin(t * 3.4 + i * 0.8) * 0.22 * ambient;
      });
    }

    if (this.pondWater){
      this.pondWater.material.color.setHSL(0.55, 0.62, 0.5 + Math.sin(elapsed * 1.1) * 0.04);
    }
    if (this.lanternLights){
      const night = this.lanternNight ?? 1;
      for (let i = 0; i < this.lanternLights.length; i++){
        this.lanternLights[i].material.emissiveIntensity = (0.75 + Math.sin(elapsed * 3 + i) * 0.2) * night;
      }
    }

    if (this.superFoliage){
      const pulse = 0.55 + Math.sin(t * 1.3) * 0.22;
      for (const f of this.superFoliage) f.material.emissiveIntensity = pulse;
      this.superGlow.intensity = 4.6 + Math.sin(t * 1.3) * 1.4;
      this.superMotes.rotation.y = t * 0.1;
      this.superMotes.position.y = Math.sin(t * 0.5) * 0.6 * ambient;
    }

    if (this.realmRings){
      this.realmRings.forEach((r, i) => {
        r.rotation.x = t * (0.5 + i * 0.25) * ambient;
        r.rotation.y = t * (0.35 - i * 0.1) * ambient;
      });
      this.realmGate.material.opacity = 0.34 + Math.sin(t * 2.2) * 0.12;
      this.realmGlow.intensity = 3.6 + Math.sin(t * 2.2) * 1.0;
    }

    if (this.mansionWindows){
      // Windows breathe a little, as if someone's moving about inside.
      this.mansionWindows.forEach((w, i) => {
        w.material.emissiveIntensity = 0.75 + Math.sin(t * 1.1 + i * 1.7) * 0.22;
      });
      this.mansionGlow.intensity = 2.6 + Math.sin(t * 1.1) * 0.6;
    }

    if (this.voidRings){
      this.voidRings.forEach((r, i) => {
        r.rotation.x += dt * (0.20 + i * 0.09) * ambient;
        r.rotation.y += dt * (0.15 - i * 0.04) * ambient;
      });
      this.voidMotes.rotation.y = -t * 0.22;
      this.voidCore.scale.setScalar(1 + Math.sin(t * 0.9) * 0.035);
      this.voidGlow.intensity = 3.0 + Math.sin(t * 1.7) * 0.9;
    }

    if (this.caveFire){
      // Firelight flicker: two out-of-phase sines so it never looks like a loop.
      const flick = 0.55 + Math.sin(t * 7.3) * 0.10 + Math.sin(t * 3.1) * 0.07;
      this.caveFire.material.opacity = flick;
      this.caveGlow.intensity = 3.4 + flick * 2.2;
      const blink = Math.sin(t * 0.7) > 0.985 ? 0.1 : 1;   // an occasional slow blink
      for (const e of this.caveEyes) e.scale.y = blink;
    }

    if (this.ownTreeGroup){
      const lift = this.ownStock > 0 ? 1 : 0.25;
      this.ownGifts.forEach((gift, i) => {
        if (!gift.visible) return;
        gift.position.y = 3.0 + (i % 2) * 0.5 + Math.sin(t * 2 + i) * 0.12 * ambient;
        gift.rotation.y = t * 0.8 + i;
      });
      this.ownGlow.intensity = (this.ownStock > 0 ? 3.0 : 1.1) + Math.sin(t * 1.8) * 0.35 * lift;
    }

    for (const a of this.animalNodes){
      const u = a.userData;
      u.angle += u.speed * dt * 0.25 * ambient;
      a.position.x = Math.cos(u.angle) * u.radius;
      a.position.z = Math.sin(u.angle) * u.radius;
      a.position.y = Math.abs(Math.sin(t * 5 + u.bob)) * 0.09 * ambient;
      a.rotation.y = -u.angle + Math.PI / 2;
    }
  }

  resize(){
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  render(){ this.renderer.render(this.scene, this.camera); }
}

// ---------- helpers ----------
export function makeLabelSprite(text, fg = '#2b2016', bg = '#fffaf0'){
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const x = c.getContext('2d');

  x.fillStyle = bg;
  roundRect(x, 6, 6, 500, 116, 26);
  x.fill();
  x.lineWidth = 9;
  x.strokeStyle = '#8b5e34';
  x.stroke();

  x.fillStyle = fg;
  x.font = 'bold 54px "Trebuchet MS", system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 256, 66);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true, depthWrite:false }));
}

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}
