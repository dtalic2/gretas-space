// ---------- The world: renderer, sky, light, road and endless scenery ----------
// The road runs along -Z. Scenery is generated in 24 m segments ahead of the player
// and dropped behind the camera, seeded by segment index so it's stable on revisit.

import * as THREE from 'three';

export const SEG = 24;            // scenery segment length
const AHEAD = 11;                 // segments generated ahead of the player
const BEHIND = 2;
export const ROAD_HALF = 4.1;     // road half-width
const WALK = 3.2;                 // sidewalk width

const tmpC = new THREE.Color();
const smooth = x => x * x * (3 - 2 * x);

export class World {
  constructor(canvas, quality = 'high'){
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.fogColor = new THREE.Color(0xbfe3ff);
    this.scene.fog = new THREE.Fog(this.fogColor, 60, 230);
    this.scene.background = this.fogColor;

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 600);
    this.scene.add(this.camera);              // so camera-attached effects (speed lines) render

    this.segments = new Map();
    this.buildMaterials();
    this.buildSky();
    this.buildLights();
    this.buildGround();
    this.buildBalloons();
    this.buildSpeedLines();
    this.setDaylight(0);
    this.setQuality(quality);
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  setQuality(q){
    this.quality = q;
    const high = q === 'high';
    this.renderer.shadowMap.enabled = high;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, high ? 2 : 1));
    this.sun.castShadow = high;
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }

  resize(){
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Portrait phones need a wider view to see all three lanes.
    this.baseFov = w / h < 0.8 ? 78 : 62;
    this.camera.updateProjectionMatrix();
  }

  // ---------- materials & textures ----------
  buildMaterials(){
    const M = this.mats = {};
    const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness:0.85, ...o });

    M.road = std(0xffffff, { map: roadTexture(), roughness:0.92 });
    M.walk = std(0xffffff, { map: walkTexture(), roughness:0.95 });
    M.curb = std(0xd9d4cc);
    M.grass = std(0x6cc24a, { map: grassTexture(), roughness:1 });
    M.trunk = std(0x7a5230);
    M.leaf = [std(0x4caf50, { flatShading:true }), std(0x66bb44, { flatShading:true }),
              std(0x2e9e5b, { flatShading:true }), std(0x8bc34a, { flatShading:true })];
    M.blossom = std(0xffb7d5, { flatShading:true });
    M.metal = std(0x566070, { roughness:0.4, metalness:0.6 });
    M.darkMetal = std(0x2c323a, { roughness:0.5, metalness:0.5 });
    M.bulb = new THREE.MeshStandardMaterial({ color:0xfff4c2, emissive:0xffe28a, emissiveIntensity:1.2 });
    M.white = std(0xffffff);
    M.red = std(0xe63946);
    M.yellow = std(0xffc933);
    M.wood = std(0xa86b3c);
    M.hedge = std(0x3f9b3f, { flatShading:true });
    M.flowers = [std(0xff5d8f), std(0xffd23f), std(0xffffff), std(0xa06cd5)];
    M.water = std(0x4fc3f7, { roughness:0.15, metalness:0.2 });
    M.roofs = [std(0xe05a4f), std(0x3a86ff), std(0x2a9d8f), std(0x9b5de5), std(0xff7b00)];
    M.house = [std(0xfff1d6), std(0xffd9c2), std(0xd6ecff), std(0xe2f7d6), std(0xffe0ef), std(0xe9e0ff)];
    M.glass = std(0x9fd3ff, { roughness:0.1, metalness:0.3, emissive:0x223344, emissiveIntensity:0.2 });
    M.awning = [0xe63946, 0x2a9d8f, 0xf4a261, 0x3a86ff, 0x8338ec].map(c => std(0xffffff, { map: stripeTexture(c) }));

    // Building facades: a handful of variants with lit windows.
    // candy-coloured shopfronts: peach, mint, butter, lilac, sky, coral, pistachio, rose
    const facades = [
      [0xffb38a, 0x3b4a6a], [0x9ee6c9, 0x2d4a5a], [0xffe08a, 0x40506a], [0xc9b6ff, 0x33305a],
      [0x9fd4ff, 0x2a3a5a], [0xff8f8f, 0x3a3042], [0xc7ec8e, 0x3a4a3a], [0xffc2dd, 0x4a3a5a],
    ];
    M.facades = facades.map(([wall, win]) => {
      const { map, emissive } = facadeTexture(wall, win);
      return std(0xffffff, { map, emissiveMap:emissive, emissive:0xffe9b0, emissiveIntensity:0.55, roughness:0.8 });
    });
    M.roofTop = std(0xf3efe6);
    M.flags = [0xff4fa3, 0x3a86ff, 0xffc933, 0x06d6a0, 0xff7b00, 0x9b5de5].map(c =>
      new THREE.MeshStandardMaterial({ color:c, roughness:0.7, side:THREE.DoubleSide }));
    M.rope = std(0x5a4a3a);
    M.zebra = std(0xf7f7f2, { roughness:0.8, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 });
    M.planter = std(0xc8744a);
    M.sign = [0xff006e, 0x3a86ff, 0xffbe0b, 0x06d6a0].map(c =>
      new THREE.MeshStandardMaterial({ color:c, emissive:c, emissiveIntensity:0.8 }));

    const G = this.geos = {};
    G.box = new THREE.BoxGeometry(1, 1, 1);
    G.cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
    G.cylLo = new THREE.CylinderGeometry(1, 1, 1, 8);
    G.ico = new THREE.IcosahedronGeometry(1, 0);
    G.ico1 = new THREE.IcosahedronGeometry(1, 1);
    G.sphere = new THREE.SphereGeometry(1, 12, 10);
    G.cone = new THREE.ConeGeometry(1, 1, 4);
    G.cone8 = new THREE.ConeGeometry(1, 1, 8);
    const roof = new THREE.Shape();
    roof.moveTo(-0.5, 0); roof.lineTo(0.5, 0); roof.lineTo(0, 0.5); roof.closePath();
    G.prism = new THREE.ExtrudeGeometry(roof, { depth:1, bevelEnabled:false });
    G.prism.translate(0, 0, -0.5);
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0, -1, 0], 3));
    tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
    G.flag = tri;
  }

  buildSky(){
    const geo = new THREE.SphereGeometry(500, 32, 16);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite:false, fog:false,
      uniforms: {
        top: { value: new THREE.Color(0x3a8ee6) },
        mid: { value: new THREE.Color(0x8fd0ff) },
        bottom: { value: new THREE.Color(0xd8f1ff) },
        sunDir: { value: new THREE.Vector3(-0.4, 0.5, -0.75).normalize() },
        sunCol: { value: new THREE.Color(1.0, 0.9, 0.6) },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunCol;
        varying vec3 vDir;
        void main(){
          float h = vDir.y;
          vec3 c = h > 0.0 ? mix(mid, top, pow(clamp(h*1.6,0.0,1.0), 0.8)) : mix(mid, bottom, clamp(-h*6.0,0.0,1.0));
          c = mix(bottom, c, smoothstep(-0.05, 0.12, h));
          float s = max(dot(normalize(vDir), sunDir), 0.0);
          c += sunCol * (smoothstep(0.9992, 0.9997, s) * 2.2 + pow(s, 14.0) * 0.35 + pow(s, 3.0) * 0.08);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(geo, this.skyMat);
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    // Image-based light from the sky, so paint and metal pick up soft reflections.
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(geo, this.skyMat));
    const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 16), new THREE.MeshBasicMaterial({ color:0xa89f90 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -10;
    envScene.add(ground);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();

    // clouds: puffy clusters that drift and recycle
    this.clouds = [];
    const cloudMat = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:1, emissive:0xffffff,
      emissiveIntensity:0.25, flatShading:true, fog:false });
    for (let i = 0; i < 16; i++){
      const c = new THREE.Group();
      const n = 4 + Math.floor(Math.random() * 4);
      for (let j = 0; j < n; j++){
        const m = new THREE.Mesh(this.geos.ico1, cloudMat);
        const s = 4 + Math.random() * 5;
        m.scale.set(s * 1.3, s * 0.8, s);
        m.position.set((j - n / 2) * 5 + Math.random() * 3, Math.random() * 2, Math.random() * 4);
        c.add(m);
      }
      const merged = mergeGroup(c);
      merged.position.set((Math.random() - 0.5) * 400, 55 + Math.random() * 40, -Math.random() * 450);
      this.scene.add(merged);
      this.clouds.push(merged);
    }

    // far skyline hills and towers, locked to the player so they sit on the horizon
    this.horizon = new THREE.Group();
    const hillMat = new THREE.MeshStandardMaterial({ color:0x86c48a, roughness:1, flatShading:true });
    const towerMat = new THREE.MeshStandardMaterial({ color:0xa9c3dd, roughness:1 });
    for (let i = 0; i < 26; i++){
      const side = i % 2 ? 1 : -1;
      const h = new THREE.Mesh(this.geos.ico1, hillMat);
      const s = 30 + Math.random() * 40;
      h.scale.set(s, s * 0.45, s);
      h.position.set(side * (140 + Math.random() * 120), -4, -60 - Math.random() * 380);
      this.horizon.add(h);
    }
    for (let i = 0; i < 30; i++){
      const t = new THREE.Mesh(this.geos.box, towerMat);
      const w = 8 + Math.random() * 10, ht = 25 + Math.random() * 60;
      t.scale.set(w, ht, w);
      t.position.set((Math.random() - 0.5) * 280, ht / 2 - 2, -330 - Math.random() * 60);
      this.horizon.add(t);
    }
    this.horizon = mergeGroup(this.horizon);
    this.horizon.children.forEach(m => { m.castShadow = false; m.receiveShadow = false; });
    this.scene.add(this.horizon);
  }

  buildLights(){
    this.hemi = new THREE.HemisphereLight(0xcfeaff, 0x8a7a5a, 0.7);
    this.scene.add(this.hemi);
    // rim light from up the road: puts a bright edge on the dog as it runs towards it
    this.rim = new THREE.DirectionalLight(0xbfe0ff, 1.1);
    this.scene.add(this.rim, this.rim.target);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
    this.sun.position.set(-12, 30, -8);
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -22; sc.right = 22; sc.top = 40; sc.bottom = -30; sc.near = 1; sc.far = 90;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
  }

  buildGround(){
    const len = 320;
    // road
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, len), this.mats.road);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    this.mats.road.map.repeat.set(1, len / 8);
    this.road = road;
    // sidewalks + curbs
    this.walks = [];
    for (const s of [-1, 1]){
      const w = new THREE.Mesh(new THREE.BoxGeometry(WALK, 0.2, len), this.mats.walk);
      w.position.set(s * (ROAD_HALF + WALK / 2), 0.1, 0);
      w.receiveShadow = true;
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.24, len), this.mats.curb);
      curb.position.set(s * (ROAD_HALF + 0.12), 0.12, 0);
      curb.receiveShadow = true;
      this.walks.push(w, curb);
    }
    this.mats.walk.map.repeat.set(1, len / 4);
    // grass
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(700, len + 200), this.mats.grass);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.02;
    grass.receiveShadow = true;
    this.mats.grass.map.repeat.set(700 / 6, (len + 200) / 6);
    this.grass = grass;
    this.groundGroup = new THREE.Group();
    this.groundGroup.add(road, grass, ...this.walks);
    this.scene.add(this.groundGroup);
  }

  // ---------- per-frame ----------
  update(playerZ, dt, camZ = playerZ){
    // ground follows the player in whole-tile steps so textures never swim
    const snap = Math.floor(playerZ / 24) * 24;
    this.groundGroup.position.z = snap - 120;
    this.horizon.position.z = playerZ;
    this.sky.position.set(0, 0, camZ);

    // day → golden hour → pink dusk → day, over about 3.6 km of running
    this.setDaylight(((-playerZ / 3600) % 1 + 1) % 1);

    // shadow camera rides with the player; the sun's height follows the time of day
    const sd = this.sunDir;
    this.sun.position.set(sd.x * 40, sd.y * 40, playerZ - 4 + sd.z * 40);
    this.sun.target.position.set(0, 0, playerZ - 12);
    this.rim.position.set(3, 6, playerZ - 30);
    this.rim.target.position.set(0, 1, playerZ);

    for (const b of this.balloons){
      b.position.y += Math.sin(performance.now() / 1800 + b.userData.ph) * dt * 0.6;
      b.position.x += dt * b.userData.drift;
      b.rotation.y += dt * 0.1;
      if (b.position.z > playerZ + 40) b.position.z -= 520;
      else if (b.position.z < playerZ - 480) b.position.z += 520 * Math.ceil((playerZ - 480 - b.position.z) / 520);
      if (Math.abs(b.position.x) > 160) b.userData.drift *= -1;
    }

    for (const c of this.clouds){
      c.position.x += dt * 1.5;
      if (c.position.z > playerZ + 60) c.position.z -= 500;
      else if (c.position.z < playerZ - 460) c.position.z += 500 * Math.ceil((playerZ - 460 - c.position.z) / 500);
      if (c.position.x > 220) c.position.x = -220;
    }

    // scenery segments
    const cur = Math.floor(-playerZ / SEG);
    for (let i = cur - BEHIND; i <= cur + AHEAD; i++){
      if (i < -2 || this.segments.has(i)) continue;
      const g = mergeGroup(this.buildSegment(i));
      g.position.z = -i * SEG;
      this.segments.set(i, g);
      this.scene.add(g);
    }
    for (const [i, g] of this.segments){
      if (i < cur - BEHIND || i > cur + AHEAD + 2) this.dropSegment(i, g);
    }
  }

  dropSegment(i, g){
    this.scene.remove(g);
    this.segments.delete(i);
    g.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
  }

  clearScenery(){
    for (const [i, g] of [...this.segments]) this.dropSegment(i, g);
  }

  zoneAt(i){
    const z = Math.floor((i + 4) / 22) % 3;
    return ['city', 'suburb', 'park'][z];
  }

  // ---------- scenery ----------
  buildSegment(i){
    const g = new THREE.Group();
    const rng = mulberry(i * 9973 + 17);
    const zone = this.zoneAt(i);
    const M = this.mats, G = this.geos;
    const add = (geo, mat, x, y, z, sx, sy, sz, ry = 0, shadow = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = ry;
      m.castShadow = shadow; m.receiveShadow = true;
      g.add(m); return m;
    };

    // street lamps on both sides, staggered
    for (const s of [-1, 1]){
      const lz = s > 0 ? -4 : -16;
      const x = s * (ROAD_HALF + 0.6);
      add(G.cylLo, M.darkMetal, x, 2.4, lz, 0.08, 4.8, 0.08);
      add(G.box, M.darkMetal, x - s * 0.55, 4.75, lz, 1.2, 0.08, 0.08, 0, false);
      add(G.box, M.darkMetal, x - s * 1.1, 4.65, lz, 0.45, 0.14, 0.3, 0, false);
      add(G.box, M.bulb, x - s * 1.1, 4.56, lz, 0.35, 0.04, 0.22, 0, false);
    }

    // bunting strung across the street from shopfront to shopfront
    if (zone === 'city' && i % 2 === 0){
      const z0 = -10, span = (ROAD_HALF + WALK + 0.5) * 2, n = 22;
      for (let k = 0; k <= n; k++){
        const f = k / n;
        const x = -span / 2 + f * span;
        const y = 9.4 - Math.sin(f * Math.PI) * 0.8;       // sagging line, above rocket height
        if (k < n){
          const nx = -span / 2 + (k + 1) / n * span, ny = 9.4 - Math.sin((k + 1) / n * Math.PI) * 0.8;
          const r = add(G.box, M.rope, (x + nx) / 2, (y + ny) / 2, z0, Math.hypot(nx - x, ny - y), 0.03, 0.03, 0, false);
          r.rotation.z = Math.atan2(ny - y, nx - x);
          const fl = add(G.flag, M.flags[(k + i) % M.flags.length], (x + nx) / 2, (y + ny) / 2 - 0.02, z0, 0.42, 0.55, 1, 0, false);
          fl.rotation.y = 0.15 * Math.sin(k);
        }
      }
    }
    // zebra crossing now and then in town
    if (zone === 'city' && i % 3 === 1){
      for (let k = -3; k <= 3; k++) add(G.box, M.zebra, k * 1.1, 0.012, -20, 0.55, 0.02, 3.2, 0, false);
    }

    // sidewalk furniture
    for (const s of [-1, 1]){
      const r = rng();
      const z = -6 - rng() * 12;
      const x = s * (ROAD_HALF + WALK - 0.7);
      if (r < 0.28) this.tree(g, x, z, rng, 0.8, true);
      else if (r < 0.4) this.hydrant(g, s * (ROAD_HALF + 0.7), z);
      else if (r < 0.52) this.bench(g, x, z, s);
      else if (r < 0.6 && zone === 'city') this.busStop(g, x - s * 0.2, z, s);
      else if (r < 0.7) this.mailbox(g, s * (ROAD_HALF + 0.75), z);
      else if (r < 0.9) this.planter(g, x, z, rng);
    }

    const plot0 = ROAD_HALF + WALK + 0.5;
    if (zone === 'city'){
      for (const s of [-1, 1]){
        let z = 0;
        while (z > -SEG + 2){
          const w = 7 + rng() * 6;
          const d = 8 + rng() * 8;
          const h = 7 + Math.floor(rng() * 7) * 3;
          const mat = M.facades[Math.floor(rng() * M.facades.length)];
          const b = add(G.box, mat, s * (plot0 + d / 2), h / 2, z - w / 2, d, h, w);
          this.setFacadeUV(b, d, h, w);
          add(G.box, M.roofTop, s * (plot0 + d / 2), h + 0.2, z - w / 2, d + 0.3, 0.4, w + 0.3);
          if (rng() < 0.5) add(G.box, M.metal, s * (plot0 + d / 2 + rng() * 2 - 1), h + 0.9, z - w / 2, 1.5, 1.2, 1.5);
          if (rng() < 0.3) add(G.cyl, M.wood, s * (plot0 + d / 2), h + 1.5, z - w / 2 + 1.5, 0.9, 2.2, 0.9);
          // shop awning at street level
          if (rng() < 0.7){
            const aw = M.awning[Math.floor(rng() * M.awning.length)];
            const a = add(G.box, aw, s * (plot0 - 0.5), 3.1, z - w / 2, 1.4, 0.12, w * 0.8, 0, false);
            a.rotation.z = s * 0.35;
            add(G.box, M.glass, s * (plot0 + 0.02), 1.4, z - w / 2, 0.1, 2.2, w * 0.7, 0, false);
          }
          if (rng() < 0.25){
            add(G.box, M.sign[Math.floor(rng() * M.sign.length)], s * (plot0 - 0.1), h * 0.6, z - w / 2, 0.2, 1.4, 3, 0, false);
          }
          z -= w + 0.4;
        }
      }
    } else if (zone === 'suburb'){
      for (const s of [-1, 1]){
        // hedge along the plot line, gap for the path
        add(G.box, M.hedge, s * (plot0 - 0.2), 0.5, -SEG * 0.25, 0.8, 1, SEG * 0.42);
        add(G.box, M.hedge, s * (plot0 - 0.2), 0.5, -SEG * 0.78, 0.8, 1, SEG * 0.36);
        const hx = s * (plot0 + 6);
        const hz = -SEG / 2 + (rng() - 0.5) * 4;
        const w = 7 + rng() * 2, d = 7, h = 3.5 + rng() * 2.5;
        const wall = M.house[Math.floor(rng() * M.house.length)];
        add(G.box, wall, hx, h / 2, hz, d, h, w);
        const roof = add(G.prism, M.roofs[Math.floor(rng() * M.roofs.length)], hx, h, hz, d * 1.12, 4.5, w * 1.1);
        roof.rotation.y = Math.PI / 2;
        add(G.box, M.wood, hx - s * (d / 2 + 0.02), 1.0, hz, 0.1, 2, 1.1, 0, false);
        for (const wz of [-w / 3, w / 3]){
          add(G.box, M.glass, hx - s * (d / 2 + 0.02), h * 0.6, hz + wz, 0.08, 1.1, 1.3, 0, false);
          add(G.box, M.white, hx - s * (d / 2 + 0.05), h * 0.6, hz + wz, 0.05, 1.3, 0.1, 0, false);
        }
        add(G.box, M.red, hx + s * 1, h + 1.8, hz + w / 4, 0.6, 1.6, 0.6);  // chimney
        add(G.box, M.walk, s * (plot0 + 1.5), 0.03, hz, 3, 0.06, 1.2, 0, false); // path
        if (rng() < 0.7) this.tree(g, s * (plot0 + 2 + rng() * 2), hz - w / 2 - 2, rng, 1.1);
        // flowers
        for (let k = 0; k < 6; k++){
          add(G.sphere, M.flowers[Math.floor(rng() * 4)], s * (plot0 + 0.8 + rng() * 2), 0.18,
            -rng() * SEG, 0.18, 0.18, 0.18, 0, false);
        }
      }
    } else {
      // park: trees, fences, a pond now and then
      for (const s of [-1, 1]){
        for (let k = 0; k < 4; k++){
          const x = s * (plot0 + 1 + rng() * 22);
          const z = -rng() * SEG;
          this.tree(g, x, z, rng, 0.9 + rng() * 0.8, false, rng() < 0.2);
        }
        for (let k = 0; k < 5; k++){
          add(G.ico, M.hedge, s * (plot0 + rng() * 14), 0.4, -rng() * SEG, 0.8, 0.6, 0.8);
        }
        // picket fence
        for (let f = 0; f < 12; f++){
          add(G.box, M.white, s * (plot0 - 0.4), 0.45, -f * 2 - 0.5, 0.08, 0.9, 0.14, 0, false);
        }
        add(G.box, M.white, s * (plot0 - 0.4), 0.65, -SEG / 2, 0.06, 0.08, SEG, 0, false);
        add(G.box, M.white, s * (plot0 - 0.4), 0.3, -SEG / 2, 0.06, 0.08, SEG, 0, false);
        if (rng() < 0.25){
          const p = add(G.cyl, M.water, s * (plot0 + 12), 0.03, -SEG / 2, 7, 0.06, 5, 0, false);
          p.receiveShadow = true;
        }
      }
    }
    return g;
  }

  // Facade textures are authored as one 3-storey tile; scale UVs so windows keep their size.
  setFacadeUV(mesh, d, h, w){
    const geo = mesh.geometry.clone();
    const uv = geo.attributes.uv;
    const norm = geo.attributes.normal;
    for (let k = 0; k < uv.count; k++){
      const nx = Math.abs(norm.getX(k)), ny = Math.abs(norm.getY(k));
      const across = nx > 0.5 ? w : d;
      if (ny > 0.5) { uv.setXY(k, 0.95, 0.99); continue; }  // top: plain wall
      uv.setXY(k, uv.getX(k) * across / 4, uv.getY(k) * h / 9);
    }
    mesh.geometry = geo;
    mesh.userData.ownGeo = true;
  }

  tree(g, x, z, rng, s = 1, planter = false, blossom = false){
    const M = this.mats, G = this.geos;
    const t = new THREE.Group();
    t.position.set(x, planter ? 0.2 : 0, z);
    const trunk = new THREE.Mesh(G.cylLo, M.trunk);
    trunk.scale.set(0.16 * s, 2 * s, 0.16 * s); trunk.position.y = s;
    trunk.castShadow = true;
    t.add(trunk);
    const leaf = blossom ? M.blossom : M.leaf[Math.floor(rng() * M.leaf.length)];
    const n = 3 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++){
      const c = new THREE.Mesh(G.ico1, leaf);
      const cs = (0.8 + rng() * 0.5) * s;
      c.scale.set(cs, cs * 0.9, cs);
      c.position.set((rng() - 0.5) * s, 2.2 * s + rng() * 0.8 * s, (rng() - 0.5) * s);
      c.castShadow = true;
      t.add(c);
    }
    if (planter){
      const p = new THREE.Mesh(G.box, M.curb);
      p.scale.set(1.1, 0.3, 1.1); p.position.y = 0.05; p.receiveShadow = true;
      t.add(p);
    }
    g.add(t);
  }

  planter(g, x, z, rng){
    const M = this.mats, G = this.geos;
    const p = new THREE.Mesh(G.box, M.planter);
    p.scale.set(0.9, 0.5, 1.8); p.position.set(x, 0.45, z); p.castShadow = true;
    g.add(p);
    const soil = new THREE.Mesh(G.ico, M.hedge);
    soil.scale.set(0.45, 0.25, 0.9); soil.position.set(x, 0.75, z);
    g.add(soil);
    for (let k = 0; k < 7; k++){
      const f = new THREE.Mesh(G.sphere, M.flowers[Math.floor(rng() * M.flowers.length)]);
      f.scale.setScalar(0.12 + rng() * 0.06);
      f.position.set(x + (rng() - 0.5) * 0.6, 0.85 + rng() * 0.2, z + (rng() - 0.5) * 1.5);
      g.add(f);
    }
  }

  hydrant(g, x, z){
    const M = this.mats, G = this.geos;
    const h = new THREE.Group(); h.position.set(x, 0.2, z);
    const body = new THREE.Mesh(G.cyl, M.red); body.scale.set(0.15, 0.6, 0.15); body.position.y = 0.3;
    const cap = new THREE.Mesh(G.sphere, M.red); cap.scale.set(0.16, 0.12, 0.16); cap.position.y = 0.62;
    const arm = new THREE.Mesh(G.cyl, M.red); arm.scale.set(0.06, 0.4, 0.06); arm.rotation.z = Math.PI / 2; arm.position.y = 0.4;
    for (const m of [body, cap, arm]){ m.castShadow = true; h.add(m); }
    g.add(h);
  }

  bench(g, x, z, s){
    const M = this.mats, G = this.geos;
    const b = new THREE.Group(); b.position.set(x, 0.2, z);
    const seat = new THREE.Mesh(G.box, M.wood); seat.scale.set(0.5, 0.08, 1.8); seat.position.y = 0.45;
    const back = new THREE.Mesh(G.box, M.wood); back.scale.set(0.08, 0.45, 1.8); back.position.set(s * 0.25, 0.75, 0);
    const l1 = new THREE.Mesh(G.box, M.darkMetal); l1.scale.set(0.5, 0.45, 0.08); l1.position.set(0, 0.22, 0.7);
    const l2 = l1.clone(); l2.position.z = -0.7;
    for (const m of [seat, back, l1, l2]){ m.castShadow = true; b.add(m); }
    g.add(b);
  }

  mailbox(g, x, z){
    const M = this.mats, G = this.geos;
    const m = new THREE.Mesh(G.box, this.mats.awning[3]); m.scale.set(0.5, 0.9, 0.5); m.position.set(x, 0.65, z);
    const top = new THREE.Mesh(G.cyl, M.metal); top.scale.set(0.25, 0.5, 0.25);
    top.rotation.x = Math.PI / 2; top.position.set(x, 1.1, z);
    m.castShadow = top.castShadow = true;
    g.add(m, top);
  }

  busStop(g, x, z, s){
    const M = this.mats, G = this.geos;
    const add = (geo, mat, px, py, pz, sx, sy, sz) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.scale.set(sx, sy, sz);
      m.castShadow = true; g.add(m); return m;
    };
    add(G.box, M.glass, x + s * 0.6, 1.4, z, 0.05, 2.2, 3.2);
    add(G.box, M.darkMetal, x, 2.6, z, 1.6, 0.1, 3.4);
    add(G.box, M.sign[1], x + s * 0.55, 1.4, z - 1.7, 0.1, 2.4, 0.9);
    add(G.box, M.wood, x + s * 0.3, 0.65, z, 0.4, 0.08, 2.4);
  }

  // ---------- time of day ----------
  setDaylight(t){
    // key colours for each time; the cycle blends between them
    const K = World.DAYLIGHT;
    const stops = [[0, K.day], [0.4, K.day], [0.58, K.golden], [0.76, K.dusk], [0.92, K.day], [1, K.day]];
    let i = 0;
    while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
    const [t0, a] = stops[i], [t1, b] = stops[i + 1];
    const f = t1 > t0 ? smooth((t - t0) / (t1 - t0)) : 0;
    const U = this.skyMat.uniforms;
    const mix = (key, target) => target.setHex(a[key]).lerp(tmpC.setHex(b[key]), f);
    mix('top', U.top.value); mix('mid', U.mid.value); mix('bottom', U.bottom.value);
    mix('sunCol', U.sunCol.value);
    mix('fog', this.fogColor);
    mix('sun', this.sun.color); mix('hemiSky', this.hemi.color); mix('hemiGround', this.hemi.groundColor);
    mix('rim', this.rim.color);
    const lerp = k => a[k] + (b[k] - a[k]) * f;
    this.sun.intensity = lerp('sunI');
    this.hemi.intensity = lerp('hemiI');
    this.rim.intensity = lerp('rimI');
    this.sunDir = (this.sunDir || new THREE.Vector3()).set(-0.4, lerp('sunY'), -0.75).normalize();
    U.sunDir.value.copy(this.sunDir);
    // windows and street lamps glow brighter as it gets darker
    const glow = lerp('glow');
    for (const m of this.mats.facades) m.emissiveIntensity = 0.35 + glow * 1.1;
    this.mats.bulb.emissiveIntensity = 1 + glow * 2.5;
    this.daylight = t;
  }

  // ---------- hot-air balloons ----------
  buildBalloons(){
    this.balloons = [];
    const colors = [['#ff4fa3', '#ffe066'], ['#3a86ff', '#ffffff'], ['#06d6a0', '#ff7b00'], ['#9b5de5', '#ffc933'], ['#ff7b00', '#3a86ff']];
    for (let i = 0; i < 7; i++){
      const [c1, c2] = colors[i % colors.length];
      const g = new THREE.Group();
      const env = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12),
        new THREE.MeshStandardMaterial({ map:balloonTexture(c1, c2), roughness:0.6, fog:false }));
      env.scale.set(1, 1.2, 1);
      const neck = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2, 16), env.material);
      neck.position.y = -3.6; neck.rotation.x = Math.PI;
      const basket = new THREE.Mesh(this.geos.box, new THREE.MeshStandardMaterial({ color:0x8a5a2b, fog:false }));
      basket.scale.set(1.1, 0.8, 1.1); basket.position.y = -5.6;
      g.add(env, neck, basket);
      for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]){
        const r = new THREE.Mesh(this.geos.box, this.mats.rope);
        r.scale.set(0.05, 1.2, 0.05); r.position.set(x, -4.8, z);
        g.add(r);
      }
      const b = mergeGroup(g);
      b.children.forEach(m => { m.castShadow = false; m.receiveShadow = false; });
      const side = i % 2 ? 1 : -1;
      b.position.set(side * (30 + Math.random() * 90), 26 + Math.random() * 30, -60 - Math.random() * 460);
      b.userData = { ph: Math.random() * 6, drift: (Math.random() - 0.5) * 1.5 };
      this.scene.add(b);
      this.balloons.push(b);
    }
  }

  // ---------- speed lines ----------
  buildSpeedLines(){
    const N = 36;
    const pos = new Float32Array(N * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0, depthTest:false,
      blending:THREE.AdditiveBlending, fog:false });
    this.lines = new THREE.LineSegments(geo, mat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 10;
    this.lineData = Array.from({ length:N }, () => this.newLine({}, true));
    this.camera.add(this.lines);
  }

  newLine(l, anyZ = false){
    const a = Math.random() * Math.PI * 2;
    const r = 0.55 + Math.random() * 0.9;                // keep the middle of the view clear
    l.x = Math.cos(a) * r * 1.6; l.y = Math.sin(a) * r;
    l.z = anyZ ? -2 - Math.random() * 10 : -12;
    l.len = 0.6 + Math.random() * 1.4;
    return l;
  }

  /** @param {number} amount 0 (none) .. 1 (full rush) */
  updateSpeedLines(dt, amount, speed){
    const mat = this.lines.material;
    mat.opacity += (amount * 0.55 - mat.opacity) * Math.min(1, dt * 4);
    this.lines.visible = mat.opacity > 0.01;
    if (!this.lines.visible) return;
    const p = this.lines.geometry.attributes.position.array;
    this.lineData.forEach((l, k) => {
      l.z += speed * dt * 0.9;
      if (l.z > -0.5) this.newLine(l);
      const s = -l.z;                                      // spread lines out with depth
      p.set([l.x * s * 0.35, l.y * s * 0.35, l.z, l.x * s * 0.35, l.y * s * 0.35, l.z - l.len], k * 6);
    });
    this.lines.geometry.attributes.position.needsUpdate = true;
  }

  render(){ this.renderer.render(this.scene, this.camera); }
}

