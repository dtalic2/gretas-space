// ---------- Every mesh in the game, built out of boxes and balls ----------
//
// No model files: each building is a little function that returns a Group
// standing on y=0 and centred on its footprint. Flat shading throughout, so
// the whole town reads as one chunky papercraft set.

import * as THREE from 'three';
import { TILE } from './data.js';

// --------------------------------------------------------- material cache --
const cache = new Map();

export function mat(color, extra){
  const key = color + '|' + (extra ? JSON.stringify(extra) : '');
  let m = cache.get(key);
  if (!m){
    m = new THREE.MeshLambertMaterial({ color, flatShading:true, ...extra });
    cache.set(key, m);
  }
  return m;
}

/** One shared material for every lit window, so nightfall is a single tweak. */
export const WINDOW = new THREE.MeshLambertMaterial({ color:0x9fd9f2, flatShading:true, emissive:0x000000 });
/** Lanterns, the balloon burner, the manor lamps. */
export const GLOW = new THREE.MeshLambertMaterial({ color:0xffd98a, flatShading:true, emissive:0x3a2a00 });

export function setNight(k){
  // k: 0 = broad daylight, 1 = deep night.
  WINDOW.emissive.setRGB(0.95 * k, 0.72 * k, 0.28 * k);
  WINDOW.color.setHex(k > 0.35 ? 0xffe0a0 : 0x9fd9f2);
  GLOW.emissive.setRGB(0.15 + 0.85 * k, 0.1 + 0.62 * k, 0.02 + 0.2 * k);
}

// ------------------------------------------------------------- primitives --
const geoCache = new Map();
function geo(key, make){
  let g = geoCache.get(key);
  if (!g){ g = make(); geoCache.set(key, g); }
  return g;
}

export function box(w, h, d, color, x = 0, y = 0, z = 0, extra){
  const m = new THREE.Mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), mat(color, extra));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function cyl(rt, rb, h, seg, color, x = 0, y = 0, z = 0){
  const m = new THREE.Mesh(geo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, false)),
                           mat(color, { flatShading: seg <= 12 }));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function cone(r, h, seg, color, x = 0, y = 0, z = 0){
  const m = new THREE.Mesh(geo(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), mat(color));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function ball(r, detail, color, x = 0, y = 0, z = 0, extra){
  const m = new THREE.Mesh(geo(`s${r},${detail}`, () => new THREE.IcosahedronGeometry(r, detail)), mat(color, extra));
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function panel(mesh, material){ mesh.material = material; return mesh; }

/** A little board on a post with an emoji painted on it — factory signage. */
export function sign(emoji, color = 0x8d6242){
  const g = new THREE.Group();
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff6e2';
  ctx.fillRect(0, 0, 128, 128);
  ctx.font = '86px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 70);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62),
    new THREE.MeshLambertMaterial({ map:tex }));
  face.position.set(0, 1.18, 0.06);
  g.add(box(0.76, 0.76, 0.1, color, 0, 0.8, 0), face);
  g.add(box(0.12, 0.85, 0.12, color, 0, 0, 0));
  return g;
}

/**
 * A striped balloon envelope: a lathe turned from a teardrop profile, with the
 * gores coloured by the angle around the axis so the stripes line up.
 */
function envelope(radius, height, colA, colB){
  const pts = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++){
    const t = i / steps;
    // The power pushes the widest part up to about two thirds, which is what
    // makes it read as a balloon rather than an onion.
    const r = Math.sin(Math.pow(t, 1.6) * Math.PI) * radius + 0.08;
    pts.push(new THREE.Vector2(Math.max(0.06, r), t * height - height / 2));
  }
  const geo = new THREE.LatheGeometry(pts, 16);
  const pos = geo.attributes.position;
  const a = new THREE.Color(colA), b = new THREE.Color(colB);
  const cols = [];
  for (let i = 0; i < pos.count; i++){
    const ang = Math.atan2(pos.getZ(i), pos.getX(i)) + Math.PI;
    const c = Math.floor(ang / (Math.PI / 4)) % 2 ? a : b;
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors:true, flatShading:true }));
  m.castShadow = true;
  return m;
}

// ============================================================== buildings ==

/** Move a finished mesh in world axes — translateX would use its own rotation. */
function at(mesh, x = 0, z = 0){ mesh.position.x += x; mesh.position.z += z; return mesh; }

