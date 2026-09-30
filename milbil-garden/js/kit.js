// Tiny helpers for building low-poly meshes out of boxes and balls.
// Geometry and materials are cached, so a hundred carrots share one of each.
import * as THREE from 'three';

const mats = new Map();
export function mat(color, extra) {
  const key = color + '|' + (extra ? JSON.stringify(extra) : '');
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
    mats.set(key, m);
  }
  return m;
}

// Smooth-shaded version, for round faces that shouldn't look faceted.
export function smooth(color, extra) {
  return mat(color, { flatShading: false, ...extra });
}

const geos = new Map();
export function geo(key, make) {
  let g = geos.get(key);
  if (!g) { g = make(); geos.set(key, g); }
  return g;
}

function mesh(g, m, x, y, z, shadow = true) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = shadow;
  o.receiveShadow = true;
  return o;
}

// Every helper puts the bottom of the shape at y (except ball, which is centred).
export function box(w, h, d, color, x = 0, y = 0, z = 0, m) {
  return mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), m || mat(color), x, y + h / 2, z);
}

export function cyl(rt, rb, h, seg, color, x = 0, y = 0, z = 0, m) {
  return mesh(geo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)),
    m || mat(color, { flatShading: seg <= 10 }), x, y + h / 2, z);
}

export function cone(r, h, seg, color, x = 0, y = 0, z = 0, m) {
  return mesh(geo(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), m || mat(color), x, y + h / 2, z);
}

// detail 0 = chunky, 1 = rounder, 2+ = smooth sphere.
export function ball(r, detail, color, x = 0, y = 0, z = 0, m) {
  const g = detail >= 3
    ? geo(`s${r}`, () => new THREE.SphereGeometry(r, 24, 16))
    : geo(`i${r},${detail}`, () => new THREE.IcosahedronGeometry(r, detail));
  return mesh(g, m || (detail >= 3 ? smooth(color) : mat(color)), x, y, z);
}

export function torus(r, tube, color, arc = Math.PI * 2, x = 0, y = 0, z = 0, m) {
  return mesh(geo(`t${r},${tube},${arc}`, () => new THREE.TorusGeometry(r, tube, 8, 24, arc)), m || smooth(color), x, y, z);
}

export function group(...children) {
  const g = new THREE.Group();
  for (const c of children) if (c) g.add(c);
  return g;
}

export const rnd = (a, b) => a + Math.random() * (b - a);

// A rounded wooden board with text on it, as a texture. Returns a mesh whose
// sign can be redrawn with .userData.draw(lines).
export function signBoard(w, h, { bg = '#fff7e0', edge = '#8a5a36', font = 'bold 44px system-ui, sans-serif', color = '#3a2e22' } = {}) {
  const cv = document.createElement('canvas');
  const scale = 256;
  cv.width = Math.round(w * scale);
  cv.height = Math.round(h * scale);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.Mesh(geo(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h)),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
  let last = '';
  m.userData.draw = (lines, opts = {}) => {
    const key = JSON.stringify([lines, opts]);
    if (key === last) return;
    last = key;
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    const r = 36;
    c.fillStyle = opts.edge || edge;
    roundRect(c, 0, 0, cv.width, cv.height, r); c.fill();
    c.fillStyle = opts.bg || bg;
    roundRect(c, 10, 10, cv.width - 20, cv.height - 20, r - 8); c.fill();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const n = lines.length;
    lines.forEach((ln, i) => {
      const big = i === 0 && opts.title;
      c.font = big ? opts.title : (opts.font || font);
      c.fillStyle = big ? (opts.titleColor || color) : color;
      c.fillText(ln, cv.width / 2, cv.height * (i + 0.5) / n + 4, cv.width - 30);
    });
    tex.needsUpdate = true;
  };
  return m;
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
