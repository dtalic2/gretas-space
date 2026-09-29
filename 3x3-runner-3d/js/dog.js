// ---------- Dogs, built from primitives, with outfits and a run cycle ----------
// The dog faces -Z (the way the road runs). Every breed comes out of one builder,
// driven by the parameters in data.js.

import * as THREE from 'three';
import { OUTFITS } from './data.js';

const matCache = new Map();
function mat(color, { rough = 0.75, metal = 0, emissive = 0, ei = 0 } = {}){
  const k = `${color}|${rough}|${metal}|${emissive}|${ei}`;
  if (!matCache.has(k)){
    matCache.set(k, new THREE.MeshStandardMaterial({
      color, roughness:rough, metalness:metal, emissive, emissiveIntensity:ei,
      envMapIntensity: metal > 0.5 ? 1 : 0.45,   // fur shouldn't pick up much sky tint
    }));
  }
  return matCache.get(k);
}

function mesh(geo, material, { x=0, y=0, z=0, sx=1, sy=1, sz=1, rx=0, ry=0, rz=0, shadow=true } = {}){
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  m.castShadow = shadow;
  return m;
}

const SPHERE = new THREE.SphereGeometry(1, 20, 14);
const SPHERE_LO = new THREE.SphereGeometry(1, 10, 8);

export const DOG_SCALE = 1.3;

/**
 * Build a dog.
 * @param {object} def   entry from DOGS
 * @param {object} wear  { hat, eyes, neck, back } outfit ids
 * @param {object} opts  { tint } recolours the coat (rivals)
 */
