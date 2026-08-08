// ---------- Crop meshes: built once, then grown continuously ----------
//
// A crop is built in its mature form exactly once. Every moving piece is
// registered as a "part" with a progress window, and updateCrop() drives them
// from the plot's real growth progress each frame. Nothing is ever rebuilt, so
// the plant swells smoothly over its whole life instead of snapping between
// stages.
import * as THREE from 'three';
import { CROPS } from './data.js';

const lam = (c, flat = true) => new THREE.MeshLambertMaterial({ color:c, flatShading:flat });

const clamp01 = (t) => t < 0 ? 0 : t > 1 ? 1 : t;

// ---- motion style (see MOTION_STYLES in data.js) ----
const EASES = {
  smooth: (t) => t * t * (3 - 2 * t),
  linear: (t) => t,
  // easeOutBack: overshoots past 1 then settles, for the springy style.
  back:   (t) => { const c = 1.9; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; },
};
let ease = EASES.smooth;
let bobScale = 1;

export function setCropMotion(style){
  ease = EASES[style?.ease] || EASES.smooth;
  bobScale = style?.bob ?? 1;
}

/** Eased 0..1 for the slice of a crop's life between `a` and `b`. */
const band = (p, a, b) => ease(clamp01((p - a) / Math.max(1e-6, b - a)));

// Unripe produce is pale and green; it drifts to its real colour as it fills out.
const UNRIPE_TINT = new THREE.Color(0x9ccf6a);
const UNRIPE_MIX  = 0.75;
const RIPEN_FROM  = 0.55;

