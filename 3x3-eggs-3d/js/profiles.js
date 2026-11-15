// ---------- The cast ----------
//
// A profile is the character you run around as. Everything that makes one — the
// colours, the hat, the face, the way it moves — lives in the object below, so
// adding a character means adding one entry and nothing else.
//
// STAND-IN ART, AND HOW TO REPLACE IT
// Until the Clip Club screenshots turn up, each character is built here out of
// boxes and a drawn-on face. Every profile supports two render modes:
//
//   mode: 'rig'    built from the colours in the entry (what ships today)
//   mode: 'card'   a cut-out of `art`, billboarded so it always faces the camera
//
// So when the real art arrives: drop `pip.png` (transparent background, the
// character standing, roughly 320×420) into assets/profiles/, then change that
// one profile to `mode: 'card', art: 'assets/profiles/pip.png'`. Nothing else in
// the game reads these fields — not the controls, not the stealing, not the
// camera — so the swap is exactly that one line per character.

import * as THREE from 'three';

export const PROFILES = [
  {
    id: 'pip', name: 'Pip', blurb: 'Quick feet, loud shoes.',
    mode: 'rig', art: null,
    skin: 0xf6c49a, hair: 0x3b2a20, shirt: 0xef5d5d, pants: 0x2f4a7a, shoe: 0xf2f2f2,
    hat: 'cap', hatColor: 0xffc531,
    trait: { speed: 1.08, sneak: 0.95, carry: 0 },
    at: 0,
  },
  {
    id: 'mo', name: 'Mo', blurb: 'Steps like a cat.',
    mode: 'rig', art: null,
    skin: 0x8d5a34, hair: 0x14100e, shirt: 0x37c98a, pants: 0x27343f, shoe: 0x1b1b1b,
    hat: 'hood', hatColor: 0x2aa070,
    trait: { speed: 0.98, sneak: 1.25, carry: 0 },
    at: 0,
  },
  {
    id: 'bee', name: 'Bee', blurb: 'Carries two without wobbling.',
    mode: 'rig', art: null,
    skin: 0xffd9b8, hair: 0xf2a33c, shirt: 0xffd23f, pants: 0x4b3b8f, shoe: 0xe8e8e8,
    hat: 'band', hatColor: 0xff7bd0,
    trait: { speed: 0.96, sneak: 1.0, carry: 1 },
    at: 0,
  },
  {
    id: 'tuck', name: 'Tuck', blurb: 'Slow to start, hard to stop.',
    mode: 'rig', art: null,
    skin: 0xe8b086, hair: 0x6b3f2a, shirt: 0x5b8def, pants: 0x30455c, shoe: 0x8a4b2a,
    hat: 'none', hatColor: 0x000000,
    trait: { speed: 1.14, sneak: 0.8, carry: 0 },
    at: 6,
  },
  {
    id: 'wren', name: 'Wren', blurb: 'Nobody hears Wren coming.',
    mode: 'rig', art: null,
    skin: 0xf3cfae, hair: 0xb0453c, shirt: 0x9b6bff, pants: 0x1f2a44, shoe: 0xd7d7d7,
    hat: 'bow', hatColor: 0xff6fa5,
    trait: { speed: 1.0, sneak: 1.4, carry: 0 },
    at: 14,
  },
  {
    id: 'dot', name: 'Dot', blurb: 'The whole basket, every run.',
    mode: 'rig', art: null,
    skin: 0x6e4630, hair: 0x241a14, shirt: 0xff8a3d, pants: 0x155e4c, shoe: 0xffd166,
    hat: 'crown', hatColor: 0xffd531,
    trait: { speed: 1.04, sneak: 1.08, carry: 2 },
    at: 28,
  },
];

export const profileById = (id) => PROFILES.find((p) => p.id === id) || PROFILES[0];

// ---------------------------------------------------------------- the face
//
// Drawn once per profile onto a canvas and used as the front of the head. It is
// also what the start screen shows, so the character you pick is the character
// you see.

