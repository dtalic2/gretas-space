// 3D preview of the badges, drawn from the same STL files you print.
// Drag to turn, scroll or pinch to zoom. ?shot=set|plate|<piece id> hides the
// page around the picture (used to make the preview images).
import * as THREE from '../vendor/three.module.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) document.body.classList.add('shot');

const manifest = await (await fetch('pieces.json')).json();

// The list of pieces with their download links, built first so it shows
// even if the 3D view can't start.
const list = document.getElementById('pieces');
for (const p of manifest.pieces) {
  const li = document.createElement('li');
  li.className = 'piece';
  li.innerHTML = `
    <button type="button" class="look" data-view="${p.id}" aria-pressed="false">
      <span class="title">${p.title}</span>
      <span class="size">${p.w} × ${p.h} mm</span>
    </button>
    <span class="files">
      <a href="${p.file}" download>.3mf</a>
      <a href="${p.stl}" download>.stl</a>
    </span>`;
  list.append(li);
}

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 1, 2000);

scene.add(new THREE.HemisphereLight(0xffffff, 0x7c828c, 1.5));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(-70, 150, 110);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
Object.assign(key.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 10, far: 400 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.05;
scene.add(key);
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.7);
fill.position.set(90, 60, -40);
scene.add(fill);

// Everything below is in printer coordinates (millimetres, z up, bed from
// 0 to 180); this group turns that into three.js's y-up world, centred.
const P = manifest.plate;
const world = new THREE.Group();
world.rotation.x = -Math.PI / 2;
world.position.set(-P / 2, 0, P / 2);
scene.add(world);

// The print bed.
const bedShape = new THREE.Shape();
(function roundRect(s, x, y, w, h, r) {
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
})(bedShape, -6, -6, P + 12, P + 12, 8);
const bed = new THREE.Mesh(
  new THREE.ExtrudeGeometry(bedShape, { depth: 2, bevelEnabled: false }),
  new THREE.MeshStandardMaterial({ color: 0x7d8088, roughness: 0.92, map: speckle() }),
);
bed.position.z = -2;
bed.receiveShadow = true;
world.add(bed);
const edge = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.PlaneGeometry(P, P)),
  new THREE.LineBasicMaterial({ color: 0x8b8f98, transparent: true, opacity: 0.55 }),
);
edge.position.set(P / 2, P / 2, 0.02);
world.add(edge);

function speckle() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#9a9a9a';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26000; i++) {
    const v = 120 + Math.random() * 80 | 0;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4 / P, 4 / P);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const materials = {
  base: new THREE.MeshStandardMaterial({ color: manifest.colours.base, roughness: 0.55 }),
  top: new THREE.MeshStandardMaterial({ color: manifest.colours.top, roughness: 0.45 }),
};

// Binary STL -> two geometries: the white plate (everything at or below
// baseT) and the raised green details (everything above it).
function parseSTL(buf) {
  const dv = new DataView(buf);
  const n = dv.getUint32(80, true);
  const parts = { base: [], top: [] };
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50 + 12;
    const v = [];
    for (let k = 0; k < 9; k++) v.push(dv.getFloat32(o + k * 4, true));
    const maxZ = Math.max(v[2], v[5], v[8]);
    (maxZ > manifest.baseT + 1e-3 ? parts.top : parts.base).push(...v);
  }
  const out = {};
  for (const [k, arr] of Object.entries(parts)) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();   // non-indexed, so this gives flat faces
    out[k] = g;
  }
  return out;
}

