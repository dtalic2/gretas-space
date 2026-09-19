// ---------- The island, the sky above it and the clouds below ----------
import * as THREE from 'three';
import { GRID, TILE } from './data.js';
import { isLand, isPath, isShore, hash2, worldX, worldZ } from './island.js';
import { setNight, mat, ball } from './models.js';

export const DAY_LENGTH = 420;        // seconds for a full day + night

// Key moments of the cycle. Everything between them is a straight lerp.
const SKY_KEYS = [
  //          overhead    horizon     sunlight    strength      how dark
  { t:0.00, zen:0x101a38, sky:0x27406e, sun:0x5f7fbf, si:0.25, ai:0.42, night:1.00 },  // deep night
  { t:0.12, zen:0x6a6fa8, sky:0xf0a678, sun:0xffb070, si:0.75, ai:0.62, night:0.45 },  // dawn
  { t:0.25, zen:0x4aa8e8, sky:0xc8ecfb, sun:0xfff3dd, si:1.25, ai:0.80, night:0.00 },  // morning
  { t:0.55, zen:0x3f9fe4, sky:0xcdeefb, sun:0xfff6e6, si:1.30, ai:0.82, night:0.00 },  // afternoon
  { t:0.70, zen:0x7a7fd0, sky:0xffc79a, sun:0xff9d5c, si:0.85, ai:0.62, night:0.40 },  // sunset
  { t:0.82, zen:0x1e2a5a, sky:0x51639a, sun:0x6f8ccc, si:0.35, ai:0.46, night:0.92 },  // dusk
  { t:1.00, zen:0x101a38, sky:0x27406e, sun:0x5f7fbf, si:0.25, ai:0.42, night:1.00 },
];

function keyAt(t){
  let a = SKY_KEYS[0], b = SKY_KEYS[SKY_KEYS.length - 1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++){
    if (t >= SKY_KEYS[i].t && t <= SKY_KEYS[i + 1].t){ a = SKY_KEYS[i]; b = SKY_KEYS[i + 1]; break; }
  }
  const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
  return {
    zen: new THREE.Color(a.zen).lerp(new THREE.Color(b.zen), f),
    sky: new THREE.Color(a.sky).lerp(new THREE.Color(b.sky), f),
    sun: new THREE.Color(a.sun).lerp(new THREE.Color(b.sun), f),
    si: a.si + (b.si - a.si) * f,
    ai: a.ai + (b.ai - a.ai) * f,
    night: a.night + (b.night - a.night) * f,
  };
}

