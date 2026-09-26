// ---------- Every mesh in the hotel, built out of boxes and balls ----------
//
// No model files. Rooms are built in their own space: x from -2 to 2 across
// the slot, the floor at y = 0, and z from the back wall (-2.2) to the open
// front (1.2). The corridor runs along the front of every floor after that.

import * as THREE from 'three';
import { FLOOR_H } from './data.js';

export const ROOM_H = FLOOR_H - 0.25;     // floor to ceiling, under the next slab
export const BACK = -2.2, FRONT = 1.2;

// --------------------------------------------------------- material cache --
const cache = new Map();
const inside = [];                        // materials that light up at night

export function mat(color, extra){
  const key = color + '|' + (extra ? JSON.stringify(extra) : '');
  let m = cache.get(key);
  if (!m){
    m = new THREE.MeshLambertMaterial({ color, flatShading:true, ...extra });
    cache.set(key, m);
  }
  return m;
}

/** An indoor surface: after dark it glows a little, as if the lights were on. */
export function imat(color){
  const key = 'in' + color;
  let m = cache.get(key);
  if (!m){
    m = new THREE.MeshLambertMaterial({ color, flatShading:true });
    m.userData.base = new THREE.Color(color);
    cache.set(key, m);
    inside.push(m);
  }
  return m;
}

export const WINDOW = new THREE.MeshLambertMaterial({ color:0x9fd9f2, flatShading:true });
export const GLOW = new THREE.MeshLambertMaterial({ color:0xffd98a, flatShading:true, emissive:0x3a2a00 });
export const NEON = new THREE.MeshLambertMaterial({ color:0xff6fb1, flatShading:true, emissive:0x551030 });
export const WATER = new THREE.MeshLambertMaterial({ color:0x5cc8ef, transparent:true, opacity:0.82, emissive:0x05304a });
export const GLASS = new THREE.MeshLambertMaterial({ color:0xcdefff, transparent:true, opacity:0.28, depthWrite:false });

export function setNight(k){
  // k: 0 = broad daylight, 1 = deep night.
  WINDOW.emissive.setRGB(0.85 * k, 0.65 * k, 0.3 * k);
  WINDOW.color.setHex(k > 0.4 ? 0xffe0a0 : 0x9fd9f2);
  GLOW.emissive.setRGB(0.18 + 0.82 * k, 0.12 + 0.6 * k, 0.02 + 0.2 * k);
  NEON.emissive.setRGB(0.3 + 0.7 * k, 0.06 + 0.25 * k, 0.18 + 0.4 * k);
  for (const m of inside) m.emissive.copy(m.userData.base).multiplyScalar(0.42 * k);
}

// ------------------------------------------------------------- primitives --
const geoCache = new Map();
function geo(key, make){
  let g = geoCache.get(key);
  if (!g){ g = make(); geoCache.set(key, g); }
  return g;
}

function withMat(m, material){
  if (material instanceof THREE.Material) m.material = material;
  return m;
}