/** Build the mature plant, tagged so updateCrop can grow it. Anchored at soil level. */
export function buildCrop(type){
  const spec = CROPS[type];
  const g = new THREE.Group();
  if (!spec) return g;

  g.scale.setScalar(spec.scale || 1);

  const leafMat = lam(spec.leaf);
  // Mythic crops reuse the ordinary shapes but glow, which is what sets them apart.
  const bodyMat = spec.glow
    ? new THREE.MeshLambertMaterial({ color:spec.color, emissive:spec.color,
                                      emissiveIntensity:0.55, flatShading:true })
    : lam(spec.color);

  const parts = [];
  const ripening = [];

  /** @param opts {from,to,rise,fadeStart,fadeEnd,isFruit} */
  const addPart = (obj, start, end, opts = {}) => {
    parts.push({
      obj, start, end,
      from: opts.from ?? 0, to: opts.to ?? 1,
      rise: opts.rise ?? 0,
      fadeStart: opts.fadeStart, fadeEnd: opts.fadeEnd,
      isFruit: !!opts.isFruit,       // driven by the fruit cycle, not the plant's age
      baseY: obj.position.y,
    });
  };

  const ripen = (mat) => {
    const ripe = mat.color.clone();
    ripening.push({ mat, ripe, unripe: ripe.clone().lerp(UNRIPE_TINT, UNRIPE_MIX) });
  };

  // ---- seedling: a mound and a shoot, so a fresh plot isn't bare ----
  const seedling = new THREE.Group();
  const mound = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI*2, 0, Math.PI/2), lam(0x3d2a19));
  mound.scale.y = 0.45; mound.receiveShadow = true; seedling.add(mound);
  const shoot = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 5), leafMat);
  shoot.position.y = 0.2; seedling.add(shoot);
  g.add(seedling);
  // Pops up immediately, then shrinks away under the real plant.
  addPart(seedling, 0, 0.05, { from:0.35, to:1, fadeStart:0.16, fadeEnd:0.38 });

  // ---- the generic leafy base ----
  // Crops whose ripe form is the whole plant (lettuce, sunflower, chard…) skip
  // this entirely so they don't end up buried in foliage.
  if (spec.bush !== false){
    const bush = new THREE.Group();
    const h = 0.95;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, h, 6), leafMat);
    stem.position.y = h / 2; stem.castShadow = true; bush.add(stem);
    for (let i = 0; i < 5; i++){
      const a = (i / 5) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 5), leafMat);
      leaf.scale.set(1, 0.24, 0.7);
      leaf.position.set(Math.cos(a) * 0.26, h * 0.62, Math.sin(a) * 0.26);
      leaf.rotation.set(0, -a, -0.45);
      leaf.castShadow = true;
      bush.add(leaf);
    }
    g.add(bush);
    addPart(bush, 0.08, 0.62, { from:0.06, to:1, rise:0.12 });
  }

  // ---- the permanent body (perennials only: trunk, canopy, trellis) ----
  // It grows once with the plant's age and then stays put forever.
  const body = new THREE.Group();
  body.name = 'body';
  g.add(body);

  // ---- the fruit: the only part that gets picked ----
  const fruit = new THREE.Group();
  fruit.name = 'fruit';

  switch (spec.shape){
    case 'root': { // carrot — cone poking out of the soil
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.75, 8), bodyMat);
      c.rotation.x = Math.PI;         // tip down
      c.position.y = 0.42;
      c.castShadow = true;
      fruit.add(c);
      break;
    }
    case 'berry': { // strawberries hanging off the bush
      for (let i = 0; i < 3; i++){
        const a = (i / 3) * Math.PI * 2 + 0.4;
        const b = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.26, 7), bodyMat);
        b.rotation.x = Math.PI;
        b.position.set(Math.cos(a) * 0.3, 0.55, Math.sin(a) * 0.3);
        b.castShadow = true;
        fruit.add(b);
      }
      break;
    }
    case 'stalk': { // corn cob on a tall stalk
      const tall = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.5, 6), lam(0x62a52c));
      tall.position.y = 0.75; tall.castShadow = true; fruit.add(tall);
      const cob = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.4, 4, 8), bodyMat);
      cob.position.set(0.2, 1.0, 0);
      cob.rotation.z = -0.3;
      cob.castShadow = true;
      fruit.add(cob);
      break;
    }
    case 'gourd': { // pumpkin sitting on the soil
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 9), bodyMat);
      p.scale.y = 0.78;
      p.position.y = 0.36;
      p.castShadow = true;
      fruit.add(p);
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 5), lam(0x4c7a1e));
      stalk.position.y = 0.72;
      fruit.add(stalk);
      break;
    }
    case 'tropic': { // pineapple — body + spiky crown
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.62, 9), bodyMat);
      body.position.y = 0.55; body.castShadow = true; fruit.add(body);
      for (let i = 0; i < 6; i++){
        const a = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.42, 4), lam(0x2f7d1e));
        spike.position.set(Math.cos(a) * 0.1, 1.0, Math.sin(a) * 0.1);
        spike.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
        fruit.add(spike);
      }
      break;
    }
    case 'cactus': { // star cactus — glowing arms
      const mat = new THREE.MeshLambertMaterial({ color:spec.color, emissive:0x1d5e33, emissiveIntensity:0.5, flatShading:true });
      const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.6, 4, 8), mat);
      trunk.position.y = 0.6; trunk.castShadow = true; fruit.add(trunk);
      for (const side of [-1, 1]){
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 4, 6), mat);
        arm.position.set(side * 0.26, 0.72, 0);
        arm.rotation.z = side * -0.9;
        arm.castShadow = true;
        fruit.add(arm);
      }
      const star = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.14, 0),
        new THREE.MeshLambertMaterial({ color:0xffe066, emissive:0xffc300, emissiveIntensity:1.1, flatShading:true })
      );
      star.position.y = 1.12;
      fruit.add(star);
      break;
    }
    case 'shroom': { // glow cap — emissive mushroom
      const stipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.5, 7), lam(0xf2e4ff));
      stipe.position.y = 0.36; stipe.castShadow = true; fruit.add(stipe);
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 12, 8, 0, Math.PI*2, 0, Math.PI/2),
        new THREE.MeshLambertMaterial({ color:spec.color, emissive:0x6a2fb5, emissiveIntensity:0.85, flatShading:true })
      );
      cap.position.y = 0.6; cap.castShadow = true; fruit.add(cap);
      const light = new THREE.PointLight(0xc08cff, 1.4, 4, 2);
      light.position.y = 0.8;
      fruit.add(light);
      break;
    }
    case 'bulb': { // onion — squat bulb half out of the soil, shoots on top
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), bodyMat);
      b.scale.y = 1.15;
      b.position.y = 0.28;
      b.castShadow = true;
      fruit.add(b);
      for (let i = 0; i < 4; i++){
        const a = (i / 4) * Math.PI * 2;
        const shoot = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.42, 4), leafMat);
        shoot.position.set(Math.cos(a) * 0.07, 0.68, Math.sin(a) * 0.07);
        shoot.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4);
        fruit.add(shoot);
      }
      break;
    }
    case 'leafy': { // lettuce — tight rosette of flat leaves
      for (let ring = 0; ring < 3; ring++){
        const count = 5 - ring;
        const r = 0.3 - ring * 0.08;
        for (let i = 0; i < count; i++){
          const a = (i / count) * Math.PI * 2 + ring * 0.6;
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2 - ring * 0.03, 6, 5),
            lam(ring === 2 ? spec.color : spec.leaf));
          leaf.scale.set(1, 0.42, 0.9);
          leaf.position.set(Math.cos(a) * r, 0.22 + ring * 0.13, Math.sin(a) * r);
          leaf.rotation.set(0, -a, -0.7 + ring * 0.25);
          leaf.castShadow = true;
          fruit.add(leaf);
        }
      }
      break;
    }
    case 'vine': { // tomato — round fruits hanging off a staked vine
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 5), lam(0x9a6a3c));
      stake.position.set(0.26, 0.6, 0); stake.castShadow = true; fruit.add(stake);
      const spots = [[-0.22, 0.52, 0.1], [0.14, 0.72, -0.2], [-0.05, 0.36, -0.24]];
      for (const [x, y, z] of spots){
        const t = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bodyMat);
        t.position.set(x, y, z); t.castShadow = true; fruit.add(t);
        const calyx = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.08, 5), leafMat);
        calyx.position.set(x, y + 0.15, z); fruit.add(calyx);
      }
      break;
    }
    case 'flower': { // sunflower — tall stem, dark disc, ring of petals
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.5, 6), leafMat);
      stem.position.y = 0.75; stem.castShadow = true; fruit.add(stem);

      const head = new THREE.Group();
      head.position.set(0, 1.55, 0.06);
      head.rotation.x = -0.45;                       // tilt the face toward the camera

      // Petals sit behind a broad seed disc; overlapping them stops the head
      // reading as a hollow ring.
      for (let i = 0; i < 12; i++){
        const a = (i / 12) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.17, 5, 4), bodyMat);
        petal.scale.set(0.5, 1, 0.2);
        petal.position.set(Math.cos(a) * 0.25, Math.sin(a) * 0.25, -0.02);
        petal.rotation.z = a + Math.PI / 2;
        head.add(petal);
      }
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 14), lam(0x6b4423));
      disc.rotation.x = Math.PI / 2;
      disc.position.z = 0.05;
      disc.castShadow = true;
      head.add(disc);
      fruit.add(head);

      for (const side of [-1, 1]){
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), leafMat);
        leaf.scale.set(1, 0.22, 0.6);
        leaf.position.set(side * 0.24, 0.7, 0);
        leaf.rotation.z = side * -0.6;
        leaf.castShadow = true;
        fruit.add(leaf);
      }
      break;
    }
    case 'teardrop': { // aubergine — glossy pendant fruit with a green calyx
      const a = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 9), bodyMat);
      a.scale.set(1, 1.55, 1);
      a.position.set(0.08, 0.42, 0);
      a.rotation.z = -0.22;
      a.castShadow = true;
      fruit.add(a);
      const calyx = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.2, 6), leafMat);
      calyx.position.set(0.14, 0.78, 0);
      calyx.rotation.z = -0.22;
      fruit.add(calyx);
      break;
    }
    case 'melon': { // watermelon — big striped sphere resting on the soil
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 11), bodyMat);
      body.scale.y = 0.86;
      body.position.y = 0.4;
      body.castShadow = true;
      fruit.add(body);
      // Three open rings tracing meridians read as stripes from any angle.
      for (let i = 0; i < 3; i++){
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(0.465, 0.465, 0.07, 16, 1, true),
          lam(0x246b14)
        );
        band.rotation.x = Math.PI / 2;
        band.rotation.y = (i / 3) * Math.PI;
        band.scale.y = 0.86;
        band.position.y = 0.4;
        fruit.add(band);
      }
      const curl = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 5, 10, Math.PI * 1.5), leafMat);
      curl.position.set(0.1, 0.8, 0);
      curl.rotation.set(1.1, 0.4, 0);
      fruit.add(curl);
      break;
    }
    case 'moonflower': { // moonbloom — pale glowing bloom on a slim stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.8, 5), leafMat);
      stem.position.y = 0.4; stem.castShadow = true; fruit.add(stem);

      const petalMat = new THREE.MeshLambertMaterial({
        color:spec.color, emissive:0x2b6bb5, emissiveIntensity:0.75, flatShading:true,
      });
      for (let i = 0; i < 6; i++){
        const a = (i / 6) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.17, 6, 5), petalMat);
        petal.scale.set(0.5, 0.2, 1);
        petal.position.set(Math.cos(a) * 0.17, 0.9, Math.sin(a) * 0.17);
        petal.rotation.set(0.35, -a, 0);
        fruit.add(petal);
      }
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.1, 0),
        new THREE.MeshLambertMaterial({ color:0xffffff, emissive:0xbfe4ff, emissiveIntensity:1.2, flatShading:true })
      );
      core.position.y = 0.95;
      fruit.add(core);
      const light = new THREE.PointLight(0x9ecbff, 1.3, 4.5, 2);
      light.position.y = 1.0;
      fruit.add(light);
      break;
    }
    case 'chard': { // rainbow chard — a fan of differently coloured stalks
      const stalkColors = [0xff4d6d, 0xffb03a, 0xffe066, 0x6bd968, 0x8a6bff];
      stalkColors.forEach((c, i) => {
        const a = (i / stalkColors.length) * Math.PI * 2;
        const lean = 0.28;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.8, 5), lam(c));
        stalk.position.set(Math.cos(a) * 0.14, 0.4, Math.sin(a) * 0.14);
        stalk.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
        stalk.castShadow = true;
        fruit.add(stalk);

        const blade = new THREE.Mesh(new THREE.SphereGeometry(0.19, 6, 5), lam(0x2f7d1e));
        blade.scale.set(0.85, 0.3, 1);
        blade.position.set(Math.cos(a) * 0.32, 0.82, Math.sin(a) * 0.32);
        blade.rotation.set(0, -a, -0.5);
        blade.castShadow = true;
        fruit.add(blade);
      });
      break;
    }
    case 'star': { // star fruit — a golden five-pointed star on a slim stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.75, 5), leafMat);
      stem.position.y = 0.37; stem.castShadow = true; fruit.add(stem);

      const starMat = new THREE.MeshLambertMaterial({
        color:spec.color, emissive:0xc79000, emissiveIntensity:0.6, flatShading:true,
      });
      const head = new THREE.Group();
      head.position.set(0, 1.0, 0.04);
      head.rotation.x = -0.35;
      for (let i = 0; i < 5; i++){
        const a = (i / 5) * Math.PI * 2;
        const point = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 3), starMat);
        point.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0);
        point.rotation.set(Math.PI / 2, 0, a - Math.PI / 2);
        point.castShadow = true;
        head.add(point);
      }
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.11, 6), starMat);
      core.rotation.x = Math.PI / 2;
      head.add(core);
      fruit.add(head);
      break;
    }
    case 'pepper': { // ember pepper — glowing curved pods hanging off the bush
      const podMat = new THREE.MeshLambertMaterial({
        color:spec.color, emissive:0x9b1500, emissiveIntensity:0.75, flatShading:true,
      });
      const spots = [[-0.24, 0.5, 0.08], [0.2, 0.62, -0.14], [0.02, 0.42, -0.26]];
      for (const [x, y, z] of spots){
        const pod = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.46, 7), podMat);
        pod.position.set(x, y, z);
        pod.rotation.set(0.25, 0, Math.PI + (x > 0 ? -0.3 : 0.3));   // tips pointing down
        pod.castShadow = true;
        fruit.add(pod);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.1, 5), leafMat);
        cap.position.set(x, y + 0.23, z);
        fruit.add(cap);
      }
      const glow = new THREE.PointLight(0xff5a2b, 1.1, 3.6, 2);
      glow.position.y = 0.55;
      fruit.add(glow);
      break;
    }
    case 'crystal': { // crystal bloom — a cluster of glowing shards
      const shardMat = new THREE.MeshLambertMaterial({
        color:spec.color, emissive:0x1f7f9c, emissiveIntensity:0.85,
        flatShading:true, transparent:true, opacity:0.9,
      });
      const shards = [[0, 0, 0.62, 1], [0.22, 0.1, 0.42, 0.7], [-0.2, -0.14, 0.38, 0.65],
                      [0.08, -0.24, 0.3, 0.5], [-0.14, 0.22, 0.32, 0.55]];
      for (const [x, z, h, s] of shards){
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), shardMat);
        shard.scale.set(s, h / 0.32, s);
        shard.position.set(x, h * 0.75, z);
        shard.rotation.y = Math.random() * Math.PI;
        shard.castShadow = true;
        fruit.add(shard);
      }
      const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), lam(0x4a6b78));
      base.scale.y = 0.45; base.position.y = 0.1; base.receiveShadow = true;
      fruit.add(base);
      const glow = new THREE.PointLight(0x7fe8ff, 1.5, 4.2, 2);
      glow.position.y = 0.7;
      fruit.add(glow);
      break;
    }
    case 'grapes': { // void grapes — a heavy bunch on a little trellis
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 5), lam(0x6b4a2f));
      post.position.set(-0.26, 0.55, 0); post.castShadow = true; fruit.add(post);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5), lam(0x6b4a2f));
      arm.rotation.z = Math.PI / 2; arm.position.set(-0.04, 1.05, 0); fruit.add(arm);

      const berryMat = new THREE.MeshLambertMaterial({
        color:spec.color, emissive:0x3d1080, emissiveIntensity:0.55, flatShading:true,
      });
      // Three tapering tiers make a bunch rather than a blob.
      const tiers = [[3, 0.17, 0.85], [3, 0.12, 0.63], [2, 0.07, 0.44], [1, 0, 0.3]];
      for (const [count, ring, y] of tiers){
        for (let i = 0; i < count; i++){
          const a = (i / Math.max(1, count)) * Math.PI * 2 + y * 3;
          const berry = new THREE.Mesh(new THREE.IcosahedronGeometry(0.115, 0), berryMat);
          berry.position.set(0.16 + Math.cos(a) * ring, y, Math.sin(a) * ring);
          berry.castShadow = true;
          fruit.add(berry);
        }
      }
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), leafMat);
      leaf.scale.set(1, 0.22, 0.85);
      leaf.position.set(0.3, 1.0, 0.06);
      leaf.rotation.z = -0.3;
      leaf.castShadow = true;
      fruit.add(leaf);
      break;
    }
    case 'cluster': { // blueberries — tight clumps of little berries
      for (const [cx, cy, cz] of [[-0.22, 0.52, 0.12], [0.24, 0.6, -0.1], [0.02, 0.42, -0.26]]){
        for (let i = 0; i < 4; i++){
          const a = (i / 4) * Math.PI * 2 + cy * 5;
          const berry = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 0), bodyMat);
          berry.position.set(cx + Math.cos(a) * 0.09, cy + (i % 2) * 0.07, cz + Math.sin(a) * 0.09);
          berry.castShadow = true;
          fruit.add(berry);
        }
      }
      break;
    }
    case 'broccoli': { // a thick stalk under a bumpy dome of florets
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.5, 7), lam(0x8fbf5a));
      stalk.position.y = 0.25; stalk.castShadow = true; fruit.add(stalk);
      for (let i = 0; i < 4; i++){
        const a = (i / 4) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 5), leafMat);
        leaf.scale.set(1, 0.2, 0.7);
        leaf.position.set(Math.cos(a) * 0.24, 0.34, Math.sin(a) * 0.24);
        leaf.rotation.set(0, -a, -0.7);
        leaf.castShadow = true;
        fruit.add(leaf);
      }
      const crown = [[0, 0.72, 0, 0.3], [-0.2, 0.64, 0.14, 0.2], [0.21, 0.66, -0.1, 0.21],
                     [0.06, 0.86, 0.16, 0.18], [-0.12, 0.84, -0.14, 0.17]];
      for (const [x, y, z, r] of crown){
        const floret = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), bodyMat);
        floret.position.set(x, y, z); floret.castShadow = true; fruit.add(floret);
      }
      break;
    }
    case 'cucumber': { // long ribbed fruits lying across the soil
      for (const [x, z, rot] of [[-0.16, 0.14, 0.5], [0.2, -0.12, -0.8]]){
        const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.46, 4, 8), bodyMat);
        c.position.set(x, 0.19, z);
        c.rotation.set(Math.PI / 2, 0, rot);
        c.castShadow = true;
        fruit.add(c);
      }
      for (let i = 0; i < 3; i++){
        const a = (i / 3) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 5), leafMat);
        leaf.scale.set(1, 0.18, 0.8);
        leaf.position.set(Math.cos(a) * 0.3, 0.4, Math.sin(a) * 0.3);
        leaf.rotation.set(0, -a, -0.35);
        leaf.castShadow = true;
        fruit.add(leaf);
      }
      break;
    }
    case 'lotus': { // sun lotus — layered pink petals over a lily pad
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), lam(spec.leaf));
      pad.rotation.x = -Math.PI / 2; pad.position.y = 0.06; fruit.add(pad);
      const petalMat = new THREE.MeshLambertMaterial({
        color:spec.color, emissive:0xd4487f, emissiveIntensity:0.45, flatShading:true,
      });
      for (let ring = 0; ring < 3; ring++){
        const count = 7 - ring * 2;
        for (let i = 0; i < count; i++){
          const a = (i / count) * Math.PI * 2 + ring * 0.5;
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.2 - ring * 0.03, 6, 5), petalMat);
          petal.scale.set(0.45, 0.22, 1);
          petal.position.set(Math.cos(a) * (0.26 - ring * 0.07), 0.16 + ring * 0.11, Math.sin(a) * (0.26 - ring * 0.07));
          petal.rotation.set(0.5 - ring * 0.18, -a, 0);
          petal.castShadow = true;
          fruit.add(petal);
        }
      }
      const heart = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.09, 0.12, 8),
        new THREE.MeshLambertMaterial({ color:0xffe066, emissive:0xffc300, emissiveIntensity:1, flatShading:true })
      );
      heart.position.y = 0.48; fruit.add(heart);
      const glow = new THREE.PointLight(0xffb3d0, 1.2, 4, 2);
      glow.position.y = 0.5; fruit.add(glow);
      break;
    }
    case 'frostlily': { // frost lily — icy trumpet with a rime of shards
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.72, 5), lam(spec.leaf));
      stem.position.y = 0.36; stem.castShadow = true; fruit.add(stem);
      const iceMat = new THREE.MeshLambertMaterial({
        color:spec.color, emissive:0x4a86b8, emissiveIntensity:0.7,
        flatShading:true, transparent:true, opacity:0.92,
      });
      for (let i = 0; i < 6; i++){
        const a = (i / 6) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 4), iceMat);
        petal.position.set(Math.cos(a) * 0.16, 0.88, Math.sin(a) * 0.16);
        petal.rotation.set(Math.cos(a) * -0.7, 0, Math.sin(a) * 0.7);
        petal.castShadow = true;
        fruit.add(petal);
      }
      for (let i = 0; i < 5; i++){
        const a = (i / 5) * Math.PI * 2 + 0.4;
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), iceMat);
        shard.position.set(Math.cos(a) * 0.3, 0.2 + (i % 2) * 0.12, Math.sin(a) * 0.3);
        fruit.add(shard);
      }
      const glow = new THREE.PointLight(0xbfeaff, 1.4, 4.5, 2);
      glow.position.y = 0.9; fruit.add(glow);
      break;
    }
    // ---------- perennials: body goes in `body`, pickings go in `fruit` ----------
    case 'palm': { // coconut palm — bare trunk, arching fronds, nuts at the crown
      const trunk = new THREE.Group();
      for (let i = 0; i < 6; i++){
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.13 - i * 0.008, 0.16 - i * 0.008, 0.34, 7), lam(0x9a6a3c));
        seg.position.set(Math.sin(i * 0.5) * 0.07, 0.17 + i * 0.32, 0);
        seg.rotation.z = Math.cos(i * 0.5) * 0.06;
        seg.castShadow = true;
        trunk.add(seg);
      }
      body.add(trunk);
      for (let i = 0; i < 7; i++){
        const a = (i / 7) * Math.PI * 2;
        const frond = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 5), lam(spec.leaf));
        frond.scale.set(1, 0.1, 0.28);
        frond.position.set(Math.cos(a) * 0.42, 2.02 - Math.abs(Math.sin(a)) * 0.07, Math.sin(a) * 0.42);
        frond.rotation.set(0, -a, -0.32);
        frond.castShadow = true;
        body.add(frond);
      }
      for (let i = 0; i < 3; i++){
        const a = (i / 3) * Math.PI * 2 + 0.6;
        const nut = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), bodyMat);
        nut.position.set(Math.cos(a) * 0.17, 1.86, Math.sin(a) * 0.17);
        nut.castShadow = true;
        fruit.add(nut);
      }
      break;
    }
    case 'grapevine': { // a trellis with woody vines; bunches hang from the crossbar
      const woodMat = lam(0x7a5230);
      for (const x of [-0.5, 0.5]){
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.5, 5), woodMat);
        post.position.set(x, 0.75, 0); post.castShadow = true; body.add(post);
      }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.09, 0.09), woodMat);
      bar.position.y = 1.45; bar.castShadow = true; body.add(bar);
      // Twisting vines along the crossbar.
      for (let i = 0; i < 7; i++){
        const t = i / 6;
        const twist = new THREE.Mesh(new THREE.SphereGeometry(0.075, 5, 4), leafMat);
        twist.position.set(-0.6 + t * 1.2, 1.45 + Math.sin(t * 9) * 0.09, Math.cos(t * 9) * 0.09);
        body.add(twist);
      }
      for (const x of [-0.42, 0.34]){
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), leafMat);
        leaf.scale.set(1, 0.2, 0.85);
        leaf.position.set(x, 1.34, 0.14);
        leaf.rotation.z = x < 0 ? 0.4 : -0.4;
        leaf.castShadow = true;
        body.add(leaf);
      }

      // Two hanging bunches.
      for (const bx of [-0.34, 0.36]){
        for (const [count, ring, y] of [[3, 0.11, 1.16], [2, 0.075, 0.98], [1, 0, 0.84]]){
          for (let i = 0; i < count; i++){
            const a = (i / count) * Math.PI * 2 + y * 4;
            const berry = new THREE.Mesh(new THREE.IcosahedronGeometry(0.085, 0), bodyMat);
            berry.position.set(bx + Math.cos(a) * ring, y, Math.sin(a) * ring);
            berry.castShadow = true;
            fruit.add(berry);
          }
        }
      }
      break;
    }
    case 'fruittree': { // apple / orange — trunk, canopy, and pickable fruit
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 1.15, 7), lam(0x7a5230));
      trunk.position.y = 0.57; trunk.castShadow = true; body.add(trunk);
      const greens = [spec.leaf, 0x357a1e, 0x4c9a2a];
      const blobs = [[0, 1.6, 0, 0.62], [-0.4, 1.4, 0.24, 0.42], [0.42, 1.45, -0.18, 0.44],
                     [0.12, 1.95, 0.2, 0.38], [-0.18, 1.88, -0.24, 0.34]];
      blobs.forEach(([x, y, z, r], i) => {
        const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), lam(greens[i % 3]));
        f.position.set(x, y, z); f.castShadow = true; body.add(f);
      });

      // Fruit tucked around the canopy edge so it reads against the leaves.
      const spots = [[-0.46, 1.32, 0.3], [0.5, 1.3, -0.16], [0.1, 1.14, 0.42],
                     [-0.24, 1.72, -0.4], [0.34, 1.82, 0.28]];
      for (const [x, y, z] of spots){
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.145, 9, 7), bodyMat);
        f.position.set(x, y, z); f.castShadow = true; fruit.add(f);
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.09, 4), lam(0x5b3a1c));
        stalk.position.set(x, y + 0.16, z); fruit.add(stalk);
      }
      break;
    }
    case 'worldtree': { // the endgame tree — glowing gold canopy, luminous fruit
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 1.5, 8), lam(0x6b4a2f));
      trunk.position.y = 0.75; trunk.castShadow = true; body.add(trunk);
      for (const side of [-1, 1]){
        const root = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 0.5, 5), lam(0x5b3f22));
        root.position.set(side * 0.24, 0.2, 0);
        root.rotation.z = side * 0.6;
        body.add(root);
      }
      const canopyMat = new THREE.MeshLambertMaterial({
        color:spec.leaf, emissive:0x156b45, emissiveIntensity:0.45, flatShading:true,
      });
      const blobs = [[0, 2.1, 0, 0.78], [-0.55, 1.8, 0.3, 0.5], [0.58, 1.85, -0.24, 0.52],
                     [0.16, 2.6, 0.26, 0.46], [-0.24, 2.5, -0.3, 0.42]];
      for (const [x, y, z, r] of blobs){
        const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), canopyMat);
        f.position.set(x, y, z); f.castShadow = true; body.add(f);
      }

      const goldMat = new THREE.MeshLambertMaterial({
        color:spec.color, emissive:0xc98a12, emissiveIntensity:1.0, flatShading:true,
      });
      const spots = [[-0.6, 1.7, 0.36], [0.64, 1.72, -0.2], [0.14, 1.5, 0.5],
                     [-0.3, 2.34, -0.46], [0.4, 2.44, 0.34], [0, 2.9, 0]];
      for (const [x, y, z] of spots){
        const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), goldMat);
        f.position.set(x, y, z); f.castShadow = true; fruit.add(f);
      }
      const glow = new THREE.PointLight(0xffd166, 2.0, 6, 2);
      glow.position.y = 2.1;
      fruit.add(glow);
      break;
    }
    default: {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), bodyMat);
      b.position.y = 0.5; b.castShadow = true; fruit.add(b);
    }
  }

  g.add(fruit);

  // Perennial bodies grow once with the plant's age and then stay.
  if (body.children.length) addPart(body, 0.05, 0.92, { from:0.05, to:1, rise:0.18 });

  if (spec.glow){
    const light = new THREE.PointLight(spec.color, 1.3, 4.5, 2);
    light.position.y = 0.8;
    fruit.add(light);
  }

  // All three start from exactly 0 so the fruit group goes fully invisible before
  // its window opens. That matters for the crops whose fruit carries a PointLight
  // (World Tree, Glow Cap, Moonbloom…): a scaled-down light still shines at full
  // strength, so a picked tree or a fresh seed would glow with no fruit on it.
  if (spec.perennial){
    // The tree is already there; only the crop of fruit cycles, over the back
    // two-thirds of each regrow.
    addPart(fruit, 0.34, 1.0, { to:1, isFruit:true });
  } else if (spec.bush !== false){
    // On bush crops the fruit is the last thing to appear, swelling on an
    // established plant.
    addPart(fruit, 0.42, 1.0, { to:1, isFruit:true });
  } else {
    // Elsewhere the "fruit" IS the plant, so it grows across almost the whole life.
    addPart(fruit, 0.14, 0.96, { to:1, isFruit:true });
  }

  // Everything sharing the crop's body colour ripens; leaves and stems don't.
  ripen(bodyMat);

  // Several shapes hang a PointLight on their fruit. Collect them so the garden
  // can cap how many are lit at once — 49 plots of glowing crops would be 49
  // dynamic lights, which a forward renderer will not thank you for.
  const lights = [];
  fruit.traverse(o => { if (o.isLight) lights.push(o); });

  g.userData = {
    parts, ripening, fruit, lights,
    fruitBaseY: fruit.position.y,
    phase: Math.random() * Math.PI * 2,   // so the plots don't sway in lockstep
    lastProgress: -1, lastFruit: -1,
  };

  updateCrop(g, 0, 0, 0);
  return g;
}

