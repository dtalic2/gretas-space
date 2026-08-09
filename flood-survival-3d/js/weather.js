// ---------- Sky, light, rain, thunder ----------
//
// Everything visual here is a pure function of the day counter, so the look of
// the world and the height of the water can never disagree about what day it is.
// Day 1 is drizzle over a normal valley; day 10 is a black downpour.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = (v, a, b) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// A day is dawn -> noon -> sunset -> midnight -> dawn, with daylight taking the
// first two thirds. Nights are short on purpose: the game is about the work you
// get done, and a long dark stretch is just waiting.
const SUNSET = 2 / 3;

const P = {
  // Day is deliberately brighter than a real overcast sky: ACES tone mapping
  // eats the midtones, and a working day has to be a working day.
  day:   { top:0x5793c0, mid:0xa6c8da, bot:0xd9e6ea, fog:0xbdcfd6, sun:0xfff0d2, sunI:1.55,
           hemiSky:0xc2dcea, hemiGnd:0x5c6b46, hemiI:0.95, deep:0x123746, shallow:0x4a6b55, tint:0xa2c9e0 },
  dusk:  { top:0x2a3358, mid:0xa9738a, bot:0xe0a487, fog:0xc08f7e, sun:0xff9f68, sunI:0.85,
           hemiSky:0xd49a8e, hemiGnd:0x453a2c, hemiI:0.50, deep:0x1a2b3e, shallow:0x5c5a4a, tint:0xc08a7c },
  night: { top:0x050912, mid:0x0d1628, bot:0x1a2436, fog:0x121a28, sun:0x9db4e8, sunI:0.30,
           hemiSky:0x2b3a5c, hemiGnd:0x131a16, hemiI:0.32, deep:0x07141e, shallow:0x16241d, tint:0x2a3a52 },
  // What the whole palette drifts toward as the storm builds.
  storm: { top:0x4a545c, mid:0x6d7880, bot:0x8b959d, fog:0x808b93, sun:0xbcc8d0, sunI:0.62,
           hemiSky:0x8b959f, hemiGnd:0x3d4639, hemiI:0.62, deep:0x14262e, shallow:0x3f4f45, tint:0x6c7a84 },
};

/** Storm strength for a given day: a rising baseline with gusts on top. */
function rainAt(day){
  const ramp = 0.22 + 0.66 * Math.pow(clamp01(day / 10), 0.9);
  const gust = 0.22 * Math.sin(day * TAU * 3.1) + 0.14 * Math.sin(day * TAU * 7.7 + 2.0);
  return clamp01(ramp + gust);
}

export class Weather {
  constructor(scene){
    this.scene = scene;
    this.rain = 0.3;
    this.night = 0;
    this.flash = 0;
    this.thunderQueue = [];

    this.skyTint = new THREE.Color();
    this.sunDir = new THREE.Vector3(0.4, 0.7, 0.3);
    this.sunColor = new THREE.Color();
    this.fogColor = new THREE.Color();
    this.waterDeep = new THREE.Color();
    this.waterShallow = new THREE.Color();
    this.fogNear = 34;
    this.fogFar = 145;

    this._buildSky(scene);
    this._buildLights(scene);
    this._buildRain(scene);
    this._buildClouds(scene);

    this._tmp = { a: new THREE.Color(), b: new THREE.Color() };
  }