export function box(w, h, d, color, x = 0, y = 0, z = 0, material){
  const m = new THREE.Mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
                           material || mat(color));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function cyl(rt, rb, h, seg, color, x = 0, y = 0, z = 0, material){
  const m = new THREE.Mesh(geo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)),
                           material || mat(color, { flatShading: seg <= 12 }));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function cone(r, h, seg, color, x = 0, y = 0, z = 0, material){
  const m = new THREE.Mesh(geo(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), material || mat(color));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function ball(r, detail, color, x = 0, y = 0, z = 0, material){
  const m = new THREE.Mesh(geo(`s${r},${detail}`, () => new THREE.IcosahedronGeometry(r, detail)), material || mat(color));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Words painted on a board, as a texture. Used for the hotel's name. */
export function textTexture(text, { w = 512, h = 128, bg = '#fff6e2', fg = '#8d4a2f', font = 'bold 74px' } = {}){
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (bg){ ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  ctx.font = `${font} system-ui, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fg;
  ctx.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ----------------------------------------------------------- furnishings --

/** Walls, carpet and a window: every room starts as this. */
function shell(wall, floor, { window = true, trim = 0xfff3e0 } = {}){
  const g = new THREE.Group();
  const w = imat(wall);
  g.add(box(4, ROOM_H, 0.14, 0, 0, 0, BACK - 0.07, w));
  for (const s of [-1, 1]) g.add(box(0.1, ROOM_H, FRONT - BACK, 0, s * 1.95, 0, (BACK + FRONT) / 2, w));
  g.add(box(3.8, 0.04, FRONT - BACK - 0.05, 0, 0, 0, (BACK + FRONT) / 2, imat(floor)));
  g.add(box(3.8, 0.12, 0.05, trim, 0, 0.04, BACK + 0.02));                    // skirting
  if (window){
    g.add(box(1.5, 1.1, 0.06, 0xfff3e0, 0.7, 1.05, BACK + 0.02));
    g.add(box(1.3, 0.9, 0.08, 0, 0.7, 1.15, BACK + 0.03, WINDOW));
    g.add(box(0.06, 0.9, 0.1, 0xfff3e0, 0.7, 1.15, BACK + 0.04));
  }
  return g;
}

function bed(color, x, z, { len = 1.9, wid = 1.1, y = 0, legs = true } = {}){
  const g = new THREE.Group();
  if (legs) g.add(box(wid + 0.1, 0.3, len, 0x9a6a44, 0, y, 0));
  g.add(box(wid + 0.12, 0.8, 0.1, 0x8d5a36, 0, y, -len / 2));                // headboard
  g.add(box(wid, 0.18, len - 0.1, 0xfffaf2, 0, y + 0.3, 0.02));              // mattress
  g.add(box(wid + 0.04, 0.12, len * 0.6, color, 0, y + 0.42, len * 0.2));    // blanket
  g.add(box(wid * 0.7, 0.14, 0.32, 0xffffff, 0, y + 0.48, -len / 2 + 0.28)); // pillow
  g.position.set(x, 0, z);
  return g;
}

function lamp(x, z, color = 0x8d6242, y = 0){
  const g = new THREE.Group();
  g.add(box(0.5, 0.5, 0.45, color, 0, y, 0));
  g.add(cyl(0.04, 0.04, 0.35, 6, 0x6b4b33, 0, y + 0.5, 0));
  g.add(cone(0.2, 0.26, 8, 0, 0, y + 0.8, 0, GLOW));
  g.position.set(x, 0, z);
  return g;
}

function rug(color, x, z, w = 1.6, d = 1.1){
  return box(w, 0.03, d, 0, x, 0.04, z, imat(color));
}

function picture(color, x, y){
  const g = new THREE.Group();
  g.add(box(0.62, 0.48, 0.04, 0xfff3e0, 0, 0, 0));
  g.add(box(0.5, 0.36, 0.05, color, 0, 0.06, 0));
  g.position.set(x, y, BACK + 0.03);
  return g;
}

function pot(x, z, flower = 0xff8fb1, y = 0){
  const g = new THREE.Group();
  g.add(cyl(0.16, 0.12, 0.26, 8, 0xd8663f, 0, y, 0));
  g.add(ball(0.2, 0, 0x63bb52, 0, y + 0.42, 0));
  for (let i = 0; i < 3; i++){
    const a = i * 2.1;
    g.add(ball(0.08, 0, flower, Math.cos(a) * 0.13, y + 0.56, Math.sin(a) * 0.13));
  }
  g.position.set(x, 0, z);
  return g;
}

function table(x, z, top = 0xf3e0c0, r = 0.38){
  const g = new THREE.Group();
  g.add(cyl(0.05, 0.08, 0.62, 6, 0x8d6242, 0, 0, 0));
  g.add(cyl(r, r, 0.07, 12, top, 0, 0.62, 0));
  g.position.set(x, 0, z);
  return g;
}

function star(r = 0.5, depth = 0.2, color = 0xffd86b, material){
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++){
    const a = i / 10 * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  const g = geo(`star${r},${depth}`, () => new THREE.ExtrudeGeometry(s, { depth, bevelEnabled:false }));
  const m = new THREE.Mesh(g, material || mat(color));
  m.castShadow = true;
  return m;
}

// ------------------------------------------------------------------ rooms --

export const ROOM_MODELS = {
  cosy(){
    const g = shell(0xf6e3c8, 0xc98f5e);
    g.add(bed(0x6fb3e8, -0.7, -1.2));
    g.add(lamp(0.45, -1.8));
    g.add(rug(0xe8a0a0, 0.6, -0.2));
    g.add(picture(0x9fd9f2, -0.7, 1.7));
    return g;
  },

  bunk(){
    const g = shell(0xd8ecff, 0x9b7653);
    const b = new THREE.Group();
    b.add(bed(0xf2b134, 0, 0, { wid:1.0 }));
    b.add(bed(0x63bb52, 0, 0, { wid:1.0, y:1.15, legs:false }));
    b.add(box(1.1, 0.12, 1.9, 0x9a6a44, 0, 1.03, 0));
    for (const sx of [-0.55, 0.55]) for (const sz of [-0.9, 0.9])
      b.add(box(0.1, 2.0, 0.1, 0x8d5a36, sx, 0, sz));
    b.position.set(-0.8, 0, -1.15);
    g.add(b);
    for (let i = 0; i < 5; i++) g.add(box(0.5, 0.05, 0.06, 0x8d5a36, 0.0, 0.3 + i * 0.35, -0.2));
    g.add(box(0.05, 1.9, 0.06, 0x8d5a36, -0.25, 0, -0.2));
    g.add(box(0.05, 1.9, 0.06, 0x8d5a36, 0.25, 0, -0.2));
    g.add(box(0.7, 0.5, 0.45, 0xe2604f, 1.2, 0, -1.8));                       // toy box
    g.add(rug(0xb6e8a8, 0.9, 0.1, 1.2, 0.9));
    return g;
  },

  flower(){
    const g = shell(0xffe3ee, 0xb9d98f);
    g.add(bed(0xff8fb1, -0.7, -1.2));
    g.add(box(1.6, 0.08, 0.35, 0xfff3e0, 0.9, 1.7, BACK + 0.2));              // shelf
    g.add(pot(0.4, BACK + 0.2, 0xffd86b, 1.78));
    g.add(pot(1.1, BACK + 0.2, 0x9b6ede, 1.78));
    g.add(pot(1.4, -0.6, 0xff6f91));
    g.add(pot(1.4, 0.4, 0xffffff));
    g.add(pot(0.4, -1.9, 0xff8fb1));
    g.add(rug(0xffd6f0, 0.4, -0.1));
    return g;
  },

  moon(){
    const g = shell(0x3a4a8a, 0x2b3566);
    g.add(bed(0xd7b5ff, -0.6, -1.15, { wid:1.4 }));
    const moon = ball(0.32, 1, 0, 0.9, 2.05, -0.8, GLOW);
    g.add(moon);
    g.add(cyl(0.01, 0.01, 0.45, 4, 0xcccccc, 0.9, 2.3, -0.8));
    for (let i = 0; i < 6; i++){
      const s = star(0.09, 0.02, 0, GLOW);
      s.position.set(-1.6 + i * 0.35, 1.7 + (i % 2) * 0.35, BACK + 0.03);
      g.add(s);
    }
    g.add(lamp(0.75, -1.85, 0x5a4a8a));
    g.add(rug(0x8fa0e8, 0.5, 0.0));
    g.userData.spin = moon;
    return g;
  },

  star(){
    const g = shell(0xfff1c4, 0xe7c26a, { trim:0xffd86b });
    const s = star(0.95, 0.35, 0xffd86b);
    s.rotation.x = -Math.PI / 2;
    s.position.set(-0.5, 0.05, -0.8);
    g.add(s);
    const pillow = box(0.6, 0.15, 0.3, 0xffffff, -0.5, 0.4, -1.4);
    g.add(pillow);
    g.add(box(1.0, 0.1, 0.8, 0xffa0c0, -0.5, 0.4, -0.6));
    const hang = star(0.22, 0.08, 0, GLOW);
    hang.position.set(1.1, 1.9, -0.8);
    g.add(hang);
    g.add(cyl(0.01, 0.01, 0.6, 4, 0xcccccc, 1.1, 2.1, -0.76));
    g.add(pot(1.4, -1.8, 0xffd86b));
    g.add(rug(0xffffff, 0.8, 0.2, 1.2, 0.8));
    g.userData.spin = hang;
    return g;
  },

  cloud(){
    const g = shell(0xeaf6ff, 0xfdfcf7, { trim:0xf2b134 });
    // A bed made of cloud.
    for (const [x, y, z, r] of [[-0.9, 0.35, -1.3, 0.45], [-0.3, 0.4, -1.1, 0.5], [0.3, 0.35, -1.3, 0.42],
                                 [-0.6, 0.5, -0.7, 0.42], [0.0, 0.45, -0.6, 0.4]]){
      g.add(ball(r, 1, 0xffffff, x, y, z));
    }
    g.add(box(1.8, 0.9, 0.1, 0xf2b134, -0.3, 0, BACK + 0.08));                // gold headboard
    g.add(box(0.8, 0.12, 0.3, 0xffd6f0, -0.3, 0.85, -1.4));
    // A little chandelier.
    g.add(cyl(0.01, 0.01, 0.5, 4, 0xf2b134, 1.0, 2.25, -0.6));
    g.add(cone(0.28, 0.3, 8, 0xf2b134, 1.0, 1.95, -0.6));
    g.add(ball(0.14, 1, 0, 1.0, 1.9, -0.6, GLOW));
    g.add(box(0.5, 0.9, 0.5, 0xf2b134, 1.3, 0, 0.2));                         // gold tap stand
    g.add(rug(0x9fd9f2, 0.6, 0.1, 1.4, 1.0));
    return g;
  },

  // ------------------------------------------------------------ areas ----
  cafe(){
    const g = shell(0xffe8cc, 0x8d6242);
    g.add(box(2.2, 0.9, 0.6, 0xd8663f, -0.7, 0, -1.7));                       // counter
    g.add(box(2.3, 0.08, 0.7, 0xfff3e0, -0.7, 0.9, -1.7));
    g.add(box(0.4, 0.5, 0.35, 0x6b6b6b, -1.3, 0.98, -1.75));                  // coffee machine
    g.add(cyl(0.1, 0.08, 0.14, 8, 0xffffff, -0.3, 0.98, -1.6));
    g.add(ball(0.14, 1, 0xf2b134, 0.2, 1.08, -1.65));                          // bun
    for (const [x, z] of [[0.9, -0.6], [-0.4, 0.2]]){
      g.add(table(x, z, 0xfff3e0));
      g.add(cyl(0.08, 0.06, 0.1, 8, 0xffffff, x + 0.1, 0.69, z));
    }
    g.add(box(1.4, 0.35, 0.05, 0x3b3b3b, -0.7, 1.7, BACK + 0.03));            // menu board
    return g;
  },

  games(){
    const g = shell(0xdff5d8, 0x6a8f5a);
    g.add(box(1.8, 0.7, 1.0, 0x6b4b33, -0.4, 0, -0.9));
    g.add(box(1.7, 0.06, 0.9, 0x2f8a4a, -0.4, 0.7, -0.9));
    for (let i = 0; i < 6; i++)
      g.add(ball(0.07, 0, [0xff6f91, 0xffd86b, 0x5cc8ef, 0x9b6ede][i % 4], -1 + i * 0.25, 0.83, -0.9 + (i % 3 - 1) * 0.2));
    g.add(box(0.7, 1.6, 0.6, 0x9b6ede, 1.4, 0, -1.7));                        // the ding machine
    g.add(box(0.5, 0.4, 0.05, 0, 1.4, 1.05, -1.38, WINDOW));
    g.add(ball(0.08, 0, 0xe2604f, 1.4, 0.85, -1.35));
    return g;
  },

  spa(){
    const g = shell(0xd8f4f6, 0xffffff, { window:false });
    g.add(box(2.2, 0.55, 1.1, 0xffffff, -0.5, 0, -1.4));
    g.add(box(2.0, 0.08, 0.9, 0, -0.5, 0.48, -1.4, WATER));
    const bubbles = new THREE.Group();
    for (let i = 0; i < 14; i++){
      bubbles.add(ball(0.08 + (i % 3) * 0.05, 1, 0xffffff,
        -1.4 + Math.random() * 1.8, 0.65 + Math.random() * 1.6, -1.8 + Math.random() * 0.8,
        mat(0xffffff, { transparent:true, opacity:0.7 })));
    }
    g.add(bubbles);
    g.userData.bubbles = bubbles;
    g.add(box(0.5, 0.9, 0.4, 0xff8fb1, 1.35, 0, -1.8));                       // towels
    g.add(box(0.5, 0.05, 0.42, 0xffffff, 1.35, 0.45, -1.8));
    g.add(pot(1.4, 0.4, 0xffffff));
    g.add(rug(0x9fe8dd, 0.5, 0.2, 1.2, 0.7));
    return g;
  },

  library(){
    const g = shell(0xf1e0c8, 0x7a5236, { window:false });
    const books = [0xe2604f, 0x5cc8ef, 0xffd86b, 0x63bb52, 0x9b6ede, 0xff8fb1];
    for (let row = 0; row < 4; row++){
      g.add(box(3.6, 0.06, 0.4, 0x8d5a36, 0, 0.2 + row * 0.6, BACK + 0.22));
      for (let i = 0; i < 14; i++){
        const h = 0.34 + ((i * 7 + row * 3) % 5) * 0.04;
        g.add(box(0.2, h, 0.3, books[(i + row) % books.length], -1.6 + i * 0.245, 0.26 + row * 0.6, BACK + 0.22));
      }
    }
    // The enormous armchair.
    g.add(box(1.2, 0.45, 0.9, 0xd8663f, 0.3, 0, -0.1));
    g.add(box(1.2, 0.9, 0.2, 0xd8663f, 0.3, 0.3, -0.5));
    for (const s of [-1, 1]) g.add(box(0.2, 0.7, 0.9, 0xc4553a, 0.3 + s * 0.6, 0.2, -0.1));
    g.add(lamp(-1.3, -0.2, 0x7a5236));
    return g;
  },

  music(){
    const g = shell(0xf3e6ff, 0x8a6aa8);
    g.add(box(1.8, 0.85, 0.7, 0x2b2530, -0.5, 0, -1.7));                      // piano
    g.add(box(1.8, 0.6, 0.2, 0x2b2530, -0.5, 0.85, -1.95));
    g.add(box(1.6, 0.05, 0.25, 0xffffff, -0.5, 0.85, -1.4));
    for (let i = 0; i < 7; i++) g.add(box(0.06, 0.04, 0.14, 0x111111, -1.2 + i * 0.22, 0.9, -1.45));
    g.add(box(0.9, 0.45, 0.35, 0x6b4b33, -0.5, 0, -0.9));                     // stool
    const notes = new THREE.Group();
    for (let i = 0; i < 3; i++){
      const n = new THREE.Group();
      n.add(ball(0.1, 0, 0x9b6ede, 0, 0, 0));
      n.add(box(0.03, 0.3, 0.03, 0x9b6ede, 0.08, 0, 0));
      n.position.set(0.6 + i * 0.4, 1.4 + i * 0.3, -1.2);
      notes.add(n);
    }
    g.add(notes);
    g.userData.notes = notes;
    g.add(pot(1.4, -1.8, 0xd7b5ff));
    return g;
  },

  ballroom(){
    const g = shell(0x3b2a4a, 0x2a1e36, { window:false });
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++){
      if ((i + j) % 2) continue;
      g.add(box(0.7, 0.03, 0.7, 0, -1.5 + i * 0.75, 0.05, -1.8 + j * 0.8,
        [GLOW, NEON, WINDOW][(i + j * 2) % 3]));
    }
    g.add(cyl(0.01, 0.01, 0.5, 4, 0xcccccc, 0, 2.3, -0.6));
    const disco = ball(0.3, 1, 0xe8e8f0, 0, 2.05, -0.6, mat(0xe8e8f0, { emissive:0x333344 }));
    g.add(disco);
    g.userData.spin = disco;
    for (const s of [-1, 1]) g.add(box(0.15, 2.5, 0.15, 0xf2b134, s * 1.7, 0, BACK + 0.15));
    return g;
  },
};

/** An empty space waiting for a room: bare walls and some planks. */
export function emptyRoom(){
  const g = shell(0xd7d0c4, 0xbdb4a6, { window:false, trim:0xbdb4a6 });
  g.add(box(1.6, 0.06, 0.3, 0xc49a6c, -0.6, 0.06, -1.3));
  g.add(box(1.6, 0.06, 0.3, 0xc49a6c, -0.5, 0.12, -1.0));
  g.add(cone(0.18, 0.5, 8, 0xef8b3c, 1.1, 0, -0.6));
  g.add(box(0.3, 0.02, 0.3, 0xffffff, 1.1, 0.25, -0.6));
  g.add(cyl(0.16, 0.14, 0.3, 8, 0x9fb0c0, 0.4, 0, -1.8));
  return g;
}

/** The ground floor's two lobby slots, 8 wide, centred on its own origin. */
export function lobby(){
  const g = new THREE.Group();
  const wall = imat(0xfbe3c4);
  g.add(box(8, ROOM_H, 0.14, 0, 0, 0, BACK - 0.07, wall));
  // Chequered floor, full depth right out to the pavement.
  for (let i = 0; i < 10; i++) for (let j = 0; j < 6; j++){
    g.add(box(0.8, 0.04, 0.78, 0, -3.6 + i * 0.8, 0, -1.9 + j * 0.78, imat((i + j) % 2 ? 0xfff3e0 : 0xd8b48c)));
  }
  // Tall windows at the back.
  for (const x of [-1.6, 0.6, 2.8]){
    g.add(box(1.3, 1.8, 0.06, 0xfff3e0, x, 0.55, BACK + 0.02));
    g.add(box(1.1, 1.6, 0.08, 0, x, 0.65, BACK + 0.03, WINDOW));
  }
  // Reception.
  g.add(box(2.2, 1.0, 0.6, 0xd8663f, -2.5, 0, -1.2));
  g.add(box(2.35, 0.08, 0.72, 0xfff3e0, -2.5, 1.0, -1.2));
  g.add(ball(0.12, 1, 0xf2b134, -1.8, 1.14, -1.1));                           // the bell
  g.add(box(0.8, 0.5, 0.05, 0xf2b134, -2.5, 1.6, BACK + 0.03));               // key board
  for (let i = 0; i < 6; i++) g.add(box(0.06, 0.12, 0.06, 0x8d6242, -2.8 + (i % 3) * 0.3, 1.65 + Math.floor(i / 3) * 0.2, BACK + 0.07));
  // A sofa for anybody waiting, and plants.
  g.add(box(1.6, 0.45, 0.7, 0x9b6ede, 2.6, 0, -1.6));
  g.add(box(1.6, 0.6, 0.2, 0x8455c4, 2.6, 0.35, -1.95));
  g.add(pot(3.6, -1.8, 0xff8fb1));
  g.add(pot(-3.7, -1.9, 0xffd86b));
  // Chandelier.
  g.add(cyl(0.015, 0.015, 0.4, 4, 0xf2b134, 0, 2.35, -0.4));
  g.add(cone(0.4, 0.3, 8, 0xf2b134, 0, 2.05, -0.4));
  g.add(ball(0.18, 1, 0, 0, 2.0, -0.4, GLOW));
  // The front: pillars and an awning over the door.
  for (const x of [-3.95, 3.95]) g.add(box(0.2, ROOM_H, 0.2, 0xfff3e0, x, 0, 2.3));
  g.add(box(2.6, 0.1, 0.7, 0xe2604f, 0, ROOM_H - 0.12, 2.75));
  g.add(box(2.6, 0.18, 0.06, 0xfff3e0, 0, ROOM_H - 0.2, 3.1));
  // The receptionist.
  const r = milbil(0xffd6a0);
  r.position.set(-2.8, 0, -1.8);
  r.scale.setScalar(1.25);
  g.add(r);
  g.userData.receptionist = r;
  return g;
}

// ------------------------------------------------------------------ milbils --

export function milbil(color = 0xffb3c7){
  const g = new THREE.Group();
  const body = ball(0.34, 1, color, 0, 0.36, 0);
  body.scale.set(1, 0.95, 0.92);
  g.add(body);
  const belly = ball(0.24, 1, 0xfff6ee, 0, 0.3, 0.16);
  belly.scale.set(1, 0.85, 0.7);
  g.add(belly);
  for (const s of [-1, 1]){
    const ear = cone(0.12, 0.34, 6, color, s * 0.2, 0.52, -0.02);
    ear.rotation.z = s * 0.45;
    g.add(ear);
  }
  for (const s of [-1, 1]){
    g.add(ball(0.085, 1, 0xffffff, s * 0.13, 0.44, 0.27));
    g.add(ball(0.042, 0, 0x2f2a28, s * 0.14, 0.45, 0.33));
  }
  g.add(ball(0.05, 0, 0xff9d6b, 0, 0.36, 0.33));
  const feet = [];
  for (const s of [-1, 1]){
    const f = ball(0.11, 0, 0xf5d0b8, s * 0.14, 0.09, 0.05);
    f.scale.set(1, 0.7, 1.3);
    g.add(f);
    feet.push(f);
  }
  g.userData.feet = feet;
  g.add(cone(0.07, 0.18, 5, color, 0, 0.66, 0));
  return g;
}

/** A small suitcase, carried by every guest who is not staying put. */
export function suitcase(color = 0xe2604f){
  const g = new THREE.Group();
  g.add(box(0.34, 0.26, 0.14, color, 0, 0, 0));
  g.add(box(0.14, 0.05, 0.03, 0x4a3a2e, 0, 0.26, 0));
  return g;
}

/** A drawn character as a billboard sprite, plus the smudge of shade under it. */
export function characterSprite(texture, height = 1.9){
  const group = new THREE.Group();
  const material = new THREE.SpriteMaterial({ map:texture, transparent:true, depthWrite:false });
  const sprite = new THREE.Sprite(material);
  const aspect = (texture.image && texture.image.width / texture.image.height) || 0.75;
  sprite.scale.set(height * aspect, height, 1);
  sprite.position.y = height / 2;
  group.add(sprite);
  const shade = new THREE.Mesh(new THREE.CircleGeometry(height * 0.24, 14),
    new THREE.MeshBasicMaterial({ color:0x2e2418, transparent:true, opacity:0.22, depthWrite:false }));
  shade.rotation.x = -Math.PI / 2;
  shade.position.y = 0.06;
  group.add(shade);
  group.userData.sprite = sprite;
  group.userData.shade = shade;
  return group;
}

// ----------------------------------------------------------------- outside --

export function tree(x, z, s = 1){
  const g = new THREE.Group();
  g.add(cyl(0.18, 0.24, 1.3, 6, 0x8d6242, 0, 0, 0));
  g.add(ball(0.95, 0, 0x63bb52, 0, 1.8, 0));
  g.add(ball(0.7, 0, 0x76c95e, 0.4, 2.3, 0.2));
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  return g;
}

export function helicopter(){
  const g = new THREE.Group();
  const body = ball(0.62, 1, 0xf25f5c, 0, 0.62, 0);
  body.scale.set(1.25, 0.85, 1.0);
  g.add(body);
  g.add(ball(0.36, 1, 0, 0.42, 0.7, 0, WINDOW));
  g.add(box(1.5, 0.26, 0.26, 0xe0574f, -1.15, 0.62, 0));
  g.add(box(0.42, 0.62, 0.1, 0xf7a8a8, -1.85, 0.72, 0));
  for (const sz of [-1, 1]){
    g.add(box(1.4, 0.1, 0.1, 0xb0a99e, 0.05, 0.06, sz * 0.42));
    g.add(box(0.08, 0.3, 0.08, 0xb0a99e, 0.45, 0.16, sz * 0.42));
    g.add(box(0.08, 0.3, 0.08, 0xb0a99e, -0.45, 0.16, sz * 0.42));
  }
  g.add(box(0.1, 0.3, 0.1, 0xb0a99e, 0, 1.05, 0));
  const rotor = new THREE.Group();
  for (let i = 0; i < 2; i++){
    const blade = box(2.9, 0.07, 0.26, 0xd8d2c6, 0, 0, 0);
    blade.rotation.y = i * Math.PI / 2;
    rotor.add(blade);
  }
  rotor.position.y = 1.4;
  g.add(rotor);
  g.userData.rotor = rotor;
  return g;
}

export function bus(){
  const g = new THREE.Group();
  g.add(box(5.2, 1.7, 2.0, 0xf6c343, 0, 0.35, 0));
  g.add(box(5.25, 0.2, 2.05, 0xe2604f, 0, 1.0, 0));
  for (let i = 0; i < 5; i++) g.add(box(0.7, 0.55, 2.06, 0, -1.9 + i * 0.95, 1.3, 0, WINDOW));
  g.add(box(0.1, 0.8, 1.6, 0, 2.62, 1.1, 0, WINDOW));
  for (const x of [-1.7, 1.7]) for (const z of [-1, 1]){
    const w = cyl(0.36, 0.36, 0.25, 10, 0x3b3b3b, x, 0.36, z * 0.95);
    w.rotation.x = Math.PI / 2;
    w.position.y = 0.36;
    g.add(w);
  }
  return g;
}

// ----------------------------------------------------------------- merging --

/**
 * Bake a group's still meshes into one mesh per material. A room is thirty-odd
 * boxes; a tall hotel would be a thousand draw calls without this. Anything in
 * `keep` (and whatever is under it) is left alone so it can still move, and so
 * is anything with a texture.
 */
export function flatten(group, keep = []){
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const keepSet = new Set(keep.filter(Boolean));
  const buckets = new Map();
  const drop = [];
  group.traverse((o) => {
    if (!o.isMesh || o === group) return;
    for (let p = o; p && p !== group; p = p.parent) if (keepSet.has(p)) return;
    if (o.material.map || Array.isArray(o.material)) return;
    let b = buckets.get(o.material);
    if (!b){ b = []; buckets.set(o.material, b); }
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    b.push({ geo:o.geometry, m, shadow:o.castShadow });
    drop.push(o);
  });
  for (const o of drop) o.parent.remove(o);

  const nm = new THREE.Matrix3();
  const v = new THREE.Vector3();
  for (const [material, parts] of buckets){
    let count = 0;
    const flat = parts.map(p => {
      const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
      count += g.attributes.position.count;
      return { g, m:p.m, own:g !== p.geo };
    });
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
    let off = 0;
    for (const { g, m, own } of flat){
      nm.getNormalMatrix(m);
      const P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < P.count; i++, off++){
        v.fromBufferAttribute(P, i).applyMatrix4(m);
        pos[off * 3] = v.x; pos[off * 3 + 1] = v.y; pos[off * 3 + 2] = v.z;
        if (N){
          v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
          nor[off * 3] = v.x; nor[off * 3 + 1] = v.y; nor[off * 3 + 2] = v.z;
        }
      }
      if (own) g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = !material.transparent;
    mesh.receiveShadow = true;
    mesh.userData.merged = true;
    group.add(mesh);
  }
  return group;
}

/** Throw away a flattened group's own geometry. Shared, cached geometry stays. */
export function disposeMerged(group){
  group.traverse(o => { if (o.isMesh && o.userData.merged) o.geometry.dispose(); });
}
