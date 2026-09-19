// ---------- Birds, butterflies and fireflies ----------
//
// None of it is playable. All of it is why the island feels inhabited when you
// stand in the grass and look at nothing in particular.

import * as THREE from 'three';
import { hash2 } from './island.js';
import { mat } from './models.js';

const BIRDS = 7;
const BUTTERFLIES = 9;
const FIREFLIES = 40;

function bird(){
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), mat(0x4a4038));
  body.scale.set(1, 0.8, 2.1);
  g.add(body);
  const wings = [];
  for (const s of [-1, 1]){
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.26), mat(0x5b5047));
    w.position.set(s * 0.38, 0.05, 0);
    g.add(w);
    wings.push(w);
  }
  g.userData.wings = wings;
  return g;
}

function butterfly(color){
  const g = new THREE.Group();
  const wings = [];
  for (const s of [-1, 1]){
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.17), new THREE.MeshLambertMaterial({
      color, flatShading:true, side:THREE.DoubleSide, transparent:true, opacity:0.95 }));
    w.position.x = s * 0.1;
    g.add(w);
    wings.push(w);
  }
  g.userData.wings = wings;
  return g;
}

/** A soft round dot, drawn once, used for every firefly. */
function sparkTexture(){
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,245,190,1)');
  grad.addColorStop(0.35, 'rgba(255,220,120,0.55)');
  grad.addColorStop(1, 'rgba(255,200,90,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Wildlife {
  constructor(world){
    this.world = world;
    this.group = new THREE.Group();
    world.scene.add(this.group);

    this.birds = [];
    for (let i = 0; i < BIRDS; i++){
      const m = bird();
      this.group.add(m);
      this.birds.push({
        mesh: m,
        a: hash2(i, 3) * Math.PI * 2,
        r: 14 + hash2(i, 7) * 16,
        y: 11 + hash2(i, 11) * 9,
        speed: 0.14 + hash2(i, 13) * 0.14,
        flap: hash2(i, 17) * 6,
      });
    }

    this.butterflies = [];
    const cols = [0xffd86b, 0xff9dd6, 0x9fe8ff, 0xfff0b0, 0xc9a8ff];
    for (let i = 0; i < BUTTERFLIES; i++){
      const m = butterfly(cols[i % cols.length]);
      this.group.add(m);
      this.butterflies.push({
        mesh: m,
        a: hash2(i, 23) * Math.PI * 2,
        r: 3 + hash2(i, 29) * 12,
        drift: 0.25 + hash2(i, 31) * 0.4,
        bob: hash2(i, 37) * 6,
        flap: hash2(i, 41) * 6,
      });
    }

    // Fireflies are one cloud of points: cheap, and they only show up at dusk.
    const pos = new Float32Array(FIREFLIES * 3);
    this.fly = [];
    for (let i = 0; i < FIREFLIES; i++){
      const a = hash2(i, 43) * Math.PI * 2;
      const r = 2 + hash2(i, 47) * 14;
      this.fly.push({ a, r, y: 0.5 + hash2(i, 53) * 1.6, speed: 0.1 + hash2(i, 59) * 0.25, ph: hash2(i, 61) * 6 });
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = this.fly[i].y;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.fireflies = new THREE.Points(geo, new THREE.PointsMaterial({
      map: sparkTexture(), size: 0.55, sizeAttenuation: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0,
    }));
    this.fireflies.frustumCulled = false;
    this.group.add(this.fireflies);
  }

  update(dt, t, night){
    for (const b of this.birds){
      b.a += b.speed * dt;
      b.flap += dt * 9;
      const x = Math.cos(b.a) * b.r, z = Math.sin(b.a) * b.r;
      b.mesh.position.set(x, b.y + Math.sin(b.a * 2.3) * 1.2, z);
      b.mesh.rotation.y = -b.a + Math.PI / 2;
      b.mesh.rotation.z = Math.sin(b.a * 2.3) * 0.2;
      const lift = Math.sin(b.flap) * 0.6;
      b.mesh.userData.wings[0].rotation.z = -lift;
      b.mesh.userData.wings[1].rotation.z = lift;
      b.mesh.visible = night < 0.7;          // they roost once it is properly dark
    }

    for (const f of this.butterflies){
      f.a += f.drift * dt;
      f.bob += dt * 1.7;
      f.flap += dt * 22;
      const wobble = Math.sin(f.bob * 1.7) * 1.2;
      f.mesh.position.set(
        Math.cos(f.a) * (f.r + wobble),
        0.9 + Math.sin(f.bob) * 0.45,
        Math.sin(f.a) * (f.r + wobble),
      );
      f.mesh.rotation.y = -f.a;
      const open = 0.5 + Math.abs(Math.sin(f.flap)) * 0.9;
      f.mesh.userData.wings[0].rotation.y = open;
      f.mesh.userData.wings[1].rotation.y = -open;
      f.mesh.visible = night < 0.45;
    }

    const pos = this.fireflies.geometry.attributes.position;
    this.fireflies.material.opacity = Math.max(0, night - 0.25) * 1.2;
    if (this.fireflies.material.opacity > 0.01){
      for (let i = 0; i < this.fly.length; i++){
        const f = this.fly[i];
        f.a += f.speed * dt * 0.35;
        f.ph += dt * (1.4 + (i % 5) * 0.2);
        pos.setXYZ(i,
          Math.cos(f.a) * f.r + Math.sin(f.ph * 0.7) * 0.6,
          f.y + Math.sin(f.ph) * 0.35,
          Math.sin(f.a) * f.r + Math.cos(f.ph * 0.5) * 0.6);
      }
      pos.needsUpdate = true;
    }
    this.fireflies.visible = this.fireflies.material.opacity > 0.01;
  }
}