World.DAYLIGHT = {
  day:    { top:0x2f86ec, mid:0x8fd3ff, bottom:0xe2f5ff, fog:0xc4e6ff, sunCol:0xfff0b0, sun:0xfff1d6, sunI:2.2,
            hemiSky:0xd6eeff, hemiGround:0x8a7a5a, hemiI:0.7, rim:0xbfe0ff, rimI:1.0, sunY:0.55, glow:0 },
  golden: { top:0x4a78d8, mid:0xffc98a, bottom:0xffe3b8, fog:0xffd9b0, sunCol:0xffb050, sun:0xffc27a, sunI:2.1,
            hemiSky:0xffe0c0, hemiGround:0x8a6a4a, hemiI:0.65, rim:0xffd0a0, rimI:1.3, sunY:0.2, glow:0.35 },
  dusk:   { top:0x3b3a8f, mid:0xd98ac8, bottom:0xffb8a8, fog:0xd9a3c4, sunCol:0xff7a6a, sun:0xff9a8a, sunI:1.3,
            hemiSky:0xc8b0ff, hemiGround:0x6a5070, hemiI:0.75, rim:0xa0c0ff, rimI:1.5, sunY:0.1, glow:0.9 },
};

// ---------- merging ----------
// A segment is built from dozens of small meshes; bake them into one mesh per material
// (split by whether they cast shadows) so each segment costs a handful of draw calls.
export function mergeGroup(g){
  g.updateMatrixWorld(true);
  const buckets = new Map();
  g.traverse(o => {
    if (!o.isMesh) return;
    const key = o.material.uuid + (o.castShadow ? '|s' : '');
    if (!buckets.has(key)) buckets.set(key, { mat:o.material, shadow:o.castShadow, geos:[] });
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    buckets.get(key).geos.push(geo);
    if (o.userData.ownGeo) o.geometry.dispose();
  });
  const out = new THREE.Group();
  for (const b of buckets.values()){
    const merged = concat(b.geos);
    b.geos.forEach(x => x.dispose());
    const m = new THREE.Mesh(merged, b.mat);
    m.castShadow = b.shadow;
    m.receiveShadow = true;
    out.add(m);
  }
  return out;
}

