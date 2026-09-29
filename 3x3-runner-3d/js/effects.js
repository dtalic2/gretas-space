// ---------- Particles ----------
// One Points cloud per look (sparkles, confetti, dust), each a single draw call.

import * as THREE from 'three';

class Cloud {
  constructor(scene, max, size, tex, blending = THREE.NormalBlending){
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.i = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo = geo;
    const mat = new THREE.PointsMaterial({ size, map:tex, vertexColors:true, transparent:true,
      depthWrite:false, blending, sizeAttenuation:true, alphaTest:0.01 });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    for (let k = 0; k < max; k++) this.pos[k * 3 + 1] = -999;
    scene.add(this.points);
  }

  emit(x, y, z, vx, vy, vz, color, life, grav, drag = 0){
    const k = this.i; this.i = (this.i + 1) % this.max;
    this.pos.set([x, y, z], k * 3);
    this.vel.set([vx, vy, vz], k * 3);
    this.col.set([color.r, color.g, color.b], k * 3);
    this.life[k] = life; this.grav[k] = grav; this.drag[k] = drag;
  }

  update(dt){
    const p = this.pos, v = this.vel;
    for (let k = 0; k < this.max; k++){
      if (this.life[k] <= 0) continue;
      this.life[k] -= dt;
      if (this.life[k] <= 0){ p[k * 3 + 1] = -999; continue; }
      const d = 1 - this.drag[k] * dt;
      v[k * 3] *= d; v[k * 3 + 2] *= d;
      v[k * 3 + 1] -= this.grav[k] * dt;
      p[k * 3] += v[k * 3] * dt; p[k * 3 + 1] += v[k * 3 + 1] * dt; p[k * 3 + 2] += v[k * 3 + 2] * dt;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}

function dotTex(soft){
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  if (soft){
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  } else {
    x.fillStyle = '#fff'; x.fillRect(12, 20, 40, 24);
  }
  return new THREE.CanvasTexture(c);
}

const tmp = new THREE.Color();

export class Effects {
  constructor(scene){
    this.spark = new Cloud(scene, 500, 0.35, dotTex(true), THREE.AdditiveBlending);
    this.confetti = new Cloud(scene, 500, 0.3, dotTex(false));
    this.dust = new Cloud(scene, 300, 0.7, dotTex(true));
    this.dust.points.material.opacity = 0.55;
  }

  sparkle(x, y, z, color = 0xffd54a, n = 10, speed = 3){
    tmp.set(color);
    for (let i = 0; i < n; i++){
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.spark.emit(x, y, z, Math.cos(a) * Math.cos(b) * s, Math.sin(b) * s + 1, Math.sin(a) * Math.cos(b) * s,
        tmp, 0.35 + Math.random() * 0.3, 4, 2);
    }
  }

  burstConfetti(x, y, z, n = 80, forward = 0){
    const colors = [0xff4fa3, 0x3a86ff, 0xffb703, 0x06d6a0, 0xffffff, 0x8338ec, 0xff7b00];
    for (let i = 0; i < n; i++){
      tmp.set(colors[i % colors.length]);
      const a = Math.random() * Math.PI * 2;
      const s = 3 + Math.random() * 6;
      this.confetti.emit(x + (Math.random() - 0.5) * 4, y + Math.random() * 2, z,
        Math.cos(a) * s, 4 + Math.random() * 7, Math.sin(a) * s * 0.5 + forward,
        tmp, 1.2 + Math.random() * 1.0, 9, 1.5);
    }
  }

  puff(x, y, z, color = 0xd8d2c8, n = 6){
    tmp.set(color);
    for (let i = 0; i < n; i++){
      this.dust.emit(x + (Math.random() - 0.5) * 0.6, y, z + Math.random() * 0.5,
        (Math.random() - 0.5) * 2, 0.5 + Math.random() * 1.2, 1 + Math.random() * 2, tmp, 0.4 + Math.random() * 0.3, 0.5, 2);
    }
  }

  stars(x, y, z){
    for (let i = 0; i < 24; i++){
      tmp.setHSL(0.13 + Math.random() * 0.05, 1, 0.6);
      const a = i / 24 * Math.PI * 2;
      this.spark.emit(x, y, z, Math.cos(a) * 5, 3 + Math.random() * 3, Math.sin(a) * 5, tmp, 0.8, 6, 1);
    }
  }

  flame(x, y, z){
    for (let i = 0; i < 3; i++){
      tmp.setHSL(0.05 + Math.random() * 0.08, 1, 0.55);
      this.spark.emit(x + (Math.random() - 0.5) * 0.3, y, z, (Math.random() - 0.5), -2 - Math.random() * 3, 4 + Math.random() * 3, tmp, 0.3, 0, 0);
    }
  }

  update(dt){ this.spark.update(dt); this.confetti.update(dt); this.dust.update(dt); }
}