/**
 * Drive one crop's appearance from its live growth progress.
 * @param {THREE.Group} group     a group from buildCrop
 * @param {number} progress       0..1, the plant's own age
 * @param {number} elapsed        seconds, for the idle sway
 * @param {number} [fruitProgress] 0..1 for the current crop of fruit. Differs from
 *   `progress` only on perennials, where the tree is mature but its fruit re-grows.
 */
export function updateCrop(group, progress, elapsed, fruitProgress = progress){
  const d = group.userData;
  if (!d || !d.parts) return;

  const moved = Math.abs(progress - d.lastProgress) > 0.0004
             || Math.abs(fruitProgress - d.lastFruit) > 0.0004;
  if (moved){
    d.lastProgress = progress;
    d.lastFruit = fruitProgress;

    for (const p of d.parts){
      const t = p.isFruit ? fruitProgress : progress;
      const u = band(t, p.start, p.end);
      let s = p.from + (p.to - p.from) * u;
      if (p.fadeEnd != null) s *= 1 - band(t, p.fadeStart, p.fadeEnd);

      p.obj.visible = s > 0.012;
      if (p.obj.visible){
        p.obj.scale.setScalar(s);
        p.obj.position.y = p.baseY - p.rise * (1 - u);
      }
    }

    const rt = band(fruitProgress, RIPEN_FROM, 1);
    for (const r of d.ripening) r.mat.color.copy(r.unripe).lerp(r.ripe, rt);
  }

  // Idle motion: a faint sway while growing, a clear bob once ripe.
  const fruit = d.fruit;
  if (fruit && fruit.visible){
    const ripe = fruitProgress >= 1;
    fruit.position.y = d.fruitBaseY + (ripe ? Math.sin(elapsed * 2.2 + d.phase) * 0.07 * bobScale : 0);
    fruit.rotation.y = Math.sin(elapsed * 0.9 + d.phase) * (ripe ? 0.22 : 0.06) * bobScale;
  }
}

/** Floating icon above a plot: 💧 when thirsty, ✨ when ready. */
export function makeIcon(kind){
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.font = '96px system-ui, "Apple Color Emoji", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(kind === 'water' ? '💧' : '✨', 64, 70);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true, depthWrite:false }));
  s.scale.set(0.7, 0.7, 1);
  s.renderOrder = 10;
  return s;
}
