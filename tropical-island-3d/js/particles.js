// ---------- One pool of soft particles for smoke, sparks, chips and dust ----------
import * as THREE from 'three';

const N = 900;

export class Particles {
  constructor(scene){
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(N * 3);
    this.col = new Float32Array(N * 3);
    this.size = new Float32Array(N);
    this.alpha = new Float32Array(N);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo = geo;

    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uScale: { value: innerHeight / 2 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color;
        uniform float uScale; varying float vA; varying vec3 vC;
        void main(){
          vA = alpha; vC = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA; varying vec3 vC;
        void main(){
          vec2 d = gl_PointCoord - 0.5;
          float r = dot(d, d);
          if (r > 0.25) discard;
          gl_FragColor = vec4(vC, vA * smoothstep(0.25, 0.05, r));
        }`,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);

    this.p = [];
    for (let i = 0; i < N; i++){
      this.p.push({ life: 0, max: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, g: 0, s0: 1, s1: 1, a: 1, drag: 0 });
    }
    this.cursor = 0;
    addEventListener('resize', () => { this.mat.uniforms.uScale.value = innerHeight / 2; });
  }

  /**
   * @param o { x,y,z, vx,vy,vz, life, color, size, grow, alpha, gravity, drag }
   */
  emit(o){
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % N;
    const q = this.p[i];
    q.life = q.max = o.life ?? 1;
    q.x = o.x; q.y = o.y; q.z = o.z;
    q.vx = o.vx ?? 0; q.vy = o.vy ?? 0; q.vz = o.vz ?? 0;
    q.g = o.gravity ?? 0;
    q.s0 = o.size ?? 0.3; q.s1 = q.s0 * (o.grow ?? 1);
    q.a = o.alpha ?? 1;
    q.drag = o.drag ?? 0;
    const c = typeof o.color === 'number' ? new THREE.Color(o.color) : o.color;
    this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
  }

  burst(at, count, color, { up = 3, spread = 2, size = 0.22, life = 0.8, gravity = 9 } = {}){
    for (let k = 0; k < count; k++){
      this.emit({
        x: at.x, y: at.y, z: at.z,
        vx: (Math.random() - 0.5) * spread * 2, vy: up * (0.4 + Math.random() * 0.8), vz: (Math.random() - 0.5) * spread * 2,
        life: life * (0.6 + Math.random() * 0.6), color, size: size * (0.6 + Math.random() * 0.8), gravity,
      });
    }
  }

  smoke(x, y, z, dark = false){
    const v = dark ? 0.35 + Math.random() * 0.1 : 0.78 + Math.random() * 0.12;
    this.emit({
      x: x + (Math.random() - 0.5) * 0.2, y, z: z + (Math.random() - 0.5) * 0.2,
      vx: 0.35 + Math.random() * 0.3, vy: 1.1 + Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.3,
      life: 3.2 + Math.random(), color: new THREE.Color(v, v, v), size: 0.55, grow: 4, alpha: 0.42, drag: 0.3,
    });
  }

  spark(x, y, z){
    this.emit({
      x: x + (Math.random() - 0.5) * 0.4, y, z: z + (Math.random() - 0.5) * 0.4,
      vx: (Math.random() - 0.5) * 0.8, vy: 2 + Math.random() * 2, vz: (Math.random() - 0.5) * 0.8,
      life: 0.7 + Math.random() * 0.5, color: Math.random() < 0.5 ? 0xffc04a : 0xff7a2a, size: 0.12, grow: 0.3, gravity: -0.5,
    });
  }

  update(dt){
    for (let i = 0; i < N; i++){
      const q = this.p[i];
      if (q.life <= 0){ this.pos[i * 3 + 1] = -999; this.alpha[i] = 0; continue; }
      q.life -= dt;
      q.vy -= q.g * dt;
      if (q.drag){ const k = Math.max(0, 1 - q.drag * dt); q.vx *= k; q.vz *= k; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      const f = 1 - Math.max(0, q.life) / q.max;
      this.pos[i * 3] = q.x; this.pos[i * 3 + 1] = q.y; this.pos[i * 3 + 2] = q.z;
      this.size[i] = q.s0 + (q.s1 - q.s0) * f;
      this.alpha[i] = q.a * Math.min(1, (1 - f) * 2.5) * Math.min(1, f * 12 + 0.2);
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = a.size.needsUpdate = a.alpha.needsUpdate = a.color.needsUpdate = true;
  }
}