export function buildDog(def, wear = {}, opts = {}){
  const coat = opts.tint ?? def.body;
  const fur = mat(coat, { rough:0.85 });
  const belly = mat(opts.tint ? lighten(opts.tint, 0.35) : def.belly, { rough:0.9 });
  const earM = mat(opts.tint ? darken(opts.tint, 0.25) : def.ears, { rough:0.85 });
  const dark = mat(0x151515, { rough:0.3 });
  const noseM = mat(def.nose, { rough:0.25 });
  const white = mat(0xffffff, { rough:0.3, emissive:0xffffff, ei:0.3 });
  const tongueM = mat(0xff6b8a, { rough:0.5 });

  const legLen = def.legLen ?? 1;
  const long = def.long ?? 1;
  const chubby = def.chubby ?? 1;
  const snout = def.snout ?? 1;

  const legH = 0.34 * legLen;
  const bodyY = legH + 0.22;
  const bodyR = 0.24 * chubby;
  const bodyLen = 0.6 * long;

  const root = new THREE.Group();
  const pivot = new THREE.Group();        // lean / squash / flip
  root.add(pivot);
  const inner = new THREE.Group();        // everything above ground, bobs
  pivot.add(inner);

  // --- body ---
  const bodyGeo = new THREE.CapsuleGeometry(bodyR, bodyLen, 8, 16);
  const body = mesh(bodyGeo, fur, { y:bodyY, rx:Math.PI / 2 });
  inner.add(body);
  inner.add(mesh(SPHERE, belly, { y:bodyY - bodyR * 0.35, z:-bodyLen * 0.25,
    sx:bodyR * 0.85, sy:bodyR * 0.75, sz:bodyR * 1.3 }));
  if (def.patch && !opts.tint){
    inner.add(mesh(SPHERE, mat(def.patch), { y:bodyY + 0.02, z:-bodyLen / 2 - bodyR * 0.45,
      sx:bodyR * 0.8, sy:bodyR * 0.85, sz:bodyR * 0.55 }));
  }
  if (def.spots && !opts.tint){
    const spotM = mat(def.spots);
    const rng = mulberry(7);
    for (let i = 0; i < 16; i++){
      const a = rng() * Math.PI * 2 - Math.PI;
      if (Math.abs(a) > 2.2) continue;               // keep off the belly
      const z = (rng() - 0.5) * (bodyLen + bodyR);
      const r = bodyR * 1.0;
      const s = 0.035 + rng() * 0.03;
      inner.add(mesh(SPHERE_LO, spotM, { x:Math.sin(a) * r, y:bodyY + Math.cos(a) * r, z,
        sx:s, sy:s, sz:s * 1.2, shadow:false }));
    }
  }
  if (def.fluffy){
    // a ruff of fur round the neck
    for (let i = 0; i < 7; i++){
      const a = (i / 6) * Math.PI - Math.PI / 2;
      inner.add(mesh(SPHERE_LO, i % 2 ? belly : fur, {
        x:Math.sin(a) * bodyR * 0.9, y:bodyY + 0.08 + Math.cos(a) * bodyR * 0.55,
        z:-bodyLen / 2 - 0.02, sx:0.12, sy:0.12, sz:0.1 }));
    }
  }

  // --- legs ---
  const legs = [];
  const legGeo = new THREE.CapsuleGeometry(0.068, legH, 4, 8);
  const hipZ = bodyLen / 2 * 0.85;
  for (const [x, z, front] of [[-1, -hipZ, true], [1, -hipZ, true], [-1, hipZ, false], [1, hipZ, false]]){
    const hip = new THREE.Group();
    hip.position.set(x * bodyR * 0.55, bodyY - 0.06, z);
    const leg = mesh(legGeo, fur, { y:-legH / 2 });
    hip.add(leg);
    const paw = mesh(SPHERE, front && def.patch ? mat(def.patch) : belly, { y:-legH - 0.02, z:-0.03,
      sx:0.085, sy:0.06, sz:0.11 });
    hip.add(paw);
    inner.add(hip);
    legs.push({ hip, front, side:x });
  }

  // --- head ---
  const head = new THREE.Group();
  head.position.set(0, bodyY + 0.3, -(bodyLen / 2 + bodyR * 0.55));
  inner.add(head);
  const headR = 0.25;
  head.add(mesh(SPHERE, fur, { sx:headR, sy:headR * 0.95, sz:headR }));
  // cheeks
  head.add(mesh(SPHERE, belly, { y:-0.07, z:-0.1, sx:0.17, sy:0.12, sz:0.14 }));
  // snout
  const snoutLen = 0.13 * snout;
  const muzzleM = def.mask ? mat(opts.tint ? darken(opts.tint, 0.3) : def.mask) : belly;
  head.add(mesh(SPHERE, muzzleM, { y:-0.07, z:-0.2 - snoutLen * 0.5,
    sx:0.12, sy:0.095, sz:0.08 + snoutLen }));
  head.add(mesh(SPHERE, noseM, { y:-0.03, z:-0.2 - snoutLen * 1.45 - 0.02, sx:0.055, sy:0.042, sz:0.04 }));
  // tongue, pops out while running
  const tongue = mesh(SPHERE, tongueM, { y:-0.15, z:-0.2 - snoutLen, sx:0.045, sy:0.02, sz:0.07, rx:0.5 });
  head.add(tongue);
  // eyes
  const eyes = [];
  for (const s of [-1, 1]){
    const e = new THREE.Group();
    e.position.set(s * 0.1, 0.05, -0.2);
    e.add(mesh(SPHERE, dark, { sx:0.052, sy:0.06, sz:0.04 }));
    e.add(mesh(SPHERE_LO, white, { x:s * -0.012, y:0.022, z:-0.03, sx:0.017, sy:0.017, sz:0.01, shadow:false }));
    head.add(e);
    eyes.push(e);
  }
  // brows for the malamute's mask
  if (def.maskLight){
    for (const s of [-1, 1]) head.add(mesh(SPHERE_LO, belly, { x:s * 0.1, y:0.12, z:-0.19, sx:0.05, sy:0.025, sz:0.02 }));
    head.add(mesh(SPHERE, belly, { y:0.02, z:-0.15, sx:0.06, sy:0.16, sz:0.12 }));
  }

  // ears
  const ears = [];
  const es = def.earScale ?? 1;
  for (const s of [-1, 1]){
    const ep = new THREE.Group();
    if (def.earType === 'floppy'){
      ep.position.set(s * 0.19, 0.13, 0.02);
      ep.add(mesh(SPHERE, earM, { x:s * 0.03, y:-0.13, sx:0.06, sy:0.15, sz:0.1 }));
      ep.rotation.z = s * 0.15;
    } else if (def.earType === 'fold'){
      ep.position.set(s * 0.15, 0.17, -0.02);
      ep.add(mesh(SPHERE, earM, { x:s * 0.04, y:-0.02, z:-0.03, sx:0.07, sy:0.035, sz:0.07, rz:s * 0.6 }));
    } else {
      ep.position.set(s * 0.13, 0.18, 0.02);
      const cone = mesh(new THREE.ConeGeometry(0.085 * es, 0.2 * es, 4), earM, { y:0.09 * es, ry:Math.PI / 4 });
      ep.add(cone);
      ep.add(mesh(new THREE.ConeGeometry(0.05 * es, 0.13 * es, 4), belly, { y:0.07 * es, z:-0.03, ry:Math.PI / 4, shadow:false }));
      ep.rotation.z = -s * 0.28;
    }
    head.add(ep);
    ears.push({ g:ep, side:s, base:ep.rotation.clone() });
  }

  // --- tail ---
  const tail = new THREE.Group();
  tail.position.set(0, bodyY + 0.08, bodyLen / 2 + bodyR * 0.8);
  inner.add(tail);
  if (def.tail === 'curl'){
    const t = mesh(new THREE.TorusGeometry(0.1, 0.045 * (def.fluffy ? 1.5 : 1), 8, 14, Math.PI * 1.6), fur,
      { y:0.12, z:-0.02, ry:Math.PI / 2, rz:-0.6 });
    tail.add(t);
  } else if (def.tail === 'stub'){
    tail.add(mesh(SPHERE, fur, { y:0.02, sx:0.07, sy:0.07, sz:0.07 }));
  } else {
    const r = def.tail === 'plume' ? 0.07 : 0.042;
    const t = mesh(new THREE.CapsuleGeometry(r, 0.26, 4, 8), fur, { y:0.14, z:0.08, rx:-0.6 });
    tail.add(t);
    if (def.tailTip && !opts.tint) tail.add(mesh(SPHERE_LO, mat(def.tailTip), { y:0.3, z:0.17, sx:0.05, sy:0.07, sz:0.05 }));
  }

  // --- outfit anchors ---
  const anchors = {
    hat: new THREE.Group(), eyes: new THREE.Group(), neck: new THREE.Group(), back: new THREE.Group(),
  };
  anchors.hat.position.set(0, headR * 0.85, 0.02);
  anchors.eyes.position.set(0, 0.05, -0.23);
  head.add(anchors.hat, anchors.eyes);
  anchors.neck.position.set(0, bodyY + 0.15, -bodyLen / 2 - bodyR * 0.25);
  anchors.back.position.set(0, bodyY + bodyR * 0.95, 0.02);
  inner.add(anchors.neck, anchors.back);

  const dog = {
    root, pivot, inner, head, legs, ears, tail, tongue, eyes, anchors,
    def, legH, bodyY, flutter: [], flames: [],
    t: Math.random() * 10,
    blinkT: 2,
  };
  root.scale.setScalar(DOG_SCALE * (def.size ?? 1));
  setWear(dog, wear);
  return dog;
}