const pieces = {};
await Promise.all(manifest.pieces.map(async (p) => {
  const geo = parseSTL(await (await fetch(p.stl)).arrayBuffer());
  const g = new THREE.Group();
  for (const k of ['base', 'top']) {
    const m = new THREE.Mesh(geo[k], materials[k]);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  g.position.set(p.x - p.w / 2, p.y - p.h / 2, 0);
  world.add(g);
  pieces[p.id] = p;
}));

// ----- camera: a simple orbit around a target -----
const view = { az: 0, el: 0.95, dist: 300, target: new THREE.Vector3() };
let anim = null;
let dirty = true;
let current = null;   // the named view last chosen, re-fitted on resize

function bounds(list) {
  const xs = list.flatMap((p) => [p.x - p.w / 2, p.x + p.w / 2]);
  const ys = list.flatMap((p) => [p.y - p.h / 2, p.y + p.h / 2]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

// Printer (x, y) -> world position.
const toWorld = (x, y, z = 0) => new THREE.Vector3(x - P / 2, z, P / 2 - y);

// The closest distance at which the box (printer coordinates) fits on
// screen with a margin, found by trying distances.
function fit(v, box, margin = 0.86) {
  const corners = [];
  for (const x of [box.x0, box.x1]) for (const y of [box.y0, box.y1]) for (const z of [0, 3]) corners.push(toWorld(x, y, z));
  let lo = 10, hi = 3000;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    Object.assign(view, { az: v.az, el: v.el, dist: mid });
    view.target.copy(v.target);
    placeCamera();
    camera.updateMatrixWorld();
    const fits = corners.every((c) => {
      const p = c.clone().project(camera);
      return Math.abs(p.x) <= margin && Math.abs(p.y) <= margin && p.z < 1;
    });
    if (fits) hi = mid; else lo = mid;
  }
  return { ...v, dist: hi };
}

const VIEWS = {
  set: () => {
    const b = bounds(manifest.pieces);
    return fit({ az: 0.14, el: 0.98, target: toWorld((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2) }, b, 0.9);
  },
  plate: () => fit({ az: 0, el: Math.PI / 2 - 0.001, target: toWorld(P / 2, P / 2) }, { x0: -6, x1: P + 6, y0: -6, y1: P + 6 }, 0.96),
};

function pieceView(id) {
  const p = pieces[id];
  const box = { x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: p.y - p.h / 2, y1: p.y + p.h / 2 };
  return fit({ az: 0.3, el: 0.82, target: toWorld(p.x, p.y, 1.5) }, box, 0.8);
}

function goTo(name, instant = false) {
  const keep = { az: view.az, el: view.el, dist: view.dist, target: view.target.clone() };
  const to = VIEWS[name] ? VIEWS[name]() : pieceView(name);
  Object.assign(view, keep);
  if (instant) {
    Object.assign(view, { az: to.az, el: to.el, dist: to.dist });
    view.target.copy(to.target);
    anim = null;
  } else {
    anim = { from: { ...view, target: view.target.clone() }, to, t0: performance.now() };
  }
  current = name;
  dirty = true;
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
}

function placeCamera() {
  const { az, el, dist, target } = view;
  camera.position.set(
    target.x + dist * Math.cos(el) * Math.sin(az),
    target.y + dist * Math.sin(el),
    target.z + dist * Math.cos(el) * Math.cos(az),
  );
  camera.lookAt(target);
}

function resize() {
  const { clientWidth: w, clientHeight: h } = canvas;
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (current && !anim) goTo(current, true);
    dirty = true;
  }
}

function frame(now) {
  resize();
  if (anim) {
    const t = Math.min(1, (now - anim.t0) / 650);
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    const { from, to } = anim;
    view.az = from.az + (to.az - from.az) * e;
    view.el = from.el + (to.el - from.el) * e;
    view.dist = from.dist + (to.dist - from.dist) * e;
    view.target.lerpVectors(from.target, to.target, e);
    if (t === 1) anim = null;
    dirty = true;
  }
  if (dirty) {
    placeCamera();
    renderer.render(scene, camera);
    dirty = false;
  }
  requestAnimationFrame(frame);
}

// Drag to orbit, wheel or two fingers to zoom.
const pointers = new Map();
let pinch = 0;
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  anim = null;
});
canvas.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  const cur = { x: e.clientX, y: e.clientY };
  pointers.set(e.pointerId, cur);
  current = null;
  if (pointers.size === 1) {
    view.az -= (cur.x - prev.x) * 0.006;
    view.el = THREE.MathUtils.clamp(view.el + (cur.y - prev.y) * 0.006, 0.12, Math.PI / 2 - 0.001);
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch) view.dist = THREE.MathUtils.clamp(view.dist * pinch / d, 40, 900);
    pinch = d;
  }
  dirty = true;
});
const release = (e) => { pointers.delete(e.pointerId); pinch = 0; };
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  anim = null;
  current = null;
  view.dist = THREE.MathUtils.clamp(view.dist * Math.exp(e.deltaY * 0.0012), 40, 900);
  dirty = true;
}, { passive: false });
canvas.addEventListener('dblclick', () => goTo('set'));

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  goTo(b.dataset.view);
  if (b.closest('.piece')) canvas.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}));
window.addEventListener('resize', () => { dirty = true; });

resize();
goTo(shot || 'set', true);
requestAnimationFrame(frame);
requestAnimationFrame(() => requestAnimationFrame(() => { window.__ready = true; }));