function roof(w, d, h, color, y){
  // A simple hip roof: a squashed 4-sided cone reads as thatch or tile.
  const r = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h, 4), mat(color));
  r.position.y = y + h / 2;
  r.rotation.y = Math.PI / 4;
  r.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
  r.castShadow = true; r.receiveShadow = true;
  return r;
}

function door(color = 0x7a4a2c, x = 0, z = 0, ry = 0){
  const g = new THREE.Group();
  const d = box(0.55, 0.85, 0.12, color, 0, 0, 0);
  const knob = ball(0.05, 0, 0xffd66b, 0.17, 0.45, 0.08);
  g.add(d, knob);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return g;
}

function win(x, y, z, s = 0.42){
  const m = panel(box(s, s, 0.1, 0xffffff, 0, 0, 0), WINDOW);
  m.position.set(x, y, z);
  return m;
}

export const MODELS = {

  // ---------------------------------------------------------------- field --
  field(){
    const g = new THREE.Group();
    const soil = box(1.76, 0.22, 1.76, 0x7d5333, 0, 0, 0);
    soil.receiveShadow = true;
    g.add(soil);
    for (let i = -1; i <= 1; i++) g.add(box(1.6, 0.06, 0.18, 0x6a442a, 0, 0.22, i * 0.5));
    for (const s of [-1, 1]){
      g.add(box(0.1, 0.16, 1.8, 0x9a7048, s * 0.9, 0, 0));
      g.add(box(1.8, 0.16, 0.1, 0x9a7048, 0, 0, s * 0.9));
    }
    return g;
  },

  // --------------------------------------------------------------- houses --
  cottage(){
    const g = new THREE.Group();
    g.add(box(2.6, 1.5, 2.2, 0xfdf1dc, 0, 0, 0));
    g.add(box(2.7, 0.18, 2.3, 0xe2d3b6, 0, 1.5, 0));
    g.add(roof(3.1, 2.7, 1.25, 0xd8663f, 1.68));
    g.add(door(0x8b5a33, 0, 1.12));
    g.add(win(-0.78, 1.0, 1.12), win(0.78, 1.0, 1.12), win(1.32, 0.95, 0));
    const chim = box(0.32, 0.7, 0.32, 0xc06b4c, 0.85, 1.7, -0.5);
    g.add(chim);
    g.userData.smokeAt = new THREE.Vector3(0.85, 2.45, -0.5);
    g.add(box(0.9, 0.08, 0.5, 0xb9a279, 0, 0, 1.3));         // doorstep
    return g;
  },

  burrow(){
    const g = new THREE.Group();
    g.add(cyl(0.95, 1.05, 1.5, 12, 0xf6e7cf, 0, 0, 0));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1.7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      mat(0xd8493f, { flatShading:true }));
    cap.position.y = 1.45;
    cap.scale.y = 0.72;
    cap.castShadow = true;
    g.add(cap);
    const spots = [[0.9, 0.4], [-0.7, 0.9], [0.2, -1.0], [-1.1, -0.3], [0.55, 1.05]];
    for (const [sx, sz] of spots){
      const s = ball(0.26, 1, 0xfff4e6, sx, 1.45 + Math.sqrt(Math.max(0, 1 - (sx*sx + sz*sz) / 2.9)) * 0.72, sz);
      s.scale.y = 0.45;
      g.add(s);
    }
    g.add(door(0x7c4a2a, 0, 0.92));
    g.add(win(-0.62, 1.0, 0.72, 0.3), win(0.62, 1.0, 0.72, 0.3));
    return g;
  },

  tower(){
    const g = new THREE.Group();
    const tiers = [[2.0, 1.3, 0xf3e6cc], [1.7, 1.2, 0xe9d7b6], [1.4, 1.1, 0xf3e6cc]];
    let y = 0;
    for (const [w, h, c] of tiers){
      g.add(box(w, h, w, c, 0, y, 0));
      g.add(box(w + 0.22, 0.14, w + 0.22, 0xb08a5e, 0, y + h, 0));
      g.add(win(0, y + h * 0.55, w / 2 + 0.02, 0.38));
      g.add(win(0, y + h * 0.55, -w / 2 - 0.02, 0.38));
      y += h + 0.14;
    }
    g.add(roof(1.8, 1.8, 1.0, 0x4f7fb5, y));
    g.add(door(0x7c4a2a, 0, 1.02));
    const pole = box(0.08, 0.7, 0.08, 0xb9a279, 0, y + 1.0, 0);
    const flag = box(0.55, 0.32, 0.05, 0xff8fb1, 0.3, y + 1.35, 0);
    g.add(pole, flag);
    g.userData.flag = flag;
    return g;
  },

  manor(){
    const g = new THREE.Group();
    g.add(box(4.2, 2.0, 3.0, 0xfaeed6, 0, 0, 0));
    g.add(roof(4.8, 3.6, 1.5, 0x6d5bb0, 2.0));
    for (const s of [-1, 1]){
      g.add(box(1.5, 1.5, 1.5, 0xf1e2c4, s * 2.3, 0, 0.4));
      g.add(at(roof(1.9, 1.9, 0.9, 0x6d5bb0, 1.5), s * 2.3, 0.4));
      g.add(win(s * 2.3, 0.9, 1.18, 0.4));
    }
    g.add(cyl(0.75, 0.8, 3.2, 10, 0xf7ead0, 0, 0, -1.2));
    g.add(cone(1.0, 1.2, 10, 0x6d5bb0, 0, 3.2, -1.2));
    g.add(door(0x6f4326, 0, 1.52));
    g.add(win(-1.2, 1.2, 1.52), win(1.2, 1.2, 1.52), win(0, 2.4, -1.85, 0.34));
    for (const s of [-1, 1]) g.add(panel(ball(0.16, 0, 0xffd98a, s * 0.75, 1.55, 1.6), GLOW));
    return g;
  },

  // ------------------------------------------------------------ factories --
  bakery(){
    const g = new THREE.Group();
    g.add(box(2.8, 1.6, 2.2, 0xffe9c9, 0, 0, 0));
    g.add(roof(3.3, 2.8, 1.1, 0xc9553f, 1.6));
    // striped awning over the counter
    for (let i = -2; i <= 2; i++){
      g.add(box(0.36, 0.1, 0.9, i % 2 ? 0xffffff : 0xe8604c, i * 0.37, 1.05, 1.42));
    }
    g.add(box(2.1, 0.7, 0.3, 0xdcc19a, 0, 0, 1.15));          // counter
    g.add(win(-0.85, 1.05, 1.12, 0.5), win(0.85, 1.05, 1.12, 0.5));
    const chim = box(0.34, 0.8, 0.34, 0xb75a44, -1.0, 1.7, -0.6);
    g.add(chim);
    g.userData.smokeAt = new THREE.Vector3(-1.0, 2.55, -0.6);
    const s = sign('🥐'); s.position.set(1.55, 0, 1.2); g.add(s);
    return g;
  },

  press(){
    const g = new THREE.Group();
    g.add(box(2.6, 1.3, 2.2, 0xe7f0d8, 0, 0, 0));
    g.add(roof(3.1, 2.7, 1.0, 0x5f9e5a, 1.3));
    const wheel = cyl(1.0, 1.0, 0.24, 12, 0x9a6b43, -1.55, 0.95, 0);
    wheel.rotation.z = Math.PI / 2;
    g.add(wheel);
    g.userData.spin = wheel;
    for (let i = 0; i < 6; i++){
      const spoke = box(0.14, 1.8, 0.1, 0x7d5333, 0, 0, 0);
      spoke.position.set(0, 0, 0);
      spoke.rotation.x = (i / 6) * Math.PI;
      wheel.add(spoke);
    }
    for (const s of [-1, 1]) g.add(cyl(0.34, 0.38, 0.7, 10, 0xc98a4a, 0.75 * s, 0, 1.35));
    g.add(win(0.5, 0.85, 1.12, 0.45));
    const sg = sign('🧃'); sg.position.set(-0.7, 0, 1.3); g.add(sg);
    return g;
  },

  pen(){
    const g = new THREE.Group();
    // 3x2 tiles: a fenced yard with a shelter at one end
    g.add(box(5.4, 0.12, 3.4, 0x8fbf63, 0, 0, 0));
    for (const s of [-1, 1]){
      g.add(box(5.4, 0.1, 0.12, 0xb98a55, 0, 0.55, s * 1.7));
      g.add(box(5.4, 0.1, 0.12, 0xb98a55, 0, 0.25, s * 1.7));
      g.add(box(0.12, 0.1, 3.4, 0xb98a55, s * 2.7, 0.55, 0));
      g.add(box(0.12, 0.1, 3.4, 0xb98a55, s * 2.7, 0.25, 0));
    }
    for (let i = -3; i <= 3; i++) g.add(box(0.16, 0.7, 0.16, 0xa8794a, i * 0.9, 0, -1.7));
    g.add(box(2.0, 1.3, 1.9, 0xf0e2c8, -1.6, 0.12, 0));
    g.add(at(roof(2.5, 2.3, 0.9, 0x8a6bb0, 1.42), -1.6, 0));
    // two puffs, bobbing
    for (const [px, pz] of [[1.1, 0.5], [2.0, -0.6]]){
      const p = new THREE.Group();
      p.add(ball(0.46, 1, 0xfffdf6, 0, 0.55, 0));
      p.add(ball(0.2, 1, 0xf4d9c0, 0, 0.62, 0.42));
      p.add(ball(0.05, 0, 0x2f2a28, -0.08, 0.68, 0.58), ball(0.05, 0, 0x2f2a28, 0.08, 0.68, 0.58));
      for (const s of [-1, 1]) p.add(box(0.11, 0.3, 0.11, 0x6b5b52, s * 0.17, 0.12, 0.1));
      p.position.set(px, 0.12, pz);
      g.add(p);
      (g.userData.bobbers = g.userData.bobbers || []).push(p);
    }
    const sg = sign('🐑'); sg.position.set(2.4, 0.12, 1.5); g.add(sg);
    return g;
  },

  loom(){
    const g = new THREE.Group();
    g.add(box(2.8, 1.5, 2.3, 0xf3e0ef, 0, 0, 0));
    g.add(roof(3.3, 2.8, 1.1, 0xa2628f, 1.5));
    const spool = cyl(0.42, 0.42, 1.0, 10, 0xffc0d6, 1.05, 0.5, 1.0);
    spool.rotation.z = Math.PI / 2;
    g.add(spool);
    g.userData.spin = spool;
    g.add(box(1.5, 0.12, 0.12, 0xd6a8c4, -0.5, 1.0, 1.1));
    for (let i = 0; i < 5; i++) g.add(box(0.06, 0.55, 0.06, 0xffb3c7, -1.1 + i * 0.3, 0.45, 1.1));
    g.add(win(-0.9, 0.95, 1.17, 0.45));
    const sg = sign('🧣'); sg.position.set(-1.5, 0, 1.2); g.add(sg);
    return g;
  },

  kitchen(){
    const g = new THREE.Group();
    g.add(box(5.0, 1.7, 3.0, 0xffe6cf, 0, 0, 0));
    g.add(roof(5.6, 3.6, 1.3, 0xe08a3c, 1.7));
    const pot = cyl(0.8, 0.65, 0.9, 12, 0x6c757f, 1.5, 0.12, 1.85);
    g.add(box(1.9, 0.12, 1.5, 0xa8a29a, 1.5, 0, 1.85), pot);
    g.userData.smokeAt = new THREE.Vector3(1.5, 1.1, 1.85);
    g.add(box(2.3, 0.75, 0.4, 0xdcc19a, -1.3, 0, 1.4));
    g.add(win(-2.0, 1.0, 1.52, 0.5), win(-0.6, 1.0, 1.52, 0.5));
    const sg = sign('🍲'); sg.position.set(-2.6, 0, 1.6); g.add(sg);
    return g;
  },

  // ------------------------------------------------------------- fixtures --
  barn(){
    const g = new THREE.Group();
    g.add(box(3.0, 1.7, 2.6, 0xd15a4a, 0, 0, 0));
    g.add(roof(3.5, 3.1, 1.2, 0xa8412f, 1.7));
    g.add(box(1.2, 1.25, 0.12, 0xfff3e0, 0, 0, 1.32));
    g.add(box(0.12, 1.25, 0.05, 0xd15a4a, 0, 0, 1.4));
    g.add(box(3.05, 0.12, 0.08, 0xfff3e0, 0, 1.55, 1.32));
    g.add(win(-1.05, 1.15, 1.32, 0.4), win(1.05, 1.15, 1.32, 0.4));
    g.add(box(0.7, 0.42, 0.1, 0xfff3e0, 0, 1.82, 0.95));       // hay-loft door
    // hay bales outside
    for (const [x, z] of [[1.9, 1.2], [1.9, 0.5]]){
      const b = cyl(0.34, 0.34, 0.5, 10, 0xe4c46b, x, 0, z);
      b.rotation.z = Math.PI / 2;
      g.add(b);
    }
    return g;
  },

  balloon(){
    const g = new THREE.Group();
    g.add(box(3.0, 0.4, 3.0, 0xc9a06a, 0, 0, 0));
    g.add(box(3.2, 0.16, 3.2, 0xa8794a, 0, 0.4, 0));
    for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]])
      g.add(box(0.2, 0.55, 0.2, 0x8d6242, x, 0.56, z));
    g.add(box(0.14, 1.0, 0.14, 0x8d6242, -1.25, 0.56, 1.25));   // mooring post

    // The balloon itself bobs on its ropes, so it lives in its own group.
    const rig = new THREE.Group();
    rig.position.y = 1.1;

    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.55, 8), mat(0xb5834c));
    basket.position.y = 0.28;
    basket.castShadow = true;
    rig.add(basket);
    rig.add(cyl(0.44, 0.44, 0.08, 8, 0x8d6242, 0, 0.5, 0));

    rig.add(envelope(0.88, 2.2, 0xff8fb1, 0xfff0f5).translateY(1.72));
    for (let i = 0; i < 4; i++){
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const rope = box(0.05, 0.95, 0.05, 0xe8d8b8, Math.cos(a) * 0.36, 0.5, Math.sin(a) * 0.36);
      rope.rotation.z = -Math.cos(a) * 0.18;
      rope.rotation.x = Math.sin(a) * 0.18;
      rig.add(rope);
    }
    rig.add(panel(ball(0.13, 0, 0xffd98a, 0, 1.12, 0), GLOW));    // the burner

    g.add(rig);
    g.userData.bob = rig;
    return g;
  },

  // ---------------------------------------------------------------- decor --
  tree(){
    const g = new THREE.Group();
    g.add(cyl(0.16, 0.22, 0.9, 8, 0x8a5c38, 0, 0, 0));
    const c1 = ball(0.72, 1, 0x5fae55, 0, 1.35, 0);
    const c2 = ball(0.5, 1, 0x6dbd5e, 0.42, 1.05, 0.25);
    const c3 = ball(0.44, 1, 0x519c4a, -0.35, 1.15, -0.2);
    g.add(c1, c2, c3);
    g.userData.sway = g;
    return g;
  },

  flowers(){
    const g = new THREE.Group();
    g.add(box(1.3, 0.16, 1.3, 0x6b4a2f, 0, 0, 0));
    const cols = [0xff8fb1, 0xffe08a, 0xd7b5ff, 0xfff0f5, 0xff9d6b];
    let i = 0;
    for (const x of [-0.35, 0, 0.35]) for (const z of [-0.35, 0, 0.35]){
      g.add(box(0.05, 0.3, 0.05, 0x5fae55, x, 0.16, z));
      g.add(ball(0.12, 0, cols[i++ % cols.length], x, 0.56, z));
    }
    return g;
  },

  lamp(){
    const g = new THREE.Group();
    g.add(cyl(0.1, 0.16, 1.5, 8, 0x5b5750, 0, 0, 0));
    g.add(box(0.36, 0.44, 0.36, 0xd9534f, 0, 1.5, 0));
    const lamp = panel(ball(0.2, 1, 0xffd98a, 0, 1.72, 0), GLOW);
    g.add(lamp);
    g.add(cone(0.3, 0.22, 4, 0x8d6242, 0, 1.94, 0));
    return g;
  },

  bench(){
    const g = new THREE.Group();
    for (const s of [-1, 1]) g.add(box(0.14, 0.4, 0.5, 0x8a5c38, s * 0.55, 0, 0));
    g.add(box(1.4, 0.12, 0.55, 0xb98a55, 0, 0.4, 0));
    g.add(box(1.4, 0.45, 0.1, 0xb98a55, 0, 0.5, -0.24));
    return g;
  },

  fountain(){
    const g = new THREE.Group();
    g.add(cyl(1.5, 1.6, 0.5, 14, 0xd9d2c4, 0, 0, 0));
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.12, 16),
      new THREE.MeshLambertMaterial({ color:0x6ec5e8, transparent:true, opacity:0.85 }));
    water.position.y = 0.46;
    g.add(water);
    g.add(cyl(0.22, 0.3, 0.9, 10, 0xd9d2c4, 0, 0.5, 0));
    g.add(cyl(0.7, 0.75, 0.2, 12, 0xd9d2c4, 0, 1.4, 0));
    const spout = ball(0.22, 1, 0x8fd8f4, 0, 1.75, 0);
    g.add(spout);
    g.userData.spout = spout;
    return g;
  },

  statue(){
    const g = new THREE.Group();
    g.add(box(1.2, 0.3, 1.2, 0xbfb6a6, 0, 0, 0));
    g.add(box(0.9, 0.5, 0.9, 0xd0c7b6, 0, 0.3, 0));
    const m = MODELS.milbil(0xcfc7b8, true);
    m.position.y = 0.8;
    m.scale.setScalar(1.35);
    g.add(m);
    return g;
  },

  // -------------------------------------------------------------- milbils --
  /** The residents. `stone` makes the statue version (no eye shine, grey). */
  milbil(color = 0xffb3c7, stone = false){
    const g = new THREE.Group();
    const body = ball(0.34, 1, color, 0, 0.36, 0);
    body.scale.set(1, 0.95, 0.92);
    g.add(body);
    const belly = ball(0.24, 1, stone ? color : 0xfff6ee, 0, 0.3, 0.16);
    belly.scale.set(1, 0.85, 0.7);
    g.add(belly);

    const ears = [];
    for (const s of [-1, 1]){
      const ear = cone(0.12, 0.34, 6, color, s * 0.2, 0.52, -0.02);
      ear.rotation.z = s * 0.45;
      g.add(ear);
      ears.push(ear);
    }
    g.userData.ears = ears;

    for (const s of [-1, 1]){
      g.add(ball(0.085, 1, stone ? color : 0xffffff, s * 0.13, 0.44, 0.27));
      if (!stone) g.add(ball(0.042, 0, 0x2f2a28, s * 0.14, 0.45, 0.33));
    }
    g.add(ball(0.05, 0, stone ? color : 0xff9d6b, 0, 0.36, 0.33));   // nose

    const feet = [];
    for (const s of [-1, 1]){
      const f = ball(0.11, 0, stone ? color : 0xf5d0b8, s * 0.14, 0.09, 0.05);
      f.scale.set(1, 0.7, 1.3);
      g.add(f);
      feet.push(f);
    }
    g.userData.feet = feet;
    const tuft = cone(0.07, 0.18, 5, color, 0, 0.66, 0);
    g.add(tuft);
    return g;
  },
};

