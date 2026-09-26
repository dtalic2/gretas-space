// ---------- The world around the hotel: sky, light, ground and weather ----------

import * as THREE from 'three';
import { box, ball, mat, tree, setNight } from './models.js';

const DAY_SECS = 480;                  // one day and night, in real seconds

const SKY = {
  day:   new THREE.Color(0x8fd3f4),
  dusk:  new THREE.Color(0xf6a98a),
  night: new THREE.Color(0x1b2346),
};

export class World {
  constructor(canvas){
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = SKY.day.clone();
    this.scene.fog = new THREE.Fog(0x8fd3f4, 70, 170);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400);

    this.hemi = new THREE.HemisphereLight(0xfff4e0, 0x6aa05a, 0.85);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d6, 1.5);
    this.sun.position.set(18, 36, 26);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 44; sc.bottom = -8; sc.near = 1; sc.far = 110;
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun, this.sun.target);

    this._ground();
    this._clouds();
    this._stars();
    this.night = 0;
    this.resize();
  }

  _ground(){
    const s = this.scene;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat(0x8ccf5c));
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.26;
    grass.receiveShadow = true;
    s.add(grass);

    // The pavement the guests walk along, and the road the bus drives down.
    s.add(box(90, 0.1, 2.6, 0xe9dcc4, 0, -0.26, 3.9));
    s.add(box(90, 0.14, 0.2, 0xcdbd9f, 0, -0.26, 5.25));
    const road = box(90, 0.06, 4.4, 0x6b6f7a, 0, -0.26, 7.6);
    s.add(road);
    for (let x = -44; x < 44; x += 4) s.add(box(1.8, 0.07, 0.18, 0xfff3e0, x, -0.24, 7.6));
    s.add(box(90, 0.1, 30, 0x7fc052, 0, -0.3, 22));

    for (const [x, z, k] of [[-19, -4, 1.2], [-22, 1, 0.9], [19, -5, 1.1], [23, -1, 1.3], [-17, -9, 1.4],
                              [16, -10, 1], [-8, -9, 1.2], [4, -10, 1.4], [28, 2, 1], [-28, -2, 1.2],
                              [-24, 13, 1.1], [20, 14, 1.3], [-6, 16, 1], [10, 18, 1.2]]){
      const t = tree(x, z, k);
      t.position.y = -0.26;
      s.add(t);
    }

    // Soft hills, far off.
    for (const [x, z, r, c] of [[-60, -70, 34, 0x9fd67a], [10, -90, 44, 0x93cf6c], [70, -65, 30, 0xa6da83],
                                 [-110, -40, 30, 0x9fd67a], [120, -50, 36, 0x93cf6c]]){
      const h = ball(r, 2, c, x, -r * 0.62, z);
      h.castShadow = false;
      s.add(h);
    }
  }

  _clouds(){
    this.clouds = [];
    const white = mat(0xffffff, { transparent:true, opacity:0.92 });
    for (let i = 0; i < 9; i++){
      const g = new THREE.Group();
      const n = 3 + (i % 3);
      for (let j = 0; j < n; j++){
        const b = ball(1.6 + Math.random() * 1.4, 1, 0, j * 2.1 - n, Math.random() * 0.8, Math.random() * 1.2, white);
        b.castShadow = false;
        g.add(b);
      }
      g.position.set(-80 + i * 20 + Math.random() * 8, 22 + Math.random() * 18, -30 - Math.random() * 40);
      g.userData.speed = 0.6 + Math.random() * 0.8;
      this.scene.add(g);
      this.clouds.push(g);
    }
  }

  _stars(){
    const n = 420, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++){
      const a = Math.random() * Math.PI * 2, up = 0.08 + Math.random() * 0.9;
      const r = 180;
      pos[i * 3] = Math.cos(a) * Math.cos(up) * r;
      pos[i * 3 + 1] = Math.sin(up) * r;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(up) * r - 40;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color:0xffffff, size:1.3, transparent:true, opacity:0, fog:false, depthWrite:false });
    this.stars = new THREE.Points(g, this.starMat);
    this.scene.add(this.stars);
  }

  resize(){
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Where in the day we are, 0..1 with 0.5 at midday. Tied to the clock. */
  dayPhase(){ return ((Date.now() / 1000) % DAY_SECS) / DAY_SECS; }

  update(dt){
    for (const c of this.clouds){
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 100) c.position.x = -100;
    }

    // Daylight for most of the loop, a warm dusk, a short proper night.
    const p = this.dayPhase();
    const sunUp = Math.sin(p * Math.PI * 2 - Math.PI / 2);      // -1 midnight, 1 noon
    const night = THREE.MathUtils.smoothstep(-sunUp, -0.15, 0.45);
    const dusk = Math.max(0, 1 - Math.abs(sunUp - 0.05) / 0.3) * (1 - night * 0.6);
    this.night = night;

    const sky = this.scene.background;
    sky.copy(SKY.day).lerp(SKY.dusk, dusk * 0.7).lerp(SKY.night, night);
    this.scene.fog.color.copy(sky);
    this.sun.intensity = 1.5 * (1 - night * 0.85);
    this.sun.color.setHex(dusk > 0.4 ? 0xffc59a : 0xfff0d6);
    this.hemi.intensity = 0.85 - night * 0.5;
    this.starMat.opacity = night * 0.9;
    setNight(night);
  }

  render(){ this.renderer.render(this.scene, this.camera); }
}

