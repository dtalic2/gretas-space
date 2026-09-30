// Your milbil in 3D, built from the same look the editor saves:
// { color, hat, eyes, extra }. Rebuild it whenever the look changes.
import * as THREE from 'three';
import { mat, smooth, box, cyl, cone, ball, torus, group } from './kit.js';

const INK = 0x2b2233;
const hex = c => new THREE.Color(c).getHex();

// Body is a ball of radius R centred at y = R + a little, facing +z.
const R = 0.42;
const CY = R + 0.08;

function eyes(kind) {
  const g = group();
  const Y = CY + 0.08, Z = R * 0.9;
  for (const s of [-1, 1]) {
    const x = s * 0.15;
    const winkThis = kind === 'wink' && s === 1;
    if (kind === 'happy' || winkThis) {
      const a = torus(0.055, 0.016, INK, Math.PI, x, Y - 0.01, Z);
      g.add(a);
    } else if (kind === 'sleepy') {
      const a = torus(0.055, 0.016, INK, Math.PI, x, Y + 0.02, Z);
      a.rotation.z = Math.PI;
      g.add(a);
    } else {
      const r = kind === 'sparkle' ? 0.07 : 0.055;
      const e = ball(r, 3, INK, x, Y, Z);
      e.scale.z = 0.6;
      g.add(e);
      g.add(ball(r * 0.35, 3, 0xffffff, x + 0.02, Y + 0.022, Z + 0.035));
      if (kind === 'sparkle') g.add(ball(r * 0.2, 3, 0xffffff, x - 0.02, Y - 0.02, Z + 0.04));
    }
  }
  return g;
}

function hat(kind, color) {
  const top = CY + R * 0.92;
  switch (kind) {
    case 'straw': return group(
      cyl(0.52, 0.52, 0.04, 20, 0xe2b04a, 0, top - 0.08),
      cyl(0.25, 0.3, 0.24, 16, 0xe2b04a, 0, top - 0.06),
      cyl(0.305, 0.305, 0.07, 16, 0xe0558a, 0, top - 0.04));
    case 'cap': {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), smooth(0xe05252));
      d.position.y = top - 0.16;
      d.castShadow = true;
      const brim = box(0.36, 0.03, 0.3, 0xb83c3c, 0, top - 0.17, 0.36);
      return group(d, brim, ball(0.04, 3, 0xb83c3c, 0, top + 0.19, 0));
    }
    case 'beanie': {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.37, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), smooth(0x5b8def));
      d.position.y = top - 0.18;
      d.castShadow = true;
      const band = torus(0.36, 0.05, 0x3f6fd1, Math.PI * 2, 0, top - 0.17, 0);
      band.rotation.x = Math.PI / 2;
      return group(d, band, ball(0.09, 1, 0xffffff, 0, top + 0.22, 0));
    }
    case 'flower': {
      const g = group();
      const cols = [0xff7eb6, 0xffd44f, 0xffffff, 0xb98cff, 0xff9f5a];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const f = ball(0.06, 1, cols[i % 5], Math.cos(a) * 0.3, top - 0.1, Math.sin(a) * 0.3);
        g.add(f, ball(0.025, 1, 0xf5b82e, Math.cos(a) * 0.32, top - 0.08, Math.sin(a) * 0.32));
      }
      const vine = torus(0.3, 0.018, 0x5fae3f, Math.PI * 2, 0, top - 0.11, 0);
      vine.rotation.x = Math.PI / 2;
      g.add(vine);
      return g;
    }
    case 'sprout': {
      const g = group(cyl(0.018, 0.022, 0.22, 5, 0x4c9a2a, 0, top - 0.04));
      const l1 = ball(0.09, 1, 0x6cc24a, 0.08, top + 0.18, 0); l1.scale.set(1.3, 0.35, 0.8); l1.rotation.z = 0.4;
      const l2 = ball(0.08, 1, 0x8fd16a, -0.07, top + 0.13, 0); l2.scale.set(1.3, 0.35, 0.8); l2.rotation.z = -0.4;
      return g.add(l1, l2), g;
    }
    case 'crown': {
      const g = group(cyl(0.2, 0.22, 0.14, 10, 0xf5c542, 0, top - 0.04));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.add(cone(0.05, 0.14, 4, 0xf5c542, Math.cos(a) * 0.19, top + 0.08, Math.sin(a) * 0.19));
      }
      g.add(ball(0.035, 1, 0xe0558a, 0, top + 0.04, 0.21));
      return g;
    }
    default: {
      const t = cone(0.06, 0.16, 5, color, 0, top - 0.04, 0);
      t.rotation.z = 0.3;
      return group(t);
    }
  }
}