function faceCanvas(p, size = 128){
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const hex = (v) => '#' + v.toString(16).padStart(6, '0');

  g.fillStyle = hex(p.skin);
  g.fillRect(0, 0, size, size);

  // fringe across the top
  g.fillStyle = hex(p.hair);
  g.beginPath();
  g.moveTo(0, 0); g.lineTo(size, 0); g.lineTo(size, size * 0.26);
  g.quadraticCurveTo(size * 0.5, size * 0.4, 0, size * 0.26);
  g.closePath(); g.fill();

  // eyes
  const ey = size * 0.52, er = size * 0.085;
  for (const ex of [size * 0.32, size * 0.68]){
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(ex, ey, er * 1.25, er * 1.45, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(ex + er * 0.12, ey + er * 0.1, er * 0.62, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(ex + er * 0.4, ey - er * 0.3, er * 0.2, 0, Math.PI * 2); g.fill();
  }

  // cheeks and a small smile
  g.fillStyle = 'rgba(255,120,120,0.35)';
  g.beginPath(); g.arc(size * 0.22, size * 0.66, size * 0.07, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(size * 0.78, size * 0.66, size * 0.07, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#7a3b2a'; g.lineWidth = size * 0.035; g.lineCap = 'round';
  g.beginPath(); g.arc(size * 0.5, size * 0.68, size * 0.14, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke();

  return c;
}

const faceCache = new Map();
function faceTexture(p){
  if (!faceCache.has(p.id)){
    const t = new THREE.CanvasTexture(faceCanvas(p, 128));
    t.colorSpace = THREE.SRGBColorSpace;
    faceCache.set(p.id, t);
  }
  return faceCache.get(p.id);
}

/** The portrait on the start screen, drawn into a 2D canvas the UI owns. */
export function drawPortrait(ctx, p, w, h){
  const hex = (v) => '#' + v.toString(16).padStart(6, '0');
  ctx.clearRect(0, 0, w, h);

  // shoulders
  ctx.fillStyle = hex(p.shirt);
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h);
  ctx.quadraticCurveTo(w * 0.5, h * 0.62, w * 0.88, h);
  ctx.closePath(); ctx.fill();

  // head
  const face = faceCanvas(p, 96);
  const s = Math.min(w, h) * 0.62;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(w / 2 - s / 2, h * 0.52 - s / 2, s, s, s * 0.22);
  ctx.clip();
  ctx.drawImage(face, w / 2 - s / 2, h * 0.52 - s / 2, s, s);
  ctx.restore();

  // hat
  ctx.fillStyle = hex(p.hatColor);
  const hx = w / 2, hy = h * 0.52 - s / 2;
  if (p.hat === 'cap'){
    ctx.beginPath(); ctx.ellipse(hx, hy + s * 0.06, s * 0.52, s * 0.2, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(hx - s * 0.5, hy + s * 0.04, s * 0.98, s * 0.06);
  } else if (p.hat === 'band'){
    ctx.fillRect(hx - s * 0.52, hy + s * 0.1, s * 1.04, s * 0.12);
  } else if (p.hat === 'bow'){
    ctx.beginPath(); ctx.arc(hx - s * 0.3, hy + s * 0.1, s * 0.13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx - s * 0.08, hy + s * 0.1, s * 0.13, 0, Math.PI * 2); ctx.fill();
  } else if (p.hat === 'hood'){
    ctx.beginPath(); ctx.ellipse(hx, hy + s * 0.14, s * 0.58, s * 0.3, 0, Math.PI, 0); ctx.fill();
  } else if (p.hat === 'crown'){
    ctx.beginPath();
    ctx.moveTo(hx - s * 0.34, hy + s * 0.16);
    ctx.lineTo(hx - s * 0.34, hy - s * 0.06);
    ctx.lineTo(hx - s * 0.17, hy + s * 0.06);
    ctx.lineTo(hx, hy - s * 0.1);
    ctx.lineTo(hx + s * 0.17, hy + s * 0.06);
    ctx.lineTo(hx + s * 0.34, hy - s * 0.06);
    ctx.lineTo(hx + s * 0.34, hy + s * 0.16);
    ctx.closePath(); ctx.fill();
  }
}

// ---------------------------------------------------------------- the body
//
// buildAvatar returns a group plus the handful of parts the walk cycle moves.
// Both render modes return the same shape, so player.js never asks which it got.

const box = (w, h, d, color) => new THREE.Mesh(
  new THREE.BoxGeometry(w, h, d),
  new THREE.MeshLambertMaterial({ color }),
);

function buildRig(p){
  const g = new THREE.Group();

  const body = box(0.52, 0.6, 0.34, p.shirt);
  body.position.y = 0.86;
  body.castShadow = true;
  g.add(body);

  // head — plain sides, drawn face on the front (+Z)
  const skinMat = () => new THREE.MeshLambertMaterial({ color: p.skin });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.42), [
    skinMat(), skinMat(),
    new THREE.MeshLambertMaterial({ color: p.hair }),   // top: hair
    skinMat(),
    new THREE.MeshLambertMaterial({ map: faceTexture(p) }),
    new THREE.MeshLambertMaterial({ color: p.hair }),   // back: hair
  ]);
  head.position.y = 1.4;
  head.castShadow = true;
  g.add(head);

  if (p.hat !== 'none'){
    const hat = new THREE.Group();
    if (p.hat === 'cap'){
      const crown = box(0.48, 0.14, 0.44, p.hatColor); crown.position.y = 0.26;
      const peak = box(0.4, 0.05, 0.22, p.hatColor); peak.position.set(0, 0.21, 0.3);
      hat.add(crown, peak);
    } else if (p.hat === 'band'){
      const b = box(0.5, 0.09, 0.46, p.hatColor); b.position.y = 0.2; hat.add(b);
    } else if (p.hat === 'bow'){
      const l = box(0.14, 0.14, 0.1, p.hatColor); l.position.set(-0.17, 0.26, 0);
      const r = box(0.14, 0.14, 0.1, p.hatColor); r.position.set(0.17, 0.26, 0);
      hat.add(l, r);
    } else if (p.hat === 'hood'){
      const h = box(0.56, 0.3, 0.5, p.hatColor); h.position.y = 0.16; hat.add(h);
    } else if (p.hat === 'crown'){
      const base = box(0.5, 0.1, 0.46, p.hatColor); base.position.y = 0.24; hat.add(base);
      for (const x of [-0.17, 0, 0.17]){
        const spike = box(0.1, 0.14, 0.1, p.hatColor); spike.position.set(x, 0.34, 0); hat.add(spike);
      }
    }
    hat.position.y = 1.4;
    hat.traverse((m) => { m.castShadow = true; });
    g.add(hat);
  }

  const larm = box(0.14, 0.44, 0.16, p.shirt); larm.position.set(-0.34, 0.92, 0);
  const rarm = box(0.14, 0.44, 0.16, p.shirt); rarm.position.set(0.34, 0.92, 0);
  const lleg = box(0.18, 0.5, 0.2, p.pants);   lleg.position.set(-0.14, 0.3, 0);
  const rleg = box(0.18, 0.5, 0.2, p.pants);   rleg.position.set(0.14, 0.3, 0);
  for (const m of [larm, rarm, lleg, rleg]){ m.castShadow = true; g.add(m); }

  // hands and shoes, so the limbs read at a distance
  // The back basket. You look at the back of this character more than any other
  // part of it, and this is also where the stolen eggs ride.
  const pack = box(0.4, 0.34, 0.2, p.hatColor === 0x000000 ? p.pants : p.hatColor);
  pack.position.set(0, 1.0, -0.26);
  pack.castShadow = true;
  g.add(pack);
  const packLip = box(0.44, 0.07, 0.24, 0xe3c37a);
  packLip.position.set(0, 1.18, -0.26);
  g.add(packLip);

  const lhand = box(0.16, 0.12, 0.18, p.skin); lhand.position.set(-0.34, 0.68, 0);
  const rhand = box(0.16, 0.12, 0.18, p.skin); rhand.position.set(0.34, 0.68, 0);
  const lshoe = box(0.2, 0.12, 0.26, p.shoe);  lshoe.position.set(-0.14, 0.06, 0.03);
  const rshoe = box(0.2, 0.12, 0.26, p.shoe);  rshoe.position.set(0.14, 0.06, 0.03);
  g.add(lhand, rhand, lshoe, rshoe);

  return { group: g, parts: { body, head, larm, rarm, lleg, rleg, lhand, rhand, lshoe, rshoe, pack, packLip } };
}

function buildCard(p){
  const g = new THREE.Group();
  const tex = new THREE.TextureLoader().load(p.art);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 1.65),
    new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }),
  );
  plane.position.y = 0.83;
  plane.castShadow = true;
  g.add(plane);

  return { group: g, parts: { card: plane }, billboard: true };
}

