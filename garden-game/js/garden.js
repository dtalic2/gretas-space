// ---------- The plot grid: growth maths + mesh management ----------
import * as THREE from 'three';
import { CROPS, WATER_BOOST, THIRST_AT, PLOT_MAX } from './data.js';
import { buildCrop, updateCrop, makeIcon } from './crops.js';

// Thirsty crops crawl, they never fully stall. Charms can raise this and speed
// up perennial regrowth, so both are settable from outside.
let unwateredSpeed = 0.35;
let regrowBonus = 1;
export function setThirstEase(speed){ unwateredSpeed = Math.max(0.35, speed || 0.35); }
export function setRegrowBonus(mult){ regrowBonus = Math.max(1, mult || 1); }
const CROP_LIGHT_BUDGET = 6;  // most dynamic crop lights allowed at once

/**
 * Fraction 0..1 of a timed cycle, closed-form so offline time works.
 * @param {number} startMs     when the cycle began
 * @param {number} durationSec its length at 1x speed
 * @param {object} plot        for the watering state
 * @param {number} now         epoch ms
 * @param {number} mult        global growth multiplier
 */
function cycleFraction(startMs, durationSec, plot, now, mult){
  const growMs = (durationSec * 1000) / Math.max(0.01, mult);
  const thirstMs = growMs * THIRST_AT;

  // Progress accrued while un-watered.
  const dry = (elapsed) => elapsed <= thirstMs
    ? elapsed / growMs
    : (thirstMs + (elapsed - thirstMs) * unwateredSpeed) / growMs;

  if (!plot.watered || !plot.boostFrom){
    return Math.min(1, dry(Math.max(0, now - startMs)));
  }
  const atWater = dry(Math.max(0, plot.boostFrom - startMs));
  const since = Math.max(0, now - plot.boostFrom) * WATER_BOOST;
  return Math.min(1, atWater + since / growMs);
}

/** How grown the plant itself is. For a perennial this caps at 1 and stays there. */
export function progressOf(plot, now, mult = 1){
  const spec = plot?.crop && CROPS[plot.crop];
  if (!spec) return 0;
  return cycleFraction(plot.planted, spec.growSec, plot, now, mult);
}

/**
 * How grown the current crop of fruit is — the thing you actually harvest.
 * Identical to progressOf except on a perennial that has already fruited once,
 * where it tracks the shorter regrow cycle instead.
 */
export function fruitProgressOf(plot, now, mult = 1){
  const spec = plot?.crop && CROPS[plot.crop];
  if (!spec) return 0;
  if (!spec.perennial || !plot.fruitedAt) return progressOf(plot, now, mult);
  return cycleFraction(plot.fruitedAt, spec.regrowSec / regrowBonus, plot, now, mult);
}

/** The cycle currently in play: the regrow for a fruiting perennial, else the plant's. */
function activeCycle(plot, now, mult){
  const spec = CROPS[plot.crop];
  const perennialRegrow = spec.perennial && plot.fruitedAt;
  return {
    start: perennialRegrow ? plot.fruitedAt : plot.planted,
    seconds: perennialRegrow ? spec.regrowSec / regrowBonus : spec.growSec,
    fraction: fruitProgressOf(plot, now, mult),
  };
}

export function isThirsty(plot, now, mult){
  return !!plot.crop && !plot.watered && fruitProgressOf(plot, now, mult) >= THIRST_AT;
}

export function isReady(plot, now, mult){
  return !!plot.crop && fruitProgressOf(plot, now, mult) >= 1;
}

/** Seconds of real time until the next harvest, for the HUD. */
export function secondsLeft(plot, now, mult){
  if (!plot.crop) return 0;
  const cyc = activeCycle(plot, now, mult);
  const growMs = (cyc.seconds * 1000) / Math.max(0.01, mult);
  const remaining = (1 - cyc.fraction) * growMs;
  const speed = plot.watered ? WATER_BOOST
              : (cyc.fraction >= THIRST_AT ? unwateredSpeed : 1);
  return Math.max(0, remaining / speed / 1000);
}