export function setWear(dog, wear = {}){
  dog.flutter = []; dog.flames = [];
  for (const slot of Object.keys(dog.anchors)){
    const a = dog.anchors[slot];
    while (a.children.length) a.remove(a.children[0]);
    const id = wear[slot];
    const o = OUTFITS.find(x => x.id === id);
    if (o) a.add(buildOutfit(o, dog));
  }
}

function buildOutfit(o, dog){
  const g = new THREE.Group();
  const c = mat(o.color, { rough:0.6 });
  const c2 = o.color2 != null ? mat(o.color2, { rough:0.6 }) : c;
  const gold = mat(o.color, { rough:0.25, metal:0.9, emissive:0x553300, ei:0.35 });
  switch (o.id){
    case 'cap': {
      g.add(mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), c, { y:-0.03 }));
      g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16, 1, false, 0, Math.PI), c,
        { y:-0.02, z:-0.15, ry:Math.PI / 2, sx:1, sz:1.3 }));
      g.add(mesh(SPHERE_LO, mat(0xffffff), { y:0.17, sx:0.03, sy:0.02, sz:0.03 }));
      break;
    }
    case 'beanie': {
      g.add(mesh(new THREE.SphereGeometry(0.21, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), c, { y:-0.04, sy:1.15 }));
      g.add(mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 20), c2, { y:-0.03, rx:Math.PI / 2 }));
      g.add(mesh(SPHERE, c2, { y:0.22, sx:0.07, sy:0.07, sz:0.07 }));
      break;
    }
    case 'party': {
      g.add(mesh(new THREE.ConeGeometry(0.13, 0.36, 16), c, { y:0.16, rz:0.15 }));
      g.add(mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 16), c2, { y:0.06, rx:Math.PI / 2, rz:0.15 }));
      g.add(mesh(new THREE.TorusGeometry(0.06, 0.016, 6, 16), c2, { x:-0.02, y:0.2, rx:Math.PI / 2, rz:0.15 }));
      g.add(mesh(SPHERE, c2, { x:-0.055, y:0.35, sx:0.05, sy:0.05, sz:0.05 }));
      break;
    }
    case 'cowboy': {
      g.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.025, 24), c, { y:0.0, sz:0.85 }));
      g.add(mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.2, 16), c, { y:0.1 }));
      g.add(mesh(new THREE.CylinderGeometry(0.172, 0.172, 0.04, 16), mat(0x3b2410), { y:0.03 }));
      break;
    }
    case 'tophat': {
      g.add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.025, 24), c, { y:0.0 }));
      g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.32, 20), c, { y:0.17 }));
      g.add(mesh(new THREE.CylinderGeometry(0.153, 0.153, 0.06, 20), c2, { y:0.05 }));
      g.rotation.z = 0.12;
      break;
    }
    case 'crown': {
      g.add(mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.1, 20, 1, true), gold, { y:0.03 }));
      for (let i = 0; i < 6; i++){
        const a = i / 6 * Math.PI * 2;
        g.add(mesh(new THREE.ConeGeometry(0.035, 0.1, 6), gold, { x:Math.sin(a) * 0.155, y:0.12, z:Math.cos(a) * 0.155 }));
        g.add(mesh(SPHERE_LO, mat([0xe63946, 0x3a86ff, 0x06d6a0][i % 3], { rough:0.1, emissive:0x222222, ei:1 }),
          { x:Math.sin(a) * 0.162, y:0.03, z:Math.cos(a) * 0.162, sx:0.022, sy:0.022, sz:0.022 }));
      }
      break;
    }
    case 'shades': {
      const lens = mat(0x0b0b10, { rough:0.05, metal:0.6 });
      for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.11, 0.07, 0.02), lens, { x:s * 0.085 }));
      g.add(mesh(new THREE.BoxGeometry(0.34, 0.02, 0.02), lens, { y:0.03 }));
      break;
    }
    case 'nerd': {
      for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 16), c, { x:s * 0.085 }));
      g.add(mesh(new THREE.BoxGeometry(0.06, 0.012, 0.012), c));
      break;
    }
    case 'star': {
      const shape = starShape(0.075, 0.035);
      const geo = new THREE.ExtrudeGeometry(shape, { depth:0.02, bevelEnabled:false });
      for (const s of [-1, 1]) g.add(mesh(geo, mat(o.color, { rough:0.3, emissive:0x663300, ei:0.4 }), { x:s * 0.09 }));
      g.add(mesh(new THREE.BoxGeometry(0.06, 0.015, 0.015), c));
      break;
    }
    case 'bandana': {
      g.add(mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 20), c, { rx:Math.PI / 2 - 0.3 }));
      g.add(mesh(new THREE.ConeGeometry(0.12, 0.2, 3), c, { y:-0.1, z:-0.13, rx:Math.PI - 0.3, sz:0.3 }));
      break;
    }
    case 'bowtie': {
      for (const s of [-1, 1]) g.add(mesh(new THREE.ConeGeometry(0.06, 0.1, 8), c, { x:s * 0.05, z:-0.14, rz:s * Math.PI / 2 }));
      g.add(mesh(SPHERE_LO, c, { z:-0.145, sx:0.03, sy:0.03, sz:0.03 }));
      break;
    }
    case 'scarf': {
      g.add(mesh(new THREE.TorusGeometry(0.17, 0.05, 8, 20), c, { rx:Math.PI / 2 - 0.3 }));
      for (let i = 0; i < 3; i++){
        const tail = mesh(new THREE.BoxGeometry(0.09, 0.08, 0.03), i % 2 ? c2 : c, { x:0.1, y:-0.06 - i * 0.08, z:-0.14 });
        g.add(tail);
        dog.flutter.push({ m:tail, amp:0.25, off:i });
      }
      break;
    }
    case 'medal': {
      g.add(mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 20), mat(0x3a86ff), { rx:Math.PI / 2 - 0.4 }));
      const disc = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 20), gold, { y:-0.12, z:-0.16, rx:Math.PI / 2 - 0.2 });
      g.add(disc);
      break;
    }
    case 'cape': {
      const geo = new THREE.PlaneGeometry(0.42, 0.55, 4, 6);
      geo.translate(0, -0.27, 0);
      const m = new THREE.MeshStandardMaterial({ color:o.color, roughness:0.7, side:THREE.DoubleSide });
      const cape = mesh(geo, m, { y:0.02, z:-0.2, rx:-Math.PI / 2 + 0.25 });
      g.add(cape);
      dog.flutter.push({ m:cape, amp:0.18, off:0, cape:true });
      g.add(mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 12), mat(0xffc933, { metal:0.8, rough:0.3 }), { y:0, z:-0.22, rx:Math.PI / 2 }));
      break;
    }
    case 'backpack': {
      g.add(mesh(new THREE.BoxGeometry(0.3, 0.16, 0.28), c, { y:0.06 }));
      g.add(mesh(new THREE.BoxGeometry(0.22, 0.07, 0.16), mat(darken(o.color, 0.25)), { y:0.06, z:0.15 }));
      for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.2, 0.015, 6, 16, Math.PI), mat(0x222222), { x:s * 0.12, y:-0.05, ry:Math.PI / 2, rz:Math.PI }));
      break;
    }
    case 'jetpack': {
      const metal = mat(o.color, { rough:0.3, metal:0.8 });
      for (const s of [-1, 1]){
        g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 12), metal, { x:s * 0.09, y:0.06, z:0.02, rx:Math.PI / 2 }));
        g.add(mesh(new THREE.ConeGeometry(0.07, 0.08, 12), mat(0x333333), { x:s * 0.09, y:0.06, z:0.2, rx:Math.PI / 2 }));
        const flame = mesh(new THREE.ConeGeometry(0.05, 0.2, 10),
          new THREE.MeshBasicMaterial({ color:o.color2, transparent:true, opacity:0.85 }),
          { x:s * 0.09, y:0.06, z:0.33, rx:-Math.PI / 2, shadow:false });
        g.add(flame);
        dog.flames.push(flame);
      }
      break;
    }
  }
  return g;
}