function concat(geos){
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of geos){
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

// ---------- canvas textures ----------
function canvas(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

function tex(c, repeat = true){
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat){ t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 8;
  return t;
}

function speckle(ctx, w, h, n, colors, size = 2){
  for (let i = 0; i < n; i++){
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillRect(Math.random() * w, Math.random() * h, size, size);
  }
}

function roadTexture(){
  // 8.2 m wide × 8 m long tile
  const [c, x] = canvas(512, 512);
  x.fillStyle = '#555a66'; x.fillRect(0, 0, 512, 512);
  speckle(x, 512, 512, 9000, ['#4f5460', '#5c6270', '#4a4f5a', '#646a78']);
  const px = m => (m / 8.2 + 0.5) * 512;
  // edge lines
  x.fillStyle = '#f5f5f5';
  x.fillRect(px(-3.85), 0, 8, 512); x.fillRect(px(3.85) - 8, 0, 8, 512);
  // lane dashes
  x.fillStyle = '#ffffff';
  for (const m of [-1.2, 1.2]){ x.fillRect(px(m) - 5, 60, 10, 260); }
  // wear marks in each lane
  x.globalAlpha = 0.18; x.fillStyle = '#2d3137';
  for (const m of [-2.4, 0, 2.4]){ x.fillRect(px(m - 0.55), 0, 18, 512); x.fillRect(px(m + 0.55) - 18, 0, 18, 512); }
  x.globalAlpha = 1;
  return tex(c);
}

function walkTexture(){
  const [c, x] = canvas(256, 256);
  x.fillStyle = '#cfc9bf'; x.fillRect(0, 0, 256, 256);
  speckle(x, 256, 256, 2500, ['#c4bdb2', '#d8d2c9', '#bdb6aa']);
  x.strokeStyle = '#a9a296'; x.lineWidth = 3;
  x.strokeRect(0, 0, 256, 256);
  x.beginPath(); x.moveTo(128, 0); x.lineTo(128, 256); x.stroke();
  return tex(c);
}

function grassTexture(){
  const [c, x] = canvas(256, 256);
  x.fillStyle = '#74c850'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#66bb46'; x.fillRect(0, 0, 256, 128);         // mown stripes
  speckle(x, 256, 256, 6000, ['#62b544', '#7fd35a', '#5aa83e', '#8bdc66'], 3);
  return tex(c);
}

function balloonTexture(a, b){
  const [c, x] = canvas(256, 128);
  for (let i = 0; i < 8; i++){ x.fillStyle = i % 2 ? b : a; x.fillRect(i * 32, 0, 32, 128); }
  return tex(c, false);
}

function stripeTexture(color){
  const [c, x] = canvas(64, 64);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#' + color.toString(16).padStart(6, '0');
  for (let i = 0; i < 4; i++) x.fillRect(0, i * 16, 64, 8);
  return tex(c);
}

function facadeTexture(wall, win){
  // one tile = 4 m wide × 9 m tall (3 storeys), 2 windows per storey
  const [c, x] = canvas(256, 576);
  const [e, ex] = canvas(256, 576);
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  x.fillStyle = hex(wall); x.fillRect(0, 0, 256, 576);
  speckle(x, 256, 576, 1500, ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.06)'], 3);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, 256, 576);
  for (let f = 0; f < 3; f++){
    const y0 = f * 192;
    // ledge
    x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, y0 + 186, 256, 6);
    for (let k = 0; k < 2; k++){
      const wx = 30 + k * 128, wy = y0 + 40;
      x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(wx - 5, wy - 5, 78, 118);
      const lit = Math.random() < 0.35;
      const g = x.createLinearGradient(wx, wy, wx + 68, wy + 108);
      g.addColorStop(0, lit ? '#ffe7a8' : '#7fb6e6'); g.addColorStop(1, lit ? '#f4c26b' : hex(win));
      x.fillStyle = g; x.fillRect(wx, wy, 68, 108);
      x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(wx + 32, wy, 4, 108); x.fillRect(wx, wy + 52, 68, 4);
      x.fillStyle = 'rgba(255,255,255,0.25)';
      x.beginPath(); x.moveTo(wx + 6, wy + 100); x.lineTo(wx + 24, wy + 4); x.lineTo(wx + 32, wy + 4); x.lineTo(wx + 14, wy + 100); x.fill();
      if (lit){ ex.fillStyle = '#ffffff'; ex.fillRect(wx, wy, 68, 108); }
    }
  }
  return { map: tex(c), emissive: tex(e) };
}

export function mulberry(a){
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