export function buildAvatar(p){
  const built = (p.mode === 'card' && p.art) ? buildCard(p) : buildRig(p);
  const { group, parts } = built;
  group.userData.profile = p.id;

  // One walk cycle for both modes: the rig swings, the card bounces and leans.
  let phase = 0;
  built.animate = (dt, { speed = 0, crouch = false, carrying = 0, stunned = false }) => {
    phase += dt * (3.2 + speed * 2.6);
    const swing = Math.min(speed, 1) * 0.8;

    if (parts.card){
      parts.card.position.y = 0.83 + Math.abs(Math.sin(phase)) * 0.06 * swing;
      parts.card.rotation.z = Math.sin(phase) * 0.05 * swing;
      return;
    }

    const s = Math.sin(phase) * swing;
    parts.lleg.rotation.x = s;
    parts.rleg.rotation.x = -s;
    parts.lshoe.position.z = 0.03 + s * 0.22;
    parts.rshoe.position.z = 0.03 - s * 0.22;
    parts.lshoe.position.y = 0.06 + Math.max(0, s) * 0.12;
    parts.rshoe.position.y = 0.06 + Math.max(0, -s) * 0.12;

    // The eggs ride in the basket, so the arms just swing — a shade wider when
    // the basket is loaded and you are watching your balance.
    const load = carrying > 0 ? 0.12 : 0;
    parts.larm.rotation.x = -s;
    parts.rarm.rotation.x = s;
    parts.larm.rotation.z = load;
    parts.rarm.rotation.z = -load;
    parts.lhand.position.z = -s * 0.2;
    parts.rhand.position.z = s * 0.2;

    // Crouching squashes the whole character down a little.
    const crouchY = crouch ? 0.74 : 1;
    parts.body.scale.y = crouchY;
    parts.body.position.y = 0.86 * crouchY;
    parts.head.position.y = 1.4 * crouchY - (crouch ? 0.06 : 0);
    parts.head.rotation.z = stunned ? Math.sin(phase * 6) * 0.3 : 0;
  };

  return built;
}