function extra(kind) {
  const Y = CY + 0.08, Z = R * 0.92;
  switch (kind) {
    case 'glasses': {
      const g = group();
      for (const s of [-1, 1]) g.add(torus(0.085, 0.014, INK, Math.PI * 2, s * 0.15, Y, Z + 0.02));
      g.add(box(0.08, 0.02, 0.02, INK, 0, Y - 0.01, Z + 0.03));
      return g;
    }
    case 'freckles': {
      const g = group();
      for (const s of [-1, 1]) for (const [dx, dy] of [[0.2, -0.07], [0.24, -0.1], [0.17, -0.12]]) {
        g.add(ball(0.013, 1, 0xb0664a, s * dx, Y + dy, Z * 0.93));
      }
      return g;
    }
    case 'bow': {
      const g = group();
      const b = group(ball(0.035, 1, 0xe0408a));
      for (const s of [-1, 1]) { const w = cone(0.07, 0.13, 4, 0xff5fa2, s * 0.07, -0.065, 0); w.rotation.z = s * Math.PI / 2; b.add(w); }
      b.position.set(0.28, CY + R * 0.8, 0.12);
      b.rotation.z = -0.4;
      g.add(b);
      return g;
    }
    case 'scarf': {
      const s = torus(0.36, 0.07, 0xe05252, Math.PI * 2, 0, CY - 0.2, 0);
      s.rotation.x = Math.PI / 2;
      const tail = box(0.12, 0.3, 0.05, 0xc43e3e, 0.16, CY - 0.5, 0.33);
      tail.rotation.z = 0.2;
      return group(s, tail);
    }
    default: return null;
  }
}

export function makeMilbil(look) {
  const color = hex(look.color || '#ffb3c7');
  const g = new THREE.Group();
  const bodyPivot = new THREE.Group();     // bounces and squashes
  g.add(bodyPivot);

  const body = ball(R, 3, color, 0, CY, 0);
  bodyPivot.add(body);
  const belly = ball(R * 0.7, 3, 0xfff6ee, 0, CY - 0.08, R * 0.38);
  belly.scale.set(1, 0.9, 0.62);
  bodyPivot.add(belly);
  bodyPivot.add(eyes(look.eyes));
  for (const s of [-1, 1]) {
    const ch = ball(0.05, 3, 0xff8fab, s * 0.25, CY - 0.02, R * 0.82);
    ch.scale.z = 0.4;
    ch.material = smooth(0xff8fab, { transparent: true, opacity: 0.85 });
    bodyPivot.add(ch);
  }
  const smile = torus(0.06, 0.014, INK, Math.PI, 0, CY - 0.04, R * 0.97);
  smile.rotation.z = Math.PI;
  bodyPivot.add(smile);
  // Little arms.
  const arms = [];
  for (const s of [-1, 1]) {
    const a = ball(0.08, 3, color, s * (R + 0.02), CY - 0.08, 0.05);
    a.scale.set(0.8, 1.2, 0.8);
    bodyPivot.add(a);
    arms.push(a);
  }
  const ex = extra(look.extra);
  if (ex) bodyPivot.add(ex);
  bodyPivot.add(hat(look.hat, color));

  const feet = [];
  for (const s of [-1, 1]) {
    const f = ball(0.1, 3, 0xf5d0b8, s * 0.16, 0.06, 0.08);
    f.scale.set(1, 0.6, 1.4);
    g.add(f);
    feet.push(f);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { bodyPivot, feet, arms };
  return g;
}

// Waddle, hop and wave. `speed` is how fast it's walking (0 = standing).
export function animateMilbil(m, t, speed, extra = {}) {
  const { bodyPivot, feet, arms } = m.userData;
  const walk = Math.min(1, speed / 2);
  const step = t * 11;
  const idle = Math.sin(t * 2.2) * 0.02;
  const hop = extra.hop ? Math.sin(Math.min(1, extra.hop) * Math.PI) * 0.45 : 0;
  bodyPivot.position.y = idle + Math.abs(Math.sin(step)) * 0.07 * walk + hop;
  bodyPivot.rotation.z = Math.sin(step) * 0.08 * walk;
  const squash = 1 + Math.sin(t * 2.2) * 0.015;
  bodyPivot.scale.set(1 / squash, squash, 1 / squash);
  feet.forEach((f, i) => {
    const s = i ? 1 : -1;
    f.position.z = 0.08 + Math.sin(step + i * Math.PI) * 0.12 * walk;
    f.position.y = 0.06 + Math.max(0, Math.sin(step + i * Math.PI)) * 0.06 * walk + hop * 0.8;
    f.position.x = s * 0.16;
  });
  arms.forEach((a, i) => {
    const s = i ? 1 : -1;
    const wave = extra.wave && i === 1 ? Math.sin(t * 16) * 0.3 + 0.55 : 0;
    a.position.y = CY - 0.08 + wave * 0.3 + Math.sin(step + i * Math.PI) * 0.03 * walk;
    a.position.x = s * (R + 0.02 + wave * 0.05);
  });
}