/**
 * Animate a dog.
 * @param {'run'|'jump'|'slide'|'idle'|'fly'|'crash'} mode
 * @param {number} speed  running speed, scales the cycle rate
 */
export function animateDog(dog, dt, mode, speed = 12, extra = {}){
  dog.t += dt;
  const t = dog.t;
  const freq = mode === 'idle' ? 0 : 0.9 + speed * 0.075;
  dog.phase = (dog.phase ?? 0) + dt * freq * Math.PI * 2;
  const p = dog.phase;
  const legs = dog.legs;

  // blink
  dog.blinkT -= dt;
  const blink = dog.blinkT < 0.12 ? 0.15 : 1;
  if (dog.blinkT < 0) dog.blinkT = 2 + Math.random() * 3;
  for (const e of dog.eyes) e.scale.y = blink;

  let bob = 0, pitch = 0;
  if (mode === 'run'){
    // gallop: front pair and back pair offset, each pair slightly split
    for (const l of legs){
      const off = (l.front ? 0 : Math.PI) + (l.side > 0 ? 0.5 : 0);
      l.hip.rotation.x = Math.sin(p + off) * 0.95;
    }
    bob = Math.abs(Math.sin(p)) * 0.07;
    pitch = Math.sin(p) * 0.07;
    dog.tongue.visible = true;
  } else if (mode === 'jump' || mode === 'fly'){
    const vy = extra.vy ?? 0;
    for (const l of legs){
      const target = mode === 'fly' ? (l.front ? 1.2 : -1.2) : (l.front ? 0.9 : -0.9) * (vy > 0 ? 1 : 0.5);
      l.hip.rotation.x += (target - l.hip.rotation.x) * Math.min(1, dt * 14);
    }
    pitch = mode === 'fly' ? 0.1 : vy * 0.012;
    dog.tongue.visible = true;
  } else if (mode === 'slide'){
    for (const l of legs){
      const target = l.front ? 1.4 : -1.4;
      l.hip.rotation.x += (target - l.hip.rotation.x) * Math.min(1, dt * 18);
    }
    bob = -dog.legH * 0.85;
    dog.tongue.visible = true;
  } else if (mode === 'crash'){
    for (const l of legs) l.hip.rotation.x += (1.3 * (l.front ? 1 : -1) - l.hip.rotation.x) * Math.min(1, dt * 6);
    dog.tongue.visible = true;
  } else {
    // idle: stand, breathe, look around
    for (const l of legs) l.hip.rotation.x += (0 - l.hip.rotation.x) * Math.min(1, dt * 6);
    bob = Math.sin(t * 2.2) * 0.008;
    pitch = 0.04;
    dog.head.rotation.y = Math.sin(t * 0.7) * 0.35;
    dog.head.rotation.z = Math.sin(t * 0.45) * 0.12;
    dog.tongue.visible = Math.sin(t * 0.8) > -0.2;
  }
  if (mode !== 'idle'){
    dog.head.rotation.y *= 0.9; dog.head.rotation.z *= 0.9;
  }

  dog.inner.position.y = bob;
  dog.inner.rotation.x = pitch;
  dog.head.rotation.x = -pitch * 0.8 + (mode === 'run' ? Math.sin(p * 2) * 0.03 : 0);

  // ears flap behind the motion
  for (const e of dog.ears){
    if (dog.def.earType === 'floppy'){
      const flap = mode === 'idle' ? Math.sin(t * 2) * 0.05
        : mode === 'jump' || mode === 'fly' ? -0.9 : Math.sin(p - 0.8) * 0.35 - 0.25;
      e.g.rotation.x = flap;
      e.g.rotation.z = e.base.z + e.side * (mode === 'jump' ? 0.6 : Math.abs(Math.sin(p)) * 0.2);
    } else {
      e.g.rotation.x = mode === 'idle' ? 0 : Math.sin(p) * 0.08 - 0.15;
    }
  }

  // tail wag — faster when happy
  const wag = extra.happy ? 16 : mode === 'idle' ? 8 : 11;
  dog.tail.rotation.y = Math.sin(t * wag) * (mode === 'idle' ? 0.6 : 0.4);
  dog.tail.rotation.x = mode === 'run' ? Math.sin(p) * 0.15 : 0;

  // flutter capes and scarves
  for (const f of dog.flutter){
    if (f.cape){
      const s = mode === 'idle' ? 0.1 : Math.min(1, speed / 20);
      f.m.rotation.x = -Math.PI / 2 + 0.25 + (1 - s) * 1.0 + Math.sin(t * 14 + f.off) * f.amp * s;
    } else {
      f.m.rotation.x = Math.sin(t * 12 + f.off) * f.amp;
      f.m.position.z = -0.14 + (mode === 'idle' ? 0 : 0.05 + Math.sin(t * 10 + f.off) * 0.02);
    }
  }
  for (const fl of dog.flames){
    const s = 0.7 + Math.random() * 0.6 + (mode === 'fly' ? 1.5 : 0);
    fl.scale.set(1, s, 1);
  }
}

// ---------- helpers ----------
function starShape(R, r){
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++){
    const a = i / 10 * Math.PI * 2 + Math.PI / 2;
    const rad = i % 2 ? r : R;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  return s;
}

function lighten(hex, f){ const c = new THREE.Color(hex); c.lerp(new THREE.Color(0xffffff), f); return c.getHex(); }
function darken(hex, f){ const c = new THREE.Color(hex); c.multiplyScalar(1 - f); return c.getHex(); }

function mulberry(a){
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
