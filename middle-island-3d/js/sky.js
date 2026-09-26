// ---------- Sky, sun, stars and the turning of the day ----------
//
// Everything here is a function of one number: `t`, how far through the day we
// are (0 = dawn). The sky, the light, the fog and the clock on the HUD all read
// it, so they cannot drift apart.
import * as THREE from 'three';
import { DAY_SPLIT } from './econ.js';
import { rng } from './terrain.js';

/** Clock hour (0–24) for a fraction of the day. Daylight is stretched. */
export function hourOf(t){
  return t < DAY_SPLIT ? 6 + (t / DAY_SPLIT) * 14 : (20 + ((t - DAY_SPLIT) / (1 - DAY_SPLIT)) * 10) % 24;
}

/** 0 at noon, 1 in the dead of night, eased across dusk and dawn. */
export function nightOf(t){
  const h = hourOf(t);
  const hh = h < 6 ? h + 24 : h;          // 6 → 30
  // Dusk 18.5–21, dawn 4.5–7 (i.e. 28.5–31)
  if (hh < 18.5) return hh < 7 ? 1 - (hh - 4.5) / 2.5 : 0;
  if (hh < 21) return (hh - 18.5) / 2.5;
  if (hh < 28.5) return 1;
  return 1 - (hh - 28.5) / 2.5;
}

export function isNight(t){ return nightOf(t) > 0.55; }

export function clockText(t){
  const h = hourOf(t);
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 10) * 10;
  const part = h < 5 || h >= 20.5 ? 'night' : h < 8 ? 'dawn' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return { time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, part };
}

const PAL = {
  day:   { top: new THREE.Color(0x3f86d8), hor: new THREE.Color(0xbfe2f6), sun: new THREE.Color(0xfff2d6), amb: 1.0 },
  dusk:  { top: new THREE.Color(0x3a4c8a), hor: new THREE.Color(0xf6a36b), sun: new THREE.Color(0xffa060), amb: 0.6 },
  night: { top: new THREE.Color(0x070c1e), hor: new THREE.Color(0x1d2c4f), sun: new THREE.Color(0x8aa0e0), amb: 0.28 },
};

export class Sky {
  constructor(scene){
    this.scene = scene;

    // Gradient dome.
    this.uni = {
      uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() },
    };
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(420, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: this.uni, side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSunDir; uniform vec3 uSunCol; varying vec3 vDir;
          void main(){
            float h = clamp(vDir.y, -0.2, 1.0);
            vec3 c = mix(uHor, uTop, pow(max(h, 0.0), 0.55));
            float s = max(dot(vDir, uSunDir), 0.0);
            c += uSunCol * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.25);
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    dome.renderOrder = -1;
    scene.add(dome);
    this.dome = dome;

    // Stars.
    const r = rng(77);
    const starPos = [];
    for (let i = 0; i < 900; i++){
      const u = r() * 2 - 1, th = r() * Math.PI * 2;
      const y = Math.abs(u) * 0.9 + 0.08;
      const s = Math.sqrt(1 - y * y);
      starPos.push(Math.cos(th) * s * 400, y * 400, Math.sin(th) * s * 400);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starMat);
    scene.add(this.stars);

    // Moon.
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 12), new THREE.MeshBasicMaterial({ color: 0xeef2ff, fog: false, transparent: true }));
    scene.add(this.moon);

    // Lights.
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5c7040, 0.9);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 220;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // Clouds: flattened puffs that drift across.
    this.clouds = new THREE.Group();
    const cmat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.92 });
    this.cloudMat = cmat;
    const puff = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 16; i++){
      const c = new THREE.Group();
      const n = 3 + Math.floor(r() * 4);
      for (let j = 0; j < n; j++){
        const m = new THREE.Mesh(puff, cmat);
        const s = 4 + r() * 5;
        m.scale.set(s * 1.6, s * 0.7, s);
        m.position.set((j - n / 2) * 5 + r() * 3, r() * 2, r() * 4);
        c.add(m);
      }
      c.position.set((r() - 0.5) * 360, 55 + r() * 25, (r() - 0.5) * 360);
      c.userData.v = 1.2 + r() * 1.5;
      this.clouds.add(c);
    }
    scene.add(this.clouds);

    this.fogCol = new THREE.Color();
    this._c1 = new THREE.Color();
    this._c2 = new THREE.Color();
  }

  update(dt, t, focus){
    const night = nightOf(t);
    const h = hourOf(t);
    // Dusk-ness peaks at the edges of the night.
    const dusk = Math.max(0, 1 - Math.abs(night - 0.5) * 2) * (night > 0 && night < 1 ? 1 : 0);

    const top = this._c1.copy(PAL.day.top).lerp(PAL.night.top, night).lerp(PAL.dusk.top, dusk * 0.5);
    const hor = this._c2.copy(PAL.day.hor).lerp(PAL.night.hor, night).lerp(PAL.dusk.hor, dusk * 0.8);
    this.uni.uTop.value.copy(top);
    this.uni.uHor.value.copy(hor);
    this.fogCol.copy(hor);
    this.scene.fog.color.copy(hor);

    // The sun rises in the east (+x) at 6 and sets in the west at 20.
    const dayFrac = THREE.MathUtils.clamp((h - 6) / 14, 0, 1);
    const ang = dayFrac * Math.PI;
    const sunDir = new THREE.Vector3(Math.cos(ang), Math.sin(ang) * 0.9 + 0.05, -0.35).normalize();
    this.uni.uSunDir.value.copy(sunDir);
    this.uni.uSunCol.value.copy(PAL.day.sun).lerp(PAL.dusk.sun, dusk).multiplyScalar(1 - night);

    // At night the "sun" light is the moon, across the sky from where the sun set.
    const hn = h < 6 ? h + 24 : h;
    const moonFrac = THREE.MathUtils.clamp((hn - 19) / 12, 0, 1);
    const mang = moonFrac * Math.PI;
    const moonDir = new THREE.Vector3(Math.cos(mang), Math.sin(mang) * 0.8 + 0.1, 0.3).normalize();
    const lightDir = night > 0.5 ? moonDir : sunDir;

    this.sun.position.copy(focus).addScaledVector(lightDir, 110);
    this.sun.target.position.copy(focus);
    this.sun.color.copy(PAL.day.sun).lerp(PAL.dusk.sun, dusk).lerp(PAL.night.sun, night);
    this.sun.intensity = THREE.MathUtils.lerp(2.3, 0.35, night) * (1 - dusk * 0.3);
    this.hemi.intensity = THREE.MathUtils.lerp(0.95, 0.42, night);
    this.hemi.color.copy(PAL.day.hor).lerp(PAL.night.top, night * 0.7);

    this.moon.position.copy(focus).addScaledVector(moonDir, 360);
    this.moon.material.opacity = THREE.MathUtils.smoothstep(night, 0.2, 0.8);
    this.starMat.opacity = THREE.MathUtils.smoothstep(night, 0.3, 1);
    this.dome.position.copy(focus).setY(0);
    this.stars.position.copy(this.dome.position);

    this.cloudMat.color.setRGB(1, 1, 1).lerp(PAL.dusk.hor, dusk * 0.5).multiplyScalar(1 - night * 0.7);
    for (const c of this.clouds.children){
      c.position.x += c.userData.v * dt;
      if (c.position.x > 200) c.position.x = -200;
    }
    return night;
  }
}