export class Garden {
  /**
   * @param {World} world
   * @param {object[]} plots  the live array from save state
   */
  constructor(world, plots){
    this.world = world;
    this.plots = plots;
    this.nodes = [];

    this.group = new THREE.Group();
    world.scene.add(this.group);

    for (let i = 0; i < PLOT_MAX; i++){
      const holder = new THREE.Group();
      holder.userData.plotIndex = i;
      holder.position.copy(world.plotAnchors[i]);
      this.group.add(holder);
      this.nodes.push({ holder, cropMesh:null, stage:-1, icon:null, iconKind:null });
    }

    // Selection ring that snaps to the focused plot.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.02, 1.2, 28),
      new THREE.MeshBasicMaterial({ color:0xffe066, transparent:true, opacity:0.9, side:THREE.DoubleSide, depthWrite:false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    ring.renderOrder = 5;
    this.ring = ring;
    world.scene.add(ring);
  }

  /** Swap meshes when the planted crop changes, and refresh the status icons. */
  sync(now, mult){
    for (let i = 0; i < PLOT_MAX; i++){
      const plot = this.plots[i];
      const node = this.nodes[i];

      // Keyed on the crop alone — growth is animated, not rebuilt.
      const key = plot.crop || 'empty';

      if (node.key !== key){
        if (node.cropMesh){ node.holder.remove(node.cropMesh); disposeTree(node.cropMesh); }
        node.cropMesh = plot.crop ? buildCrop(plot.crop) : null;
        if (node.cropMesh){
          node.holder.add(node.cropMesh);
          // Snap straight to the crop's real size — a plant restored from a save
          // (or after time away) must not flash at seedling scale for a frame.
          updateCrop(node.cropMesh, progressOf(plot, now, mult), 0, fruitProgressOf(plot, now, mult));
        }
        node.key = key;
      }

      // Floating status icon.
      const wantIcon = !plot.crop ? null
        : isReady(plot, now, mult) ? 'ready'
        : isThirsty(plot, now, mult) ? 'water'
        : null;

      if (node.iconKind !== wantIcon){
        if (node.icon){ node.holder.remove(node.icon); node.icon.material.map?.dispose(); node.icon.material.dispose(); node.icon = null; }
        if (wantIcon){
          node.icon = makeIcon(wantIcon);
          node.icon.position.y = 1.75;
          node.holder.add(node.icon);
        }
        node.iconKind = wantIcon;
      }
    }

    this._budgetLights();
  }

  /**
   * Only the handful of glowing crops nearest the camera actually cast light.
   * The emissive material carries the look either way, so the ones that go dark
   * still read as glowing — they just stop lighting their neighbours.
   */
  _budgetLights(){
    const cam = this.world.camera.position;
    const lit = [];
    for (let i = 0; i < PLOT_MAX; i++){
      const ls = this.nodes[i].cropMesh?.userData.lights;
      if (ls && ls.length) lit.push({ d: cam.distanceToSquared(this.world.plotAnchors[i]), ls });
    }
    if (!lit.length) return;
    lit.sort((a, b) => a.d - b.d);
    for (let k = 0; k < lit.length; k++){
      const on = k < CROP_LIGHT_BUDGET;
      for (const l of lit[k].ls) l.visible = on;
    }
  }

  /** Per-frame: advance every crop's growth, float the icons. */
  animate(elapsed, now, mult){
    for (let i = 0; i < PLOT_MAX; i++){
      const node = this.nodes[i];
      const plot = this.plots[i];
      if (node.cropMesh && plot.crop){
        updateCrop(node.cropMesh, progressOf(plot, now, mult), elapsed, fruitProgressOf(plot, now, mult));
      }
      if (node.icon){
        node.icon.position.y = 1.75 + Math.sin(elapsed * 3 + i * 0.7) * 0.14;
      }
    }
    if (this.ring.visible){
      const s = 1 + Math.sin(elapsed * 4) * 0.045;
      this.ring.scale.set(s, s, s);
    }
  }

  /**
   * Floating "63%" over the plot you're pointing at, so you can see exactly how
   * far along its fruit is. One sprite, repainted only when the number changes.
   */
  showPercent(index, pct){
    if (!this.pctSprite){
      const c = document.createElement('canvas');
      c.width = 256; c.height = 128;
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true, depthWrite:false, depthTest:false }));
      s.scale.set(1.5, 0.75, 1);
      s.renderOrder = 20;
      this.pctSprite = s;
      this.pctCanvas = c;
      this.pctValue = -1;
      this.world.scene.add(s);
    }

    if (index == null || pct == null){ this.pctSprite.visible = false; return; }

    const v = Math.max(0, Math.min(100, Math.round(pct)));
    if (v !== this.pctValue){
      this.pctValue = v;
      const x = this.pctCanvas.getContext('2d');
      x.clearRect(0, 0, 256, 128);
      x.fillStyle = 'rgba(43,32,22,0.86)';
      roundRectPath(x, 26, 26, 204, 76, 38);
      x.fill();
      x.lineWidth = 6;
      x.strokeStyle = v >= 100 ? '#ffe066' : '#8fd14f';
      x.stroke();
      x.fillStyle = v >= 100 ? '#ffe066' : '#ffffff';
      x.font = 'bold 54px "Trebuchet MS", system-ui, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(v >= 100 ? 'RIPE' : `${v}%`, 128, 66);
      this.pctSprite.material.map.needsUpdate = true;
    }

    this.pctSprite.visible = true;
    this.pctSprite.position.copy(this.world.plotAnchors[index]);
    this.pctSprite.position.y += 2.45;
  }

  focus(index){
    if (index == null){ this.ring.visible = false; return; }
    this.ring.visible = true;
    this.ring.position.copy(this.world.plotAnchors[index]);
    this.ring.position.y += 0.06;
  }

  /** Burst of particles when a crop is harvested. */
  celebrate(index, color = 0xffe066){
    const anchor = this.world.plotAnchors[index];
    const n = 22;
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(n * 3);
    const vel = [];
    for (let i = 0; i < n; i++){
      arr[i*3] = anchor.x; arr[i*3+1] = anchor.y + 0.6; arr[i*3+2] = anchor.z;
      vel.push(new THREE.Vector3((Math.random()-0.5)*3, 2.2 + Math.random()*2.4, (Math.random()-0.5)*3));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color, size:0.22, transparent:true, opacity:1, depthWrite:false, blending:THREE.AdditiveBlending,
    }));
    this.world.scene.add(pts);

    let life = 0;
    const tick = (dt) => {
      life += dt;
      const p = geo.attributes.position;
      for (let i = 0; i < n; i++){
        vel[i].y -= 7 * dt;
        p.setX(i, p.getX(i) + vel[i].x * dt);
        p.setY(i, p.getY(i) + vel[i].y * dt);
        p.setZ(i, p.getZ(i) + vel[i].z * dt);
      }
      p.needsUpdate = true;
      pts.material.opacity = Math.max(0, 1 - life / 1.1);
      if (life > 1.1){
        this.world.scene.remove(pts);
        geo.dispose(); pts.material.dispose();
        return false;
      }
      return true;
    };
    (this.world.particleTicks ||= []).push(tick);
  }
}

function disposeTree(root){
  root.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material){
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats){ m.map?.dispose(); m.dispose(); }
    }
  });
}

function roundRectPath(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}