export class World {
  constructor(canvas){
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xc8ecfb, 48, 330);

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.5, 400);
    this.camera.position.set(0, 26, 30);

    this.sun = new THREE.DirectionalLight(0xfff3dd, 1.25);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const cam = this.sun.shadow.camera;
    cam.left = -26; cam.right = 26; cam.top = 26; cam.bottom = -26;
    cam.near = 1; cam.far = 90;
    this.sun.shadow.bias = -0.0009;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xcfe9ff, 0x6a8a4a, 0.8);
    this.scene.add(this.hemi);

    this.town = new THREE.Group();          // everything placeable lives in here
    this.scene.add(this.town);

    this._island();
    this._scatter();
    this._horizon();
    this._sky();
    this._clouds();

    this.time = DAY_LENGTH * 0.28;          // open the game mid-morning
    this.night = 0;
    this.resize();
  }

  // ------------------------------------------------------------- island ---
  _island(){
    const pos = [], col = [], idx = [];
    const c = new THREE.Color();
    const H = 1.5;                          // how thick the slab of earth is

    const quad = (a, b, cc, d, color) => {
      const base = pos.length / 3;
      for (const v of [a, b, cc, d]){
        pos.push(v[0], v[1], v[2]);
        c.setHex(color);
        col.push(c.r, c.g, c.b);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };

    const GRASS = [0x8ccf5c, 0x82c855, 0x95d667, 0x79bf52];

    for (let iz = 0; iz < GRID; iz++){
      for (let ix = 0; ix < GRID; ix++){
        if (!isLand(ix, iz)) continue;
        const x0 = worldX(ix) - TILE / 2, x1 = x0 + TILE;
        const z0 = worldZ(iz) - TILE / 2, z1 = z0 + TILE;
        const edge = !isLand(ix + 1, iz) || !isLand(ix - 1, iz) || !isLand(ix, iz + 1) || !isLand(ix, iz - 1);
        let color = GRASS[Math.floor(hash2(ix, iz) * GRASS.length)];
        if (isPath(ix, iz)) color = hash2(ix + 7, iz + 3) > 0.5 ? 0xe0cfa4 : 0xd8c69a;
        else if (edge) color = 0xa8d477;

        quad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], color);

        // Sides only where the island actually ends.
        const dirt = hash2(ix + 31, iz + 17) > 0.5 ? 0x9a6b43 : 0x8d6242;
        if (!isLand(ix, iz + 1)) quad([x0, -H, z1], [x1, -H, z1], [x1, 0, z1], [x0, 0, z1], dirt);
        if (!isLand(ix, iz - 1)) quad([x1, -H, z0], [x0, -H, z0], [x0, 0, z0], [x1, 0, z0], dirt);
        if (!isLand(ix + 1, iz)) quad([x1, -H, z1], [x1, -H, z0], [x1, 0, z0], [x1, 0, z1], dirt);
        if (!isLand(ix - 1, iz)) quad([x0, -H, z0], [x0, -H, z1], [x0, 0, z1], [x0, 0, z0], dirt);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors:true, flatShading:true }));
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;

    // The underside: a lumpy rock the whole town is sitting on.
    const rockGeo = new THREE.ConeGeometry(GRID * TILE * 0.40, 15, 11, 3);
    const p = rockGeo.attributes.position;
    for (let i = 0; i < p.count; i++){
      const y = p.getY(i);
      if (y > -7.4){
        const n = hash2(Math.round(p.getX(i) * 4), Math.round(p.getZ(i) * 4));
        p.setX(i, p.getX(i) * (0.82 + n * 0.5));
        p.setZ(i, p.getZ(i) * (0.82 + n * 0.5));
        p.setY(i, y - n * 1.6);
      }
    }
    rockGeo.computeVertexNormals();
    const rock = new THREE.Mesh(rockGeo, mat(0x7d5333));
    rock.rotation.x = Math.PI;          // apex points down, base meets the underside
    rock.position.y = -1.45 - 7.5;
    rock.receiveShadow = true;
    this.scene.add(rock);

    // Little chunks of rock that never quite fell.
    this.floaters = [];
    for (let i = 0; i < 7; i++){
      const a = (i / 7) * Math.PI * 2 + 0.4;
      const r = 20 + hash2(i, 9) * 9;
      const chunk = ball(0.8 + hash2(i, 3) * 1.4, 0, 0x8d6242,
        Math.cos(a) * r, -3 - hash2(i, 5) * 7, Math.sin(a) * r);
      chunk.scale.y = 0.7;
      const grass = ball(0.8 + hash2(i, 3) * 1.4, 0, 0x8ccf5c, 0, 0.25, 0);
      grass.scale.set(0.92, 0.35, 0.92);
      chunk.add(grass);
      chunk.castShadow = false;
      this.scene.add(chunk);
      this.floaters.push({ mesh:chunk, phase: i * 1.7, base: chunk.position.y });
    }
  }

  /** Rocks, bushes and tufts around the shore, always in the same places. */
  _scatter(){
    const rockGeo = new THREE.IcosahedronGeometry(0.42, 0);
    const bushGeo = new THREE.IcosahedronGeometry(0.46, 0);
    const tuftGeo = new THREE.ConeGeometry(0.1, 0.5, 4);
    const rockMat = mat(0x9c9287);
    const bushMat = mat(0x4f9a46);
    const tuftMat = mat(0x76bd5c);
    const budMat = [mat(0xff8fb1), mat(0xffe08a), mat(0xd7b5ff)];

    for (let iz = 0; iz < GRID; iz++){
      for (let ix = 0; ix < GRID; ix++){
        if (!isShore(ix, iz)) continue;
        const n = hash2(ix * 3 + 1, iz * 5 + 2);
        const x = worldX(ix) + (hash2(ix, iz + 90) - 0.5) * 1.2;
        const z = worldZ(iz) + (hash2(ix + 90, iz) - 0.5) * 1.2;

        if (n < 0.30){
          const m = new THREE.Mesh(rockGeo, rockMat);
          m.position.set(x, 0.1, z);
          m.scale.set(1 + n, 0.7 + n, 1 + n * 0.6);
          m.rotation.y = n * 9;
          m.castShadow = true; m.receiveShadow = true;
          this.scene.add(m);
        } else if (n < 0.62){
          const g = new THREE.Group();
          for (let i = 0; i < 3; i++){
            const b = new THREE.Mesh(bushGeo, bushMat);
            b.position.set((i - 1) * 0.34, 0.26 + (i === 1 ? 0.16 : 0), (hash2(i, ix) - 0.5) * 0.4);
            b.scale.setScalar(0.7 + hash2(i, iz) * 0.5);
            b.castShadow = true;
            g.add(b);
          }
          g.position.set(x, 0, z);
          this.scene.add(g);
        } else if (n < 0.9){
          const g = new THREE.Group();
          for (let i = 0; i < 4; i++){
            const t = new THREE.Mesh(tuftGeo, tuftMat);
            t.position.set((hash2(i, ix) - 0.5) * 0.7, 0.25, (hash2(i, iz) - 0.5) * 0.7);
            t.rotation.z = (hash2(i + 3, ix) - 0.5) * 0.5;
            g.add(t);
          }
          if (n > 0.84){
            const bud = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), budMat[Math.floor(n * 100) % 3]);
            bud.position.set(0.2, 0.55, 0.1);
            g.add(bud);
          }
          g.position.set(x, 0, z);
          this.scene.add(g);
        }
      }
    }
  }

  /**
   * Other islands, far enough out that the fog does most of the work. They are
   * the difference between standing in a town and standing on a diorama.
   */
  _horizon(){
    this.far = [];
    for (let i = 0; i < 9; i++){
      const g = new THREE.Group();
      const size = 9 + hash2(i, 101) * 20;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(size, size * 0.94, 1.6, 9), mat(0x86c95e));
      disc.position.y = 0.8;
      g.add(disc);
      const rock = new THREE.Mesh(new THREE.ConeGeometry(size * 0.94, size * 1.5, 9, 2), mat(0x7d5333));
      rock.rotation.x = Math.PI;
      rock.position.y = -size * 0.75;
      g.add(rock);

      // a hint of trees on the bigger ones, so they read as land
      if (size > 12){
        for (let j = 0; j < 5; j++){
          const a = hash2(i * 7, j) * Math.PI * 2;
          const r = hash2(j, i * 3) * size * 0.7;
          const t = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 6), mat(0x4f9a46));
          t.position.set(Math.cos(a) * r, 3.2, Math.sin(a) * r);
          g.add(t);
        }
      }

      // Spread them above and below the eyeline so the view over the edge has
      // something in it whichever way you are facing.
      const ang = (i / 9) * Math.PI * 2 + hash2(i, 5);
      const dist = 155 + hash2(i, 61) * 130;
      g.position.set(Math.cos(ang) * dist, -11 + hash2(i, 71) * 18, Math.sin(ang) * dist);
      g.traverse((n) => { n.castShadow = false; n.receiveShadow = false; });
      this.scene.add(g);
      this.far.push({ mesh:g, base:g.position.y, phase:i * 2.1 });
    }
  }

  // ---------------------------------------------------------------- sky ---
  _sky(){
    // A gradient dome instead of a flat clear colour: the horizon stays pale
    // while the zenith deepens, and the sun spills a haze into the sky around
    // it. At ground level this is most of what you are looking at.
    this.skyUniforms = {
      zen:  { value: new THREE.Color(0x4aa8e8) },
      haze: { value: new THREE.Color(0xc8ecfb) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunCol: { value: new THREE.Color(0xfff3dd) },
      glow: { value: 0.75 },
    };
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(320, 28, 18),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite:false, fog:false,
        uniforms: this.skyUniforms,
        vertexShader: `
          varying vec3 vDir;
          void main(){
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 zen, haze, sunCol, sunDir;
          uniform float glow;
          varying vec3 vDir;
          void main(){
            vec3 d = normalize(vDir);
            float h = clamp(d.y, 0.0, 1.0);
            vec3 c = mix(haze, zen, pow(h, 0.62));
            float s = max(dot(d, normalize(sunDir)), 0.0);
            c += sunCol * pow(s, 90.0) * glow * 1.6;     // the sun's own bloom
            c += sunCol * pow(s, 5.0) * glow * 0.22;     // the haze around it
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    dome.renderOrder = -1000;
    dome.frustumCulled = false;
    this.scene.add(dome);
    this.dome = dome;

    const disc = new THREE.Mesh(new THREE.CircleGeometry(9, 24),
      new THREE.MeshBasicMaterial({ color:0xfff0c0, transparent:true, opacity:0.9, fog:false }));
    disc.renderOrder = -1;
    this.scene.add(disc);
    this.sunDisc = disc;

    const starPos = [];
    for (let i = 0; i < 260; i++){
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * 0.9;
      const r = 220;
      starPos.push(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r + 20, Math.sin(a) * Math.cos(b) * r);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({
      color:0xffffff, size:1.6, sizeAttenuation:true, transparent:true, opacity:0, fog:false }));
    this.scene.add(this.stars);
  }

  _clouds(){
    this.clouds = [];
    // Clouds take a little of the sky's own colour, so they are pink at dawn
    // and dark blue at night instead of always looking like rain.
    const puffMat = new THREE.MeshLambertMaterial({ color:0xffffff, flatShading:true, fog:false });
    this.cloudMat = puffMat;
    for (let i = 0; i < 26; i++){
      const g = new THREE.Group();
      const lumps = 3 + Math.floor(hash2(i, 11) * 3);
      for (let j = 0; j < lumps; j++){
        const r = 1.6 + hash2(i, j) * 2.2;
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), puffMat);
        m.position.set((j - lumps / 2) * 2.2 + hash2(j, i) * 1.4, hash2(i + j, 2) * 0.9, hash2(j, i + 5) * 2 - 1);
        m.scale.y = 0.62;
        g.add(m);
      }
      // Three bands: under the island, high overhead, and a distant row that
      // sits on the horizon when you are standing in the grass.
      const band = i % 3;
      const a = hash2(i, 21) * Math.PI * 2;
      const r = band === 0 ? 40 + hash2(i, 41) * 60
              : band === 1 ? 12 + hash2(i, 31) * 60
              : 70 + hash2(i, 33) * 60;
      const y = band === 0 ? 17 + hash2(i, 61) * 12
              : band === 1 ? -12 - hash2(i, 51) * 14
              : 2.5 + hash2(i, 63) * 7;
      g.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      g.scale.setScalar(band === 1 ? 1.4 : band === 2 ? 1.9 : 1.0);
      this.scene.add(g);
      this.clouds.push({ mesh:g, speed: 0.25 + hash2(i, 71) * 0.5 });
    }
  }

  // ------------------------------------------------------------- frame ----
  resize(){
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Advance the sky. `dt` in seconds. */
  update(dt){
    this.time = (this.time + dt) % DAY_LENGTH;
    const t = this.time / DAY_LENGTH;
    const k = keyAt(t);

    this.skyUniforms.zen.value.copy(k.zen);
    this.skyUniforms.haze.value.copy(k.sky);
    this.skyUniforms.sunCol.value.copy(k.sun);
    this.skyUniforms.glow.value = 0.35 + 0.65 * (1 - k.night);
    this.dome.position.copy(this.camera.position);
    this.scene.fog.color.copy(k.sky);
    this.sun.color.copy(k.sun);
    this.sun.intensity = k.si;
    this.hemi.intensity = k.ai;
    this.night = k.night;
    setNight(k.night);

    // The sun swings from east to west and dips under the island at night.
    const ang = (t - 0.25) * Math.PI * 2;
    const sx = Math.cos(ang) * 60, sy = Math.sin(ang) * 48, sz = -26;
    this.sun.position.set(sx, sy, sz);
    this.sun.target.position.set(0, 0, 0);
    this.skyUniforms.sunDir.value.set(sx, sy, sz).normalize();
    this.sunDisc.position.set(sx * 2.4, sy * 2.4, sz * 2.4);
    this.sunDisc.lookAt(0, 0, 0);
    this.sunDisc.material.opacity = Math.max(0, Math.min(1, (sy + 10) / 30)) * 0.9;
    this.sunDisc.material.color.copy(k.sun);
    this.stars.material.opacity = k.night * 0.9;

    this.cloudMat.emissive.copy(k.sky).multiplyScalar(0.16 + 0.26 * (1 - k.night));
    for (const c of this.clouds){
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > 95) c.mesh.position.x = -95;
    }
    const tt = this.time;
    for (const f of this.far){
      f.mesh.position.y = f.base + Math.sin(tt * 0.12 + f.phase) * 0.8;
      f.mesh.rotation.y += dt * 0.008;
    }
    for (const f of this.floaters){
      f.mesh.position.y = f.base + Math.sin(tt * 0.35 + f.phase) * 0.45;
      f.mesh.rotation.y += dt * 0.05;
    }
  }

  render(){ this.renderer.render(this.scene, this.camera); }
}