// ------------------------------------------------------------- crop plants --

/** The thing growing on a field: `t` is 0..1 ripeness. Rebuilt on stage change. */
export function cropMesh(crop, stage){
  const g = new THREE.Group();
  const spots = [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45], [0, 0]];
  const h = crop.tall * (stage === 0 ? 0.3 : stage === 1 ? 0.65 : 1);
  for (const [x, z] of spots){
    const stalkH = 0.35 * h + 0.12;
    g.add(box(0.09, stalkH, 0.09, 0x5f9e4f, x, 0.2, z));
    if (stage >= 1){
      const head = crop.id === 'wheat'
        ? box(0.14, 0.34 * h, 0.14, crop.color, x, 0.2 + stalkH, z)
        : ball(0.17 * (0.7 + 0.5 * h), 0, crop.color, x, 0.2 + stalkH + 0.12 * h, z);
      g.add(head);
      if (stage >= 2 && crop.id !== 'wheat'){
        const extra = ball(0.1, 0, crop.color, x + 0.14, 0.2 + stalkH + 0.05, z - 0.1);
        g.add(extra);
      }
    }
  }
  return g;
}

// ----------------------------------------------------------------- ghosts --

const GHOST_OK = new THREE.MeshLambertMaterial({ color:0x8ff0a8, transparent:true, opacity:0.55, depthWrite:false });
const GHOST_NO = new THREE.MeshLambertMaterial({ color:0xff8b7a, transparent:true, opacity:0.5, depthWrite:false });

/** A see-through copy of a model, used while you are choosing where to put it. */
export function ghostify(group, ok){
  group.traverse((n) => {
    if (n.isMesh){
      n.material = ok ? GHOST_OK : GHOST_NO;
      n.castShadow = false;
      n.receiveShadow = false;
    }
  });
  return group;
}

/** Footprint highlight under a ghost. */
export function tilePad(w, d, ok){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * TILE - 0.1, d * TILE - 0.1),
    new THREE.MeshBasicMaterial({ color: ok ? 0x6ee08a : 0xff7a66, transparent:true, opacity:0.45, depthWrite:false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.06;
  return m;
}

/** Model for a building type, or a flower bed if something unknown sneaks in. */
export function makeModel(type){
  const make = MODELS[type];
  return make ? make() : MODELS.flowers();
}