  _buildSky(scene){
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x3f6f96) },
        mid: { value: new THREE.Color(0x83a8bc) },
        bot: { value: new THREE.Color(0xbdd0d6) },
        flash: { value: 0 },
      },
      vertexShader: `
        varying vec3 vP;
        void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform float flash;
        varying vec3 vP;
        void main(){
          float h = normalize(vP).y;
          vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.72)) : mix(mid, bot, pow(-h, 0.55));
          gl_FragColor = vec4(c + flash * 0.55, 1.0);
        }`,
    });
    this.skyUniforms = mat.uniforms;
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(240, 32, 20), mat));

    // Moon. Only visible once the sky is dark enough for it to matter.
    this.moon = new THREE.Mesh(
      new THREE.SphereGeometry(5, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xdfe6f5, transparent: true, opacity: 0 }),
    );
    scene.add(this.moon);
  }

  _buildLights(scene){
    this.hemi = new THREE.HemisphereLight(0xaac6d6, 0x4d5a3c, 0.74);
    scene.add(this.hemi);

    const sun = new THREE.DirectionalLight(0xffe9c4, 1.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 180;
    const s = 46;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0007;
    sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);
    this.sun = sun;

    // Lightning gets its own light so a flash reads on the ground, not just the sky.
    this.bolt = new THREE.DirectionalLight(0xdce8ff, 0);
    this.bolt.position.set(-40, 70, -30);
    scene.add(this.bolt);
  }

  /**
   * Rain as camera-locked line segments, animated entirely in the vertex shader.
   * Falling 4000 streaks on the CPU would show up in the frame time on a phone;
   * this way the attributes never change after upload.
   */
  _buildRain(scene){
    const N = 3600, BOX = 70, H = 34;
    const pos = new Float32Array(N * 2 * 3);
    const tip = new Float32Array(N * 2);
    const seed = new Float32Array(N * 2);

    for (let i = 0; i < N; i++){
      const x = (Math.random() - 0.5) * BOX;
      const y = Math.random() * H;
      const z = (Math.random() - 0.5) * BOX;
      const s = 0.6 + Math.random() * 0.8;
      for (let k = 0; k < 2; k++){
        const o = (i * 2 + k) * 3;
        pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
        tip[i * 2 + k] = k;
        seed[i * 2 + k] = s;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('tip', new THREE.BufferAttribute(tip, 1));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        time:      { value: 0 },
        origin:    { value: new THREE.Vector3() },
        intensity: { value: 0.3 },
        tint:      { value: new THREE.Color(0xbfd4e0) },
        boxH:      { value: H },
      },
      vertexShader: `
        attribute float tip;
        attribute float seed;
        uniform float time; uniform vec3 origin; uniform float intensity; uniform float boxH;
        varying float vA;
        void main(){
          vec3 p = position;
          float speed = 26.0 * seed * (0.6 + intensity * 0.7);
          p.y = mod(p.y - time * speed, boxH);
          // Wind shear: streaks lean more the harder it comes down.
          float lean = 2.6 * intensity;
          p.x += (boxH - p.y) * lean * 0.06;
          // Second vertex trails behind along the fall direction.
          float len = (0.5 + intensity * 1.5) * seed;
          p.y += tip * len;
          p.x -= tip * len * lean * 0.06;
          p += origin;
          // Fade out the drops nearest the camera; they otherwise smear the view.
          vA = intensity * smoothstep(1.5, 7.0, length(p - cameraPosition));
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 tint; varying float vA;
        void main(){ gl_FragColor = vec4(tint, vA * 0.42); }`,
    });

    this.rainUniforms = mat.uniforms;
    this.rainMesh = new THREE.LineSegments(geo, mat);
    this.rainMesh.frustumCulled = false;
    scene.add(this.rainMesh);
  }

  _buildClouds(scene){
    this.clouds = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x5d666e, transparent: true, opacity: 0.85, flatShading: true });
    for (let i = 0; i < 22; i++){
      const puff = new THREE.Group();
      const lumps = 3 + (i % 3);
      for (let k = 0; k < lumps; k++){
        const r = 7 + Math.random() * 9;
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
        m.position.set((k - lumps / 2) * r * 1.1, Math.random() * r * 0.3, Math.random() * r * 0.4);
        m.scale.y = 0.42;
        puff.add(m);
      }
      const a = Math.random() * TAU, d = 30 + Math.random() * 120;
      puff.position.set(Math.cos(a) * d, 52 + Math.random() * 22, Math.sin(a) * d);
      puff.userData.drift = 0.7 + Math.random() * 1.1;
      this.clouds.add(puff);
    }
    this.cloudMat = mat;
    scene.add(this.clouds);
  }

  /** Blend a palette field across day/dusk/night, then toward the storm look. */
  _mixColor(field, w, out){
    const { a, b } = this._tmp;
    a.setHex(P.night[field]);
    b.setHex(P.day[field]);
    a.lerp(b, w.day);
    b.setHex(P.dusk[field]);
    a.lerp(b, w.dusk);
    b.setHex(P.storm[field]);
    a.lerp(b, w.storm);
    return out.copy(a);
  }

  _mixNum(field, w){
    const n = P.night[field], d = P.day[field];
    let v = n + (d - n) * w.day;
    v += (P.dusk[field] - v) * w.dusk;
    v += (P.storm[field] - v) * w.storm;
    return v;
  }

  update(dt, day, camera, audio){
    const frac = day - Math.floor(day);
    // One continuous arc: above the horizon for the first two thirds of the day,
    // below it for the last third. The daytime half is raised to a fractional
    // power so the sun clears the horizon quickly and the middle of the day sits
    // near full brightness — otherwise two thirds of every day reads as dusk.
    const ang = frac <= SUNSET
      ? Math.PI * (frac / SUNSET)
      : Math.PI * (1 + (frac - SUNSET) / (1 - SUNSET));
    const s = Math.sin(ang);
    const e = s > 0 ? Math.pow(s, 0.45) : s * 0.9;

    this.rain = rainAt(day);
    this.night = 1 - smooth(e, -0.05, 0.25);

    const w = {
      day: smooth(e, -0.05, 0.25),
      dusk: smooth(0.30 - Math.abs(e), 0, 0.30) * smooth(0.35 - e, 0, 0.35),
      storm: this.rain * 0.78,
    };

    // ---- sky + fog ----
    this._mixColor('top', w, this.skyUniforms.top.value);
    this._mixColor('mid', w, this.skyUniforms.mid.value);
    this._mixColor('bot', w, this.skyUniforms.bot.value);
    this._mixColor('fog', w, this.fogColor);
    this._mixColor('tint', w, this.skyTint);
    this._mixColor('deep', w, this.waterDeep);
    this._mixColor('shallow', w, this.waterShallow);
    this._mixColor('sun', w, this.sunColor);

    this.fogNear = 28 - this.rain * 12;
    this.fogFar = 165 - this.rain * 85 - this.night * 30;
    if (this.scene.fog){
      this.scene.fog.color.copy(this.fogColor);
      this.scene.fog.near = this.fogNear;
      this.scene.fog.far = this.fogFar;
    }

    // ---- sun / moon ----
    const azim = -0.6 + frac * TAU * 0.35;
    this.sunDir.set(Math.cos(azim) * 0.75, Math.max(0.12, e), Math.sin(azim) * 0.75).normalize();
    const c = camera.position;
    this.sun.position.set(c.x + this.sunDir.x * 90, c.y + Math.max(14, e * 90), c.z + this.sunDir.z * 90);
    this.sun.target.position.set(c.x, 0, c.z);
    this.sun.target.updateMatrixWorld();
    this.sun.color.copy(this.sunColor);
    this.sun.intensity = this._mixNum('sunI', w);

    this.hemi.intensity = this._mixNum('hemiI', w);
    this._mixColor('hemiSky', w, this.hemi.color);
    this._mixColor('hemiGnd', w, this.hemi.groundColor);

    this.moon.position.set(c.x - this.sunDir.x * 150, c.y + 60, c.z - this.sunDir.z * 150);
    this.moon.material.opacity = this.night * (1 - this.rain) * 0.9;

    // ---- rain ----
    const u = this.rainUniforms;
    u.time.value += dt;
    u.intensity.value += (this.rain - u.intensity.value) * Math.min(1, dt * 1.5);
    u.tint.value.copy(this.fogColor).lerp(new THREE.Color(0xffffff), 0.55);
    // Snap the box to the camera so it always surrounds the player, and snap on a
    // grid so drops don't visibly slide sideways as you walk.
    u.origin.value.set(
      Math.round((c.x - 35) / 4) * 4,
      Math.round((c.y - 12) / 4) * 4,
      Math.round((c.z - 35) / 4) * 4,
    );
    this.rainMesh.visible = this.rain > 0.03;

    // ---- clouds ----
    this.cloudMat.color.copy(this.fogColor).multiplyScalar(0.85);
    this.cloudMat.opacity = 0.5 + this.rain * 0.45;
    for (const puff of this.clouds.children){
      puff.position.x += puff.userData.drift * dt * (1 + this.rain);
      if (puff.position.x > 150) puff.position.x = -150;
    }
    this.clouds.position.set(c.x * 0.85, 0, c.z * 0.85);

    // ---- lightning ----
    this.flash = Math.max(0, this.flash - dt * 4.5);
    if (this.rain > 0.55 && Math.random() < dt * (0.06 + this.rain * 0.22)){
      this.flash = 0.7 + Math.random() * 0.5;
      // Thunder arrives after the light, which is most of why it feels distant.
      this.thunderQueue.push(0.4 + Math.random() * 2.2);
    }
    this.bolt.intensity = this.flash * 3.4;
    this.skyUniforms.flash.value = this.flash * 0.8;

    for (let i = this.thunderQueue.length - 1; i >= 0; i--){
      this.thunderQueue[i] -= dt;
      if (this.thunderQueue[i] <= 0){
        this.thunderQueue.splice(i, 1);
        audio?.thunder();
      }
    }
  }

  /** Label for the HUD. */
  label(){
    if (this.rain > 0.72) return { ico: '⛈️', text: 'Downpour' };
    if (this.rain > 0.42) return { ico: '🌧️', text: 'Rain' };
    if (this.night > 0.6) return { ico: '🌙', text: 'Night' };
    return { ico: '🌥️', text: 'Drizzle' };
  }
}
